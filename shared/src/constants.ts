export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const MAX_PSEUDO_LENGTH = 16;

export const VOTE_DURATION_MIN = 5;
export const VOTE_DURATION_MAX = 20;
export const VOTE_DURATION_DEFAULT = 12;

export const ROUNDS_MIN = 3;
export const ROUNDS_MAX = 20;
export const ROUNDS_DEFAULT = 8;

export const DISCONNECT_GRACE_MS = 30_000;
export const MAX_MISSED_ROUNDS = 2;

export const QUESTION_CATEGORIES = ["gentil", "drole", "hot", "secret"] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  gentil: "Gentil / Méchant",
  drole: "Drôle / Cringe",
  hot: "Hot / Froid",
  secret: "Secret / Public",
};
