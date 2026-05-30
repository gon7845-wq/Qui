import { useState } from "react";
import { useStore } from "../store";
import { PlayerGrid } from "../components/PlayerGrid";
import { Card } from "../components/Card";
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
    <div className="relative h-full w-full overflow-y-auto no-scrollbar">
      <button
        onClick={leave}
        className="fixed top-5 left-5 z-40 label text-ink-soft hover:text-ink transition-colors"
      >
        ← Quitter
      </button>

      <div className="min-h-full grid place-items-center px-5 py-16">
        <div className="w-full max-w-2xl flex flex-col items-center gap-7">
          <Card className="w-full p-7 text-center">
            <div className="label text-ink-soft">Code de la partie</div>
            <div
              className="font-display brand-gradient leading-none mt-1"
              style={{ fontSize: "clamp(64px, 16vmin, 140px)", letterSpacing: "0.05em" }}
            >
              {lobby.code}
            </div>
            <div className="label text-ink-faint mt-2">
              {lobby.players.length} joueur{lobby.players.length > 1 ? "s" : ""} · 3 minimum pour lancer
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button variant="soft" size="sm" onClick={copyLink}>
                {copied ? "✓ Lien copié" : "Copier le lien"}
              </Button>
              {isHost && (
                <Button size="sm" disabled={!canStart} onClick={startGame}>
                  {canStart ? "Lancer la partie →" : `${3 - lobby.players.length} joueur(s) en plus`}
                </Button>
              )}
              {!isHost && <span className="label text-ink-faint self-center">En attente de l'hôte…</span>}
            </div>

            {isHost && (
              <div className="mt-6 border-t border-[#F3E7DD] pt-5">
                <div className="label text-ink-soft mb-3">Réglages</div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  <Pip
                    active={lobby.settings.anonymous}
                    onClick={() => updateSettings({ anonymous: !lobby.settings.anonymous })}
                    label={lobby.settings.anonymous ? "Anonyme" : "Visibles"}
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
                      label={`${v} manches`}
                    />
                  ))}
                </div>
              </div>
            )}
          </Card>

          <PlayerGrid players={lobby.players} selfId={selfId} />
        </div>
      </div>
    </div>
  );
}

function Pip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`pill h-9 px-4 text-sm transition-all ${active ? "text-white" : "text-ink-soft hover:text-ink"}`}
      style={
        active
          ? { background: "linear-gradient(135deg,#FF5E8A,#FF9F43)", boxShadow: "0 6px 16px -6px rgba(255,94,138,0.6)" }
          : { background: "rgba(255,94,138,0.1)" }
      }
    >
      {label}
    </button>
  );
}
