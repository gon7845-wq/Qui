// Persists per-room player identity so reconnects keep your seat.
const KEY = "qui.session";

export interface SessionRecord {
  roomCode: string;
  playerId: string;
  token: string;
  pseudo: string;
}

export function loadSession(roomCode: string): SessionRecord | null {
  try {
    const raw = localStorage.getItem(`${KEY}:${roomCode}`);
    if (!raw) return null;
    return JSON.parse(raw) as SessionRecord;
  } catch {
    return null;
  }
}

export function saveSession(rec: SessionRecord): void {
  try {
    localStorage.setItem(`${KEY}:${rec.roomCode}`, JSON.stringify(rec));
    localStorage.setItem("qui.lastPseudo", rec.pseudo);
  } catch {
    /* quota */
  }
}

export function clearSession(roomCode: string): void {
  try {
    localStorage.removeItem(`${KEY}:${roomCode}`);
  } catch {
    /* */
  }
}

export function lastPseudo(): string {
  try {
    return localStorage.getItem("qui.lastPseudo") ?? "";
  } catch {
    return "";
  }
}
