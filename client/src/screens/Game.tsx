import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { Table } from "../components/Table";
import { Seats } from "../components/Seats";
import { CenterCard } from "../components/CenterCard";
import { VoteTokens } from "../components/VoteTokens";
import type { Player, Ranked } from "../types";

export function Game() {
  const { lobby, reveal } = useStore();
  if (!lobby) return null;

  const isQuestion = lobby.state === "question" && !reveal;
  const isReveal = lobby.state === "reveal" && reveal;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Floating HUD */}
      <div className="fixed top-5 left-5 z-40 label text-cream/55">
        MANCHE {String(lobby.currentRound).padStart(2, "0")} /{" "}
        {String(lobby.totalRounds).padStart(2, "0")}
      </div>
      <div className="fixed top-5 right-5 z-40 label text-cream/55">
        TABLE Nº{lobby.code}
      </div>

      <div className="absolute inset-0 grid place-items-center px-3 py-6">
        <AnimatePresence mode="wait">
          {isQuestion && <QuestionPhase key={`q-${lobby.currentRound}`} />}
          {isReveal && reveal && <RevealPhase key={`r-${lobby.currentRound}`} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── PHASE 1 — VOTE ───
function QuestionPhase() {
  const { lobby, selfId, vote } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const currentRound = lobby?.currentRound ?? 0;

  useEffect(() => {
    setSelected(null);
  }, [currentRound]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  if (!lobby || !lobby.currentQuestion || !lobby.roundEndTime) return null;

  const remaining = Math.max(0, lobby.roundEndTime - now);
  const seconds = Math.ceil(remaining / 1000);
  const pct = Math.min(1, remaining / (lobby.settings.voteDuration * 1000));
  const urgent = seconds <= 3;

  const voted = !!selected;

  function handleSelect(id: string) {
    if (voted) return;
    setSelected(id);
    vote(id);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full h-full grid place-items-center"
    >
      <Table>
        {/* Timer ring around the felt */}
        <TimerRing pct={pct} urgent={urgent} />

        <Seats
          players={lobby.players}
          selfId={selfId}
          selectedId={selected}
          onSelect={handleSelect}
          selectableIds={new Set(lobby.players.map((p) => p.id))}
        />

        <CenterCard widthRatio={0.62}>
          <div className="label text-ink/55">L'ACCUSATION</div>
          <motion.div
            initial={{ opacity: 0, filter: "blur(6px)", y: 6 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif-i leading-[1.02] mt-1"
            style={{
              fontSize: "clamp(22px, 3.6vmin, 38px)",
              color: "var(--ink)",
            }}
          >
            {lobby.currentQuestion}
          </motion.div>
          <div className="mt-4 flex items-center justify-center gap-3">
            <span
              className={`font-display tabular-nums ${urgent ? "text-ruby" : "text-ink"}`}
              style={{
                fontSize: "clamp(28px, 5vmin, 46px)",
                animation: urgent ? "ticker 0.4s ease-in-out infinite" : undefined,
              }}
            >
              {String(seconds).padStart(2, "0")}
            </span>
            <span className="label text-ink/55">SEC</span>
          </div>
          <div className="label text-ink/55 mt-3">
            {voted ? "JETON LANCÉ — EN ATTENTE…" : "→ TAPE UN JETON"}
          </div>
          <div className="label text-ink/40 mt-1">
            {lobby.votesCount} / {lobby.players.length} ONT VOTÉ
          </div>
        </CenterCard>
      </Table>
    </motion.div>
  );
}

function TimerRing({ pct, urgent }: { pct: number; urgent: boolean }) {
  // SVG circle outline that shrinks as time runs out
  const C = 2 * Math.PI * 48; // circumference for r=48 in a 100-viewbox
  const dash = C * pct;
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 z-20 pointer-events-none"
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: "visible" }}
    >
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="none"
        stroke={urgent ? "#C8392F" : "#C8A23F"}
        strokeWidth="0.6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${C}`}
        transform="rotate(-90 50 50)"
        style={{
          transition: "stroke-dasharray 100ms linear",
          filter: urgent
            ? "drop-shadow(0 0 6px rgba(200,57,47,0.6))"
            : "drop-shadow(0 0 4px rgba(200,162,63,0.4))",
        }}
      />
    </svg>
  );
}

// ─── PHASE 2 — REVEAL (tokens fly to guilty) ───
function RevealPhase() {
  const { reveal, lobby, selfId, nextRound } = useStore();
  if (!reveal || !lobby) return null;
  const isHost = lobby.hostId === selfId;

  // Tally for highlighting
  const tally: Record<string, number> = {};
  reveal.ranked.forEach((r) => (tally[r.id] = r.count));
  const sorted = [...reveal.ranked].sort((a, b) => b.count - a.count);
  const top = sorted[0];
  const hasGuilty = top && top.count > 0;
  const ties: Ranked[] = hasGuilty
    ? sorted.filter((r) => r.count === top.count)
    : [];

  // Stage machine
  const [stage, setStage] = useState<"deal" | "tokens" | "verdict">("deal");
  const [tokenCount, setTokenCount] = useState(0);

  // Build the votes map. If anonymous & we don't have real per-vote data,
  // synthesize one entry per voter pointing to its target (so tokens still fly).
  // Server now sends votes:null when anonymous. We need positional voters list.
  const votesMap = useMemo<Record<string, string>>(() => {
    if (reveal.votes) return reveal.votes;
    // Anonymous: synthesize from ranked counts using anonymous-voter IDs.
    // We map each "guess voter" to a target so tokens still animate.
    const out: Record<string, string> = {};
    let idx = 0;
    for (const r of reveal.ranked) {
      for (let k = 0; k < r.count; k++) {
        const voter = lobby.players[idx % lobby.players.length];
        if (voter) out[`anon-${idx}-${r.id}`] = r.id;
        idx++;
      }
    }
    return out;
  }, [reveal, lobby.players]);

  const totalVotes = Object.keys(votesMap).length;

  useEffect(() => {
    setStage("deal");
    setTokenCount(0);
    const timers: ReturnType<typeof setTimeout>[] = [];

    // After 0.9s, start dropping tokens one by one
    timers.push(
      setTimeout(() => {
        setStage("tokens");
      }, 900)
    );

    for (let i = 0; i < totalVotes; i++) {
      timers.push(
        setTimeout(() => {
          setTokenCount(i + 1);
        }, 900 + i * 280)
      );
    }

    // Then reveal verdict 0.6s after last token
    timers.push(
      setTimeout(() => {
        setStage("verdict");
      }, 900 + totalVotes * 280 + 600)
    );

    return () => timers.forEach(clearTimeout);
  }, [reveal.round]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full h-full grid place-items-center"
    >
      <Table>
        {/* Spotlight on the guilty during verdict */}
        {stage === "verdict" && hasGuilty && (
          <GuiltySpotlight
            playerIds={ties.map((t) => t.id)}
            players={lobby.players}
          />
        )}

        <Seats
          players={lobby.players}
          selfId={selfId}
          voteCounts={stage === "verdict" ? tally : undefined}
          highlightId={stage === "verdict" && hasGuilty ? top.id : null}
        />

        {/* Animated vote tokens flying from voters to targets */}
        <VoteTokens
          votes={votesMap}
          players={lobby.players}
          count={tokenCount}
        />

        <AnimatePresence mode="wait">
          {stage === "deal" && (
            <CenterCard key="deal" widthRatio={0.6} variant="card">
              <div className="label text-ink/55">VERDICT</div>
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="font-display leading-[0.95] mt-1"
                style={{
                  fontSize: "clamp(28px, 5.5vmin, 56px)",
                  color: "var(--ink)",
                }}
              >
                Les jetons tombent…
              </motion.div>
              <div
                className="font-serif-i mt-3"
                style={{
                  fontSize: "clamp(14px, 2vmin, 18px)",
                  color: "var(--ink)",
                }}
              >
                « {reveal.question} »
              </div>
            </CenterCard>
          )}

          {stage === "tokens" && (
            <CenterCard
              key="tokens"
              widthRatio={0.5}
              variant="card"
              className="!py-4"
            >
              <div className="label text-ink/55">DÉPOUILLEMENT</div>
              <div
                className="font-display tabular-nums leading-none mt-1"
                style={{ fontSize: "clamp(36px, 8vmin, 80px)" }}
              >
                {tokenCount} / {totalVotes}
              </div>
              <div className="label text-ink/55 mt-1">JETONS COMPTÉS</div>
            </CenterCard>
          )}

          {stage === "verdict" && (
            <CenterCard
              key="verdict"
              widthRatio={0.7}
              variant="plaque"
              className="!py-4"
            >
              {hasGuilty ? (
                <>
                  <div
                    className="label"
                    style={{ color: "rgba(26,12,8,0.7)" }}
                  >
                    {ties.length > 1 ? `${ties.length} EX-AEQUO` : "COUPABLE"}
                  </div>
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0, rotate: -3 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{
                      duration: 0.6,
                      ease: [0.34, 1.56, 0.64, 1],
                      delay: 0.2,
                    }}
                    className="font-display leading-[0.88] mt-1"
                    style={{
                      fontSize: "clamp(40px, 9vmin, 96px)",
                      color: "var(--wood-900)",
                    }}
                  >
                    {ties.length > 1
                      ? ties.map((t) => t.pseudo).join(" & ")
                      : top.pseudo}
                  </motion.div>
                  <div
                    className="label mt-2"
                    style={{ color: "rgba(26,12,8,0.7)" }}
                  >
                    {top.count} VOIX · +3 PTS
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="label"
                    style={{ color: "rgba(26,12,8,0.7)" }}
                  >
                    NON-LIEU
                  </div>
                  <div
                    className="font-display leading-tight mt-1"
                    style={{
                      fontSize: "clamp(32px, 7vmin, 72px)",
                      color: "var(--wood-900)",
                    }}
                  >
                    Aucun jeton lancé.
                  </div>
                </>
              )}
            </CenterCard>
          )}
        </AnimatePresence>
      </Table>

      {/* Floating "skip" for host */}
      {isHost && (
        <button
          onClick={nextRound}
          className="fixed bottom-5 right-5 z-40 label text-cream/55 hover:text-cream"
        >
          PASSER →
        </button>
      )}
    </motion.div>
  );
}

function GuiltySpotlight({
  playerIds,
  players,
}: {
  playerIds: string[];
  players: Player[];
}) {
  // We render spotlights at each tied player's seat
  const [size, setSize] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => {
      const r = e[0].contentRect;
      setSize(Math.min(r.width, r.height));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 z-10 pointer-events-none">
      {size > 0 &&
        playerIds.map((id) => {
          const idx = players.findIndex((p) => p.id === id);
          if (idx < 0) return null;
          const total = players.length;
          const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
          const r = size * 0.4;
          const x = size / 2 + r * Math.cos(angle);
          const y = size / 2 + r * Math.sin(angle);
          return (
            <div
              key={id}
              className="absolute spotlight"
              style={{
                left: x,
                top: y,
                width: size * 0.42,
                height: size * 0.42,
                marginLeft: -(size * 0.21),
                marginTop: -(size * 0.21),
                animation: "spot-pulse 2s ease-in-out infinite",
              }}
            />
          );
        })}
    </div>
  );
}

