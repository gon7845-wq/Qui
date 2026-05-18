// Server-authoritative pacing for each phase, in milliseconds.

export const PHASE_DURATION = {
  question: 3_000,
  // vote is dynamic (settings.voteDurationSec * 1000)
  revealIntro: 2_500,
  revealBox: 1_800,
  revealElimination: 3_500,
  revealVerdict: 5_000, // longer now — no score screen after
} as const;
