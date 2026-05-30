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
}

export interface LobbySettings {
  anonymous: boolean;
  voteDuration: number;
  revealDuration: number;
  questionCount: number;
  allowSelfVote: boolean;
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
