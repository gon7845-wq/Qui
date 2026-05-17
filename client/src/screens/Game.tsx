import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { Timer } from "../components/Timer";
import { Button } from "../components/Button";
import { PlayerCard, accentFor } from "../components/PlayerCard";

export function Game() {
  const { lobby, selfId, reveal, nextRound } = useStore();
  if (!lobby) return null;

  const isHost = lobby.hostId === selfId;
  const isQuestion = lobby.state === "question" && !reveal;
  const isReveal = lobby.state === "reveal" && reveal;

  return (
    <div className="relative z-10 min-h-screen px-6 md:px-10 pt-6 pb-12">
      <div className="mx-auto max-w-5xl">
        {/* HUD */}
        <div className="flex items-center justify-between">
          <div className="overline text-pearl/40">
            ROUND {String(lobby.currentRound).padStart(2, "0")} /{" "}
            {String(lobby.totalRounds).padStart(2, "0")}
          </div>
          <div className="overline text-pearl/40">SALON Nº{lobby.code}</div>
        </div>

        <AnimatePresence mode="wait">
          {isQuestion && (
            <QuestionView key={`q-${lobby.currentRound}`} />
          )}
          {isReveal && reveal && (
            <RevealView
              key={`r-${lobby.currentRound}`}
              isHost={isHost}
              onNext={nextRound}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function QuestionView() {
  const { lobby, selfId, vote } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const currentRound = lobby?.currentRound ?? 0;

  useEffect(() => {
    setSelected(null);
  }, [currentRound]);

  if (!lobby || !lobby.currentQuestion || !lobby.roundEndTime) return null;

  const voted = !!selected;

  function handleVote(targetId: string) {
    if (voted) return;
    setSelected(targetId);
    vote(targetId);
  }

  const players = lobby.players;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Question reveal */}
      <div className="relative mt-10 mb-2 rounded-3xl glass-strong px-6 py-10 md:px-10 md:py-12">
        <motion.h1
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="italic-display text-5xl md:text-7xl tracking-tight leading-[0.95]"
        >
          {lobby.currentQuestion}
        </motion.h1>
      </div>

      {/* Timer + status */}
      <div className="mt-6 flex items-center gap-6">
        <Timer
          endTime={lobby.roundEndTime}
          duration={lobby.settings.voteDuration}
        />
        <div className="overline text-pearl/45 hidden sm:block">
          {lobby.votesCount} / {lobby.players.length} ONT VOTÉ
        </div>
      </div>

      {/* Players to vote */}
      <div className="mt-8">
        <div className="overline text-pearl/55 mb-3">
          {voted ? "EN ATTENTE DES AUTRES…" : "→ VOTE POUR UN JOUEUR"}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {players.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04, duration: 0.4 }}
            >
              <PlayerCard
                player={p}
                index={i}
                isSelf={p.id === selfId}
                selected={selected === p.id}
                disabled={voted && selected !== p.id}
                onClick={() => handleVote(p.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function RevealView({
  isHost,
  onNext,
}: {
  isHost: boolean;
  onNext: () => void;
}) {
  const { reveal, lobby, selfId } = useStore();
  if (!reveal || !lobby) return null;

  const top = reveal.ranked[0];
  const isWinner = top && top.count > 0;
  const ties = reveal.ranked.filter((r) => r.count === top.count && top.count > 0);
  const maxCount = Math.max(1, ...reveal.ranked.map((r) => r.count));

  const votersByTarget = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (reveal.votes) {
      for (const [voterId, targetId] of Object.entries(reveal.votes)) {
        if (!map[targetId]) map[targetId] = [];
        const voter = lobby.players.find((p) => p.id === voterId);
        if (voter) map[targetId].push(voter.pseudo);
      }
    }
    return map;
  }, [reveal, lobby.players]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Question banner (smaller) */}
      <div className="mt-6 rounded-3xl glass px-6 py-6">
        <div className="overline text-pearl/45 mb-2">LA QUESTION ÉTAIT</div>
        <h2 className="italic-display text-3xl md:text-5xl tracking-tight leading-tight text-pearl/85">
          {reveal.question}
        </h2>
      </div>

      {/* Winner reveal */}
      {isWinner && (
        <div className="mt-10">
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -3 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 18,
              delay: 0.3,
            }}
            className="text-center"
          >
            <div className="overline text-pearl/45 mb-2">
              {ties.length > 1 ? `${ties.length} EX-AEQUO` : "C'EST"}
            </div>
            <div
              className="italic-display iridescent-text text-[20vw] md:text-[14vw] leading-[0.85] tracking-tight"
              style={{
                filter:
                  "drop-shadow(0 0 60px rgba(221, 160, 255, 0.45)) drop-shadow(0 0 100px rgba(255, 184, 225, 0.25))",
              }}
            >
              {ties.length > 1
                ? ties.map((t) => t.pseudo).join(" & ")
                : top.pseudo}
            </div>
            <div className="overline text-pearl/55 mt-2">
              {top.count} VOTE{top.count > 1 ? "S" : ""}
            </div>
          </motion.div>
        </div>
      )}
      {!isWinner && (
        <div className="mt-10 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="italic-display text-6xl text-pearl/30"
          >
            personne n'a voté.
          </motion.div>
        </div>
      )}

      {/* Ranking bars */}
      <div className="mt-12">
        <div className="overline text-pearl/55 mb-4">RÉSULTATS</div>
        <div className="grid gap-2">
          {reveal.ranked.map((r, i) => {
            const [c1, c2] = accentFor(r.pseudo);
            const pct = (r.count / maxCount) * 100;
            const isYou = r.id === selfId;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.08, duration: 0.4 }}
                className="relative overflow-hidden rounded-xl glass"
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{
                    delay: 0.8 + i * 0.08,
                    duration: 0.9,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="absolute inset-y-0 left-0"
                  style={{
                    background: `linear-gradient(to right, ${c1}55, ${c2}22, transparent)`,
                    borderRight:
                      r.count > 0 ? `1.5px solid ${c2}` : undefined,
                    boxShadow:
                      r.count > 0
                        ? `0 0 30px ${c1}55, inset 0 0 30px ${c2}22`
                        : undefined,
                  }}
                />
                <div className="relative flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="overline text-pearl/40 w-7">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-lg font-semibold tracking-tight">
                      {r.pseudo}
                    </span>
                    {isYou && (
                      <span className="overline iridescent-text">VOUS</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {!reveal.anonymous && votersByTarget[r.id]?.length > 0 && (
                      <span className="overline text-pearl/55 hidden sm:inline">
                        ← {votersByTarget[r.id].join(" · ")}
                      </span>
                    )}
                    <span
                      className="italic-display text-3xl tabular-nums"
                      style={{
                        color: r.count > 0 ? c2 : "rgba(244,241,255,0.3)",
                      }}
                    >
                      {r.count}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Next */}
      <div className="mt-10 flex items-center justify-between">
        <div className="overline text-pearl/45">
          PROCHAIN ROUND DANS QUELQUES SECONDES…
        </div>
        {isHost && (
          <Button variant="glass" onClick={onNext}>
            PASSER →
          </Button>
        )}
      </div>
    </motion.div>
  );
}
