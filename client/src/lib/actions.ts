import type { PlayerId, RoomSettings } from "@qui/shared";
import { getSocket } from "./socket";

type Result = { ok: true } | { ok: false; message: string };

function wrap(emit: (cb: (res: { ok: true } | { ok: false; error: { message: string } } | undefined) => void) => void): Promise<Result> {
  return new Promise((resolve) => {
    emit((res) => {
      if (res?.ok) resolve({ ok: true });
      else resolve({ ok: false, message: res?.error.message ?? "Erreur inconnue." });
    });
  });
}

export function startGame(): Promise<Result> {
  return wrap((cb) => getSocket().emit("game:start", cb));
}

export function castVote(targetId: PlayerId, doubleVote: boolean): Promise<Result> {
  return wrap((cb) => getSocket().emit("vote:cast", { targetId, doubleVote }, cb));
}

export function requestRematch(): Promise<Result> {
  return wrap((cb) => getSocket().emit("game:rematch", cb));
}

export function updateSettings(patch: Partial<RoomSettings>): Promise<Result> {
  return wrap((cb) => getSocket().emit("room:settings", patch, cb));
}
