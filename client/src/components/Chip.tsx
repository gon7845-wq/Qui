import { motion } from "framer-motion";
import { chipColorFor } from "../lib/colors";

interface Props {
  pseudo: string;
  size?: number;
  selected?: boolean;
  selectable?: boolean;
  disabled?: boolean;
  isSelf?: boolean;
  isHost?: boolean;
  onClick?: () => void;
  voteCount?: number;
  glow?: boolean;
  className?: string;
}

export function Chip({
  pseudo,
  size = 88,
  selected,
  selectable,
  disabled,
  isSelf,
  isHost,
  onClick,
  voteCount,
  glow,
  className = "",
}: Props) {
  const colors = chipColorFor(pseudo);
  const initial = pseudo.slice(0, 1).toUpperCase();

  return (
    <motion.button
      type="button"
      disabled={disabled || !selectable}
      onClick={onClick}
      whileHover={selectable && !disabled ? { scale: 1.06, y: -3 } : undefined}
      whileTap={selectable && !disabled ? { scale: 0.95 } : undefined}
      animate={selected ? { scale: 1.08 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className={`relative ${selectable && !disabled ? "cursor-pointer" : "cursor-default"} ${className}`}
      style={{
        width: size,
        height: size,
        ["--chip-color" as any]: colors.outer,
        ["--chip-color-dark" as any]: colors.outerDark,
        ["--chip-inner" as any]: colors.inner,
        ["--chip-inner-dark" as any]: colors.innerDark,
      }}
    >
      <span
        className={`chip absolute inset-0 ${glow ? "" : ""}`}
        style={
          glow
            ? {
                boxShadow:
                  "inset 0 -3px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 10px rgba(0,0,0,0.5), 0 0 60px rgba(232,221,196,0.6), 0 0 100px rgba(232,221,196,0.35)",
              }
            : selected
            ? {
                boxShadow:
                  "inset 0 -3px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4), 0 0 0 3px var(--gold), 0 0 30px rgba(200,162,63,0.5)",
              }
            : undefined
        }
      />
      {/* Initial label */}
      <span
        className="absolute inset-0 grid place-items-center font-display"
        style={{
          fontSize: Math.round(size * 0.42),
          color: colors.innerDark,
          textShadow: "0 1px 0 rgba(255,255,255,0.25)",
          zIndex: 2,
        }}
      >
        {initial}
      </span>
      {/* Pseudo plaque underneath */}
      <span
        className="absolute left-1/2 top-[100%] -translate-x-1/2 mt-2 font-serif-b text-cream text-sm whitespace-nowrap"
        style={{
          textShadow: "0 1px 2px rgba(0,0,0,0.7)",
        }}
      >
        {pseudo}
      </span>
      {/* Badges */}
      {isHost && (
        <span
          className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-gold text-wood-900 text-[10px] font-bold"
          style={{ boxShadow: "0 0 0 2px var(--wood-900), 0 2px 4px rgba(0,0,0,0.5)", zIndex: 3 }}
          title="Hôte"
        >
          ♛
        </span>
      )}
      {isSelf && (
        <span
          className="label absolute left-1/2 -top-4 -translate-x-1/2 text-gold-light"
          style={{ zIndex: 3 }}
        >
          TOI
        </span>
      )}
      {/* Vote count token (during reveal) */}
      {typeof voteCount === "number" && voteCount > 0 && (
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.2 }}
          className="absolute -right-2 -bottom-2 grid place-items-center font-display text-base"
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: "linear-gradient(180deg, #E9CB6F 0%, #C8A23F 50%, #8C6F22 100%)",
            color: "#1A0C08",
            border: "1.5px solid #5D4810",
            boxShadow: "0 2px 6px rgba(0,0,0,0.7)",
            zIndex: 3,
          }}
        >
          {voteCount}
        </motion.span>
      )}
    </motion.button>
  );
}
