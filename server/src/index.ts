import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
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
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, "../../client/dist");
const HAS_CLIENT_BUNDLE = existsSync(path.join(CLIENT_DIST, "index.html"));

const app = express();

if (CLIENT_ORIGIN) {
  app.use(cors({ origin: CLIENT_ORIGIN }));
}

app.get("/health", (_req, res) => res.json({ ok: true, t: Date.now() }));

if (HAS_CLIENT_BUNDLE) {
  app.use(
    express.static(CLIENT_DIST, {
      maxAge: "1y",
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    })
  );
  app.get("*", (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

const httpServer = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: CLIENT_ORIGIN ? { origin: CLIENT_ORIGIN, credentials: true } : undefined,
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
    bindToRoom(room.code, host.id);
    room.attachSocket(host.id, socket.id);
    const token = room.getPlayerToken(host.id)!;
    // Send initial state explicitly to the joining socket
    socket.emit("room:state", room.snapshot());
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
    bindToRoom(room.code, res.playerId);
    room.attachSocket(res.playerId, socket.id);
    // Explicit initial state to the joining socket (prevents
    // "stuck on entering" if no other event happens for a while)
    socket.emit("room:state", room.snapshot());
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
    if (!session.roomCode || !session.playerId) {
      ack?.({ ok: false, error: { code: "BAD_REQUEST", message: "Pas dans une partie." } });
      return;
    }
    const room = manager.getRoom(session.roomCode);
    if (!room) {
      ack?.({ ok: false, error: { code: "ROOM_NOT_FOUND", message: "Partie introuvable." } });
      return;
    }
    ack?.(room.startGame(session.playerId));
  });

  socket.on("game:rematch", (ack) => {
    if (!session.roomCode || !session.playerId) {
      ack?.({ ok: false, error: { code: "BAD_REQUEST", message: "Pas dans une partie." } });
      return;
    }
    const room = manager.getRoom(session.roomCode);
    if (!room) {
      ack?.({ ok: false, error: { code: "ROOM_NOT_FOUND", message: "Partie introuvable." } });
      return;
    }
    ack?.(room.rematch(session.playerId));
  });

  socket.on("vote:cast", ({ targetId }, ack) => {
    if (!session.roomCode || !session.playerId) {
      ack?.({ ok: false, error: { code: "BAD_REQUEST", message: "Pas dans une partie." } });
      return;
    }
    const room = manager.getRoom(session.roomCode);
    if (!room) {
      ack?.({ ok: false, error: { code: "ROOM_NOT_FOUND", message: "Partie introuvable." } });
      return;
    }
    if (typeof targetId !== "string") {
      ack?.({ ok: false, error: { code: "BAD_REQUEST", message: "Cible manquante." } });
      return;
    }
    ack?.(room.castVote(session.playerId, targetId));
  });

  socket.on("disconnect", () => {
    if (!session.roomCode || !session.playerId) return;
    const room = manager.getRoom(session.roomCode);
    if (room) room.handleDisconnect(session.playerId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[qui] server listening on http://localhost:${PORT}`);
  if (HAS_CLIENT_BUNDLE) {
    console.log(`[qui] serving client bundle from ${CLIENT_DIST}`);
  } else {
    console.log(`[qui] dev mode — client must be served separately`);
  }
  if (CLIENT_ORIGIN) {
    console.log(`[qui] CORS open for ${CLIENT_ORIGIN}`);
  }
});
