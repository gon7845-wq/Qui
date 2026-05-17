import { motion } from "framer-motion";
import { useStore } from "../store";
import { Button } from "../components/Button";
import { Stamp } from "../components/Stamp";

export function Final() {
  const { final, lobby, selfId, startGame, leave } = useStore();
  if (!final || !lobby) return null;

  const isHost = lobby.hostId === selfId;
  const podium = final.finalRanking.slice(0, 3);
  const rest = final.finalRanking.slice(3);
  const champion = podium[0];

  return (
    <div className="relative z-10 min-h-screen px-6 md:px-10 pt-6 pb-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <button
            onClick={leave}
            className="overline text-paper/55 hover:text-paper"
          >
            ← QUITTER
          </button>
          <div className="overline text-paper/55">
            ✚ AUDIENCE LEVÉE ✚ SALLE Nº{lobby.code}
          </div>
        </div>

        {/* Verdict final poster */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: -0.4 }}
          transition={{ duration: 0.8 }}
          className="paper relative mt-8 rounded-[3px] p-7 md:p-12 overflow-hidden"
        >
          <div className="relative z-10 text-center">
            <div className="overline text-ink/55 mb-2">JUGEMENT DÉFINITIF</div>
            <h1 className="font-stamp text-[14vw] md:text-[10vw] leading-[0.85] text-ink">
              VERDICT.
            </h1>
            <div className="mt-4 font-serif-italic text-2xl text-ink/70">
              Le pire de la salle a été désigné.
            </div>
          </div>

          {/* Corner stamps */}
          <div className="absolute right-4 top-4 md:right-8 md:top-8">
            <Stamp variant="verdict" rotate={-9} size="md">
              SCELLÉ
            </Stamp>
          </div>
        </motion.div>

        {/* Champion big card */}
        {champion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="paper relative mt-8 rounded-[3px] p-8 md:p-12 overflow-hidden"
          >
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
              <div>
                <div className="overline text-ink/55 mb-2">
                  ✚ LE PIRE DE LA SALLE ✚
                </div>
                <div
                  className="font-stamp leading-[0.82]"
                  style={{
                    fontSize: "clamp(64px, 13vw, 180px)",
                    color: "var(--vermillion-dark)",
                  }}
                >
                  {champion.pseudo}
                </div>
                <div className="mt-3 font-typewriter text-[11px] uppercase tracking-widest text-ink/55">
                  Casier judiciaire alourdi de {champion.score} points
                </div>
              </div>
              <Stamp variant="coupable" rotate={-8} size="xl" animate delay={0.6}>
                CONDAMNÉ·E
              </Stamp>
            </div>
          </motion.div>
        )}

        {/* Podium 2-3 */}
        {podium.length > 1 && (
          <section className="mt-10">
            <div className="overline text-paper/65 mb-4">
              ✚ AUTRES SUSPECT·E·S NOTABLES ✚
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {podium.slice(1).map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.15 }}
                  className="paper relative rounded-[3px] p-6"
                >
                  <div className="overline text-ink/55">
                    {i + 2}ÈME PLACE
                  </div>
                  <div className="mt-2 font-serif-italic text-4xl text-ink truncate">
                    {p.pseudo}
                  </div>
                  <div className="mt-2 font-stamp text-2xl text-vermillion-dark">
                    {p.score} PTS
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Rest */}
        {rest.length > 0 && (
          <section className="mt-10">
            <div className="overline text-paper/65 mb-3">
              ✚ AUTRES MEMBRES DU JURY ✚
            </div>
            <div className="grid gap-2">
              {rest.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 + i * 0.05 }}
                  className="flex items-center justify-between rounded-[3px] border border-paper/15 px-5 py-3"
                  style={{ background: "rgba(240,230,208,0.04)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-typewriter text-[11px] text-paper/55">
                      {String(i + 4).padStart(2, "0")}.
                    </span>
                    <span className="font-serif text-xl text-paper">
                      {p.pseudo}
                    </span>
                    {p.id === selfId && (
                      <span className="overline text-vermillion">VOUS</span>
                    )}
                  </div>
                  <span className="font-stamp text-paper/85">
                    {p.score} PTS
                  </span>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Recap des affaires */}
        <section className="mt-12">
          <div className="overline text-paper/65 mb-3">
            ✚ RECUEIL DES {final.history.length} AFFAIRES ✚
          </div>
          <div className="grid gap-2">
            {final.history.map((h, i) => {
              const top = h.ranked[0];
              if (!top || top.count === 0) {
                return (
                  <div
                    key={i}
                    className="paper relative rounded-[3px] p-4"
                    style={{ transform: "rotate(-0.3deg)" }}
                  >
                    <div className="overline text-ink/55">
                      Nº{String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="font-serif-italic text-xl mt-1 text-ink/65">
                      {h.question}
                    </div>
                    <div className="overline text-ink/40 mt-2">NON-LIEU</div>
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className="paper relative rounded-[3px] p-4"
                  style={{ transform: `rotate(${(i % 2 === 0 ? -0.4 : 0.3)}deg)` }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="overline text-ink/55">
                        AFFAIRE Nº{String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="font-serif-italic text-xl mt-1 truncate text-ink">
                        {h.question}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-stamp text-xl text-vermillion-dark">
                        {top.pseudo}
                      </div>
                      <div className="font-typewriter text-[10px] uppercase tracking-widest text-ink/55">
                        {top.count} voix
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-12 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="overline text-paper/55">UNE AUTRE AUDIENCE ?</div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={leave}>
              QUITTER
            </Button>
            {isHost && (
              <Button variant="primary" onClick={startGame}>
                ROUVRIR L'AUDIENCE →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
