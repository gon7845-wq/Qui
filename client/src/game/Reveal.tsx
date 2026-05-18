import { motion, AnimatePresence } from "framer-motion";
import type { Phase, RoomState } from "@qui/shared";
import { Avatar } from "../components/Avatar";
import { Gavel } from "../components/Gavel";

interface Props {
  state: RoomState;
}

/**
 * Minimal multi-phase reveal. Will be polished in step 4 (Framer + audio).
 * For now: shows the right thing at each sub-phase so the loop is testable.
 */
export function RevealScreen({ state }: Props) {
  const phase = state.phase;
  const reveal = state.reveal;
  if (!reveal) return null;

  const guiltyPlayers = state.players.filter((p) => reveal.guilty.includes(p.id));
  const playerById = new Map(state.players.map((p) => [p.id, p]));

  return (
    <div className="min-h-full grid place-items-center px-6 py-10 overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === "round:reveal:intro" && (
          <SubScene key="intro">
            <motion.div
              initial={{ scale: 0.6, rotate: -25, opacity: 0 }}
              animate={{ scale: 1.4, rotate: 12, opacity: 1 }}
              transition={{ duration: 0.5, ease: "backOut" }}
              className="origin-center"
            >
              <Gavel size={140} />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="court-title text-3xl tracking-[0.4em] text-court-brass mt-6"
            >
              VERDICT
            </motion.p>
          </SubScene>
        )}

        {phase === "round:reveal:box" && (
          <SubScene key="box">
            <p className="court-title text-xs tracking-[0.4em] text-court-parchment/50 mb-4">
              Le box des accusés
            </p>
            <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {reveal.results.map((r, i) => {
                const p = playerById.get(r.playerId);
                if (!p) return null;
                return (
                  <motion.li
                    key={r.playerId}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.06, duration: 0.35 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <Avatar seed={p.avatar} size={64} />
                    <span className="text-court-parchment/70 text-xs truncate max-w-[80px]">
                      {p.pseudo}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </SubScene>
        )}

        {phase === "round:reveal:elimination" && (
          <SubScene key="elim">
            <p className="court-title text-xs tracking-[0.4em] text-court-parchment/50 mb-4">
              Le jury se prononce…
            </p>
            <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {reveal.results.map((r, i) => {
                const p = playerById.get(r.playerId);
                if (!p) return null;
                const isGuilty = reveal.guilty.includes(r.playerId);
                // Eliminate from low to high — last places fade first
                const delay = (reveal.results.length - 1 - i) * 0.18;
                return (
                  <motion.li
                    key={r.playerId}
                    initial={{ opacity: 1 }}
                    animate={isGuilty ? { opacity: 1, scale: 1.05 } : { opacity: 0.1, scale: 0.9, filter: "grayscale(1)" }}
                    transition={{ delay, duration: 0.4 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <Avatar seed={p.avatar} size={64} dim={!isGuilty} />
                    <span className="text-court-parchment/70 text-xs truncate max-w-[80px]">
                      {p.pseudo}
                    </span>
                    <span className="font-gavel text-court-brass text-sm">
                      {r.voteCount}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </SubScene>
        )}

        {phase === "round:reveal:verdict" && (
          <SubScene key="verdict">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="court-title text-xs tracking-[0.5em] text-court-accuse mb-4"
            >
              {guiltyPlayers.length > 1 ? "COUPABLES" : "COUPABLE"}
            </motion.p>
            <div className="flex items-center justify-center gap-6 flex-wrap">
              {guiltyPlayers.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ scale: 0.4, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.18, duration: 0.5, ease: "backOut" }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-court-brass/30 blur-2xl scale-150" />
                    <Avatar seed={p.avatar} size={140} />
                  </div>
                  <p className="court-title text-2xl text-court-parchment">
                    {p.pseudo}
                  </p>
                  <p className="font-gavel text-court-brass text-3xl tabular-nums">
                    {reveal.results.find((r) => r.playerId === p.id)?.voteCount ?? 0}{" "}
                    voix
                  </p>
                </motion.div>
              ))}
            </div>
            {guiltyPlayers.length === 0 && (
              <p className="text-court-parchment/60 court-title text-2xl">
                Aucun verdict prononcé.
              </p>
            )}
          </SubScene>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubScene({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center flex flex-col items-center"
    >
      {children}
    </motion.div>
  );
}

// Make Phase usable in JSX guards (typing aid)
export type _RevealPhase = Extract<Phase, `round:reveal:${string}`>;
