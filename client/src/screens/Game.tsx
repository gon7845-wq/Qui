import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { PlayerGrid } from "../components/PlayerGrid";
import { Card } from "../components/Card";
import { VoteReactions } from "../components/VoteReactions";
import { Confetti } from "../components/Confetti";
import { PauseOverlay } from "../components/PauseOverlay";
import { TONE, tone } from "../lib/colors";
import type { Ranked } from "../types";

export function Game() {
  const { lobby, reveal, selfId, pause, resume } = useStore();
  if (!lobby) return null;

  const isQuestion = lobby.state === "question" && !reveal;
  const isReveal = lobby.state === "reveal" && reveal;
  const isHost = lobby.hostId === selfId;
  const canPause = isHost && !lobby.paused && (isQuestion || isReveal);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="fixed top-5 left-5 z-40 label text-ink-soft">
        Manche {lobby.currentRound} / {lobby.totalRounds}
      </div>
      <div className="fixed top-5 right-5 z-40 label text-ink-faint">#{lobby.code}</div>

      <div className="absolute inset-0 grid place-items-center px-5 py-16 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          {isQuestion && <QuestionPhase key={`q-${lobby.currentRound}`} />}
          {isReveal && reveal && <RevealPhase key={`r-${lobby.currentRound}`} />}
        </AnimatePresence>
      </div>

      {canPause && (
        <button
          onClick={pause}
          className="fixed bottom-5 left-5 z-40 label text-ink-soft hover:text-ink transition-colors"
        >
          ⏸ Pause
        </button>
      )}

      <AnimatePresence>
        {lobby.paused && <PauseOverlay isHost={isHost} onResume={resume} />}
      </AnimatePresence>
    </div>
  );
}

// ─── PHASE 1 — VOTE ───
function QuestionPhase() {
  const { lobby, selfId, vote } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const currentRound = lobby?.currentRound ?? 0;

  useEffect(() => setSelected(null), [currentRound]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  if (!lobby || !lobby.currentQuestion || !lobby.roundEndTime) return null;

  const t = tone(lobby.currentQuestion.tone);
  const meta = TONE[t];
  const remaining = Math.max(0, lobby.roundEndTime - now);
  const seconds = Math.ceil(remaining / 1000);
  const pct = Math.min(1, remaining / (lobby.settings.voteDuration * 1000));
  const urgent = seconds <= 3;
  const voted = !!selected;
  const noSelf = lobby.settings.allowSelfVote === false;
  const selectableIds = new Set(
    lobby.players.filter((p) => !noSelf || p.id !== selfId).map((p) => p.id)
  );
  const selectedName = selected ? lobby.players.find((p) => p.id === selected)?.pseudo ?? "" : "";

  function handleSelect(id: string) {
    if (noSelf && id === selfId) return;
    if (id === selected) return; // déjà voté pour cette personne
    setSelected(id);
    vote(id); // le serveur remplace le vote précédent
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className={`w-full max-w-2xl flex flex-col items-center gap-6 tone-${t}`}
    >
      <Card className="w-full p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="tone-gradient rounded-full px-3 py-1 text-white label" style={{ fontSize: 10 }}>
            {meta.emoji} {meta.label}
          </span>
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="font-display text-ink leading-tight"
          style={{ fontSize: "clamp(22px, 4vmin, 34px)" }}
        >
          {lobby.currentQuestion.text}
        </motion.h1>

        {/* Timer bar */}
        <div className="mt-5 h-2.5 w-full rounded-full bg-[#F3E7DD] overflow-hidden">
          <div
            className="h-full rounded-full tone-gradient"
            style={{
              width: `${pct * 100}%`,
              transition: "width 100ms linear",
              animation: urgent ? "wiggle 0.4s ease-in-out infinite" : undefined,
            }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="label text-ink-faint">
            {lobby.votesCount}/{lobby.players.length} ont voté
          </span>
          <span className={`font-display ${urgent ? "tone-text" : "text-ink-soft"}`} style={{ fontSize: 18 }}>
            {seconds}s
          </span>
        </div>
      </Card>

      <div className="label text-ink-soft text-center">
        {voted
          ? `✓ Voté pour ${selectedName} — touche quelqu'un d'autre pour changer`
          : noSelf
          ? "👇 Touche quelqu'un (pas toi)"
          : "👇 Touche une personne"}
      </div>

      <PlayerGrid
        players={lobby.players}
        selfId={selfId}
        selectedId={selected}
        onSelect={handleSelect}
        selectableIds={selectableIds}
      />
    </motion.div>
  );
}

// ─── PHASE 2 — REVEAL ───
function RevealPhase() {
  const { reveal, lobby, selfId, nextRound } = useStore();
  const [stage, setStage] = useState<"tally" | "verdict">("tally");

  useEffect(() => {
    setStage("tally");
    const id = setTimeout(() => setStage("verdict"), 1700);
    return () => clearTimeout(id);
  }, [reveal?.round]);

  if (!reveal || !lobby) return null;
  const isHost = lobby.hostId === selfId;

  const t = tone(reveal.question.tone);
  const meta = TONE[t];

  const tally: Record<string, number> = {};
  reveal.ranked.forEach((r) => (tally[r.id] = r.count));
  const sorted = [...reveal.ranked].sort((a, b) => b.count - a.count);
  const top = sorted[0];
  const hasResult = top && top.count > 0;
  const ties: Ranked[] = hasResult ? sorted.filter((r) => r.count === top.count) : [];
  const totalVotes = reveal.ranked.reduce((s, r) => s + r.count, 0);

  const headings: Record<string, string> = {
    warm: "Le groupe a choisi",
    spicy: "Le groupe a parlé",
    fun: "Et le verdict…",
  };
  const subtitles: Record<string, string> = {
    warm: "le plus aimé sur cette question",
    spicy: "ça pique un peu",
    fun: "voilà la réponse du groupe",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className={`w-full max-w-2xl flex flex-col items-center gap-6 tone-${t}`}
    >
      {stage === "verdict" && hasResult && <VoteReactions emoji={meta.reaction} count={totalVotes * 4} />}
      {stage === "verdict" && hasResult && t === "warm" && <Confetti count={60} seed={reveal.round} />}

      <Card className="w-full p-6 text-center">
        <div className="label text-ink-faint mb-1">« {reveal.question.text} »</div>
        <AnimatePresence mode="wait">
          {stage === "tally" ? (
            <motion.div
              key="tally"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-display text-ink-soft py-2"
              style={{ fontSize: "clamp(20px, 3.4vmin, 28px)" }}
            >
              On compte les voix… {meta.emoji}
            </motion.div>
          ) : hasResult ? (
            <motion.div
              key="verdict"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
            >
              <div className="label text-ink-soft">
                {ties.length > 1 ? `${ties.length} ex æquo` : headings[t]}
              </div>
              <div
                className="font-display tone-text leading-tight my-1"
                style={{ fontSize: "clamp(40px, 9vmin, 76px)" }}
              >
                {ties.map((x) => x.pseudo).join(" & ")}
              </div>
              <div className="label text-ink-soft">
                {top.count} voix · {subtitles[t]}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-display text-ink-soft py-2"
              style={{ fontSize: "clamp(24px, 5vmin, 40px)" }}
            >
              Personne n'a voté 🤷
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <PlayerGrid
        players={lobby.players}
        selfId={selfId}
        voteCounts={stage === "verdict" ? tally : undefined}
        highlightId={stage === "verdict" && hasResult ? top.id : null}
        dimOthers={stage === "verdict" && hasResult}
      />

      {isHost && (
        <button
          onClick={nextRound}
          className="fixed bottom-5 right-5 z-40 label text-ink-soft hover:text-ink transition-colors"
        >
          Passer →
        </button>
      )}
    </motion.div>
  );
}
