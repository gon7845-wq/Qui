// Server-authoritative pacing for each phase, in milliseconds.
// Clients receive `phaseEndsAt` and animate within these windows.

export const PHASE_DURATION = {
  question: 3_000,
  // vote is dynamic (settings.voteDurationSec * 1000)
  revealIntro: 2_500,        // gavel slam + suspense
  revealBox: 1_800,          // accused align at the dock
  revealElimination: 3_500,  // fade non-coupables one by one
  revealVerdict: 4_500,      // spotlight + verdict scroll
  score: 4_000,              // intermediate leaderboard
} as const;
