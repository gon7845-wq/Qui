import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { customAlphabet } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { timingSafeEqual } from "crypto";
import { initDb, q, purgeExpiredTokens } from "./db.js";
import { mountAuth, requireUser, userIdFromReq, userIdFromCookieHeader, userIdFromToken } from "./auth.js";
import {
  mountBilling,
  mountBillingWebhook,
  isVip,
  assertQuestionQuota,
  publicBilling,
} from "./billing.js";
import { AD_POLICY, publicAds } from "./ads.js";
import {
  pickQuestions,
  enabledCount,
  getCategories,
  getGameCategories,
  getData,
  addCategory,
  updateCategory,
  deleteCategory,
  addQuestion,
  addQuestionsBulk,
  updateQuestion,
  deleteQuestion,
} from "./store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROD = process.env.NODE_ENV === "production";

// ─── Secrets obligatoires en prod ───
// Sans SESSION_SECRET, le JWT est signé avec une valeur publique : n'importe
// qui peut se forger une session. On refuse de démarrer plutôt que d'exposer.
if (PROD) {
  const missing = ["SESSION_SECRET", "ADMIN_PASSWORD"].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`[Qui ?] Variables obligatoires en production : ${missing.join(", ")}`);
    process.exit(1);
  }
}

// ─── Filet de sécurité process ───
// L'état des parties vit en mémoire : un crash = toutes les parties en cours
// perdues. On journalise fort et on reste debout (les handlers socket ont
// leur propre try/catch, ceci ne couvre que l'imprévu).
process.on("uncaughtException", (e) => console.error("[fatal] exception non capturée :", e));
process.on("unhandledRejection", (e) => console.error("[fatal] promesse rejetée :", e));

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // derrière le proxy Railway : req.ip = vraie IP client
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// Le webhook Stripe signe le corps BRUT : il doit être monté avant le parseur
// JSON, sinon la signature ne peut plus être vérifiée.
mountBillingWebhook(app);

app.use(express.json({ limit: "512kb" }));
app.use(cookieParser());

// ─── En-têtes de sécurité (pas de dépendance : on pose l'essentiel à la main) ───
// Les régies publicitaires chargent scripts et iframes depuis leurs domaines :
// on ne les autorise que si une régie est réellement configurée, sinon la CSP
// reste stricte. Sans ça, brancher AdSense donnerait un emplacement vide sans
// le moindre message d'erreur visible.
const AD_HOSTS = process.env.ADSENSE_CLIENT
  ? {
      script:
        " https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.googletagservices.com https://adservice.google.com",
      frame:
        " https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://pagead2.googlesyndication.com",
      connect: " https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net",
    }
  : { script: "", frame: "", connect: "" };

const CSP = [
  "default-src 'self'",
  // le script inline de index.html applique le thème avant le premier rendu
  `script-src 'self' 'unsafe-inline'${AD_HOSTS.script}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ws: wss:${AD_HOSTS.connect}`,
  `frame-src 'self'${AD_HOSTS.frame}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

app.use((_req, res, next) => {
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  if (PROD) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

// ─── Limiteur de débit (en mémoire, suffisant pour une instance) ───
const buckets = new Map(); // clé -> { count, resetAt }

function hit(key, windowMs, max) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > max) return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

// purge périodique pour que la Map ne grossisse pas indéfiniment
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}, 60_000).unref();

// `by` permet d'ajouter une dimension à la clé (ex. l'e-mail visé)
function rateLimit({ windowMs, max, name, by }) {
  return (req, res, next) => {
    const extra = by ? by(req) : "";
    const r = hit(`${name}:${req.ip}:${extra}`, windowMs, max);
    if (r.ok) return next();
    res.setHeader("Retry-After", String(r.retryAfter));
    res.status(429).json({ error: "Trop de tentatives, réessaie plus tard." });
  };
}

// ─── CORS : l'app mobile (Capacitor) appelle l'API depuis une autre origine ───
const APP_ORIGINS = ["capacitor://localhost", "https://localhost", "http://localhost"];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (APP_ORIGINS.includes(origin) || origin.startsWith("http://localhost:"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-key");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ─── Authentification (Google + lien magique) ───
// Le lien magique envoie un vrai e-mail (quota Resend, réputation d'expéditeur) :
// on borne par IP *et* par adresse visée pour éviter le bombardement.
const HOUR = 3600_000;
app.use(
  "/api/auth/magic",
  rateLimit({ windowMs: HOUR, max: 8, name: "magic-ip" }),
  rateLimit({ windowMs: HOUR, max: 3, name: "magic-email", by: (req) => String(req.body?.email || "").toLowerCase() })
);
mountAuth(app);

// ─── Espace membre : contenu privé (owner = utilisateur connecté) ───
const me = express.Router();
me.use(requireUser);
me.get("/data", handle((req) => getData(req.uid)));
me.post("/categories", handle((req) => addCategory(req.body || {}, req.uid)));
me.put("/categories/:id", handle((req) => updateCategory(req.params.id, req.body || {}, req.uid)));
me.delete("/categories/:id", handle((req) => deleteCategory(req.params.id, req.body?.reassignTo, req.uid)));
// Le quota gratuit ne porte que sur les questions PRIVÉES : la banque publique
// reste entière pour tout le monde (c'est elle qui fait tourner le jeu).
me.post(
  "/questions",
  handle(async (req) => {
    await assertQuestionQuota(req.uid, 1);
    return addQuestion(req.body || {}, req.uid);
  })
);
me.post(
  "/questions/bulk",
  handle(async (req) => {
    const texts = Array.isArray(req.body?.texts) ? req.body.texts.slice(0, 500) : [];
    await assertQuestionQuota(req.uid, texts.length);
    return addQuestionsBulk(texts, req.body?.categoryId, req.uid);
  })
);
me.put("/questions/:id", handle((req) => updateQuestion(req.params.id, req.body || {}, req.uid)));
me.delete("/questions/:id", handle((req) => deleteQuestion(req.params.id, req.uid)));
app.use("/api/me", me);

// ─── Admin API ───
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "qui-admin-2026";
if (!process.env.ADMIN_PASSWORD) {
  console.warn("[Qui ?] ADMIN_PASSWORD non défini — mot de passe par défaut 'qui-admin-2026'. À changer en prod !");
}

// Comparaison à temps constant : évite de fuiter le mot de passe caractère
// par caractère via le temps de réponse.
function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function adminAuth(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (typeof key !== "string" || !timingSafeEqualStr(key, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  next();
}

function handle(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req);
      res.json(result ?? { ok: true });
    } catch (e) {
      res.status(400).json({ error: e.message || "Erreur" });
    }
  };
}

// Catégories pour le choix à la création (globales + privées si connecté)
app.get("/api/categories", async (req, res) => {
  try {
    res.json(await getGameCategories(userIdFromReq(req)));
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});

// Un seul mot de passe protège tout le back-office → force brute à border.
app.post(
  "/api/admin/login",
  rateLimit({ windowMs: 15 * 60_000, max: 10, name: "admin-login" }),
  (req, res) => {
    if (typeof req.body?.password === "string" && timingSafeEqualStr(req.body.password, ADMIN_PASSWORD)) {
      return res.json({ ok: true });
    }
    res.status(401).json({ error: "Mot de passe incorrect" });
  }
);

const admin = express.Router();
admin.use(adminAuth);
admin.get("/data", handle(() => getData()));
admin.post("/categories", handle((req) => addCategory(req.body || {})));
admin.put("/categories/:id", handle((req) => updateCategory(req.params.id, req.body || {})));
admin.delete("/categories/:id", handle((req) => deleteCategory(req.params.id, req.body?.reassignTo)));
admin.post("/questions", handle((req) => addQuestion(req.body || {})));
admin.post("/questions/bulk", handle((req) => addQuestionsBulk(req.body?.texts || [], req.body?.categoryId)));
admin.put("/questions/:id", handle((req) => updateQuestion(req.params.id, req.body || {})));
admin.delete("/questions/:id", handle((req) => deleteQuestion(req.params.id)));
app.use("/api/admin", admin);

// ─── Monétisation : offres, paiement, droits VIP ───
mountBilling(app, { requireUser, adminAuth });

// Configuration publique consommée par le client au démarrage : régie
// publicitaire, cadence des entractes, offres. Aucun secret.
app.get("/api/config", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({
    ads: publicAds(),
    billing: publicBilling(),
    // Le lien vers la politique de confidentialité n'apparaît dans le bandeau
    // de consentement que si la page existe — pas de lien mort en attendant.
    legal: { privacyUrl: process.env.PRIVACY_URL || null },
  });
});

// Static client build
const clientDist = path.resolve(__dirname, "../client/dist");

// Les assets Vite portent un hash dans leur nom → cache immuable d'un an.
// index.html ne doit jamais être caché, sinon les clients gardent un vieux
// bundle après déploiement.
app.use(
  "/assets",
  express.static(path.join(clientDist, "assets"), {
    maxAge: "1y",
    immutable: true,
    fallthrough: false,
  })
);
app.use(express.static(clientDist, { index: false, maxAge: "1h" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));
// Sonde plus profonde (base incluse) : à utiliser pour le monitoring, pas
// comme healthcheck de déploiement (un hoquet Postgres ne doit pas tuer l'app).
app.get("/readyz", async (_req, res) => {
  try {
    await q("SELECT 1");
    res.json({ ok: true, db: true, lobbies: lobbies.size });
  } catch (e) {
    res.status(503).json({ ok: false, db: false, error: e.message });
  }
});

app.get(/^\/(?!socket\.io|api|healthz|readyz).*/, (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(clientDist, "index.html"));
});

// ─── Game state (in-memory) ───
const lobbies = new Map(); // code -> Lobby
const playerLobby = new Map(); // socketId -> code
const socketPid = new Map(); // socketId -> pid (identité stable du joueur)
const makeCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);
const makePid = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 14);
// jeton de reprise de session : privé au joueur, jamais diffusé aux autres
const makeSecret = customAlphabet("abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789", 32);

const GRACE_MS = 45000; // délai avant de virer un joueur déconnecté
const MAX_LOBBIES = Number(process.env.MAX_LOBBIES) || 5000; // garde-fou mémoire

function bindSocket(socketId, code, pid) {
  playerLobby.set(socketId, code);
  socketPid.set(socketId, pid);
}

function ctx(socket) {
  const code = playerLobby.get(socket.id);
  const lobby = code ? lobbies.get(code) : null;
  const pid = socketPid.get(socket.id);
  const player = lobby && pid ? lobby.players.find((p) => p.id === pid) : null;
  return { code, lobby, pid, player };
}

function connectedCount(lobby) {
  return lobby.players.filter((p) => p.connected).length;
}

function clearDisconnectTimer(lobby, pid) {
  const t = lobby.disconnectTimers.get(pid);
  if (t) {
    clearTimeout(t);
    lobby.disconnectTimers.delete(pid);
  }
}

function scheduleDisconnect(lobby, pid) {
  clearDisconnectTimer(lobby, pid);
  lobby.disconnectTimers.set(
    pid,
    setTimeout(() => {
      lobby.disconnectTimers.delete(pid);
      removePlayer(lobby, pid);
    }, GRACE_MS)
  );
}

function createLobby(hostSocketId, hostPseudo, settings, hostUserId, hostIsVip = false) {
  let code;
  do {
    code = makeCode();
  } while (lobbies.has(code));

  const hostPid = makePid();
  const lobby = {
    code,
    hostId: hostPid,
    hostUserId: hostUserId || null,
    // Publicité décidée par le statut de l'HÔTE : il paie pour toute la table.
    // Rafraîchi au lancement de la partie (l'hôte peut passer VIP entre-temps).
    adsEnabled: !hostIsVip,
    state: "waiting", // waiting | countdown | question | reveal | ad | ended
    settings: {
      anonymous: !!settings?.anonymous,
      voteDuration: clamp(settings?.voteDuration ?? 10, 3, 30),
      revealDuration: 9,
      questionCount: clamp(settings?.questionCount ?? 8, 3, 20),
      allowSelfVote: settings?.allowSelfVote !== false, // défaut: autorisé
      categories: sanitizeCategories(settings?.categories), // [] = toutes
    },
    players: [
      {
        id: hostPid,
        secret: makeSecret(),
        socketId: hostSocketId,
        userId: hostUserId || null,
        pseudo: sanitizePseudo(hostPseudo),
        isHost: true,
        score: 0,
        connected: true,
        avatar: "",
      },
    ],
    questions: [],
    currentRound: 0,
    currentQuestion: null,
    roundStartTime: null,
    roundEndTime: null,
    revealEndTime: null,
    countdownEndTime: null,
    adEndTime: null,
    adStartTime: null,
    votes: {}, // voterPid -> targetPid (current round)
    history: [], // [{question, votes:{voterPid:targetPid}, ranked:[{id,pseudo,count}]}]
    roundTimer: null,
    paused: false,
    pauseRemaining: 0,
    disconnectTimers: new Map(), // pid -> timeout
    lastReveal: null,
    lastFinal: null,
  };
  lobbies.set(code, lobby);
  bindSocket(hostSocketId, code, hostPid);
  return lobby;
}

function clamp(v, min, max) {
  v = Number(v);
  if (!Number.isFinite(v)) v = min;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function sanitizePseudo(p) {
  let s = String(p ?? "").trim().slice(0, 20);
  if (!s) s = "Anonyme";
  return s;
}

function sanitizeAvatar(a) {
  // garde au plus 4 "caractères" (un emoji peut être multi-codepoint)
  return Array.from(String(a ?? "")).slice(0, 4).join("");
}

function sanitizeCategories(c) {
  // [] = toutes les catégories
  return Array.isArray(c) ? c.filter((x) => typeof x === "string").slice(0, 50) : [];
}

function publicLobby(lobby) {
  return {
    code: lobby.code,
    hostId: lobby.hostId,
    state: lobby.state,
    settings: lobby.settings,
    players: lobby.players.map((p) => ({
      id: p.id,
      pseudo: p.pseudo,
      isHost: p.isHost,
      score: p.score,
      connected: p.connected,
      avatar: p.avatar || "",
    })),
    currentRound: lobby.currentRound,
    totalRounds: lobby.questions.length || lobby.settings.questionCount,
    currentQuestion: lobby.currentQuestion,
    roundEndTime: lobby.roundEndTime,
    revealEndTime: lobby.revealEndTime,
    countdownEndTime: lobby.countdownEndTime,
    votesCount: Object.keys(lobby.votes).length,
    paused: lobby.paused,
    // Publicité : l'écran d'entracte se cale sur adEndTime, et `ads` dit au
    // client s'il doit afficher quoi que ce soit (faux = hôte VIP).
    ads: lobby.adsEnabled,
    adEndTime: lobby.adEndTime,
    adSkipAt: lobby.adEndTime ? lobby.adStartTime + AD_POLICY.skipAfter * 1000 : null,
  };
}

function broadcast(lobby) {
  io.to(lobby.code).emit("lobby:update", publicLobby(lobby));
}

function clearRoundTimer(lobby) {
  if (lobby.roundTimer) {
    clearTimeout(lobby.roundTimer);
    lobby.roundTimer = null;
  }
}

// remet la partie à zéro (scores, manches, timers) — game:start et game:tolobby
function resetGameState(lobby) {
  clearRoundTimer(lobby);
  lobby.paused = false;
  lobby.pauseRemaining = 0;
  lobby.currentRound = 0;
  lobby.currentQuestion = null;
  lobby.votes = {};
  lobby.roundStartTime = null;
  lobby.roundEndTime = null;
  lobby.revealEndTime = null;
  lobby.countdownEndTime = null;
  lobby.adEndTime = null;
  lobby.adStartTime = null;
  lobby.history = [];
  lobby.lastReveal = null;
  lobby.lastFinal = null;
  for (const p of lobby.players) p.score = 0;
}

// décompte 3-2-1 avant la 1ère manche (timing équitable)
function startCountdown(lobby) {
  lobby.state = "countdown";
  lobby.countdownEndTime = Date.now() + 3000;
  broadcast(lobby);
  lobby.roundTimer = setTimeout(() => startRound(lobby), 3100);
}

function startRound(lobby) {
  clearRoundTimer(lobby);
  lobby.paused = false;
  lobby.state = "question";
  lobby.currentRound += 1;
  const idx = lobby.currentRound - 1;
  lobby.currentQuestion = lobby.questions[idx] || null;
  lobby.votes = {};
  const now = Date.now();
  lobby.roundStartTime = now;
  lobby.roundEndTime = now + lobby.settings.voteDuration * 1000;
  lobby.revealEndTime = null;
  lobby.countdownEndTime = null;
  broadcast(lobby);
  lobby.roundTimer = setTimeout(() => endRound(lobby), lobby.settings.voteDuration * 1000);
}

function endRound(lobby) {
  clearRoundTimer(lobby);
  lobby.state = "reveal";

  // tally
  const tally = new Map();
  for (const p of lobby.players) tally.set(p.id, 0);
  for (const targetId of Object.values(lobby.votes)) {
    if (tally.has(targetId)) tally.set(targetId, tally.get(targetId) + 1);
  }
  const ranked = lobby.players
    .map((p) => ({ id: p.id, pseudo: p.pseudo, count: tally.get(p.id) || 0 }))
    .sort((a, b) => b.count - a.count);

  // score = total des voix reçues sur la partie (stat "le plus cité")
  for (const r of ranked) {
    if (r.count > 0) {
      const player = lobby.players.find((p) => p.id === r.id);
      if (player) player.score += r.count;
    }
  }

  lobby.history.push({
    question: lobby.currentQuestion,
    votes: lobby.settings.anonymous ? null : { ...lobby.votes },
    ranked,
  });

  const now = Date.now();
  lobby.revealEndTime = now + lobby.settings.revealDuration * 1000;

  const revealPayload = {
    question: lobby.currentQuestion,
    ranked,
    votes: lobby.settings.anonymous ? null : { ...lobby.votes },
    anonymous: lobby.settings.anonymous,
    revealEndTime: lobby.revealEndTime,
    round: lobby.currentRound,
    totalRounds: lobby.questions.length,
  };
  lobby.lastReveal = revealPayload;
  io.to(lobby.code).emit("game:reveal", revealPayload);
  broadcast(lobby);

  lobby.roundTimer = setTimeout(() => afterReveal(lobby), lobby.settings.revealDuration * 1000);
}

// ─── Enchaînement après la révélation : entracte publicitaire ou manche suivante ───
function isLastRound(lobby) {
  return lobby.currentRound >= lobby.questions.length;
}

function shouldShowAd(lobby) {
  if (!lobby.adsEnabled) return false; // hôte VIP → jamais de pub
  // Un entracte juste avant les résultats : c'est le moment où l'attention
  // est la plus forte de toute la partie.
  if (isLastRound(lobby)) return true;
  return lobby.currentRound % AD_POLICY.everyRounds === 0;
}

function afterReveal(lobby) {
  if (shouldShowAd(lobby)) return startAdBreak(lobby);
  isLastRound(lobby) ? endGame(lobby) : startRound(lobby);
}

function startAdBreak(lobby) {
  clearRoundTimer(lobby);
  lobby.state = "ad";
  lobby.paused = false;
  const now = Date.now();
  lobby.adStartTime = now;
  lobby.adEndTime = now + AD_POLICY.seconds * 1000;
  broadcast(lobby);
  lobby.roundTimer = setTimeout(() => endAdBreak(lobby), AD_POLICY.seconds * 1000);
}

function endAdBreak(lobby) {
  if (lobby.state !== "ad") return;
  clearRoundTimer(lobby);
  lobby.adEndTime = null;
  lobby.adStartTime = null;
  isLastRound(lobby) ? endGame(lobby) : startRound(lobby);
}

function endGame(lobby) {
  clearRoundTimer(lobby);
  lobby.state = "ended";
  lobby.currentQuestion = null;
  const finalRanking = [...lobby.players]
    .map((p) => ({ id: p.id, pseudo: p.pseudo, score: p.score }))
    .sort((a, b) => b.score - a.score);

  lobby.lastFinal = { finalRanking, history: lobby.history };
  io.to(lobby.code).emit("game:end", lobby.lastFinal);
  broadcast(lobby);
}

function removePlayer(lobby, pid) {
  const wasHost = lobby.hostId === pid;
  clearDisconnectTimer(lobby, pid);
  lobby.players = lobby.players.filter((p) => p.id !== pid);
  delete lobby.votes[pid];

  if (lobby.players.length === 0) {
    clearRoundTimer(lobby);
    for (const t of lobby.disconnectTimers.values()) clearTimeout(t);
    lobby.disconnectTimers.clear();
    lobbies.delete(lobby.code);
    return;
  }
  if (wasHost) {
    const newHost = lobby.players.find((p) => p.connected) || lobby.players[0];
    lobby.hostId = newHost.id;
    newHost.isHost = true;
  }
  // partie en cours et plus assez de joueurs → fin
  if (lobby.state !== "waiting" && lobby.state !== "ended" && lobby.players.length < 2) {
    endGame(lobby);
    return;
  }
  // si tous les joueurs connectés ont voté, on conclut la manche
  if (lobby.state === "question") {
    const activeIds = new Set(lobby.players.map((p) => p.id));
    for (const k of Object.keys(lobby.votes)) {
      if (!activeIds.has(k)) delete lobby.votes[k];
    }
    if (Object.keys(lobby.votes).length >= connectedCount(lobby) && connectedCount(lobby) > 0) {
      endRound(lobby);
      return;
    }
  }
  broadcast(lobby);
}

// ─── Socket handlers ───
io.on("connection", (socket) => {
  // identité du compte (si connecté) : token (app mobile) ou cookie de session
  socket.data.userId =
    userIdFromToken(socket.handshake.auth?.token) ||
    userIdFromCookieHeader(socket.handshake.headers.cookie);

  const ip = socket.handshake.headers["x-forwarded-for"]?.split(",")[0].trim() || socket.handshake.address;
  socket.data.created = 0; // nombre de lobbies créés par cette socket

  // Enveloppe chaque handler : un payload malformé (null, tableau, chaîne…)
  // ne doit jamais faire tomber le process — l'état des parties est en
  // mémoire, donc un crash efface toutes les parties en cours.
  function on(event, handler) {
    socket.on(event, (payload, ack) => {
      const cb = typeof ack === "function" ? ack : typeof payload === "function" ? payload : null;
      const data = payload && typeof payload === "object" ? payload : {};
      try {
        const r = handler(data, cb);
        if (r && typeof r.catch === "function") {
          r.catch((e) => console.error(`[socket] ${event} (async) :`, e));
        }
      } catch (e) {
        console.error(`[socket] ${event} :`, e);
        if (cb) {
          try {
            cb({ ok: false, error: "Erreur serveur" });
          } catch {}
        }
      }
    });
  }

  on("lobby:create", async ({ pseudo, settings }, cb) => {
    // Chaque lobby occupe de la mémoire durablement. Trois garde-fous, du plus
    // ciblé au plus large — le plafond par IP reste large car des joueurs
    // légitimes partagent une IP (4G/CGNAT, wifi d'entreprise).
    if (++socket.data.created > 5) {
      return cb?.({ ok: false, error: "Trop de parties créées depuis cet appareil." });
    }
    if (!hit(`lobby-create:${ip}`, 10 * 60_000, 100).ok) {
      return cb?.({ ok: false, error: "Trop de parties créées, réessaie dans quelques minutes." });
    }
    if (lobbies.size >= MAX_LOBBIES) {
      return cb?.({ ok: false, error: "Serveur saturé, réessaie dans un instant." });
    }
    try {
      const hostIsVip = await isVip(socket.data.userId);
      const lobby = createLobby(socket.id, pseudo, settings, socket.data.userId, hostIsVip);
      socket.join(lobby.code);
      cb?.({
        ok: true,
        code: lobby.code,
        lobby: publicLobby(lobby),
        selfId: lobby.hostId,
        secret: lobby.players[0].secret,
      });
    } catch (e) {
      cb?.({ ok: false, error: e.message || "Erreur création" });
    }
  });

  on("lobby:join", ({ code, pseudo }, cb) => {
    const c = String(code || "").toUpperCase().trim();
    const lobby = lobbies.get(c);
    if (!lobby) return cb?.({ ok: false, error: "Lobby introuvable" });
    if (lobby.state !== "waiting") return cb?.({ ok: false, error: "Partie déjà en cours" });
    if (lobby.players.length >= 12) return cb?.({ ok: false, error: "Lobby plein" });
    const pid = makePid();
    const p = {
      id: pid,
      secret: makeSecret(),
      socketId: socket.id,
      userId: socket.data.userId || null,
      pseudo: sanitizePseudo(pseudo),
      isHost: false,
      score: 0,
      connected: true,
      avatar: "",
    };
    lobby.players.push(p);
    bindSocket(socket.id, lobby.code, pid);
    socket.join(lobby.code);
    cb?.({ ok: true, code: lobby.code, lobby: publicLobby(lobby), selfId: pid, secret: p.secret });
    broadcast(lobby);
  });

  // Reprise après refresh / coupure réseau.
  // `pid` est diffusé à toute la table (publicLobby.players[].id) : il ne peut
  // donc pas servir de preuve d'identité. Le `secret`, lui, n'est connu que du
  // joueur — sans lui, n'importe qui pourrait reprendre la session de l'hôte.
  on("lobby:rejoin", ({ code, pid, secret }, cb) => {
    const c = String(code || "").toUpperCase().trim();
    const lobby = lobbies.get(c);
    if (!lobby) return cb?.({ ok: false });
    const player = lobby.players.find((p) => p.id === pid);
    if (!player) return cb?.({ ok: false });
    if (typeof secret !== "string" || !timingSafeEqualStr(secret, player.secret)) {
      return cb?.({ ok: false, error: "Session invalide" });
    }
    player.socketId = socket.id;
    player.connected = true;
    bindSocket(socket.id, c, pid);
    socket.join(c);
    clearDisconnectTimer(lobby, pid);
    cb?.({
      ok: true,
      code: c,
      lobby: publicLobby(lobby),
      selfId: pid,
      secret: player.secret,
      reveal: lobby.state === "reveal" ? lobby.lastReveal : null,
      final: lobby.state === "ended" ? lobby.lastFinal : null,
    });
    broadcast(lobby);
  });

  on("lobby:settings", ({ settings }) => {
    const { lobby, pid } = ctx(socket);
    if (!lobby || lobby.hostId !== pid || lobby.state !== "waiting") return;
    const s = settings || {};
    lobby.settings = {
      ...lobby.settings,
      ...(s.anonymous !== undefined ? { anonymous: !!s.anonymous } : {}),
      ...(s.voteDuration !== undefined ? { voteDuration: clamp(s.voteDuration, 3, 30) } : {}),
      ...(s.questionCount !== undefined ? { questionCount: clamp(s.questionCount, 3, 20) } : {}),
      ...(s.allowSelfVote !== undefined ? { allowSelfVote: !!s.allowSelfVote } : {}),
      ...(s.categories !== undefined ? { categories: sanitizeCategories(s.categories) } : {}),
    };
    broadcast(lobby);
  });

  on("lobby:avatar", ({ avatar }) => {
    const { lobby, player } = ctx(socket);
    if (!lobby || !player) return;
    player.avatar = sanitizeAvatar(avatar);
    broadcast(lobby);
  });

  on("game:start", async () => {
    const { lobby, pid } = ctx(socket);
    if (!lobby || lobby.hostId !== pid) return;
    if (lobby.state !== "waiting" && lobby.state !== "ended") return;
    if (lobby.players.length < 3) {
      io.to(socket.id).emit("error:msg", { message: "Il faut au moins 3 joueurs" });
      return;
    }
    const host = lobby.players.find((p) => p.id === pid);
    const ownerId = host?.userId || null; // inclut les questions privées de l'hôte
    try {
      if ((await enabledCount(lobby.settings.categories, ownerId)) < 1) {
        io.to(socket.id).emit("error:msg", { message: "Aucune question dans les catégories choisies" });
        return;
      }
      const questions = await pickQuestions(lobby.settings.questionCount, lobby.settings.categories, ownerId);
      // garde-fou si l'état a changé pendant l'await
      if (lobby.state !== "waiting" && lobby.state !== "ended") return;
      // L'hôte a pu passer VIP depuis le lobby (achat pendant l'attente) :
      // on réévalue avant de lancer, sinon il paie et voit quand même les pubs.
      lobby.adsEnabled = !(await isVip(ownerId));
      resetGameState(lobby);
      lobby.questions = questions;
      startCountdown(lobby);
    } catch (e) {
      io.to(socket.id).emit("error:msg", { message: "Erreur de chargement des questions" });
    }
  });

  on("game:vote", ({ targetId }) => {
    const { lobby, pid } = ctx(socket);
    if (!lobby || !pid || lobby.state !== "question") return;
    if (!lobby.players.find((p) => p.id === targetId)) return;
    if (!lobby.settings.allowSelfVote && targetId === pid) return;
    lobby.votes[pid] = targetId;
    broadcast(lobby);
    if (!lobby.paused && Object.keys(lobby.votes).length >= connectedCount(lobby)) {
      endRound(lobby);
    }
  });

  on("game:pause", () => {
    const { lobby, pid } = ctx(socket);
    if (!lobby || lobby.hostId !== pid || lobby.paused) return;
    if (lobby.state !== "question" && lobby.state !== "reveal") return;
    const now = Date.now();
    const endTime = lobby.state === "question" ? lobby.roundEndTime : lobby.revealEndTime;
    lobby.pauseRemaining = Math.max(500, (endTime || now) - now);
    clearRoundTimer(lobby);
    lobby.paused = true;
    broadcast(lobby);
  });

  on("game:resume", () => {
    const { lobby, pid } = ctx(socket);
    if (!lobby || lobby.hostId !== pid || !lobby.paused) return;
    const remaining = lobby.pauseRemaining || 1000;
    const now = Date.now();
    lobby.paused = false;
    if (lobby.state === "question") {
      lobby.roundEndTime = now + remaining;
      lobby.roundTimer = setTimeout(() => endRound(lobby), remaining);
    } else if (lobby.state === "reveal") {
      lobby.revealEndTime = now + remaining;
      lobby.roundTimer = setTimeout(() => afterReveal(lobby), remaining);
    }
    broadcast(lobby);
  });

  // Rejouer → retour au lobby (l'hôte peut changer les réglages)
  on("game:tolobby", () => {
    const { lobby, pid } = ctx(socket);
    if (!lobby || lobby.hostId !== pid) return;
    if (lobby.state !== "ended") return;
    resetGameState(lobby);
    lobby.state = "waiting";
    broadcast(lobby);
  });

  on("game:next", () => {
    const { lobby, pid } = ctx(socket);
    if (!lobby || lobby.hostId !== pid) return;
    if (lobby.state !== "reveal") return;
    clearRoundTimer(lobby);
    afterReveal(lobby);
  });

  // L'hôte peut abréger l'entracte, mais pas immédiatement : la durée
  // minimale est décidée par le serveur, pas par le client.
  on("game:adskip", () => {
    const { lobby, pid } = ctx(socket);
    if (!lobby || lobby.hostId !== pid || lobby.state !== "ad") return;
    if (Date.now() < (lobby.adStartTime || 0) + AD_POLICY.skipAfter * 1000) return;
    endAdBreak(lobby);
  });

  on("lobby:leave", () => {
    const { code, lobby, pid } = ctx(socket);
    playerLobby.delete(socket.id);
    socketPid.delete(socket.id);
    if (code) socket.leave(code);
    if (lobby && pid) removePlayer(lobby, pid); // départ explicite = immédiat
  });

  socket.on("disconnect", () => {
    const { lobby, pid, player } = ctx(socket);
    playerLobby.delete(socket.id);
    socketPid.delete(socket.id);
    if (!lobby || !pid || !player) return;
    // ignore si le joueur s'est déjà reconnecté sur un autre socket
    if (player.socketId !== socket.id) return;
    player.connected = false;
    broadcast(lobby);
    scheduleDisconnect(lobby, pid); // grâce avant retrait définitif
  });
});

// Les liens magiques jamais cliqués resteraient en base indéfiniment.
async function purgeTokens() {
  try {
    const n = await purgeExpiredTokens();
    if (n) console.log(`[db] ${n} lien(s) magique(s) expiré(s) purgé(s)`);
  } catch (e) {
    console.error("[db] purge des jetons :", e.message);
  }
}

const PORT = process.env.PORT || 3001;
initDb()
  .then(() => {
    purgeTokens();
    setInterval(purgeTokens, 6 * 3600_000).unref();
    httpServer.listen(PORT, () => {
      console.log(`[Qui ?] Server listening on :${PORT}`);
    });
  })
  .catch((e) => {
    console.error("[db] Échec d'initialisation :", e.message);
    process.exit(1);
  });
