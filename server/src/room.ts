import {
  DISCONNECT_GRACE_MS,
  MAX_PLAYERS,
  QUESTION_CATEGORIES,
  ROUNDS_DEFAULT,
  VOTE_DURATION_DEFAULT,
  type ErrorPayload,
  type Phase,
  type PlayerId,
  type PlayerPublic,
  type RoomSettings,
  type RoomState,
  type RoundPublicState,
  type RevealState,
} from "@qui/shared";
import { avatarFromPseudo } from "./avatar.js";
import { nanoid } from "nanoid";

interface ServerPlayer {
  id: PlayerId;
  pseudo: string;
  token: string;
  socketId: string | null;
  connected: boolean;
  isHost: boolean;
  score: number;
  doubleVoteRemaining: number;
  missedRounds: number;
  disconnectTimer: NodeJS.Timeout | null;
}

export type EmitState = (state: RoomState) => void;
export type Logger = (msg: string, meta?: Record<string, unknown>) => void;

export class Room {
  public readonly code: string;
  private players = new Map<PlayerId, ServerPlayer>();
  private phase: Phase = "lobby";
  private hostId: PlayerId;
  private settings: RoomSettings;
  private round: RoundPublicState | null = null;
  private reveal: RevealState | null = null;
  private destroyTimer: NodeJS.Timeout | null = null;
  private destroyed = false;

  constructor(
    code: string,
    hostInit: { pseudo: string },
    private emitState: EmitState,
    private log: Logger,
    private onEmpty: (code: string) => void
  ) {
    this.code = code;
    this.settings = {
      voteDurationSec: VOTE_DURATION_DEFAULT,
      rounds: ROUNDS_DEFAULT,
      anonymousVotes: true,
      allowSelfVote: false,
      categories: [...QUESTION_CATEGORIES],
    };
    const host = this.createPlayer(hostInit.pseudo, true);
    this.hostId = host.id;
  }

  // --- Public mutation entry points ---

  public addPlayer(
    pseudo: string,
    socketId: string,
    resumeToken?: string
  ):
    | { ok: true; playerId: PlayerId; token: string }
    | { ok: false; error: ErrorPayload } {
    if (this.destroyed) return err("ROOM_NOT_FOUND", "Cette partie n'existe plus.");

    // Reconnection path
    if (resumeToken) {
      const existing = [...this.players.values()].find((p) => p.token === resumeToken);
      if (existing) {
        this.cancelDisconnectTimer(existing);
        existing.socketId = socketId;
        existing.connected = true;
        this.cancelDestroy();
        this.broadcast();
        return { ok: true, playerId: existing.id, token: existing.token };
      }
    }

    // Pseudo conflict (case-insensitive)
    const lowered = pseudo.toLowerCase();
    for (const p of this.players.values()) {
      if (p.pseudo.toLowerCase() === lowered) {
        return err("PSEUDO_TAKEN", "Ce pseudo est déjà pris dans cette partie.");
      }
    }

    if (this.players.size >= MAX_PLAYERS) {
      return err("ROOM_FULL", "Cette partie est complète.");
    }
    if (this.phase !== "lobby") {
      return err("GAME_IN_PROGRESS", "Une partie est déjà en cours.");
    }

    const player = this.createPlayer(pseudo, false);
    player.socketId = socketId;
    this.cancelDestroy();
    this.broadcast();
    return { ok: true, playerId: player.id, token: player.token };
  }

  public attachSocket(playerId: PlayerId, socketId: string): boolean {
    const p = this.players.get(playerId);
    if (!p) return false;
    this.cancelDisconnectTimer(p);
    p.socketId = socketId;
    p.connected = true;
    this.broadcast();
    return true;
  }

  public handleDisconnect(playerId: PlayerId): void {
    const p = this.players.get(playerId);
    if (!p) return;
    p.connected = false;
    p.socketId = null;
    this.broadcast();

    this.cancelDisconnectTimer(p);
    p.disconnectTimer = setTimeout(() => {
      if (this.phase === "lobby") {
        this.removePlayer(playerId);
      }
      // In-game AFK handling will be implemented with the round loop
    }, DISCONNECT_GRACE_MS);
  }

  public removePlayer(playerId: PlayerId): void {
    const p = this.players.get(playerId);
    if (!p) return;
    this.cancelDisconnectTimer(p);
    this.players.delete(playerId);

    if (this.players.size === 0) {
      this.scheduleDestroy();
      return;
    }
    if (playerId === this.hostId) {
      // Transfer host to next connected player, fallback to first
      const next =
        [...this.players.values()].find((q) => q.connected) ??
        [...this.players.values()][0]!;
      next.isHost = true;
      this.hostId = next.id;
    }
    this.broadcast();
  }

  public updateSettings(
    requesterId: PlayerId,
    patch: Partial<RoomSettings>
  ): { ok: true } | { ok: false; error: ErrorPayload } {
    if (requesterId !== this.hostId) {
      return err("NOT_HOST", "Seul l'hôte peut modifier les réglages.");
    }
    if (this.phase !== "lobby") {
      return err("GAME_IN_PROGRESS", "Réglages verrouillés en cours de partie.");
    }
    const next: RoomSettings = { ...this.settings };
    if (typeof patch.voteDurationSec === "number") {
      next.voteDurationSec = clamp(Math.round(patch.voteDurationSec), 5, 20);
    }
    if (typeof patch.rounds === "number") {
      next.rounds = clamp(Math.round(patch.rounds), 3, 20);
    }
    if (typeof patch.anonymousVotes === "boolean") {
      next.anonymousVotes = patch.anonymousVotes;
    }
    if (typeof patch.allowSelfVote === "boolean") {
      next.allowSelfVote = patch.allowSelfVote;
    }
    if (Array.isArray(patch.categories)) {
      const valid = patch.categories.filter((c) =>
        QUESTION_CATEGORIES.includes(c)
      );
      if (valid.length > 0) next.categories = valid;
    }
    this.settings = next;
    this.broadcast();
    return { ok: true };
  }

  public getPlayerToken(playerId: PlayerId): string | null {
    return this.players.get(playerId)?.token ?? null;
  }

  public isEmpty(): boolean {
    return this.players.size === 0;
  }

  public hasConnectedPlayers(): boolean {
    for (const p of this.players.values()) if (p.connected) return true;
    return false;
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const p of this.players.values()) this.cancelDisconnectTimer(p);
    if (this.destroyTimer) clearTimeout(this.destroyTimer);
    this.destroyTimer = null;
    this.log(`room ${this.code} destroyed`);
  }

  public snapshot(): RoomState {
    return {
      code: this.code,
      hostId: this.hostId,
      phase: this.phase,
      players: [...this.players.values()].map(toPublic),
      settings: this.settings,
      round: this.round,
      reveal: this.reveal,
    };
  }

  // --- Internals ---

  private createPlayer(pseudo: string, isHost: boolean): ServerPlayer {
    const id = nanoid(12);
    const token = nanoid(24);
    const player: ServerPlayer = {
      id,
      pseudo,
      token,
      socketId: null,
      connected: false,
      isHost,
      score: 0,
      doubleVoteRemaining: 1,
      missedRounds: 0,
      disconnectTimer: null,
    };
    this.players.set(id, player);
    return player;
  }

  private cancelDisconnectTimer(p: ServerPlayer) {
    if (p.disconnectTimer) {
      clearTimeout(p.disconnectTimer);
      p.disconnectTimer = null;
    }
  }

  private scheduleDestroy() {
    if (this.destroyTimer) return;
    this.destroyTimer = setTimeout(() => {
      if (this.players.size === 0) this.onEmpty(this.code);
    }, 60_000);
  }

  private cancelDestroy() {
    if (this.destroyTimer) {
      clearTimeout(this.destroyTimer);
      this.destroyTimer = null;
    }
  }

  private broadcast() {
    this.emitState(this.snapshot());
  }
}

function toPublic(p: ServerPlayer): PlayerPublic {
  return {
    id: p.id,
    pseudo: p.pseudo,
    avatar: avatarFromPseudo(p.pseudo),
    connected: p.connected,
    isHost: p.isHost,
    score: p.score,
    doubleVoteRemaining: p.doubleVoteRemaining,
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function err(code: ErrorPayload["code"], message: string): { ok: false; error: ErrorPayload } {
  return { ok: false, error: { code, message } };
}
