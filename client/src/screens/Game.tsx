import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { Timer } from "../components/Timer";
import { Button } from "../components/Button";
import { DossierCard, caseNumber } from "../components/DossierCard";
import { Stamp } from "../components/Stamp";
import type { Ranked } from "../types";

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
          <div className="overline text-paper/55">
            AFFAIRE Nº{String(lobby.currentRound).padStart(2, "0")} /{" "}
            {String(lobby.totalRounds).padStart(2, "0")}
          </div>
          <div className="overline text-paper/55">SALLE Nº{lobby.code}</div>
        </div>

        <AnimatePresence mode="wait">
          {isQuestion && <QuestionView key={`q-${lobby.currentRound}`} />}
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

// ─── ACT I — L'AFFAIRE ───
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
      {/* The accusation: typed onto parchment */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -1 }}
        animate={{ opacity: 1, y: 0, rotate: -0.4 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="paper relative mt-8 rounded-[3px] p-8 md:p-12"
      >
        <div className="overline text-ink/55 mb-3">
          ✚ L'ACCUSATION ✚
        </div>
        <motion.h1
          initial={{ opacity: 0, filter: "blur(4px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-serif-italic text-4xl md:text-6xl leading-[1] text-ink"
        >
          {lobby.currentQuestion}
        </motion.h1>
        <div className="mt-6 font-typewriter text-[11px] uppercase tracking-widest text-ink/55">
          Le jury est invité à rendre son verdict
        </div>

        {/* Stamp on the paper */}
        <div className="absolute right-4 top-4 md:right-8 md:top-8">
          <Stamp variant="coupable" rotate={-12} size="md">
            URGENT
          </Stamp>
        </div>
      </motion.div>

      {/* Timer + vote counter */}
      <div className="mt-6 flex items-center gap-6 flex-wrap">
        <Timer
          endTime={lobby.roundEndTime}
          duration={lobby.settings.voteDuration}
        />
        <div className="overline text-paper/55 ml-auto">
          {lobby.votesCount} / {lobby.players.length} BULLETINS SCELLÉS
        </div>
      </div>

      {/* Dossiers — choose the accused */}
      <div className="mt-8">
        <div className="overline text-paper/65 mb-4">
          {voted
            ? "BULLETIN SCELLÉ — EN ATTENTE DES AUTRES"
            : "→ DÉSIGNE UN COUPABLE PARMI LE JURY"}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {players.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05, duration: 0.4 }}
            >
              <DossierCard
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

// ─── ACTS II/III — LE VERDICT ───
function RevealView({
  isHost,
  onNext,
}: {
  isHost: boolean;
  onNext: () => void;
}) {
  const { reveal, lobby, selfId } = useStore();
  if (!reveal || !lobby) return null;

  // Sort lowest to highest for dramatic flip order, but keep top at end
  const flipOrder = useMemo<Ranked[]>(() => {
    return [...reveal.ranked].sort((a, b) => a.count - b.count);
  }, [reveal]);

  const top = [...reveal.ranked].sort((a, b) => b.count - a.count)[0];
  const ties = top?.count
    ? reveal.ranked.filter((r) => r.count === top.count)
    : [];
  const hasGuilty = top && top.count > 0;

  // Stage machine: gavel → flips → guilty
  // Timings (must fit roughly within revealDuration ~9s)
  const GAVEL_MS = 1500;
  const FLIP_STEP_MS = 600;
  const GUILTY_DELAY_MS = GAVEL_MS + flipOrder.length * FLIP_STEP_MS;

  const [phase, setPhase] = useState<"gavel" | "flipping" | "guilty">("gavel");
  const [flippedUpTo, setFlippedUpTo] = useState(-1);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        setPhase("flipping");
      }, GAVEL_MS)
    );
    for (let i = 0; i < flipOrder.length; i++) {
      timers.push(
        setTimeout(() => {
          setFlippedUpTo(i);
        }, GAVEL_MS + i * FLIP_STEP_MS)
      );
    }
    timers.push(
      setTimeout(() => {
        setPhase("guilty");
      }, GUILTY_DELAY_MS)
    );
    return () => timers.forEach(clearTimeout);
  }, [reveal.round]);

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
      className="relative"
    >
      {/* ACT I — Gavel slam header */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mt-8 text-center"
      >
        <div className="overline text-paper/55 mb-2">
          ✚ AFFAIRE Nº{String(reveal.round).padStart(2, "0")} ✚
        </div>
        <motion.h2
          initial={{ scale: 2.6, opacity: 0, rotate: -3 }}
          animate={{ scale: 1, opacity: 1, rotate: -1 }}
          transition={{
            duration: 0.55,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className="font-stamp text-5xl md:text-8xl text-paper inline-block"
          style={{
            textShadow: "0 0 30px rgba(200,57,47,0.3)",
          }}
        >
          LE&nbsp;JURY A&nbsp;DÉLIBÉRÉ
        </motion.h2>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "gavel" ? 1 : 0.6 }}
          className="mt-4 font-serif-italic text-2xl text-cream/80 max-w-2xl mx-auto"
        >
          « {reveal.question} »
        </motion.div>
      </motion.div>

      {/* ACT II — Cards flip from lowest votes to highest */}
      {(phase === "flipping" || phase === "guilty") && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-10"
        >
          <div className="overline text-paper/60 mb-4 text-center">
            ✚ DÉPOUILLEMENT DES BULLETINS ✚
          </div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {flipOrder.map((r, i) => {
              const flipped = i <= flippedUpTo;
              const isTop = hasGuilty && r.count === top.count;
              const isStillSecret = phase === "flipping" && isTop;
              // We hide the guilty card during ACT II to keep mystery
              if (isStillSecret) {
                return (
                  <FlipCard
                    key={r.id}
                    flipped={false}
                    rank={r}
                    voters={votersByTarget[r.id]}
                    anonymous={reveal.anonymous}
                    isSelf={r.id === selfId}
                    secret
                  />
                );
              }
              return (
                <FlipCard
                  key={r.id}
                  flipped={flipped}
                  rank={r}
                  voters={votersByTarget[r.id]}
                  anonymous={reveal.anonymous}
                  isSelf={r.id === selfId}
                  isTop={isTop}
                  reveal={phase === "guilty" && isTop}
                />
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ACT III — The verdict — guilty announced */}
      <AnimatePresence>
        {phase === "guilty" && hasGuilty && (
          <motion.div
            key="verdict-banner"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-12 text-center"
          >
            <div className="overline text-paper/55 mb-3">
              {ties.length > 1 ? `${ties.length} EX-AEQUO` : "LE COUPABLE EST"}
            </div>
            <motion.div
              initial={{ scale: 0.6, opacity: 0, rotate: -2 }}
              animate={{ scale: 1, opacity: 1, rotate: -1.5 }}
              transition={{
                delay: 0.5,
                duration: 0.7,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              className="font-stamp leading-[0.82] tracking-tight"
              style={{
                fontSize: "clamp(64px, 16vw, 200px)",
                color: "var(--paper)",
                textShadow:
                  "0 0 60px rgba(200,57,47,0.45), 0 0 100px rgba(200,57,47,0.2)",
              }}
            >
              {ties.length > 1
                ? ties.map((t) => t.pseudo).join(" & ")
                : top.pseudo}
            </motion.div>
            <motion.div
              initial={{ scale: 2.6, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: -6 }}
              transition={{
                delay: 0.9,
                duration: 0.55,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              className="mt-2 inline-block"
            >
              <Stamp variant="coupable" rotate={-6} size="xl">
                COUPABLE
              </Stamp>
            </motion.div>
            <div className="mt-4 font-typewriter text-[12px] uppercase tracking-widest text-paper/55">
              {top.count} VOIX · CASIER +3 PTS
            </div>
          </motion.div>
        )}

        {phase === "guilty" && !hasGuilty && (
          <motion.div
            key="no-verdict"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-16 text-center"
          >
            <Stamp variant="innocent" rotate={-3} size="xl">
              NON-LIEU
            </Stamp>
            <div className="mt-4 font-serif-italic text-2xl text-paper/65">
              Aucune charge retenue.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next */}
      <div className="mt-12 flex items-center justify-between">
        <div className="overline text-paper/55">
          AFFAIRE SUIVANTE DANS QUELQUES SECONDES…
        </div>
        {isHost && (
          <Button variant="ghost" size="sm" onClick={onNext}>
            PASSER →
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function FlipCard({
  flipped,
  rank,
  voters,
  anonymous,
  isSelf,
  isTop,
  secret,
  reveal: highlightReveal,
}: {
  flipped: boolean;
  rank: Ranked;
  voters?: string[];
  anonymous: boolean;
  isSelf?: boolean;
  isTop?: boolean;
  secret?: boolean;
  reveal?: boolean;
}) {
  const caseNo = caseNumber(rank.pseudo + rank.id);
  const label: "INNOCENT" | "SUSPECT" | "COUPABLE" =
    rank.count === 0 ? "INNOCENT" : isTop ? "COUPABLE" : "SUSPECT";
  const labelVariant: "innocent" | "suspect" | "coupable" =
    rank.count === 0 ? "innocent" : isTop ? "coupable" : "suspect";

  return (
    <div
      className={`flip-3d aspect-[3/4] ${flipped ? "flipped" : ""}`}
      style={{ width: "100%" }}
    >
      <div className="flip-3d-inner h-full w-full">
        {/* FRONT — sealed envelope */}
        <div
          className="flip-3d-face h-full w-full rounded-[3px] overflow-hidden p-3 flex flex-col items-center justify-center text-center relative"
          style={{
            background:
              "linear-gradient(160deg, #2A1019 0%, #1E0810 60%, #10050A 100%)",
            border: "1px solid rgba(240,230,208,0.12)",
            boxShadow: "0 10px 30px -10px rgba(0,0,0,0.7)",
          }}
        >
          <div className="font-typewriter text-[9px] uppercase tracking-widest text-paper/40 absolute top-2 left-2">
            Nº{caseNo}
          </div>
          <div className="font-typewriter text-[9px] uppercase tracking-widest text-paper/40 absolute top-2 right-2">
            JURY
          </div>
          <div className="absolute inset-0 grid place-items-center">
            <div className="wax-seal">
              {secret ? "?" : "✚"}
            </div>
          </div>
          <div className="absolute bottom-3 left-0 right-0 font-stamp text-xs text-paper/60">
            BULLETIN
          </div>
        </div>

        {/* BACK — verdict revealed */}
        <div
          className={`flip-3d-face flip-3d-back paper h-full w-full rounded-[3px] p-3 flex flex-col items-center justify-between text-center relative ${
            isTop ? "ring-2 ring-vermillion" : ""
          }`}
          style={{
            outline: isTop ? "3px solid var(--vermillion)" : undefined,
            outlineOffset: isTop ? "-3px" : undefined,
          }}
        >
          <div className="relative z-10 w-full flex items-center justify-between font-typewriter text-[9px] uppercase tracking-widest text-ink/55">
            <span>Nº{caseNo}</span>
            <span>{isSelf ? "VOUS" : ""}</span>
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div
              className="font-stamp leading-none"
              style={{
                fontSize: "clamp(40px, 7vw, 64px)",
                color: "var(--ink)",
              }}
            >
              {rank.count}
            </div>
            <div className="font-typewriter text-[10px] uppercase tracking-widest text-ink/55 mt-1">
              {rank.count > 1 ? "VOIX" : "VOIX"}
            </div>
            <div className="font-serif text-xl text-ink mt-2 truncate max-w-full">
              {rank.pseudo}
            </div>
          </div>
          <div className="relative z-10 w-full flex flex-col items-center gap-1">
            <Stamp
              variant={labelVariant}
              rotate={-7}
              size="sm"
              animate={!!highlightReveal && isTop}
              delay={0.1}
            >
              {label}
            </Stamp>
            {!anonymous && voters && voters.length > 0 && (
              <div className="font-typewriter text-[9px] uppercase tracking-wider text-ink/55 line-clamp-1">
                {voters.join(" · ")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
