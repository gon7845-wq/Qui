import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { Button } from "../components/Button";
import { PlayerCard } from "../components/PlayerCard";

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
    <div className="relative z-10 min-h-screen px-6 md:px-10 pt-6 pb-24">
      <div className="mx-auto max-w-5xl">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={leave}
            className="overline text-white/50 hover:text-white"
          >
            ← QUITTER
          </button>
          <div className="overline text-white/40">
            SALON Nº{lobby.code} — EN ATTENTE
          </div>
        </div>

        {/* Hero block */}
        <div className="mt-10">
          <div className="overline text-white/40 mb-2">
            ↳ INVITE TES POTES
          </div>
          <div className="flex flex-wrap items-end justify-between gap-6 border-y border-white/10 py-8">
            <div>
              <div className="overline text-white/50 mb-2">CODE</div>
              <div className="italic-display text-[18vw] md:text-[10vw] leading-[0.85] text-acid tracking-tight">
                {lobby.code}
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-3">
              <div className="overline text-white/50">
                {lobby.players.length} JOUEUR
                {lobby.players.length > 1 ? "S" : ""} / 3 MIN
              </div>
              <Button variant="ghost" size="md" onClick={copyLink}>
                {copied ? "✓ LIEN COPIÉ" : "COPIER LE LIEN"}
              </Button>
            </div>
          </div>
        </div>

        {/* Players grid */}
        <section className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <div className="overline text-white/50">JOUEURS</div>
            <div className="overline text-white/30">EN DIRECT</div>
          </div>
          <motion.div layout className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence>
              {lobby.players.map((p, i) => (
                <motion.div
                  layout
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <PlayerCard
                    player={p}
                    index={i}
                    isSelf={p.id === selfId}
                  />
                </motion.div>
              ))}
              {Array.from({ length: Math.max(0, 3 - lobby.players.length) }).map(
                (_, i) => (
                  <motion.div
                    key={`slot-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center rounded-2xl border border-dashed border-white/15 p-7 text-white/30"
                  >
                    <span className="overline">EN ATTENTE…</span>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* Settings */}
        <section className="mt-10">
          <div className="mb-4 overline text-white/50">RÉGLAGES</div>
          <div className="grid gap-3 md:grid-cols-3">
            <SettingPill
              label="Durée vote"
              value={`${lobby.settings.voteDuration}s`}
            />
            <SettingPill
              label="Questions"
              value={String(lobby.settings.questionCount)}
            />
            <SettingPill
              label="Votes"
              value={lobby.settings.anonymous ? "Anonymes" : "Publics"}
            />
          </div>
          {isHost && (
            <div className="mt-4 flex flex-wrap gap-2">
              <SmallToggle
                active={lobby.settings.anonymous}
                onClick={() =>
                  updateSettings({ anonymous: !lobby.settings.anonymous })
                }
                label="ANONYMES"
              />
              {[5, 10, 15].map((v) => (
                <SmallToggle
                  key={v}
                  active={lobby.settings.voteDuration === v}
                  onClick={() => updateSettings({ voteDuration: v })}
                  label={`${v}s`}
                />
              ))}
              {[5, 8, 12, 16].map((v) => (
                <SmallToggle
                  key={v}
                  active={lobby.settings.questionCount === v}
                  onClick={() => updateSettings({ questionCount: v })}
                  label={`${v} Q`}
                />
              ))}
            </div>
          )}
        </section>

        {/* Start button */}
        <div className="mt-12 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
          <div className="overline text-white/50">
            {isHost
              ? canStart
                ? "TOUT EST PRÊT — TU PEUX LANCER"
                : `IL FAUT ${3 - lobby.players.length} JOUEUR(S) DE PLUS`
              : "EN ATTENTE DU HOST"}
          </div>
          {isHost && (
            <Button
              variant="acid"
              size="lg"
              disabled={!canStart}
              onClick={startGame}
            >
              LANCER LA PARTIE →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="overline text-white/40">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function SmallToggle({
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
      className={`overline rounded-full border px-3 py-2 transition-colors ${
        active
          ? "border-acid bg-acid text-ink-950"
          : "border-white/15 text-white/60 hover:border-white/40 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
