import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { customAlphabet } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";
import { pickQuestions } from "./questions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// Static client build
const clientDist = path.resolve(__dirname, "../client/dist");
app.use(express.static(clientDist));
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get(/^\/(?!socket\.io).*/, (_req, res) => {
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
    },
    players: [
      {
        id: hostSocketId,
        pseudo: sanitizePseudo(hostPseudo),
        isHost: true,
        score: 0,
        connected: true,
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
    })),
    currentRound: lobby.currentRound,
    totalRounds: lobby.questions.length || lobby.settings.questionCount,
    currentQuestion: lobby.currentQuestion,
    roundEndTime: lobby.roundEndTime,
    revealEndTime: lobby.revealEndTime,
    votesCount: Object.keys(lobby.votes).length,
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

  // attribute points: winner(s) +3
  const top = ranked[0]?.count || 0;
  if (top > 0) {
    for (const r of ranked) {
      if (r.count === top) {
        const player = lobby.players.find((p) => p.id === r.id);
        if (player) player.score += 3;
      }
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
    lobby.settings = {
      ...lobby.settings,
      anonymous: !!settings?.anonymous,
      voteDuration: clamp(settings?.voteDuration ?? lobby.settings.voteDuration, 3, 30),
      questionCount: clamp(
        settings?.questionCount ?? lobby.settings.questionCount,
        3,
        20
      ),
    };
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
    lobby.votes[socket.id] = targetId;
    broadcast(lobby);
    if (Object.keys(lobby.votes).length >= lobby.players.length) {
      endRound(lobby);
    }
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
