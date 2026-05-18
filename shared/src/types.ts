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
  | "round:score"
  | "end";

export interface PlayerPublic {
  id: PlayerId;
  pseudo: string;
  avatar: AvatarSeed;
  connected: boolean;
  isHost: boolean;
  score: number;
  doubleVoteRemaining: number; // 0 or 1
}

export interface AvatarSeed {
  hue: number;       // 0-359
  toge: 0 | 1 | 2;   // silhouette variant
  initials: string;  // 1-2 chars derived from pseudo
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
  index: number;                  // 0-based round index
  total: number;
  question: Question | null;
  votedPlayerIds: PlayerId[];     // who locked a vote (not WHAT)
}

export interface RevealResultEntry {
  playerId: PlayerId;
  voteCount: number;              // weighted (includes double-votes)
  voters?: PlayerId[];            // present only if !anonymousVotes
}

export interface RevealState {
  results: RevealResultEntry[];   // sorted desc by voteCount
  guilty: PlayerId[];             // 1 or more (tie = multiple)
  doubleVoteUsedBy: PlayerId[];   // players who burned their double-vote this round
  pointsAwarded: { playerId: PlayerId; delta: number }[];
}

export interface RoomState {
  code: RoomCode;
  hostId: PlayerId;
  phase: Phase;
  phaseEndsAt: number | null;     // server unix ms — null in lobby/end
  players: PlayerPublic[];
  settings: RoomSettings;
  round: RoundPublicState | null;
  reveal: RevealState | null;
}

export interface ErrorPayload {
  code:
    | "ROOM_NOT_FOUND"
    | "ROOM_FULL"
    | "GAME_IN_PROGRESS"
    | "NOT_IN_GAME"
    | "WRONG_PHASE"
    | "INVALID_TARGET"
    | "NO_DOUBLE_VOTE_LEFT"
    | "PSEUDO_TAKEN"
    | "PSEUDO_INVALID"
    | "NOT_HOST"
    | "NOT_ENOUGH_PLAYERS"
    | "BAD_REQUEST"
    | "RATE_LIMITED";
  message: string;
}
