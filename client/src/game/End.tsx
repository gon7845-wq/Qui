import { useState } from "react";
import { motion } from "framer-motion";
import type { RoomState } from "@qui/shared";
import { Avatar } from "../components/Avatar";
import { Gavel } from "../components/Gavel";
import { requestRematch } from "../lib/actions";

interface Props {
  state: RoomState;
  playerId: string;
  onLeave: () => void;
}

export function EndScreen({ state, playerId, onLeave }: Props) {
  const me = state.players.find((p) => p.id === playerId);
  const isHost = me?.isHost === true;
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onRematch = async () => {
    setError(null);
    setBusy(true);
    const res = await requestRematch();
    setBusy(false);
    if (!res.ok) setError(res.message);
  };

  // Podium positions: order top3 as [2nd, 1st, 3rd] for the visual stair
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean) as typeof top3;
  const heights = ["h-32", "h-44", "h-24"];
  const medals = ["🥈", "🥇", "🥉"];

  return (
    <div className="min-h-full px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ rotate: -25, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: "backOut" }}
            className="inline-block mb-4"
          >
            <Gavel size={56} />
          </motion.div>
          <p className="text-xs uppercase tracking-[0.5em] text-court-parchment/50">
            L'audience est levée
          </p>
          <h1 className="court-title text-4xl sm:text-5xl text-court-parchment mt-2">
            Le verdict final
          </h1>
        </motion.header>

        {podium.length > 0 && (
          <div className="flex items-end justify-center gap-3 sm:gap-5 mb-12">
            {podium.map((p, i) => {
              const realRank =
                p === top3[0] ? 0 : p === top3[1] ? 1 : 2;
              return (
                <motion.div
                  key={p.id}
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: 0.3 + i * 0.2,
                    duration: 0.7,
                    ease: "backOut",
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <Avatar seed={p.avatar} size={64} />
                  <p className="font-medium text-court-parchment text-sm truncate max-w-[7rem]">
                    {p.pseudo}
                  </p>
                  <p className="font-gavel text-court-brass text-2xl tabular-nums">
                    {p.score}
                  </p>
                  <div
                    className={`w-16 sm:w-24 ${heights[i]} rounded-t-lg bg-gradient-to-b from-court-brass/40 to-court-oak border border-court-brass/40 grid place-items-center text-3xl`}
                  >
                    {medals[realRank]}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {rest.length > 0 && (
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="court-card p-4 divide-y divide-court-brass/10 mb-8"
          >
            {rest.map((p, idx) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className="font-gavel text-court-brass tabular-nums w-6 text-center">
                  {idx + 4}
                </span>
                <Avatar seed={p.avatar} size={32} dim={!p.connected} />
                <span className="flex-1 text-court-parchment truncate">
                  {p.pseudo}
                </span>
                <span className="font-gavel text-court-parchment tabular-nums">
                  {p.score}
                </span>
              </li>
            ))}
          </motion.ul>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="flex flex-col sm:flex-row gap-3 items-center justify-center"
        >
          <button className="court-btn-ghost" onClick={onLeave}>
            Quitter le tribunal
          </button>
          {isHost ? (
            <button
              className="court-btn"
              onClick={onRematch}
              disabled={busy}
            >
              {busy ? "Préparation…" : "Rejuger ce groupe"}
            </button>
          ) : (
            <p className="text-court-parchment/50 text-sm italic">
              Le juge peut relancer une partie.
            </p>
          )}
        </motion.div>

        {error && (
          <p className="text-court-accuse text-sm text-center mt-4">{error}</p>
        )}
      </div>
    </div>
  );
}
