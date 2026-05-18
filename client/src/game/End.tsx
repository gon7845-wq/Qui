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
  const playerById = new Map(state.players.map((p) => [p.id, p]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onRematch = async () => {
    setError(null);
    setBusy(true);
    const res = await requestRematch();
    setBusy(false);
    if (!res.ok) setError(res.message);
  };

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
            Les verdicts
          </h1>
        </motion.header>

        {state.history.length === 0 ? (
          <p className="text-center text-court-parchment/60 italic">
            Aucun verdict prononcé.
          </p>
        ) : (
          <motion.ol
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="court-card divide-y divide-court-brass/15"
          >
            {state.history.map((entry, idx) => {
              const guiltyPlayers = entry.guilty
                .map((id) => playerById.get(id))
                .filter((p): p is NonNullable<typeof p> => Boolean(p));
              const isTie = guiltyPlayers.length > 1;

              return (
                <motion.li
                  key={entry.index}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.07 }}
                  className="p-4 sm:p-5"
                >
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="font-gavel text-court-brass tabular-nums">
                      Manche {entry.index + 1}
                    </span>
                    <span className="text-court-parchment/40 text-xs uppercase tracking-widest">
                      {entry.voteCount} voix
                    </span>
                  </div>
                  <p className="text-court-parchment/80 text-sm sm:text-base mb-3 italic">
                    « {entry.question.text} »
                  </p>
                  {guiltyPlayers.length === 0 ? (
                    <p className="text-court-parchment/40 text-sm">
                      Aucun verdict.
                    </p>
                  ) : (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-court-accuse text-xs uppercase tracking-widest font-bold">
                        {isTie ? "Coupables" : "Coupable"} →
                      </span>
                      {guiltyPlayers.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 bg-court-accuse/10 border border-court-accuse/40 rounded-full pl-1 pr-3 py-1"
                        >
                          <Avatar seed={p.avatar} size={28} />
                          <span className="text-court-parchment font-medium text-sm">
                            {p.pseudo}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.li>
              );
            })}
          </motion.ol>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex flex-col sm:flex-row gap-3 items-center justify-center mt-10"
        >
          <button className="court-btn-ghost" onClick={onLeave}>
            Quitter le tribunal
          </button>
          {isHost ? (
            <button className="court-btn" onClick={onRematch} disabled={busy}>
              {busy ? "Préparation…" : "Rejuger ce groupe"}
            </button>
          ) : (
            <p className="text-court-parchment/50 text-sm italic">
              Le juge peut relancer une partie.
            </p>
          )}
        </motion.div>

        {error && (
          <p
            role="alert"
            aria-live="assertive"
            className="text-court-accuse text-sm text-center mt-4"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
