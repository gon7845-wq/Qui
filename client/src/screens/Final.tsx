import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Avatar } from "../components/Avatar";
import { TONE, tone, type Tone } from "../lib/colors";

interface Entry {
  text: string;
  tone: Tone;
  count: number;
}
interface Bulletin {
  id: string;
  pseudo: string;
  isHost: boolean;
  total: number;
  entries: Entry[];
  topCited: boolean;
}

export function Final() {
  const { final, lobby, selfId, startGame, leave } = useStore();

  const bulletins = useMemo<Bulletin[]>(() => {
    if (!final || !lobby) return [];
    const topScore = final.finalRanking[0]?.score ?? 0;
    return final.finalRanking.map((r) => {
      const player = lobby.players.find((p) => p.id === r.id);
      const entries: Entry[] = [];
      for (const h of final.history) {
        const mine = h.ranked.find((x) => x.id === r.id);
        if (mine && mine.count > 0) {
          entries.push({ text: h.question.text, tone: tone(h.question.tone), count: mine.count });
        }
      }
      entries.sort((a, b) => b.count - a.count);
      return {
        id: r.id,
        pseudo: r.pseudo,
        isHost: !!player?.isHost,
        total: r.score,
        entries,
        topCited: r.score > 0 && r.score === topScore,
      };
    });
  }, [final, lobby]);

  const startIdx = useMemo(() => {
    const i = bulletins.findIndex((b) => b.id === selfId);
    return i >= 0 ? i : 0;
  }, [bulletins, selfId]);

  const [idx, setIdx] = useState(startIdx);
  const [dir, setDir] = useState(0);

  if (!final || !lobby || bulletins.length === 0) return null;
  const isHost = lobby.hostId === selfId;
  const current = bulletins[Math.min(idx, bulletins.length - 1)];

  function go(d: number) {
    setDir(d);
    setIdx((i) => (i + d + bulletins.length) % bulletins.length);
  }

  return (
    <div className="relative h-full w-full overflow-y-auto no-scrollbar">
      <button
        onClick={leave}
        className="fixed top-5 left-5 z-40 label text-ink-soft hover:text-ink transition-colors"
      >
        ← Quitter
      </button>

      <div className="min-h-full grid place-items-center px-5 py-16">
        <div className="w-full max-w-lg flex flex-col items-center gap-5">
          <div className="text-center">
            <div className="font-display brand-gradient" style={{ fontSize: "clamp(28px,6vmin,46px)" }}>
              Les bulletins
            </div>
            <div className="label text-ink-soft mt-1">Le portrait de chacun par le groupe</div>
          </div>

          <div className="relative w-full" style={{ minHeight: 420 }}>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={current.id}
                custom={dir}
                initial={{ opacity: 0, x: dir >= 0 ? 60 : -60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir >= 0 ? -60 : 60 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <BulletinCard b={current} isSelf={current.id === selfId} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Nav */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => go(-1)}
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink-soft shadow-md hover:text-ink transition"
              aria-label="Précédent"
            >
              ←
            </button>
            <div className="flex gap-1.5">
              {bulletins.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setDir(i > idx ? 1 : -1);
                    setIdx(i);
                  }}
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: i === idx ? 22 : 8,
                    background: i === idx ? "var(--accent)" : "rgba(255,94,138,0.25)",
                  }}
                  aria-label={`Bulletin ${b.pseudo}`}
                />
              ))}
            </div>
            <button
              onClick={() => go(1)}
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink-soft shadow-md hover:text-ink transition"
              aria-label="Suivant"
            >
              →
            </button>
          </div>

          <div className="flex gap-2 mt-1">
            <Button variant="soft" size="sm" onClick={leave}>
              Quitter
            </Button>
            {isHost && (
              <Button size="sm" onClick={startGame}>
                Rejouer →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BulletinCard({ b, isSelf }: { b: Bulletin; isSelf: boolean }) {
  const groups = (
    [
      { tone: "warm" as Tone, title: `${TONE.warm.emoji} Ton bon côté`, entries: b.entries.filter((e) => e.tone === "warm") },
      { tone: "spicy" as Tone, title: `${TONE.spicy.emoji} Ton côté piquant`, entries: b.entries.filter((e) => e.tone === "spicy") },
      { tone: "fun" as Tone, title: `${TONE.fun.emoji} Pour rire`, entries: b.entries.filter((e) => e.tone === "fun") },
    ]
  ).filter((g) => g.entries.length > 0);

  const headline = b.entries[0];

  return (
    <Card className="w-full p-7">
      <div className="flex flex-col items-center text-center gap-2">
        <Avatar pseudo={b.pseudo} colorKey={b.id} size={92} />
        <div className="flex items-center gap-2">
          {b.topCited && (
            <span className="brand-gradient font-display label" style={{ fontSize: 11 }}>
              ⭐ Le plus cité de la soirée
            </span>
          )}
        </div>
        {headline && (
          <div className={`tone-${headline.tone} mt-1`}>
            <div className="label text-ink-faint">Le groupe te voit surtout comme</div>
            <div className="font-display tone-text leading-snug" style={{ fontSize: "clamp(18px,3.4vmin,24px)" }}>
              {headline.text}
            </div>
          </div>
        )}
      </div>

      {b.entries.length === 0 ? (
        <div className="mt-6 text-center font-display text-ink-soft">
          Le groupe est resté discret avec {isSelf ? "toi" : b.pseudo} 🤫
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.tone} className={`tone-${g.tone}`}>
              <div className="label text-ink-soft mb-2">{g.title}</div>
              <div className="flex flex-col gap-1.5">
                {g.entries.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5"
                    style={{ background: "#FFF1E9" }}
                  >
                    <span className="font-body text-sm text-ink leading-tight">{e.text}</span>
                    <span className="tone-gradient shrink-0 grid place-items-center rounded-full px-2.5 h-7 text-white font-display text-sm">
                      ×{e.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
