import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** ratio of table inner radius for the card max width */
  widthRatio?: number;
  flipKey?: string | number;
  variant?: "card" | "plaque" | "ghost";
  className?: string;
}

/**
 * The card that lives at the center of the felt: question, code, verdict, etc.
 * Absolutely positioned to the center of its parent (the felt).
 */
export function CenterCard({
  children,
  widthRatio = 0.58,
  flipKey,
  variant = "card",
  className = "",
}: Props) {
  const cardStyles =
    variant === "card"
      ? {
          background:
            "linear-gradient(180deg, #F7EFD8 0%, #F0E5D0 60%, #D8CBB1 100%)",
          color: "#14110D",
          boxShadow:
            "0 0 0 1.5px #C8A23F, 0 24px 60px -16px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.6)",
        }
      : variant === "plaque"
      ? {
          background:
            "linear-gradient(180deg, #E2C268 0%, #B98F2C 50%, #8C6F22 100%)",
          color: "#1A0C08",
          boxShadow:
            "0 0 0 2px #5D4810, 0 0 0 4px rgba(232,221,196,0.15), 0 24px 60px -16px rgba(0,0,0,0.85)",
        }
      : { background: "transparent", color: "var(--cream)" };

  return (
    <motion.div
      key={flipKey}
      initial={{ rotateY: -90, opacity: 0, scale: 0.7 }}
      animate={{ rotateY: 0, opacity: 1, scale: 1 }}
      exit={{ rotateY: 90, opacity: 0, scale: 0.7 }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 24,
      }}
      className={`absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 ${className}`}
      style={{
        width: `${widthRatio * 100}%`,
        maxWidth: "min(58vmin, 540px)",
        borderRadius: "6px",
        padding: "clamp(18px, 3.5vmin, 36px)",
        textAlign: "center",
        ...cardStyles,
      }}
    >
      {/* Corner notches for "card" only */}
      {variant === "card" && (
        <>
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />
        </>
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const offset = "10px";
  const styleByPos: Record<typeof pos, React.CSSProperties> = {
    tl: { top: offset, left: offset },
    tr: { top: offset, right: offset, transform: "scaleX(-1)" },
    bl: { bottom: offset, left: offset, transform: "scaleY(-1)" },
    br: { bottom: offset, right: offset, transform: "scale(-1, -1)" },
  };
  return (
    <span
      aria-hidden
      className="absolute"
      style={{
        ...styleByPos[pos],
        width: 16,
        height: 16,
        borderLeft: "1px solid rgba(20,17,13,0.5)",
        borderTop: "1px solid rgba(20,17,13,0.5)",
      }}
    />
  );
}
