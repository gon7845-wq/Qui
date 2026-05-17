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
            className="overline text-pearl/50 hover:text-pearl"
          >
            ← QUITTER
          </button>
          <div className="overline text-pearl/40">
            FIN — SALON Nº{lobby.code}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mt-10"
        >
          <div className="overline text-pearl/40 mb-2">
            ↳ RÉSULTATS DÉFINITIFS
          </div>
          <h1 className="italic-display iridescent-text text-[18vw] md:text-[12vw] leading-[0.85] tracking-tight">
            Verdict.
          </h1>
          <div className="hr-line mt-6" />
        </motion.div>

        {/* Podium */}
        <section className="mt-10">
          <div className="overline text-pearl/55 mb-4">PODIUM</div>
          <div className="grid gap-3 md:grid-cols-3">
            {podium.map((p, i) => {
              const [c1, c2] = accentFor(p.pseudo);
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
                  className={`relative overflow-hidden rounded-3xl p-7 glass ${i === 0 ? "iri-ring" : ""}`}
                  style={{
                    boxShadow:
                      i === 0
                        ? `0 0 70px ${c1}40, inset 0 0 40px ${c2}15`
                        : undefined,
                  }}
                >
                  <div className="relative flex items-baseline justify-between">
                    <span
                      className="italic-display text-7xl"
                      style={{
                        color: i === 0 ? c2 : "rgba(244,241,255,0.3)",
                        textShadow:
                          i === 0 ? `0 0 40px ${c1}55` : undefined,
                      }}
                    >
                      {String(place).padStart(2, "0")}
                    </span>
                    {i === 0 && (
                      <span className="overline iridescent-text">
                        ★ CHAMPION
                      </span>
                    )}
                  </div>
                  <div className="relative mt-6">
                    <div className="text-3xl font-semibold tracking-tight truncate">
                      {p.pseudo}
                      {isYou && (
                        <span className="ml-2 overline iridescent-text">
                          VOUS
                        </span>
                      )}
                    </div>
                    <div
                      className="italic-display text-5xl tabular-nums mt-2"
                      style={{ color: c2 }}
                    >
                      {p.score}
                      <span className="overline text-pearl/30 ml-2">PTS</span>
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
            <div className="overline text-pearl/55 mb-3">AUTRES JOUEURS</div>
            <div className="grid gap-2">
              {rest.map((p, i) => {
                const [c1, c2] = accentFor(p.pseudo);
                const pct = (p.score / maxScore) * 100;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 + i * 0.05 }}
                    className="relative overflow-hidden rounded-xl glass"
                  >
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(to right, ${c1}33, transparent)`,
                      }}
                    />
                    <div className="relative flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <span className="overline text-pearl/40 w-7">
                          {String(i + 4).padStart(2, "0")}
                        </span>
                        <span className="text-lg font-semibold tracking-tight">
                          {p.pseudo}
                        </span>
                      </div>
                      <span
                        className="italic-display text-2xl tabular-nums"
                        style={{ color: c2 }}
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
          <div className="overline text-pearl/55 mb-3">
            RÉCAP DES {final.history.length} QUESTIONS
          </div>
          <div className="grid gap-2">
            {final.history.map((h, i) => {
              const top = h.ranked[0];
              if (!top || top.count === 0) {
                return (
                  <div
                    key={i}
                    className="rounded-xl glass p-4"
                  >
                    <div className="overline text-pearl/40">
                      Nº{String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="italic-display text-xl mt-1 text-pearl/55">
                      {h.question}
                    </div>
                    <div className="overline text-pearl/30 mt-2">PERSONNE</div>
                  </div>
                );
              }
              const [, c2] = accentFor(top.pseudo);
              return (
                <div
                  key={i}
                  className="rounded-xl glass p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="overline text-pearl/40">
                        Nº{String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="italic-display text-xl mt-1 truncate">
                        {h.question}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="italic-display text-2xl"
                        style={{ color: c2 }}
                      >
                        {top.pseudo}
                      </div>
                      <div className="overline text-pearl/40">
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
          <div className="overline text-pearl/45">UNE AUTRE ?</div>
          <div className="flex gap-3">
            <Button variant="glass" onClick={leave}>
              QUITTER
            </Button>
            {isHost && (
              <Button variant="iri" onClick={startGame}>
                REJOUER →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
