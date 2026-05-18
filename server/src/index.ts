import http from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerId,
  RoomCode,
} from "@qui/shared";
import { RoomManager, roomChannel } from "./roomManager.js";
import { sanitizePseudo } from "./pseudo.js";

const PORT = Number(process.env.PORT ?? 3001);
const ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const app = express();
app.use(cors({ origin: ORIGIN }));
app.get("/health", (_req, res) => res.json({ ok: true, t: Date.now() }));

const httpServer = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: ORIGIN, credentials: true },
  pingTimeout: 20_000,
});

const manager = new RoomManager(io);

interface SocketSession {
  roomCode: RoomCode | null;
  playerId: PlayerId | null;
}

io.on("connection", (socket) => {
  const session: SocketSession = { roomCode: null, playerId: null };

  const bindToRoom = (code: RoomCode, playerId: PlayerId) => {
    session.roomCode = code;
    session.playerId = playerId;
    socket.join(roomChannel(code));
  };

  socket.on("room:create", ({ pseudo }, ack) => {
    const clean = sanitizePseudo(pseudo);
    if (!clean) {
      ack({ ok: false, error: { code: "PSEUDO_INVALID", message: "Pseudo invalide." } });
      return;
    }
    const { room } = manager.createRoom({ pseudo: clean });
    const state = room.snapshot();
    const host = state.players.find((p) => p.isHost)!;
    // Attach the host's socket
    room.attachSocket(host.id, socket.id);
    bindToRoom(room.code, host.id);
    // Find token from internal — we re-call addPlayer? No, host already created. Use a side channel:
    // The Room constructor created the host but didn't return token. We expose snapshot for state, not token.
    // We need the host token: read from the room via a getter we'll add.
    const token = room.getPlayerToken(host.id)!;
    ack({ ok: true, code: room.code, playerId: host.id, token });
  });

  socket.on("room:join", ({ code, pseudo, resumeToken }, ack) => {
    if (typeof code !== "string") {
      ack({ ok: false, error: { code: "BAD_REQUEST", message: "Code manquant." } });
      return;
    }
    const room = manager.getRoom(code);
    if (!room) {
      ack({ ok: false, error: { code: "ROOM_NOT_FOUND", message: "Cette partie n'existe pas." } });
      return;
    }
    const clean = sanitizePseudo(pseudo);
    if (!clean) {
      ack({ ok: false, error: { code: "PSEUDO_INVALID", message: "Pseudo invalide." } });
      return;
    }
    const res = room.addPlayer(clean, socket.id, resumeToken);
    if (!res.ok) {
      ack(res);
      return;
    }
    room.attachSocket(res.playerId, socket.id);
    bindToRoom(room.code, res.playerId);
    ack({ ok: true, playerId: res.playerId, token: res.token });
  });

  socket.on("room:leave", () => {
    if (!session.roomCode || !session.playerId) return;
    const room = manager.getRoom(session.roomCode);
    if (room) room.removePlayer(session.playerId);
    socket.leave(roomChannel(session.roomCode));
    session.roomCode = null;
    session.playerId = null;
  });

  socket.on("room:settings", (patch, ack) => {
    if (!session.roomCode || !session.playerId) {
      ack?.({ ok: false, error: { code: "BAD_REQUEST", message: "Pas dans une partie." } });
      return;
    }
    const room = manager.getRoom(session.roomCode);
    if (!room) {
      ack?.({ ok: false, error: { code: "ROOM_NOT_FOUND", message: "Partie introuvable." } });
      return;
    }
    const res = room.updateSettings(session.playerId, patch);
    ack?.(res);
  });

  socket.on("game:start", (ack) => {
    // Wired in next iteration once the round loop lands.
    ack?.({ ok: false, error: { code: "BAD_REQUEST", message: "Boucle de jeu pas encore implémentée." } });
  });

  socket.on("vote:cast", (_payload, ack) => {
    ack?.({ ok: false, error: { code: "BAD_REQUEST", message: "Boucle de jeu pas encore implémentée." } });
  });

  socket.on("disconnect", () => {
    if (!session.roomCode || !session.playerId) return;
    const room = manager.getRoom(session.roomCode);
    if (room) room.handleDisconnect(session.playerId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[qui] server listening on http://localhost:${PORT}`);
  console.log(`[qui] accepting client origin: ${ORIGIN}`);
});
