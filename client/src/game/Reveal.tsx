import { useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { PlayerPublic, RoomState } from "@qui/shared";
import { Avatar } from "../components/Avatar";
import { Gavel } from "../components/Gavel";
import { Stamp } from "../components/Stamp";
import { SpeedLines } from "../components/SpeedLines";
import { Dock } from "../components/Dock";

interface Props {
  state: RoomState;
}

export function RevealScreen({ state }: Props) {
  const phase = state.phase;
  const reveal = state.reveal;
  if (!reveal) return null;

  const playerById = useMemo(
    () => new Map(state.players.map((p) => [p.id, p])),
    [state.players]
  );

  return (
    <div className="relative min-h-full grid place-items-center px-6 py-8 overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === "round:reveal:intro" && <IntroScene key="intro" />}
        {phase === "round:reveal:box" && (
          <BoxScene
            key="box"
            state={state}
            playerById={playerById}
          />
        )}
        {phase === "round:reveal:elimination" && (
          <EliminationScene
            key="elim"
            state={state}
            playerById={playerById}
          />
        )}
        {phase === "round:reveal:verdict" && (
          <VerdictScene
            key="verdict"
            state={state}
            playerById={playerById}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
//  Intro — gavel slam + screen shake + VERDICT stamp
// ──────────────────────────────────────────────────────────────────

function IntroScene() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="relative w-full h-[60vh] grid place-items-center"
    >
      {/* Background vignette deepens */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* Screen-shake wrapper — fires once on mount, suppressed if reduced motion */}
      <motion.div
        initial={{ x: 0, y: 0 }}
        animate={
          reduce
            ? { x: 0, y: 0 }
            : {
                x: [0, 0, -14, 14, -10, 10, -5, 5, -2, 2, 0],
                y: [0, 0, 6, -4, 4, -2, 2, -1, 1, 0, 0],
              }
        }
        transition={
          reduce
            ? { duration: 0 }
            : {
                duration: 0.7,
                times: [0, 0.55, 0.6, 0.66, 0.72, 0.78, 0.84, 0.9, 0.95, 0.98, 1],
                delay: 0.1,
              }
        }
        className="relative flex flex-col items-center"
      >
        {/* Speed-lines burst right at impact */}
        {!reduce && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.05 }}
            className="absolute inset-0 grid place-items-center"
          >
            <SpeedLines color="#c9a35a" durationMs={800} />
          </motion.div>
        )}

        {/* Gavel arrival */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { y: -260, rotate: -45, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { y: 0, rotate: 12, opacity: 1 }}
          transition={{
            duration: reduce ? 0.2 : 0.55,
            ease: reduce ? "easeOut" : [0.5, 0, 0.75, 0],
          }}
          className="relative z-10"
        >
          <Gavel size={160} />
        </motion.div>

        {/* VERDICT stamp slams just after the gavel */}
        <div className="relative z-10 mt-6">
          <Stamp text="VERDICT" tone="verdict" size="lg" delay={reduce ? 0.1 : 0.7} />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────
//  Box — accused align at the dock
// ──────────────────────────────────────────────────────────────────

function BoxScene({
  state,
  playerById,
}: {
  state: RoomState;
  playerById: Map<string, PlayerPublic>;
}) {
  const reveal = state.reveal!;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-5xl"
    >
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-xs uppercase tracking-[0.4em] text-court-parchment/50 mb-2"
      >
        {state.round?.question?.text}
      </motion.p>
      <p className="text-center court-title text-2xl text-court-brass mb-8">
        Au box des accusés…
      </p>

      <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 sm:gap-6">
        {reveal.results.map((r, i) => {
          const p = playerById.get(r.playerId);
          if (!p) return null;
          return (
            <motion.li
              key={r.playerId}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: i * 0.07,
                duration: 0.45,
                ease: [0.34, 1.4, 0.64, 1],
              }}
              className="flex flex-col items-center"
            >
              <Avatar seed={p.avatar} size={72} />
              <p className="mt-2 text-xs text-court-parchment/80 truncate max-w-[90px]">
                {p.pseudo}
              </p>
            </motion.li>
          );
        })}
      </ul>

      <Dock delay={0.3} />
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────
//  Elimination — non-guilty get "NON COUPABLE" stamps low-to-high
// ──────────────────────────────────────────────────────────────────

function EliminationScene({
  state,
  playerById,
}: {
  state: RoomState;
  playerById: Map<string, PlayerPublic>;
}) {
  const reveal = state.reveal!;
  // Stagger eliminations: lowest vote counts go first.
  const sortedAsc = [...reveal.results].sort((a, b) => a.voteCount - b.voteCount);
  const ranks = new Map<string, number>();
  sortedAsc.forEach((r, idx) => ranks.set(r.playerId, idx));

  const totalElims = reveal.results.length - reveal.guilty.length;
  const PER_ELIM = totalElims > 0 ? Math.min(0.55, 3.2 / totalElims) : 0.4;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-5xl"
    >
      <p className="text-center court-title text-2xl text-court-parchment mb-8">
        Le jury se prononce…
      </p>

      <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 sm:gap-6">
        {reveal.results.map((r) => {
          const p = playerById.get(r.playerId);
          if (!p) return null;
          const isGuilty = reveal.guilty.includes(r.playerId);
          const elimDelay = (ranks.get(r.playerId) ?? 0) * PER_ELIM;
          return (
            <motion.li
              key={r.playerId}
              layout
              animate={
                isGuilty
                  ? { scale: 1.08, filter: "grayscale(0)" }
                  : { scale: 0.92, filter: "grayscale(1)", opacity: 0.35 }
              }
              transition={{ delay: isGuilty ? 0 : elimDelay, duration: 0.5 }}
              className="relative flex flex-col items-center"
            >
              <div className="relative">
                <Avatar seed={p.avatar} size={72} dim={!isGuilty} />
                {!isGuilty && (
                  <motion.div
                    initial={{ scale: 3, rotate: 35, opacity: 0 }}
                    animate={{ scale: 1, rotate: -8, opacity: 1 }}
                    transition={{
                      delay: elimDelay + 0.05,
                      duration: 0.3,
                      ease: [0.34, 1.6, 0.64, 1],
                    }}
                    className="absolute inset-0 grid place-items-center pointer-events-none"
                  >
                    <span
                      className="font-gavel uppercase text-court-parchment/80 text-[10px] tracking-[0.15em] border-2 border-court-parchment/70 px-1.5 py-0.5 bg-court-ink/70"
                      style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.6)" }}
                    >
                      Innocent
                    </span>
                  </motion.div>
                )}
              </div>
              <p className="mt-2 text-xs text-court-parchment/70 truncate max-w-[90px]">
                {p.pseudo}
              </p>
              <p className="font-gavel text-court-brass text-sm tabular-nums">
                {r.voteCount}
              </p>
            </motion.li>
          );
        })}
      </ul>

      <Dock delay={0} />
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────
//  Verdict — spotlight on guilty + COUPABLE stamp + voters list
// ──────────────────────────────────────────────────────────────────

function VerdictScene({
  state,
  playerById,
}: {
  state: RoomState;
  playerById: Map<string, PlayerPublic>;
}) {
  const reveal = state.reveal!;
  const guiltyPlayers = reveal.guilty
    .map((id) => playerById.get(id))
    .filter((p): p is PlayerPublic => Boolean(p));

  const isTie = guiltyPlayers.length > 1;
  const hasGuilty = guiltyPlayers.length > 0;
  const doubleVoteIds = new Set(reveal.doubleVoteUsedBy);
  const showVoters = !state.settings.anonymousVotes;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="relative w-full max-w-5xl"
    >
      {/* Overhead spotlight cone */}
      {hasGuilty && (
        <motion.div
          initial={{ opacity: 0, scaleY: 0.2 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ originY: 0 }}
          className="pointer-events-none absolute inset-x-0 -top-40 h-[120vh] mx-auto"
        >
          <div
            className="w-full h-full"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(232,220,176,0.18) 0%, rgba(201,163,90,0.05) 30%, transparent 70%)",
            }}
          />
        </motion.div>
      )}

      {!hasGuilty && (
        <div className="text-center">
          <Stamp text="Aucun verdict" tone="innocent" size="md" />
          <p className="mt-6 text-court-parchment/60 italic">
            Le jury n'a pu trancher.
          </p>
        </div>
      )}

      {hasGuilty && (
        <>
          <div className="text-center mb-6">
            <Stamp
              text={isTie ? "Coupables" : "Coupable"}
              tone="guilty"
              size="lg"
              delay={0.1}
            />
          </div>

          <div className="flex items-start justify-center gap-6 sm:gap-10 flex-wrap">
            {guiltyPlayers.map((p, i) => {
              const result = reveal.results.find((r) => r.playerId === p.id);
              const count = result?.voteCount ?? 0;
              const voters = result?.voters ?? [];
              const usedDouble = doubleVoteIds.has(p.id);
              return (
                <motion.div
                  key={p.id}
                  initial={{ scale: 0.4, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.35 + i * 0.2,
                    duration: 0.55,
                    ease: [0.34, 1.4, 0.64, 1],
                  }}
                  className="flex flex-col items-center text-center gap-3"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.7, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-court-brass/40 blur-2xl scale-150"
                    />
                    <Avatar seed={p.avatar} size={140} />
                  </div>
                  <p className="court-title text-3xl text-court-parchment">
                    {p.pseudo}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-gavel text-court-accuse text-4xl tabular-nums">
                      {count}
                    </span>
                    <span className="text-court-parchment/60 text-xs uppercase tracking-widest">
                      {count <= 1 ? "voix" : "voix"}
                    </span>
                    {usedDouble && (
                      <span className="text-court-accuse text-xs ml-1 border border-court-accuse/60 rounded px-1.5 py-0.5 tracking-widest">
                        ×2
                      </span>
                    )}
                  </div>
                  {showVoters && voters.length > 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 + i * 0.2 }}
                      className="text-court-parchment/60 text-xs max-w-[200px]"
                    >
                      Accusé par&nbsp;:{" "}
                      <span className="text-court-parchment/90">
                        {voters
                          .map((id) => playerById.get(id)?.pseudo ?? "?")
                          .join(", ")}
                      </span>
                    </motion.p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
