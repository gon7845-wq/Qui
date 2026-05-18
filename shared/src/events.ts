import type {
  ErrorPayload,
  PlayerId,
  RoomCode,
  RoomSettings,
} from "./types.js";

// Client -> Server
export interface ClientToServerEvents {
  "room:create": (
    payload: { pseudo: string },
    ack: (
      res:
        | { ok: true; code: RoomCode; playerId: PlayerId; token: string }
        | { ok: false; error: ErrorPayload }
    ) => void
  ) => void;

  "room:join": (
    payload: { code: RoomCode; pseudo: string; resumeToken?: string },
    ack: (
      res:
        | { ok: true; playerId: PlayerId; token: string }
        | { ok: false; error: ErrorPayload }
    ) => void
  ) => void;

  "room:leave": () => void;

  "room:settings": (
    payload: Partial<RoomSettings>,
    ack?: (res: { ok: true } | { ok: false; error: ErrorPayload }) => void
  ) => void;

  "game:start": (
    ack?: (res: { ok: true } | { ok: false; error: ErrorPayload }) => void
  ) => void;

  "game:rematch": (
    ack?: (res: { ok: true } | { ok: false; error: ErrorPayload }) => void
  ) => void;

  "vote:cast": (
    payload: { targetId: PlayerId },
    ack?: (res: { ok: true } | { ok: false; error: ErrorPayload }) => void
  ) => void;
}

// Server -> Client
export interface ServerToClientEvents {
  "room:state": (state: import("./types.js").RoomState) => void;
  "error": (err: ErrorPayload) => void;
}
