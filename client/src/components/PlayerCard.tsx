import { motion } from "framer-motion";
import type { Player } from "../types";

interface Props {
  player: Player;
  index: number;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  isSelf?: boolean;
  showVoted?: boolean;
}

// Deterministic accent per pseudo
const ACCENTS = ["#DBFF00", "#FF3366", "#00E5FF", "#FF9F1C", "#A78BFA", "#34D399"];
function accentFor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

export function PlayerCard({
  player,
  index,
  selected,
  disabled,
  onClick,
  isSelf,
  showVoted,
}: Props) {
  const accent = accentFor(player.pseudo);
  const initial = player.pseudo.slice(0, 1).toUpperCase();

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      whileHover={!disabled ? { y: -4 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      animate={selected ? { scale: 1.02 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border bg-white/[0.03] p-4 text-left backdrop-blur-sm transition-colors ${
        selected
          ? "border-transparent"
          : "border-white/10 hover:border-white/25"
      } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      style={{
        boxShadow: selected
          ? `inset 0 0 0 2px ${accent}, 0 0 40px ${accent}40`
          : undefined,
      }}
    >
      {/* Number badge */}
      <span
        className="overline absolute right-3 top-3 text-white/40"
        aria-hidden
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Avatar */}
      <div
        className="relative grid h-14 w-14 shrink-0 place-items-center rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${accent}33, ${accent}11)`,
          boxShadow: `inset 0 0 0 1px ${accent}66`,
        }}
      >
        <span
          className="italic-display text-3xl"
          style={{ color: accent }}
        >
          {initial}
        </span>
        {player.isHost && (
          <span
            className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-ink-950 text-[9px] font-bold"
            style={{ color: accent, boxShadow: `0 0 0 1px ${accent}` }}
            title="Host"
          >
            ★
          </span>
        )}
      </div>

      {/* Pseudo */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-lg font-semibold tracking-tight">
            {player.pseudo}
          </span>
          {isSelf && (
            <span className="overline text-acid">VOUS</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-white/40">
          {showVoted && (
            <span className="overline" style={{ color: accent }}>
              ● VOTÉ
            </span>
          )}
          {!showVoted && player.score > 0 && (
            <span className="overline">{player.score} PTS</span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

export { accentFor };
