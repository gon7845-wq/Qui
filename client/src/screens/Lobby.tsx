import { useEffect, useState } from "react";
import { useStore } from "../store";
import { PlayerGrid } from "../components/PlayerGrid";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { CategoryPicker } from "../components/CategoryPicker";
import { ThemeToggle } from "../components/ThemeToggle";
import { SHARE_ORIGIN } from "../lib/api";

const AVATAR_KEY = "qui_avatar";
const EMOJIS = [
  "😀", "😎", "🤓", "🥳", "🤩", "😈", "👻", "🤡", "💀", "👽", "🤖", "🎃",
  "🦄", "🐱", "🐶", "🦊", "🐼", "🐸", "🐵", "🦁", "🐯", "🐨", "🐷", "🦉",
  "🦖", "🐙", "🦋", "🌟", "🔥", "🍕", "👑", "🌈",
];

export function Lobby() {
  const { lobby, selfId, leave, startGame, updateSettings, setAvatar, categories } = useStore();
  const [copied, setCopied] = useState(false);

  const self = lobby?.players.find((p) => p.id === selfId);

  // Réapplique l'avatar mémorisé à l'arrivée dans le lobby
  useEffect(() => {
    if (!selfId) return;
    const saved = localStorage.getItem(AVATAR_KEY);
    if (saved) setAvatar(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfId]);

  function pickAvatar(emoji: string) {
    setAvatar(emoji);
    localStorage.setItem(AVATAR_KEY, emoji);
  }

  if (!lobby) return null;

  const isHost = lobby.hostId === selfId;
  const canStart = lobby.players.length >= 3;
  const shareUrl = `${SHARE_ORIGIN}/r/${lobby.code}`;

  const allCatIds = categories.map((c) => c.id);
  const selCats = (lobby.settings.categories ?? []).length
    ? new Set(lobby.settings.categories)
    : new Set(allCatIds);
  const availableQuestions = categories.filter((c) => selCats.has(c.id)).reduce((s, c) => s + c.count, 0);

  function toggleCat(id: string) {
    const next = new Set(selCats);
    next.has(id) ? next.delete(id) : next.add(id);
    if (next.size === 0) return; // garder au moins une catégorie
    updateSettings({ categories: next.size === allCatIds.length ? [] : [...next] });
  }

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
      <ThemeToggle />

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
              <div className="mt-6 border-t border-[var(--hairline)] pt-5 text-left">
                <div className="label text-ink-soft mb-3 text-center">Réglages</div>
                <div className="grid gap-3">
                  <Pair label="Votes">
                    <Pip active={!lobby.settings.anonymous} onClick={() => updateSettings({ anonymous: false })} label="Visibles" />
                    <Pip active={lobby.settings.anonymous} onClick={() => updateSettings({ anonymous: true })} label="Anonymes" />
                  </Pair>
                  <Pair label="Temps de vote">
                    {[5, 10, 15, 20].map((v) => (
                      <Pip key={v} active={lobby.settings.voteDuration === v} onClick={() => updateSettings({ voteDuration: v })} label={`${v}s`} />
                    ))}
                  </Pair>
                  <Pair label="Manches">
                    {[5, 8, 12, 16].map((v) => (
                      <Pip key={`q${v}`} active={lobby.settings.questionCount === v} onClick={() => updateSettings({ questionCount: v })} label={`${v}`} />
                    ))}
                  </Pair>
                  <Pair label="Voter pour soi">
                    <Pip active={lobby.settings.allowSelfVote !== false} onClick={() => updateSettings({ allowSelfVote: true })} label="Autorisé" />
                    <Pip active={lobby.settings.allowSelfVote === false} onClick={() => updateSettings({ allowSelfVote: false })} label="Interdit" />
                  </Pair>
                </div>

                <div className="mt-4 border-t border-[var(--hairline)] pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="label text-ink-soft">Catégories</span>
                    <span className="label text-ink-faint">{availableQuestions} questions</span>
                  </div>
                  <CategoryPicker
                    categories={categories}
                    selected={selCats}
                    onToggle={toggleCat}
                    onAll={() => updateSettings({ categories: [] })}
                  />
                </div>
              </div>
            )}
          </Card>

          <Card className="w-full p-4">
            <div className="label text-ink-soft mb-3 text-center">Ton avatar</div>
            <div className="flex flex-wrap justify-center gap-1.5">
              <button
                onClick={() => pickAvatar("")}
                className="grid h-10 w-10 place-items-center rounded-full font-display text-sm transition-transform hover:scale-110"
                style={
                  !self?.avatar
                    ? { background: "linear-gradient(135deg,#FF5E8A,#FF9F43)", color: "#fff" }
                    : { background: "var(--surface)", color: "var(--ink-soft)" }
                }
                title="Initiale"
              >
                Aa
              </button>
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => pickAvatar(e)}
                  className="grid h-10 w-10 place-items-center rounded-full text-xl transition-transform hover:scale-110"
                  style={{
                    background: self?.avatar === e ? "linear-gradient(135deg,#FF5E8A,#FF9F43)" : "var(--surface)",
                    boxShadow: self?.avatar === e ? "0 0 0 2px var(--accent)" : undefined,
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </Card>

          <PlayerGrid players={lobby.players} selfId={selfId} />
        </div>
      </div>
    </div>
  );
}

function Pair({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="label text-ink-soft">{label}</div>
      <div className="flex flex-wrap justify-end gap-1.5">{children}</div>
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
