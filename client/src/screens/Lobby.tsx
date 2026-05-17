import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "../store";
import { Table } from "../components/Table";
import { Seats } from "../components/Seats";
import { CenterCard } from "../components/CenterCard";
import { Button } from "../components/Button";

export function Lobby() {
  const { lobby, selfId, leave, startGame, updateSettings } = useStore();
  const [copied, setCopied] = useState(false);
  if (!lobby) return null;

  const isHost = lobby.hostId === selfId;
  const canStart = lobby.players.length >= 3;
  const shareUrl = `${window.location.origin}/r/${lobby.code}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Floating leave button */}
      <button
        onClick={leave}
        className="fixed top-5 left-5 z-40 label text-cream/55 hover:text-cream"
      >
        ← QUITTER
      </button>

      <div className="absolute inset-0 grid place-items-center px-3 py-6">
        <Table>
          <Seats players={lobby.players} selfId={selfId} />
          <CenterCard widthRatio={0.62}>
            <div className="label text-ink/55">CODE DE LA TABLE</div>
            <div
              className="font-display leading-[0.85] tracking-tight mt-1"
              style={{
                fontSize: "clamp(56px, 12vmin, 130px)",
                color: "var(--ruby-dark)",
              }}
            >
              {lobby.code}
            </div>
            <div className="label text-ink/55 mt-2">
              {lobby.players.length} JOUEUR{lobby.players.length > 1 ? "S" : ""} /
              3 MIN
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="ghost" size="sm" onClick={copyLink}>
                {copied ? "✓ COPIÉ" : "COPIER LE LIEN"}
              </Button>
              {isHost && (
                <Button
                  variant="gold"
                  size="sm"
                  disabled={!canStart}
                  onClick={startGame}
                >
                  {canStart
                    ? "OUVRIR LE BAL →"
                    : `${3 - lobby.players.length} EN MOINS`}
                </Button>
              )}
            </div>

            {/* Host settings */}
            {isHost && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-5 border-t border-dashed border-ink/20 pt-4"
              >
                <div className="label text-ink/55 mb-2">RÈGLES DE TABLE</div>
                <div className="flex flex-wrap justify-center gap-2">
                  <Pip
                    active={lobby.settings.anonymous}
                    onClick={() =>
                      updateSettings({ anonymous: !lobby.settings.anonymous })
                    }
                    label="ANON"
                  />
                  {[5, 10, 15].map((v) => (
                    <Pip
                      key={v}
                      active={lobby.settings.voteDuration === v}
                      onClick={() => updateSettings({ voteDuration: v })}
                      label={`${v}s`}
                    />
                  ))}
                  {[5, 8, 12, 16].map((v) => (
                    <Pip
                      key={`q${v}`}
                      active={lobby.settings.questionCount === v}
                      onClick={() => updateSettings({ questionCount: v })}
                      label={`${v}M`}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {!isHost && (
              <div className="label text-ink/50 mt-4">
                EN ATTENTE DE L'HÔTE
              </div>
            )}
          </CenterCard>
        </Table>
      </div>
    </div>
  );
}

function Pip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-display tracking-wider text-[10px] h-7 px-3 rounded-full border transition-all ${
        active
          ? "bg-wood-900 text-cream border-wood-900"
          : "bg-transparent text-ink/65 border-ink/30 hover:border-ink"
      }`}
    >
      {label}
    </button>
  );
}
