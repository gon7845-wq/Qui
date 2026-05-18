import { motion, AnimatePresence } from "framer-motion";
import type { RoomState } from "@qui/shared";
import { Avatar } from "../components/Avatar";

interface Props {
  state: RoomState;
}

export function ScoreScreen({ state }: Props) {
  const reveal = state.reveal;
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const deltaById = new Map(
    (reveal?.pointsAwarded ?? []).map((p) => [p.playerId, p.delta])
  );

  return (
    <div className="min-h-full grid place-items-center px-6 py-10">
      <div className="max-w-2xl w-full">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs uppercase tracking-[0.4em] text-court-parchment/50 text-center mb-2"
        >
          Manche {state.round!.index + 1} / {state.round!.total}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="court-title text-3xl text-court-parchment text-center mb-8"
        >
          Greffe&nbsp;: les cumuls
        </motion.h2>

        <ul className="court-card p-5 sm:p-6 divide-y divide-court-brass/10">
          <AnimatePresence>
            {sorted.map((p, idx) => {
              const delta = deltaById.get(p.id) ?? 0;
              return (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="flex items-center gap-4 py-3 relative"
                >
                  <span className="font-gavel text-2xl text-court-brass tabular-nums w-8 text-center">
                    {idx + 1}
                  </span>
                  <Avatar seed={p.avatar} size={44} dim={!p.connected} />
                  <span className="flex-1 text-court-parchment truncate">
                    {p.pseudo}
                  </span>
                  {delta > 0 && (
                    <motion.span
                      initial={{ opacity: 0, y: 14, scale: 0.5 }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        y: [14, -10, -18, -30],
                        scale: [0.5, 1.2, 1, 0.8],
                      }}
                      transition={{
                        delay: 0.6 + idx * 0.06,
                        duration: 1.6,
                        times: [0, 0.25, 0.65, 1],
                      }}
                      className="absolute right-20 font-gavel text-2xl tabular-nums text-court-brass pointer-events-none"
                      style={{
                        textShadow: "0 0 12px rgba(201,163,90,0.7)",
                      }}
                    >
                      +{delta}
                    </motion.span>
                  )}
                  <motion.span
                    key={`score-${p.score}`}
                    initial={delta > 0 ? { scale: 1.3, color: "#c9a35a" } : false}
                    animate={{ scale: 1, color: "#e8dcb0" }}
                    transition={{ delay: 0.9 + idx * 0.06, duration: 0.4 }}
                    className="font-gavel text-2xl tabular-nums w-12 text-right"
                  >
                    {p.score}
                  </motion.span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}
