import { motion } from "framer-motion";
import { useStore } from "../store";
import { Table } from "../components/Table";
import { Seats } from "../components/Seats";
import { CenterCard } from "../components/CenterCard";
import { Button } from "../components/Button";

export function Final() {
  const { final, lobby, selfId, startGame, leave } = useStore();
  if (!final || !lobby) return null;

  const isHost = lobby.hostId === selfId;
  const champion = final.finalRanking[0];

  // Rebuild a player array sorted by score so seats show ranking spatially
  const sortedPlayers = final.finalRanking
    .map((r) => lobby.players.find((p) => p.id === r.id))
    .filter(Boolean) as typeof lobby.players;

  const scoresById: Record<string, number> = {};
  final.finalRanking.forEach((r) => (scoresById[r.id] = r.score));

  return (
    <div className="relative h-full w-full overflow-hidden">
      <button
        onClick={leave}
        className="fixed top-5 left-5 z-40 label text-cream/55 hover:text-cream"
      >
        ← QUITTER
      </button>

      <div className="absolute inset-0 grid place-items-center px-3 py-6">
        <Table>
          {/* Spotlight on champion */}
          {champion && (
            <ChampionSpotlight
              champId={champion.id}
              players={sortedPlayers}
            />
          )}
          <Seats
            players={sortedPlayers}
            selfId={selfId}
            voteCounts={scoresById}
            highlightId={champion?.id ?? null}
          />
          <CenterCard widthRatio={0.7} variant="plaque" className="!py-5">
            <div className="label" style={{ color: "rgba(26,12,8,0.7)" }}>
              LE PIRE DE LA SALLE
            </div>
            {champion ? (
              <motion.div
                initial={{ scale: 0.6, opacity: 0, rotate: -3 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{
                  duration: 0.7,
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: 0.3,
                }}
                className="font-display leading-[0.88] mt-1"
                style={{
                  fontSize: "clamp(44px, 11vmin, 110px)",
                  color: "var(--wood-900)",
                }}
              >
                {champion.pseudo}
              </motion.div>
            ) : (
              <div className="font-display text-3xl mt-2">—</div>
            )}
            {champion && (
              <div
                className="label mt-2"
                style={{ color: "rgba(26,12,8,0.7)" }}
              >
                {champion.score} PTS
              </div>
            )}
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="ghost" size="sm" onClick={leave}>
                QUITTER
              </Button>
              {isHost && (
                <Button variant="gold" size="sm" onClick={startGame}>
                  REJOUER →
                </Button>
              )}
            </div>
          </CenterCard>
        </Table>
      </div>

      {/* Recap drawer at the bottom (scrolls) */}
      <RecapDrawer />
    </div>
  );
}

function ChampionSpotlight({
  champId,
  players,
}: {
  champId: string;
  players: { id: string }[];
}) {
  // simple radial light at champion's seat (computed via Seats sizing isn't
  // exposed; we duplicate the math here using the Seats wrapper sized to inset-0)
  return (
    <div className="absolute inset-0 z-[5] pointer-events-none">
      <div
        className="absolute spotlight"
        style={{
          left: "50%",
          top: "50%",
          width: "55%",
          height: "55%",
          marginLeft: "-27.5%",
          marginTop: "-27.5%",
          animation: "spot-pulse 3s ease-in-out infinite",
          background:
            "radial-gradient(circle, rgba(232,221,196,0.22) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}

function RecapDrawer() {
  const { final } = useStore();
  if (!final) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <details className="group pointer-events-auto">
        <summary
          className="cursor-pointer list-none px-4 py-2 text-center label text-cream/80 hover:text-cream"
          style={{
            background:
              "linear-gradient(to top, rgba(14,7,3,0.95) 30%, transparent)",
          }}
        >
          ↑ RECAP DES {final.history.length} MANCHES ↑
        </summary>
        <div
          className="max-h-[55vh] overflow-y-auto no-scrollbar px-4 pt-2 pb-6"
          style={{ background: "rgba(14,7,3,0.98)" }}
        >
          <div className="mx-auto max-w-3xl grid gap-2">
            {final.history.map((h, i) => {
              const top = h.ranked[0];
              if (!top || top.count === 0) {
                return (
                  <div
                    key={i}
                    className="border border-cream/15 rounded-md px-4 py-2 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="label text-cream/55">
                        Nº{String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="font-serif-i text-base truncate text-cream/85">
                        {h.question}
                      </div>
                    </div>
                    <div className="label text-cream/45 shrink-0">NON-LIEU</div>
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className="border border-cream/15 rounded-md px-4 py-2 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="label text-cream/55">
                      Nº{String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="font-serif-i text-base truncate text-cream/85">
                      {h.question}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-gold-light text-lg">
                      {top.pseudo}
                    </div>
                    <div className="label text-cream/45">
                      {top.count} VOIX
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </details>
    </div>
  );
}
