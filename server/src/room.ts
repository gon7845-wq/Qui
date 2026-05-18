import {
  DISCONNECT_GRACE_MS,
  MAX_MISSED_ROUNDS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  QUESTION_CATEGORIES,
  ROUNDS_DEFAULT,
  VOTE_DURATION_DEFAULT,
  type ErrorPayload,
  type HistoryEntry,
  type Phase,
  type PlayerId,
  type PlayerPublic,
  type Question,
  type RevealResultEntry,
  type RevealState,
  type RoomSettings,
  type RoomState,
  type RoundPublicState,
} from "@qui/shared";
import { avatarFromPseudo } from "./avatar.js";
import { nanoid } from "nanoid";
import { PHASE_DURATION } from "./phaseDurations.js";
import { QuestionPicker } from "./questionPicker.js";

interface ServerPlayer {
  id: PlayerId;
  pseudo: string;
  token: string;
  socketId: string | null;
  connected: boolean;
  isHost: boolean;
  missedRounds: number;
  disconnectTimer: NodeJS.Timeout | null;
}

export type EmitState = (state: RoomState) => void;
export type EmitToSocket = (socketId: string, state: RoomState) => void;
export type Logger = (msg: string, meta?: Record<string, unknown>) => void;

export class Room {
  public readonly code: string;
  private players = new Map<PlayerId, ServerPlayer>();
  private phase: Phase = "lobby";
  private phaseEndsAt: number | null = null;
  private hostId: PlayerId;
  private settings: RoomSettings;

  private picker: QuestionPicker | null = null;
  private currentRoundIndex = 0;
  private currentQuestion: Question | null = null;
  private votes = new Map<PlayerId, PlayerId>(); // voter -> target
  private lastReveal: RevealState | null = null;
  private history: HistoryEntry[] = [];

  private phaseTimer: NodeJS.Timeout | null = null;
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

  // ──────────────────────────────────────────────────────────────
  //  Membership
  // ──────────────────────────────────────────────────────────────

  public addPlayer(
    pseudo: string,
    socketId: string,
    resumeToken?: string
  ):
    | { ok: true; playerId: PlayerId; token: string }
    | { ok: false; error: ErrorPayload } {
    if (this.destroyed) return err("ROOM_NOT_FOUND", "Cette partie n'existe plus.");

    if (resumeToken) {
      const existing = [...this.players.values()].find((p) => p.token === resumeToken);
      if (existing) {
        this.cancelDisconnectTimer(existing);
        existing.socketId = socketId;
        existing.connected = true;
        this.cancelDestroy();
        return { ok: true, playerId: existing.id, token: existing.token };
      }
    }

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
    }, DISCONNECT_GRACE_MS);
  }

  public removePlayer(playerId: PlayerId): void {
    const p = this.players.get(playerId);
    if (!p) return;
    this.cancelDisconnectTimer(p);
    this.players.delete(playerId);
    this.votes.delete(playerId);

    if (this.players.size === 0) {
      this.stopPhaseTimer();
      this.scheduleDestroy();
      return;
    }
    if (playerId === this.hostId) {
      const next =
        [...this.players.values()].find((q) => q.connected) ??
        [...this.players.values()][0]!;
      next.isHost = true;
      this.hostId = next.id;
    }

    if (this.phase !== "lobby" && this.players.size < MIN_PLAYERS) {
      this.abortToLobby();
      return;
    }

    if (this.phase === "round:vote" && this.allConnectedVoted()) {
      this.endVotePhase();
    }
    this.broadcast();
  }

  public getPlayerToken(playerId: PlayerId): string | null {
    return this.players.get(playerId)?.token ?? null;
  }

  public isEmpty(): boolean {
    return this.players.size === 0;
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const p of this.players.values()) this.cancelDisconnectTimer(p);
    this.stopPhaseTimer();
    if (this.destroyTimer) clearTimeout(this.destroyTimer);
    this.destroyTimer = null;
    this.log(`room ${this.code} destroyed`);
  }

  // ──────────────────────────────────────────────────────────────
  //  Settings
  // ──────────────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────────────
  //  Game lifecycle
  // ──────────────────────────────────────────────────────────────

  public startGame(
    requesterId: PlayerId
  ): { ok: true } | { ok: false; error: ErrorPayload } {
    if (requesterId !== this.hostId) {
      return err("NOT_HOST", "Seul le juge peut ouvrir l'audience.");
    }
    if (this.phase !== "lobby") {
      return err("GAME_IN_PROGRESS", "L'audience est déjà ouverte.");
    }
    if (this.players.size < MIN_PLAYERS) {
      return err(
        "NOT_ENOUGH_PLAYERS",
        `Il faut au moins ${MIN_PLAYERS} accusés au box.`
      );
    }

    this.picker = new QuestionPicker(this.settings.categories);
    this.currentRoundIndex = 0;
    this.history = [];
    for (const p of this.players.values()) {
      p.missedRounds = 0;
    }
    this.startNextRound();
    return { ok: true };
  }

  public rematch(
    requesterId: PlayerId
  ): { ok: true } | { ok: false; error: ErrorPayload } {
    if (requesterId !== this.hostId) {
      return err("NOT_HOST", "Seul le juge peut relancer.");
    }
    if (this.phase !== "end") {
      return err("WRONG_PHASE", "La partie n'est pas terminée.");
    }
    this.resetToLobby();
    return { ok: true };
  }

  public castVote(
    voterId: PlayerId,
    targetId: PlayerId
  ): { ok: true } | { ok: false; error: ErrorPayload } {
    if (this.phase !== "round:vote") {
      return err("WRONG_PHASE", "Ce n'est plus l'heure de voter.");
    }
    if (!this.players.has(voterId)) return err("NOT_IN_GAME", "Pas dans la partie.");
    if (!this.players.has(targetId)) return err("INVALID_TARGET", "Accusé introuvable.");
    if (targetId === voterId && !this.settings.allowSelfVote) {
      return err("INVALID_TARGET", "L'auto-vote est interdit.");
    }

    this.votes.set(voterId, targetId);

    if (this.allConnectedVoted()) {
      this.endVotePhase();
    } else {
      this.broadcast();
    }
    return { ok: true };
  }

  // ──────────────────────────────────────────────────────────────
  //  State machine internals
  // ──────────────────────────────────────────────────────────────

  private startNextRound(): void {
    if (!this.picker) this.picker = new QuestionPicker(this.settings.categories);
    this.currentQuestion = this.picker.next();
    this.votes.clear();
    this.lastReveal = null;
    this.transitionTo("round:question", PHASE_DURATION.question);
  }

  private endVotePhase(): void {
    const reveal = this.computeReveal();
    this.lastReveal = reveal;
    this.recordHistory(reveal);
    this.applyMissedRoundsAndKicks();
    this.transitionTo("round:reveal:intro", PHASE_DURATION.revealIntro);
  }

  private endRound(): void {
    if (this.currentRoundIndex + 1 >= this.settings.rounds) {
      this.endGame();
    } else {
      this.currentRoundIndex++;
      this.startNextRound();
    }
  }

  private endGame(): void {
    this.stopPhaseTimer();
    this.phase = "end";
    this.phaseEndsAt = null;
    this.currentQuestion = null;
    this.votes.clear();
    this.broadcast();
  }

  private abortToLobby(): void {
    this.log(`room ${this.code} aborted to lobby (not enough players)`);
    this.resetToLobby();
  }

  private resetToLobby(): void {
    this.stopPhaseTimer();
    this.phase = "lobby";
    this.phaseEndsAt = null;
    this.currentRoundIndex = 0;
    this.currentQuestion = null;
    this.votes.clear();
    this.lastReveal = null;
    this.history = [];
    this.picker = null;
    for (const p of this.players.values()) {
      p.missedRounds = 0;
    }
    this.broadcast();
  }

  private transitionTo(phase: Phase, durationMs: number): void {
    this.stopPhaseTimer();
    this.phase = phase;
    this.phaseEndsAt = Date.now() + durationMs;
    this.broadcast();
    this.phaseTimer = setTimeout(() => this.onPhaseTimerEnd(), durationMs);
  }

  private onPhaseTimerEnd(): void {
    this.phaseTimer = null;
    switch (this.phase) {
      case "round:question":
        this.transitionTo("round:vote", this.settings.voteDurationSec * 1_000);
        break;
      case "round:vote":
        this.endVotePhase();
        break;
      case "round:reveal:intro":
        this.transitionTo("round:reveal:box", PHASE_DURATION.revealBox);
        break;
      case "round:reveal:box":
        this.transitionTo(
          "round:reveal:elimination",
          PHASE_DURATION.revealElimination
        );
        break;
      case "round:reveal:elimination":
        this.transitionTo("round:reveal:verdict", PHASE_DURATION.revealVerdict);
        break;
      case "round:reveal:verdict":
        this.endRound();
        break;
      default:
        break;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  Reveal & history
  // ──────────────────────────────────────────────────────────────

  private computeReveal(): RevealState {
    const tally = new Map<PlayerId, number>();
    const votersFor = new Map<PlayerId, PlayerId[]>();

    for (const [voterId, targetId] of this.votes) {
      tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
      const arr = votersFor.get(targetId) ?? [];
      arr.push(voterId);
      votersFor.set(targetId, arr);
    }

    let max = 0;
    for (const v of tally.values()) if (v > max) max = v;
    const guilty: PlayerId[] =
      max > 0
        ? [...tally.entries()].filter(([, v]) => v === max).map(([id]) => id)
        : [];

    const entries: RevealResultEntry[] = [];
    for (const p of this.players.values()) {
      const count = tally.get(p.id) ?? 0;
      const voters = this.settings.anonymousVotes
        ? undefined
        : votersFor.get(p.id) ?? [];
      entries.push({ playerId: p.id, voteCount: count, voters });
    }
    entries.sort((a, b) => b.voteCount - a.voteCount);

    return { results: entries, guilty };
  }

  private recordHistory(reveal: RevealState): void {
    if (!this.currentQuestion) return;
    const top = reveal.results[0]?.voteCount ?? 0;
    this.history.push({
      index: this.currentRoundIndex,
      question: this.currentQuestion,
      guilty: reveal.guilty,
      voteCount: top,
    });
  }

  private applyMissedRoundsAndKicks(): void {
    const toKick: PlayerId[] = [];
    for (const p of this.players.values()) {
      if (!this.votes.has(p.id)) {
        p.missedRounds += 1;
        if (!p.connected && p.missedRounds >= MAX_MISSED_ROUNDS) {
          toKick.push(p.id);
        }
      } else {
        p.missedRounds = 0;
      }
    }
    for (const id of toKick) this.removePlayer(id);
  }

  private allConnectedVoted(): boolean {
    for (const p of this.players.values()) {
      if (!p.connected) continue;
      if (!this.votes.has(p.id)) return false;
    }
    return this.players.size > 0;
  }

  // ──────────────────────────────────────────────────────────────
  //  Snapshot
  // ──────────────────────────────────────────────────────────────

  public snapshot(): RoomState {
    const round: RoundPublicState | null =
      this.phase === "lobby" || this.phase === "end"
        ? null
        : {
            index: this.currentRoundIndex,
            total: this.settings.rounds,
            question: this.currentQuestion,
            votedPlayerIds: [...this.votes.keys()],
          };

    const reveal = this.phase.startsWith("round:reveal:") ? this.lastReveal : null;

    return {
      code: this.code,
      hostId: this.hostId,
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      players: [...this.players.values()].map(toPublic),
      settings: this.settings,
      round,
      reveal,
      history: this.history,
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  Helpers
  // ──────────────────────────────────────────────────────────────

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
      missedRounds: 0,
      disconnectTimer: null,
    };
    this.players.set(id, player);
    return player;
  }

  private cancelDisconnectTimer(p: ServerPlayer): void {
    if (p.disconnectTimer) {
      clearTimeout(p.disconnectTimer);
      p.disconnectTimer = null;
    }
  }

  private stopPhaseTimer(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  private scheduleDestroy(): void {
    if (this.destroyTimer) return;
    this.destroyTimer = setTimeout(() => {
      if (this.players.size === 0) this.onEmpty(this.code);
    }, 60_000);
  }

  private cancelDestroy(): void {
    if (this.destroyTimer) {
      clearTimeout(this.destroyTimer);
      this.destroyTimer = null;
    }
  }

  private broadcast(): void {
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
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function err(
  code: ErrorPayload["code"],
  message: string
): { ok: false; error: ErrorPayload } {
  return { ok: false, error: { code, message } };
}
