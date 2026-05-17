import { motion } from "framer-motion";
import { useStore } from "../store";
import { Button } from "../components/Button";
import { accentFor } from "../components/PlayerCard";

export function Final() {
  const { final, lobby, selfId, startGame, leave } = useStore();
  if (!final || !lobby) return null;

  const isHost = lobby.hostId === selfId;
  const podium = final.finalRanking.slice(0, 3);
  const rest = final.finalRanking.slice(3);
  const maxScore = Math.max(1, ...final.finalRanking.map((p) => p.score));

  return (
    <div className="relative z-10 min-h-screen px-6 md:px-10 pt-6 pb-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <button
            onClick={leave}
            className="overline text-white/50 hover:text-white"
          >
            ← QUITTER
          </button>
          <div className="overline text-white/40">FIN — SALON Nº{lobby.code}</div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mt-10"
        >
          <div className="overline text-white/40 mb-2">
            ↳ RÉSULTATS DÉFINITIFS
          </div>
          <h1 className="italic-display text-[18vw] md:text-[12vw] leading-[0.85] tracking-tight">
            Verdict
            <span style={{ color: "var(--acid)" }}>.</span>
          </h1>
          <div className="hr-line mt-6" />
        </motion.div>

        {/* Podium */}
        <section className="mt-10">
          <div className="overline text-white/50 mb-4">PODIUM</div>
          <div className="grid gap-3 md:grid-cols-3">
            {podium.map((p, i) => {
              const accent = accentFor(p.pseudo);
              const place = i + 1;
              const isYou = p.id === selfId;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 40, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: 0.4 + i * 0.15,
                    type: "spring",
                    stiffness: 200,
                    damping: 18,
                  }}
                  className="relative overflow-hidden rounded-3xl border bg-white/[0.03] p-7"
                  style={{
                    borderColor: i === 0 ? accent : "rgba(255,255,255,0.1)",
                    boxShadow:
                      i === 0 ? `0 0 60px ${accent}30` : undefined,
                  }}
                >
                  <div className="flex items-baseline justify-between">
                    <span
                      className="italic-display text-7xl"
                      style={{ color: i === 0 ? accent : "rgba(255,255,255,0.3)" }}
                    >
                      {String(place).padStart(2, "0")}
                    </span>
                    {i === 0 && (
                      <span className="overline text-acid">★ CHAMPION</span>
                    )}
                  </div>
                  <div className="mt-6">
                    <div className="text-3xl font-semibold tracking-tight truncate">
                      {p.pseudo}
                      {isYou && (
                        <span className="ml-2 overline text-acid">VOUS</span>
                      )}
                    </div>
                    <div
                      className="italic-display text-5xl tabular-nums mt-2"
                      style={{ color: accent }}
                    >
                      {p.score}
                      <span className="overline text-white/30 ml-2">PTS</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Rest of ranking */}
        {rest.length > 0 && (
          <section className="mt-10">
            <div className="overline text-white/50 mb-3">AUTRES JOUEURS</div>
            <div className="grid gap-2">
              {rest.map((p, i) => {
                const accent = accentFor(p.pseudo);
                const pct = (p.score / maxScore) * 100;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 + i * 0.05 }}
                    className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
                  >
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(to right, ${accent}30, transparent)`,
                      }}
                    />
                    <div className="relative flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <span className="overline text-white/40 w-7">
                          {String(i + 4).padStart(2, "0")}
                        </span>
                        <span className="text-lg font-semibold tracking-tight">
                          {p.pseudo}
                        </span>
                      </div>
                      <span
                        className="italic-display text-2xl tabular-nums"
                        style={{ color: accent }}
                      >
                        {p.score}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* History recap */}
        <section className="mt-12">
          <div className="overline text-white/50 mb-3">
            RÉCAP DES {final.history.length} QUESTIONS
          </div>
          <div className="grid gap-2">
            {final.history.map((h, i) => {
              const top = h.ranked[0];
              if (!top || top.count === 0) {
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <div className="overline text-white/40">
                      Nº{String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="italic-display text-xl mt-1 text-white/60">
                      {h.question}
                    </div>
                    <div className="overline text-white/30 mt-2">PERSONNE</div>
                  </div>
                );
              }
              const accent = accentFor(top.pseudo);
              return (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="overline text-white/40">
                        Nº{String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="italic-display text-xl mt-1 truncate">
                        {h.question}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="italic-display text-2xl"
                        style={{ color: accent }}
                      >
                        {top.pseudo}
                      </div>
                      <div className="overline text-white/40">
                        {top.count} vote{top.count > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Restart */}
        <div className="mt-12 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="overline text-white/40">UNE AUTRE ?</div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={leave}>
              QUITTER
            </Button>
            {isHost && (
              <Button variant="acid" onClick={startGame}>
                REJOUER →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
