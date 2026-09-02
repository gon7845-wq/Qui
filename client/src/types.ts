export type LobbyState = "waiting" | "countdown" | "question" | "reveal" | "ad" | "ended";

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
  countdownEndTime: number | null;
  votesCount: number;
  paused: boolean;
  // false = l'hôte est VIP, aucune publicité pour toute la table
  ads: boolean;
  adEndTime: number | null;
  adSkipAt: number | null;
}

export interface HouseAd {
  id: string;
  kind: "vip" | "feature" | "share";
  title: string;
  body: string;
  cta: string;
  href: string | null;
  tone: "warm" | "spicy" | "fun";
}

export interface AdConfig {
  policy: { everyRounds: number; seconds: number; skipAfter: number };
  adsense: { client: string; banner: string | null; interstitial: string | null } | null;
  admob: { appId: string; banner: string | null; interstitial: string | null } | null;
  houseOnly: boolean;
  house: HouseAd[];
}

export interface Plan {
  id: string;
  label: string;
  price: number; // centimes
  currency: string;
  period: string;
  mode: "subscription" | "payment";
  pitch: string;
  best?: boolean;
  buyable: boolean;
}

export interface BillingConfig {
  plans: Plan[];
  freePrivateQuestions: number;
  checkout: "stripe" | null;
}

export interface AppConfig {
  ads: AdConfig;
  billing: BillingConfig;
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
