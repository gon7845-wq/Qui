import { motion } from "framer-motion";
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
        <p className="text-xs uppercase tracking-[0.4em] text-court-parchment/50 text-center mb-2">
          Manche {state.round!.index + 1} / {state.round!.total}
        </p>
        <h2 className="court-title text-3xl text-court-parchment text-center mb-8">
          Greffier&nbsp;: cumul
        </h2>

        <ul className="court-card p-5 sm:p-6 divide-y divide-court-brass/10">
          {sorted.map((p, idx) => {
            const delta = deltaById.get(p.id) ?? 0;
            return (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="flex items-center gap-4 py-3"
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
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.08 }}
                    className="text-sm text-court-brass font-bold"
                  >
                    +{delta}
                  </motion.span>
                )}
                <span className="font-gavel text-2xl text-court-parchment tabular-nums w-12 text-right">
                  {p.score}
                </span>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
