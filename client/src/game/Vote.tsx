import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { PlayerId, RoomState } from "@qui/shared";
import { Avatar } from "../components/Avatar";
import { CountdownBar } from "../components/CountdownBar";
import { castVote } from "../lib/actions";
import { useCountdown } from "../lib/useCountdown";

interface Props {
  state: RoomState;
  playerId: string;
}

export function VoteScreen({ state, playerId }: Props) {
  const q = state.round?.question;
  const settings = state.settings;
  const totalMs = settings.voteDurationSec * 1_000;
  const { msLeft, progress } = useCountdown(state.phaseEndsAt, totalMs);

  const me = state.players.find((p) => p.id === playerId);
  const canDouble = (me?.doubleVoteRemaining ?? 0) > 0;
  const [doubleArmed, setDoubleArmed] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<PlayerId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committedTarget, setCommittedTarget] = useState<PlayerId | null>(null);
  const [committedDouble, setCommittedDouble] = useState(false);

  // Reset selection when phase changes (server jumped to next round)
  useEffect(() => {
    setPendingTarget(null);
    setCommittedTarget(null);
    setCommittedDouble(false);
    setError(null);
    setDoubleArmed(false);
  }, [state.round?.index]);

  const candidates = useMemo(
    () =>
      state.players.filter(
        (p) => settings.allowSelfVote || p.id !== playerId
      ),
    [state.players, settings.allowSelfVote, playerId]
  );

  const votedIds = new Set(state.round?.votedPlayerIds ?? []);
  const myVoteCommitted = committedTarget !== null && votedIds.has(playerId);

  const handlePick = async (targetId: PlayerId) => {
    setError(null);
    const useDouble = doubleArmed && canDouble;
    setPendingTarget(targetId);
    const res = await castVote(targetId, useDouble);
    setPendingTarget(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setCommittedTarget(targetId);
    setCommittedDouble(useDouble);
  };

  return (
    <div className="min-h-full px-4 sm:px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-6">
          <p className="text-xs uppercase tracking-[0.4em] text-court-parchment/50 mb-2">
            Manche {state.round!.index + 1} / {state.round!.total}
          </p>
          <motion.h2
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="court-title text-2xl sm:text-4xl font-bold text-court-parchment leading-tight max-w-3xl mx-auto"
          >
            {q?.text}
          </motion.h2>
        </header>

        <div className="court-card p-4 sm:p-6 mb-5">
          <CountdownBar msLeft={msLeft} totalMs={totalMs} progress={progress} />
          <div className="mt-3 flex items-center justify-between text-xs text-court-parchment/50 uppercase tracking-wider">
            <span>
              {votedIds.size} / {state.players.length} ont voté
            </span>
            <DoubleToggle
              canDouble={canDouble}
              armed={doubleArmed}
              committed={committedDouble}
              onToggle={() => setDoubleArmed((v) => !v)}
            />
          </div>
        </div>

        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {candidates.map((p) => {
            const isCommitted = committedTarget === p.id;
            const isPending = pendingTarget === p.id;
            const hasVoted = votedIds.has(p.id);
            return (
              <motion.li
                key={p.id}
                layout
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <button
                  onClick={() => handlePick(p.id)}
                  className={`w-full court-card p-3 flex flex-col items-center gap-2 transition relative
                    ${isCommitted ? "ring-2 ring-court-brass shadow-spotlight" : ""}
                    ${isPending ? "opacity-60" : ""}
                  `}
                >
                  <div className="relative">
                    <Avatar seed={p.avatar} size={72} dim={!p.connected} />
                    {hasVoted && p.id !== playerId && (
                      <span className="absolute -top-1 -right-1 bg-court-brass text-court-ink rounded-full w-5 h-5 grid place-items-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-court-parchment truncate max-w-full">
                    {p.pseudo}
                  </span>
                  {isCommitted && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-court-brass text-court-ink text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded-full">
                      {committedDouble ? "×2 accusé" : "Accusé"}
                    </span>
                  )}
                </button>
              </motion.li>
            );
          })}
        </ul>

        {error && (
          <p
            role="alert"
            aria-live="assertive"
            className="text-court-accuse text-sm text-center mt-4"
          >
            {error}
          </p>
        )}
        {myVoteCommitted && (
          <p className="text-court-parchment/50 text-xs text-center mt-6 italic">
            Tu peux changer d'avis tant que le marteau ne tombe pas.
          </p>
        )}
      </div>
    </div>
  );
}

interface DoubleToggleProps {
  canDouble: boolean;
  armed: boolean;
  committed: boolean;
  onToggle: () => void;
}

function DoubleToggle({ canDouble, armed, committed, onToggle }: DoubleToggleProps) {
  if (committed) {
    return (
      <span className="text-court-accuse tracking-wider">×2 verrouillé</span>
    );
  }
  if (!canDouble) {
    return <span className="text-court-parchment/30">×2 utilisé</span>;
  }
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1 rounded-full text-xs uppercase tracking-widest border transition ${
        armed
          ? "bg-court-accuse/20 border-court-accuse text-court-accuse"
          : "border-court-brass/40 text-court-parchment/70 hover:border-court-brass"
      }`}
    >
      ×2 {armed ? "armé" : "armer le double"}
    </button>
  );
}
