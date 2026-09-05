import type { Tone } from "../theme";

export type Template = "manche" | "rafale" | "bulletin";
export const TEMPLATES: readonly Template[];

export interface Question {
  text: string;
  cat: string;
  name: string;
  emoji: string;
  tone: Tone;
}

export interface Player {
  id: string;
  pseudo: string;
  avatar: string;
  isHost: boolean;
}

export interface Vote {
  voterId: string;
  targetId: string;
  atMs: number;
}

export interface MancheScenario {
  seed: string;
  hook: string;
  code: string;
  round: number;
  totalRounds: number;
  question: Question;
  players: Player[];
  votes: Vote[];
  voteDurationMs: number;
  winnerId: string;
  winnerCount: number;
  punchline: string;
}

export interface RafaleScenario {
  seed: string;
  tone: Tone;
  hook: string;
  cta: string;
  questions: Question[];
  players: Player[];
}

export interface BulletinEntry {
  text: string;
  tone: Tone;
  count: number;
}

export interface BulletinScenario {
  seed: string;
  hook: string;
  player: Player;
  players: Player[];
  mood: "loved" | "roasted" | "mixed";
  entries: BulletinEntry[];
  total: number;
  headline: BulletinEntry;
  punchline: string;
  rank: number;
}

export interface Metadata {
  title: string;
  headline: string;
  description: string;
  instagramCaption: string;
  tiktokTitle: string;
  hashtags: string[];
  host: string;
}

export function rng(seed: string | number): {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(arr: readonly T[]): T;
  shuffle<T>(arr: readonly T[]): T[];
};
export function hashString(s: string): number;
export function buildManche(seed: string | number, opts?: { tone?: Tone; playerCount?: number }): MancheScenario;
export function buildRafale(seed: string | number, opts?: { tone?: Tone; count?: number }): RafaleScenario;
export function buildBulletin(seed: string | number, opts?: { mood?: "loved" | "roasted" | "mixed" }): BulletinScenario;
export function buildScenario(template: Template, seed: string | number, opts?: object): MancheScenario | RafaleScenario | BulletinScenario;
export function buildMetadata(template: Template, scenario: object, appUrl: string): Metadata;
