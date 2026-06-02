import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { customAlphabet } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { initDb } from "./db.js";
import { mountAuth, requireUser, userIdFromReq, userIdFromCookieHeader } from "./auth.js";
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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

app.use(express.json({ limit: "512kb" }));
app.use(cookieParser());

// ─── Authentification (Google + lien magique) ───
mountAuth(app);

// ─── Espace membre : contenu privé (owner = utilisateur connecté) ───
const me = express.Router();
me.use(requireUser);
me.get("/data", handle((req) => getData(req.uid)));
me.post("/categories", handle((req) => addCategory(req.body || {}, req.uid)));
me.put("/categories/:id", handle((req) => updateCategory(req.params.id, req.body || {}, req.uid)));
me.delete("/categories/:id", handle((req) => deleteCategory(req.params.id, req.body?.reassignTo, req.uid)));
me.post("/questions", handle((req) => addQuestion(req.body || {}, req.uid)));
me.post("/questions/bulk", handle((req) => addQuestionsBulk(req.body?.texts || [], req.body?.categoryId, req.uid)));
me.put("/questions/:id", handle((req) => updateQuestion(req.params.id, req.body || {}, req.uid)));
me.delete("/questions/:id", handle((req) => deleteQuestion(req.params.id, req.uid)));
app.use("/api/me", me);

// ─── Admin API ───
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "qui-admin-2026";
if (!process.env.ADMIN_PASSWORD) {
  console.warn("[Qui ?] ADMIN_PASSWORD non défini — mot de passe par défaut 'qui-admin-2026'. À changer en prod !");
}

function adminAuth(req, res, next) {
  if (req.headers["x-admin-key"] !== ADMIN_PASSWORD) {
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

app.post("/api/admin/login", (req, res) => {
  if (req.body?.password === ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ error: "Mot de passe incorrect" });
});

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

// Static client build
const clientDist = path.resolve(__dirname, "../client/dist");
app.use(express.static(clientDist));
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get(/^\/(?!socket\.io|api|healthz).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// ─── Game state (in-memory) ───
const lobbies = new Map(); // code -> Lobby
const playerLobby = new Map(); // socketId -> code
const socketPid = new Map(); // socketId -> pid (identité stable du joueur)
const makeCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);
const makePid = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 14);

const GRACE_MS = 45000; // délai avant de virer un joueur déconnecté

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

function createLobby(hostSocketId, hostPseudo, settings, hostUserId) {
  let code;
  do {
    code = makeCode();
  } while (lobbies.has(code));

  const hostPid = makePid();
  const lobby = {
    code,
    hostId: hostPid,
    hostUserId: hostUserId || null,
    state: "waiting", // waiting | question | reveal | ended
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
    countdownEndTime: lobby.countdownEndTime || null,
    votesCount: Object.keys(lobby.votes).length,
    paused: lobby.paused,
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

  lobby.roundTimer = setTimeout(() => {
    if (lobby.currentRound >= lobby.questions.length) {
      endGame(lobby);
    } else {
      startRound(lobby);
    }
  }, lobby.settings.revealDuration * 1000);
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
  // identité du compte (si connecté) via le cookie de session du handshake
  socket.data.userId = userIdFromCookieHeader(socket.handshake.headers.cookie);

  socket.on("lobby:create", ({ pseudo, settings }, cb) => {
    try {
      const lobby = createLobby(socket.id, pseudo, settings, socket.data.userId);
      socket.join(lobby.code);
      cb?.({ ok: true, code: lobby.code, lobby: publicLobby(lobby), selfId: lobby.hostId });
    } catch (e) {
      cb?.({ ok: false, error: e.message || "Erreur création" });
    }
  });

  socket.on("lobby:join", ({ code, pseudo }, cb) => {
    const c = String(code || "").toUpperCase().trim();
    const lobby = lobbies.get(c);
    if (!lobby) return cb?.({ ok: false, error: "Lobby introuvable" });
    if (lobby.state !== "waiting") return cb?.({ ok: false, error: "Partie déjà en cours" });
    if (lobby.players.length >= 12) return cb?.({ ok: false, error: "Lobby plein" });
    const pid = makePid();
    const p = {
      id: pid,
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
    cb?.({ ok: true, code: lobby.code, lobby: publicLobby(lobby), selfId: pid });
    broadcast(lobby);
  });

  // Reprise après refresh / coupure réseau
  socket.on("lobby:rejoin", ({ code, pid }, cb) => {
    const c = String(code || "").toUpperCase().trim();
    const lobby = lobbies.get(c);
    if (!lobby) return cb?.({ ok: false });
    const player = lobby.players.find((p) => p.id === pid);
    if (!player) return cb?.({ ok: false });
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
      reveal: lobby.state === "reveal" ? lobby.lastReveal : null,
      final: lobby.state === "ended" ? lobby.lastFinal : null,
    });
    broadcast(lobby);
  });

  socket.on("lobby:settings", ({ settings }) => {
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

  socket.on("lobby:avatar", ({ avatar }) => {
    const { lobby, player } = ctx(socket);
    if (!lobby || !player) return;
    player.avatar = sanitizeAvatar(avatar);
    broadcast(lobby);
  });

  socket.on("game:start", async () => {
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
      for (const p of lobby.players) p.score = 0;
      lobby.history = [];
      lobby.currentRound = 0;
      lobby.questions = questions;
      lobby.lastReveal = null;
      lobby.lastFinal = null;
      // décompte 3-2-1 avant la 1ère manche (timing équitable)
      clearRoundTimer(lobby);
      lobby.paused = false;
      lobby.state = "countdown";
      lobby.countdownEndTime = Date.now() + 3000;
      broadcast(lobby);
      lobby.roundTimer = setTimeout(() => startRound(lobby), 3100);
    } catch (e) {
      io.to(socket.id).emit("error:msg", { message: "Erreur de chargement des questions" });
    }
  });

  socket.on("game:vote", ({ targetId }) => {
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

  socket.on("game:pause", () => {
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

  socket.on("game:resume", () => {
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
      lobby.roundTimer = setTimeout(() => {
        if (lobby.currentRound >= lobby.questions.length) endGame(lobby);
        else startRound(lobby);
      }, remaining);
    }
    broadcast(lobby);
  });

  // Rejouer → retour au lobby (l'hôte peut changer les réglages)
  socket.on("game:tolobby", () => {
    const { lobby, pid } = ctx(socket);
    if (!lobby || lobby.hostId !== pid) return;
    if (lobby.state !== "ended") return;
    clearRoundTimer(lobby);
    lobby.state = "waiting";
    lobby.paused = false;
    lobby.currentRound = 0;
    lobby.currentQuestion = null;
    lobby.votes = {};
    lobby.roundEndTime = null;
    lobby.revealEndTime = null;
    lobby.countdownEndTime = null;
    lobby.history = [];
    lobby.lastReveal = null;
    lobby.lastFinal = null;
    for (const p of lobby.players) p.score = 0;
    broadcast(lobby);
  });

  socket.on("game:next", () => {
    const { lobby, pid } = ctx(socket);
    if (!lobby || lobby.hostId !== pid) return;
    if (lobby.state !== "reveal") return;
    clearRoundTimer(lobby);
    if (lobby.currentRound >= lobby.questions.length) {
      endGame(lobby);
    } else {
      startRound(lobby);
    }
  });

  socket.on("lobby:leave", () => {
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

const PORT = process.env.PORT || 3001;
initDb()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`[Qui ?] Server listening on :${PORT}`);
    });
  })
  .catch((e) => {
    console.error("[db] Échec d'initialisation :", e.message);
    process.exit(1);
  });
