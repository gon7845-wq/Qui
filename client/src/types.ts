export type LobbyState = "waiting" | "question" | "reveal" | "ended";

export interface Question {
  text: string;
  tone: "warm" | "spicy" | "fun";
}

export interface Player {
  id: string;
  pseudo: string;
  isHost: boolean;
  score: number;
  connected: boolean;
  avatar?: string;
}

export interface LobbySettings {
  anonymous: boolean;
  voteDuration: number;
  revealDuration: number;
  questionCount: number;
  allowSelfVote: boolean;
  categories: string[]; // [] = toutes
}

export interface CategoryMeta {
  id: string;
  name: string;
  emoji: string;
  tone: "warm" | "spicy" | "fun";
  count: number;
  private?: boolean;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  premium?: boolean;
}

export interface Lobby {
  code: string;
  hostId: string;
  state: LobbyState;
  settings: LobbySettings;
  players: Player[];
  currentRound: number;
  totalRounds: number;
  currentQuestion: Question | null;
  roundEndTime: number | null;
  revealEndTime: number | null;
  votesCount: number;
  paused: boolean;
}

export interface Ranked {
  id: string;
  pseudo: string;
  count: number;
}

export interface RevealData {
  question: Question;
  ranked: Ranked[];
  votes: Record<string, string> | null;
  anonymous: boolean;
  revealEndTime: number;
  round: number;
  totalRounds: number;
}

export interface FinalData {
  finalRanking: { id: string; pseudo: string; score: number }[];
  history: Array<{
    question: Question;
    ranked: Ranked[];
    votes: Record<string, string> | null;
  }>;
}
