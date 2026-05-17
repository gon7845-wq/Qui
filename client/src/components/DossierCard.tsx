import { motion } from "framer-motion";
import type { Player } from "../types";

interface Props {
  player: Player;
  index: number;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  isSelf?: boolean;
  /** "scellé" stamp shown once player has voted */
  sealed?: boolean;
  variant?: "default" | "compact";
}

function caseNumber(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return String((h % 9000) + 1000).padStart(4, "0");
}

export function DossierCard({
  player,
  index,
  selected,
  disabled,
  onClick,
  isSelf,
  sealed,
  variant = "default",
}: Props) {
  const initial = player.pseudo.slice(0, 1).toUpperCase();
  const caseNo = caseNumber(player.pseudo + player.id);
  const tilt = ((index * 7) % 5) - 2; // -2..+2 deg, deterministic small tilt
  const isCompact = variant === "compact";

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      initial={{ rotate: tilt }}
      whileHover={!disabled ? { y: -4, rotate: tilt - 1 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      animate={selected ? { scale: 1.03, rotate: tilt } : { scale: 1, rotate: tilt }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={`paper relative block w-full overflow-hidden text-left ${isCompact ? "p-3" : "p-5"} rounded-[3px] ${
        disabled ? "opacity-65 cursor-not-allowed" : "cursor-pointer"
      }`}
      style={{
        outline: selected ? "3px solid var(--vermillion)" : undefined,
        outlineOffset: selected ? "-3px" : undefined,
      }}
    >
      {/* Top metadata strip */}
      <div className="relative z-10 flex items-baseline justify-between font-typewriter text-[10px] uppercase tracking-widest text-ink/55">
        <span>Dossier Nº{caseNo}</span>
        <span>{String(index + 1).padStart(2, "0")}/JURY</span>
      </div>

      <div className="relative z-10 mt-3 flex items-center gap-3">
        {/* Photo / initial */}
        <div
          className="relative h-12 w-12 shrink-0 grid place-items-center font-stamp text-2xl"
          style={{
            background:
              "repeating-linear-gradient(45deg, rgba(20,17,13,0.04) 0 4px, rgba(20,17,13,0.07) 4px 8px)",
            border: "1px solid rgba(20,17,13,0.25)",
            color: "var(--ink)",
          }}
        >
          {initial}
        </div>
        {/* Pseudo */}
        <div className="min-w-0 flex-1">
          <div className="font-serif text-2xl leading-tight truncate text-ink">
            {player.pseudo}
          </div>
          <div className="font-typewriter text-[10px] uppercase tracking-widest text-ink/55 mt-0.5">
            {player.isHost && <span className="mr-2">★ PRÉSIDENT·E</span>}
            {isSelf && <span className="text-vermillion-dark">VOUS</span>}
          </div>
        </div>
      </div>

      {/* Sealed stamp */}
      {sealed && (
        <motion.div
          initial={{ scale: 2.2, opacity: 0, rotate: -18 }}
          animate={{ scale: 1, opacity: 1, rotate: -12 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          className="absolute right-3 bottom-3 z-20 font-stamp border-[1.5px] border-vermillion-dark text-vermillion-dark px-2 py-0.5 text-[10px]"
          style={{ color: "var(--vermillion-dark)" }}
        >
          SCELLÉ
        </motion.div>
      )}

      {/* Selected marker */}
      {selected && !sealed && (
        <motion.div
          initial={{ scale: 1.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute right-3 bottom-3 z-20 font-stamp text-[10px] text-vermillion-dark border-[1.5px] border-vermillion-dark px-2 py-0.5"
          style={{ transform: "rotate(-6deg)" }}
        >
          ✕ TON CHOIX
        </motion.div>
      )}

      {/* Bottom rule + score */}
      {player.score > 0 && (
        <div className="relative z-10 mt-4 flex items-center justify-between font-typewriter text-[10px] uppercase tracking-widest text-ink/55 border-t border-dashed border-ink/20 pt-2">
          <span>Casier</span>
          <span className="font-stamp text-vermillion-dark text-base">{player.score} PTS</span>
        </div>
      )}
    </motion.button>
  );
}

export { caseNumber };
