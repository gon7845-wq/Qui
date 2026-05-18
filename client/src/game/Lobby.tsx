import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CATEGORY_LABELS,
  MIN_PLAYERS,
  MAX_PLAYERS,
  QUESTION_CATEGORIES,
  ROUNDS_MAX,
  ROUNDS_MIN,
  VOTE_DURATION_MAX,
  VOTE_DURATION_MIN,
  type QuestionCategory,
  type RoomState,
} from "@qui/shared";
import { Avatar } from "../components/Avatar";
import { Gavel } from "../components/Gavel";
import { startGame, updateSettings } from "../lib/actions";

interface Props {
  state: RoomState;
  playerId: string;
  onLeave: () => void;
}

export function Lobby({ state, playerId, onLeave }: Props) {
  const me = state.players.find((p) => p.id === playerId);
  const isHost = me?.isHost === true;
  const canStart = state.players.length >= MIN_PLAYERS;
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/r/${state.code}` : "";
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* */
    }
  };

  const onStart = async () => {
    setError(null);
    setStarting(true);
    const res = await startGame();
    setStarting(false);
    if (!res.ok) setError(res.message);
  };

  return (
    <div className="min-h-full px-6 py-8 sm:py-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Gavel size={36} />
            <div>
              <p className="text-xs uppercase tracking-widest text-court-parchment/50">
                Tribunal
              </p>
              <p className="court-title font-gavel text-3xl tracking-[0.35em] text-court-brass">
                {state.code}
              </p>
            </div>
          </div>
          <button className="court-btn-ghost text-sm py-2 px-4" onClick={onLeave}>
            Quitter
          </button>
        </header>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="court-card p-6 sm:p-8"
          >
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="court-title text-2xl text-court-parchment">
                Salle d'audience
              </h2>
              <span className="text-court-parchment/50 text-sm tabular-nums">
                {state.players.length} / {MAX_PLAYERS}
              </span>
            </div>

            <ul className="grid sm:grid-cols-2 gap-3">
              <AnimatePresence initial={false}>
                {state.players.map((p) => (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-3 rounded-lg border border-court-brass/20 bg-court-ink/40 px-3 py-2"
                  >
                    <Avatar seed={p.avatar} size={44} dim={!p.connected} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-court-parchment">
                        {p.pseudo}
                        {p.id === playerId && (
                          <span className="text-court-brass/60 text-xs ml-2">
                            (toi)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-court-parchment/40 tracking-wider uppercase">
                        {p.isHost ? "Juge" : p.connected ? "Présent" : "Absent…"}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            {!canStart && (
              <p className="mt-6 text-sm text-court-parchment/50 text-center">
                Il faut au moins {MIN_PLAYERS} accusés au box.
              </p>
            )}
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="court-card p-6 flex flex-col gap-5"
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-court-parchment/50 mb-2">
                Invite tes accusés
              </p>
              <button
                onClick={copyShare}
                className="w-full text-left rounded-lg border border-court-brass/30 bg-court-ink/50 px-3 py-2 hover:border-court-brass/60 transition"
              >
                <span className="block text-xs text-court-parchment/40 uppercase tracking-wider">
                  {copied ? "Copié !" : "Copier le lien"}
                </span>
                <span className="block truncate text-court-parchment/80 text-sm font-mono">
                  {shareUrl}
                </span>
              </button>
            </div>

            <div className="court-divider" />

            <SettingsPanel state={state} isHost={isHost} />

            {error && (
              <p
                role="alert"
                aria-live="assertive"
                className="text-court-accuse text-sm text-center"
              >
                {error}
              </p>
            )}

            <button
              className="court-btn mt-auto"
              disabled={!isHost || !canStart || starting}
              onClick={onStart}
              title={
                !isHost
                  ? "Seul le juge ouvre l'audience"
                  : !canStart
                  ? `Encore ${MIN_PLAYERS - state.players.length} accusé(s)`
                  : ""
              }
            >
              {starting ? "Ouverture…" : "Ouvrir l'audience"}
            </button>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ state, isHost }: { state: RoomState; isHost: boolean }) {
  const s = state.settings;
  const update = (patch: Partial<typeof s>) => {
    if (!isHost) return;
    void updateSettings(patch);
  };
  const toggleCategory = (c: QuestionCategory) => {
    if (!isHost) return;
    const set = new Set(s.categories);
    if (set.has(c)) set.delete(c);
    else set.add(c);
    if (set.size === 0) return; // can't have zero categories
    void updateSettings({ categories: [...set] });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs uppercase tracking-widest text-court-parchment/50">
        Réglages
      </p>

      <NumberRow
        label="Manches"
        value={s.rounds}
        min={ROUNDS_MIN}
        max={ROUNDS_MAX}
        disabled={!isHost}
        onChange={(v) => update({ rounds: v })}
      />
      <NumberRow
        label="Vote (sec)"
        value={s.voteDurationSec}
        min={VOTE_DURATION_MIN}
        max={VOTE_DURATION_MAX}
        disabled={!isHost}
        onChange={(v) => update({ voteDurationSec: v })}
      />

      <ToggleRow
        label="Scrutin anonyme"
        value={s.anonymousVotes}
        disabled={!isHost}
        onChange={(v) => update({ anonymousVotes: v })}
      />
      <ToggleRow
        label="Vote pour soi-même"
        value={s.allowSelfVote}
        disabled={!isHost}
        onChange={(v) => update({ allowSelfVote: v })}
      />

      <div>
        <p className="text-[10px] uppercase tracking-widest text-court-parchment/40 mb-2">
          Catégories
        </p>
        <div className="flex flex-wrap gap-2">
          {QUESTION_CATEGORIES.map((c) => {
            const active = s.categories.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCategory(c)}
                disabled={!isHost}
                className={`text-xs px-3 py-1.5 rounded-full border transition tracking-wider uppercase ${
                  active
                    ? "bg-court-brass/20 border-court-brass text-court-parchment"
                    : "bg-transparent border-court-brass/30 text-court-parchment/50 hover:border-court-brass/60"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            );
          })}
        </div>
      </div>

      {!isHost && (
        <p className="text-court-parchment/40 text-xs italic">
          Le juge ajuste les réglages.
        </p>
      )}
    </div>
  );
}

interface NumberRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (v: number) => void;
}

function NumberRow({ label, value, min, max, disabled, onChange }: NumberRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-court-parchment/70">{label}</span>
      <div className="flex items-center gap-2">
        <Stepper
          disabled={disabled || value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </Stepper>
        <span className="font-gavel text-xl text-court-brass tabular-nums w-8 text-center">
          {value}
        </span>
        <Stepper
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </Stepper>
      </div>
    </div>
  );
}

function Stepper({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 rounded-md border border-court-brass/40 text-court-parchment hover:border-court-brass disabled:opacity-30 disabled:cursor-not-allowed transition"
    >
      {children}
    </button>
  );
}

function ToggleRow({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-court-parchment/70">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${
          value ? "bg-court-brass" : "bg-court-ink border border-court-brass/30"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span
          aria-hidden
          className={`block absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-court-parchment shadow-sm transition-transform duration-200 ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
