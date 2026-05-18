import type { QuestionCategory } from "./constants.js";

export type PlayerId = string;
export type RoomCode = string;

export type Phase =
  | "lobby"
  | "round:question"
  | "round:vote"
  | "round:reveal:intro"
  | "round:reveal:box"
  | "round:reveal:elimination"
  | "round:reveal:verdict"
  | "end";

export interface PlayerPublic {
  id: PlayerId;
  pseudo: string;
  avatar: AvatarSeed;
  connected: boolean;
  isHost: boolean;
}

export interface AvatarSeed {
  hue: number;
  toge: 0 | 1 | 2;
  initials: string;
}

export interface RoomSettings {
  voteDurationSec: number;
  rounds: number;
  anonymousVotes: boolean;
  allowSelfVote: boolean;
  categories: QuestionCategory[];
}

export interface Question {
  id: string;
  text: string;
  category: QuestionCategory;
}

export interface RoundPublicState {
  index: number;
  total: number;
  question: Question | null;
  votedPlayerIds: PlayerId[];
}

export interface RevealResultEntry {
  playerId: PlayerId;
  voteCount: number;
  voters?: PlayerId[];
}

export interface RevealState {
  results: RevealResultEntry[];
  guilty: PlayerId[];
}

export interface HistoryEntry {
  index: number;
  question: Question;
  guilty: PlayerId[];
  voteCount: number;
}

export interface RoomState {
  code: RoomCode;
  hostId: PlayerId;
  phase: Phase;
  phaseEndsAt: number | null;
  players: PlayerPublic[];
  settings: RoomSettings;
  round: RoundPublicState | null;
  reveal: RevealState | null;
  history: HistoryEntry[];
}

export interface ErrorPayload {
  code:
    | "ROOM_NOT_FOUND"
    | "ROOM_FULL"
    | "GAME_IN_PROGRESS"
    | "NOT_IN_GAME"
    | "WRONG_PHASE"
    | "INVALID_TARGET"
    | "PSEUDO_TAKEN"
    | "PSEUDO_INVALID"
    | "NOT_HOST"
    | "NOT_ENOUGH_PLAYERS"
    | "BAD_REQUEST"
    | "RATE_LIMITED";
  message: string;
}
