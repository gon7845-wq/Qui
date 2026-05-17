import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { Button } from "../components/Button";
import { DossierCard } from "../components/DossierCard";

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
        <div className="flex items-center justify-between">
          <button
            onClick={leave}
            className="overline text-paper/55 hover:text-paper"
          >
            ← QUITTER LA SALLE
          </button>
          <div className="overline text-paper/55">
            ✚ SALLE Nº{lobby.code} ✚ EN ATTENTE
          </div>
        </div>

        {/* Convocation poster */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: -0.5 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="paper relative mt-8 rounded-[3px] p-6 md:p-10"
        >
          <div className="overline text-ink/55">
            CONVOCATION — AUDIENCE PUBLIQUE
          </div>
          <div className="mt-2 font-serif-italic text-3xl md:text-5xl text-ink leading-[1]">
            Veuillez vous présenter en salle&nbsp;:
          </div>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="overline text-ink/55 mb-2">CODE DE LA SALLE</div>
              <div
                className="font-stamp leading-[0.78] tracking-tight"
                style={{
                  fontSize: "clamp(96px, 18vw, 240px)",
                  color: "var(--vermillion-dark)",
                }}
              >
                {lobby.code}
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-3">
              <div className="overline text-ink/55">
                {lobby.players.length} JURÉ
                {lobby.players.length > 1 ? "S" : ""} / 3 MINIMUM
              </div>
              <Button variant="primary" size="md" onClick={copyLink}>
                {copied ? "✓ LIEN COPIÉ" : "✚ COPIER LE LIEN ✚"}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Jury list */}
        <section className="mt-12">
          <div className="mb-5 flex items-baseline justify-between">
            <div className="overline text-paper/65">
              ✚ COMPOSITION DU JURY ✚
            </div>
            <div className="overline text-paper/40">EN DIRECT</div>
          </div>
          <motion.div layout className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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
                  <DossierCard
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
                    className="grid place-items-center rounded-[3px] border-2 border-dashed border-paper/20 p-12 text-paper/35"
                  >
                    <span className="overline">PLACE VACANTE</span>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* Règlement */}
        <section className="mt-12">
          <div className="mb-4 overline text-paper/65">
            ✚ RÈGLEMENT DE L'AUDIENCE ✚
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <SettingPill
              label="Délibéré"
              value={`${lobby.settings.voteDuration}s`}
            />
            <SettingPill
              label="Affaires"
              value={String(lobby.settings.questionCount)}
            />
            <SettingPill
              label="Scrutin"
              value={lobby.settings.anonymous ? "Anonyme" : "Public"}
            />
          </div>
          {isHost && (
            <div className="mt-4 flex flex-wrap gap-2">
              <SmallToggle
                active={lobby.settings.anonymous}
                onClick={() =>
                  updateSettings({ anonymous: !lobby.settings.anonymous })
                }
                label="ANONYMAT"
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
                  key={`q${v}`}
                  active={lobby.settings.questionCount === v}
                  onClick={() => updateSettings({ questionCount: v })}
                  label={`${v} aff.`}
                />
              ))}
            </div>
          )}
        </section>

        <div className="mt-12 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
          <div className="overline text-paper/55">
            {isHost
              ? canStart
                ? "L'AUDIENCE PEUT COMMENCER"
                : `IL MANQUE ${3 - lobby.players.length} JURÉ(S)`
              : "EN ATTENTE DU PRÉSIDENT"}
          </div>
          {isHost && (
            <Button
              variant="primary"
              size="lg"
              disabled={!canStart}
              onClick={startGame}
            >
              ✚ OUVRIR L'AUDIENCE ✚
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[3px] border border-paper/20 px-5 py-4"
      style={{ background: "rgba(240,230,208,0.05)" }}
    >
      <div className="overline text-paper/55">{label}</div>
      <div className="mt-1 font-serif-italic text-3xl text-paper">{value}</div>
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
      className={`font-stamp text-[11px] tracking-widest uppercase px-3.5 py-2 transition-colors ${
        active
          ? "bg-vermillion text-paper"
          : "border border-paper/25 text-paper/65 hover:border-paper/50 hover:text-paper"
      }`}
      style={{ borderRadius: "2px" }}
    >
      {label}
    </button>
  );
}
