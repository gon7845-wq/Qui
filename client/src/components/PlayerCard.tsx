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

// Deterministic iridescent accent gradient per pseudo
const ACCENTS: Array<[string, string]> = [
  ["#9ED3FF", "#DDA0FF"], // sky → lavender
  ["#FFB8E1", "#DDA0FF"], // rose → lavender
  ["#B8FFE1", "#9ED3FF"], // mint → sky
  ["#FFE9B8", "#FFB8E1"], // butter → rose
  ["#DDA0FF", "#FFB8E1"], // lavender → rose
  ["#9ED3FF", "#B8FFE1"], // sky → mint
];
function accentFor(s: string): [string, string] {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

// Single hex for monotone glow needs
function accentSolid(s: string): string {
  const [a] = accentFor(s);
  return a;
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
  const [c1, c2] = accentFor(player.pseudo);
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
      className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl p-4 text-left transition-colors glass ${
        disabled ? "opacity-55 cursor-not-allowed" : "cursor-pointer hover:bg-white/[0.07]"
      }`}
      style={{
        boxShadow: selected
          ? `inset 0 0 0 1.5px ${c2}, 0 0 50px ${c1}33, 0 0 80px ${c2}22`
          : undefined,
      }}
    >
      {/* Number badge */}
      <span
        className="overline absolute right-3 top-3 text-pearl/40"
        aria-hidden
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Iridescent avatar */}
      <div
        className="relative grid h-14 w-14 shrink-0 place-items-center rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${c1}, ${c2})`,
          boxShadow: `0 1px 0 rgba(255,255,255,0.4) inset, 0 0 0 1px rgba(255,255,255,0.15)`,
        }}
      >
        <span
          className="italic-display text-3xl"
          style={{ color: "#0a0a14" }}
        >
          {initial}
        </span>
        {player.isHost && (
          <span
            className="absolute -bottom-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink-900 text-[10px] font-bold text-iris-butter"
            style={{
              boxShadow: `0 0 0 1px ${c2}, 0 0 12px ${c2}88`,
            }}
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
            <span className="overline iridescent-text">VOUS</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-pearl/45">
          {showVoted && (
            <span className="overline" style={{ color: c2 }}>
              ● VOTÉ
            </span>
          )}
          {!showVoted && player.score > 0 && (
            <span className="overline">{player.score} PTS</span>
          )}
        </div>
      </div>

      {selected && (
        <span className="overline absolute bottom-3 right-3" style={{ color: c2 }}>
          ✓ TON CHOIX
        </span>
      )}
    </motion.button>
  );
}

export { accentFor, accentSolid };
