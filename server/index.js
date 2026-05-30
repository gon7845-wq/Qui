import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { customAlphabet } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";
import {
  pickQuestions,
  enabledCount,
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
  return (req, res) => {
    try {
      const result = fn(req);
      res.json(result ?? { ok: true });
    } catch (e) {
      res.status(400).json({ error: e.message || "Erreur" });
    }
  };
}

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
const makeCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);

function createLobby(hostSocketId, hostPseudo, settings) {
  let code;
  do {
    code = makeCode();
  } while (lobbies.has(code));

  const lobby = {
    code,
    hostId: hostSocketId,
    state: "waiting", // waiting | question | reveal | ended
    settings: {
      anonymous: !!settings?.anonymous,
      voteDuration: clamp(settings?.voteDuration ?? 10, 3, 30),
      revealDuration: 9,
      questionCount: clamp(settings?.questionCount ?? 8, 3, 20),
      allowSelfVote: settings?.allowSelfVote !== false, // défaut: autorisé
    },
    players: [
      {
        id: hostSocketId,
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
    votes: {}, // voterId -> targetId (current round)
    history: [], // [{question, votes:{voterId:targetId}, ranked:[{id,pseudo,count}]}]
    roundTimer: null,
    paused: false,
    pauseRemaining: 0,
  };
  lobbies.set(code, lobby);
  playerLobby.set(hostSocketId, code);
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

  io.to(lobby.code).emit("game:reveal", {
    question: lobby.currentQuestion,
    ranked,
    votes: lobby.settings.anonymous ? null : lobby.votes,
    anonymous: lobby.settings.anonymous,
    revealEndTime: lobby.revealEndTime,
    round: lobby.currentRound,
    totalRounds: lobby.questions.length,
  });
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

  io.to(lobby.code).emit("game:end", {
    finalRanking,
    history: lobby.history,
  });
  broadcast(lobby);
}

function removePlayer(lobby, socketId) {
  const wasHost = lobby.hostId === socketId;
  lobby.players = lobby.players.filter((p) => p.id !== socketId);
  delete lobby.votes[socketId];

  if (lobby.players.length === 0) {
    clearRoundTimer(lobby);
    lobbies.delete(lobby.code);
    return;
  }
  if (wasHost) {
    lobby.hostId = lobby.players[0].id;
    lobby.players[0].isHost = true;
  }
  // if mid-game and not enough players, end
  if (lobby.state !== "waiting" && lobby.state !== "ended" && lobby.players.length < 2) {
    endGame(lobby);
    return;
  }
  // if everyone left has voted, end round early
  if (lobby.state === "question") {
    const activeIds = new Set(lobby.players.map((p) => p.id));
    for (const k of Object.keys(lobby.votes)) {
      if (!activeIds.has(k)) delete lobby.votes[k];
    }
    if (Object.keys(lobby.votes).length >= lobby.players.length) {
      endRound(lobby);
      return;
    }
  }
  broadcast(lobby);
}

// ─── Socket handlers ───
io.on("connection", (socket) => {
  socket.on("lobby:create", ({ pseudo, settings }, cb) => {
    try {
      const lobby = createLobby(socket.id, pseudo, settings);
      socket.join(lobby.code);
      cb?.({ ok: true, code: lobby.code, lobby: publicLobby(lobby), selfId: socket.id });
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
    const p = {
      id: socket.id,
      pseudo: sanitizePseudo(pseudo),
      isHost: false,
      score: 0,
      connected: true,
      avatar: "",
    };
    lobby.players.push(p);
    playerLobby.set(socket.id, lobby.code);
    socket.join(lobby.code);
    cb?.({ ok: true, code: lobby.code, lobby: publicLobby(lobby), selfId: socket.id });
    broadcast(lobby);
  });

  socket.on("lobby:settings", ({ settings }) => {
    const code = playerLobby.get(socket.id);
    const lobby = code && lobbies.get(code);
    if (!lobby || lobby.hostId !== socket.id || lobby.state !== "waiting") return;
    const s = settings || {};
    lobby.settings = {
      ...lobby.settings,
      ...(s.anonymous !== undefined ? { anonymous: !!s.anonymous } : {}),
      ...(s.voteDuration !== undefined ? { voteDuration: clamp(s.voteDuration, 3, 30) } : {}),
      ...(s.questionCount !== undefined ? { questionCount: clamp(s.questionCount, 3, 20) } : {}),
      ...(s.allowSelfVote !== undefined ? { allowSelfVote: !!s.allowSelfVote } : {}),
    };
    broadcast(lobby);
  });

  socket.on("lobby:avatar", ({ avatar }) => {
    const code = playerLobby.get(socket.id);
    const lobby = code && lobbies.get(code);
    if (!lobby) return;
    const p = lobby.players.find((x) => x.id === socket.id);
    if (!p) return;
    p.avatar = sanitizeAvatar(avatar);
    broadcast(lobby);
  });

  socket.on("game:start", () => {
    const code = playerLobby.get(socket.id);
    const lobby = code && lobbies.get(code);
    if (!lobby || lobby.hostId !== socket.id) return;
    if (lobby.state !== "waiting" && lobby.state !== "ended") return;
    if (lobby.players.length < 3) {
      io.to(socket.id).emit("error:msg", { message: "Il faut au moins 3 joueurs" });
      return;
    }
    if (enabledCount() < 1) {
      io.to(socket.id).emit("error:msg", { message: "Aucune question active (voir l'admin)" });
      return;
    }
    // reset scores if restart
    for (const p of lobby.players) p.score = 0;
    lobby.history = [];
    lobby.currentRound = 0;
    lobby.questions = pickQuestions(lobby.settings.questionCount);
    startRound(lobby);
  });

  socket.on("game:vote", ({ targetId }) => {
    const code = playerLobby.get(socket.id);
    const lobby = code && lobbies.get(code);
    if (!lobby || lobby.state !== "question") return;
    if (!lobby.players.find((p) => p.id === targetId)) return;
    if (!lobby.settings.allowSelfVote && targetId === socket.id) return;
    lobby.votes[socket.id] = targetId;
    broadcast(lobby);
    if (!lobby.paused && Object.keys(lobby.votes).length >= lobby.players.length) {
      endRound(lobby);
    }
  });

  socket.on("game:pause", () => {
    const code = playerLobby.get(socket.id);
    const lobby = code && lobbies.get(code);
    if (!lobby || lobby.hostId !== socket.id || lobby.paused) return;
    if (lobby.state !== "question" && lobby.state !== "reveal") return;
    const now = Date.now();
    const endTime = lobby.state === "question" ? lobby.roundEndTime : lobby.revealEndTime;
    lobby.pauseRemaining = Math.max(500, (endTime || now) - now);
    clearRoundTimer(lobby);
    lobby.paused = true;
    broadcast(lobby);
  });

  socket.on("game:resume", () => {
    const code = playerLobby.get(socket.id);
    const lobby = code && lobbies.get(code);
    if (!lobby || lobby.hostId !== socket.id || !lobby.paused) return;
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

  socket.on("game:next", () => {
    const code = playerLobby.get(socket.id);
    const lobby = code && lobbies.get(code);
    if (!lobby || lobby.hostId !== socket.id) return;
    if (lobby.state !== "reveal") return;
    clearRoundTimer(lobby);
    if (lobby.currentRound >= lobby.questions.length) {
      endGame(lobby);
    } else {
      startRound(lobby);
    }
  });

  socket.on("lobby:leave", () => {
    const code = playerLobby.get(socket.id);
    playerLobby.delete(socket.id);
    if (!code) return;
    const lobby = lobbies.get(code);
    socket.leave(code);
    if (lobby) removePlayer(lobby, socket.id);
  });

  socket.on("disconnect", () => {
    const code = playerLobby.get(socket.id);
    playerLobby.delete(socket.id);
    if (!code) return;
    const lobby = lobbies.get(code);
    if (lobby) removePlayer(lobby, socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[Qui ?] Server listening on :${PORT}`);
});
