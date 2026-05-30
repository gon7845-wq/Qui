import { motion } from "framer-motion";
import { avatarColorFor } from "../lib/colors";

interface Props {
  pseudo: string;
  /** stable key for color (e.g. player id) — falls back to pseudo */
  colorKey?: string;
  size?: number;
  selected?: boolean;
  selectable?: boolean;
  isSelf?: boolean;
  isHost?: boolean;
  onClick?: () => void;
  voteCount?: number;
  highlight?: boolean;
  dim?: boolean;
}

export function Avatar({
  pseudo,
  colorKey,
  size = 84,
  selected,
  selectable,
  isSelf,
  isHost,
  onClick,
  voteCount,
  highlight,
  dim,
}: Props) {
  const c = avatarColorFor(colorKey ?? pseudo);
  const initial = pseudo.slice(0, 1).toUpperCase();

  return (
    <motion.button
      type="button"
      disabled={!selectable}
      onClick={onClick}
      whileHover={selectable ? { scale: 1.07, y: -4 } : undefined}
      whileTap={selectable ? { scale: 0.94 } : undefined}
      animate={{
        scale: selected ? 1.08 : 1,
        opacity: dim ? 0.4 : 1,
      }}
      transition={{ type: "spring", stiffness: 360, damping: 22 }}
      className={`relative flex flex-col items-center gap-2 ${
        selectable ? "cursor-pointer" : "cursor-default"
      }`}
      style={{ width: size }}
    >
      <span
        className="relative grid place-items-center rounded-full font-display text-white"
        style={{
          width: size,
          height: size,
          fontSize: Math.round(size * 0.42),
          background: `linear-gradient(145deg, ${c.a} 0%, ${c.b} 100%)`,
          boxShadow: highlight
            ? `0 0 0 4px #fff, 0 0 0 8px ${c.a}, 0 14px 34px -8px ${c.a}cc, 0 0 50px ${c.a}99`
            : selected
            ? `0 0 0 4px #fff, 0 0 0 8px var(--accent), 0 12px 26px -8px rgba(255,94,138,0.5)`
            : `0 8px 20px -8px ${c.a}aa, inset 0 2px 0 rgba(255,255,255,0.4)`,
          textShadow: "0 2px 6px rgba(0,0,0,0.18)",
        }}
      >
        {initial}

        {isHost && (
          <span
            className="absolute -top-1.5 -right-1.5 grid place-items-center rounded-full bg-white text-[13px]"
            style={{
              width: Math.max(22, size * 0.3),
              height: Math.max(22, size * 0.3),
              boxShadow: "0 3px 8px rgba(63,39,120,0.3)",
            }}
            title="Hôte"
          >
            👑
          </span>
        )}

        {typeof voteCount === "number" && voteCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.15 }}
            className="absolute -bottom-2 -right-1 grid place-items-center rounded-full bg-white font-display text-ink"
            style={{
              minWidth: 30,
              height: 30,
              padding: "0 8px",
              fontSize: 16,
              boxShadow: "0 4px 12px -2px rgba(63,39,120,0.35)",
            }}
          >
            {voteCount}
          </motion.span>
        )}
      </span>

      <span className="flex items-center gap-1 max-w-full">
        <span
          className="font-display truncate"
          style={{
            fontSize: Math.max(13, size * 0.18),
            color: "var(--ink)",
            maxWidth: size + 24,
          }}
        >
          {pseudo}
        </span>
      </span>

      {isSelf && (
        <span
          className="label rounded-full px-2 py-0.5"
          style={{ fontSize: 9, background: "var(--accent)", color: "#fff", marginTop: -4 }}
        >
          TOI
        </span>
      )}
    </motion.button>
  );
}
