import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  widthRatio?: number;
  flipKey?: string | number;
  variant?: "card" | "plaque" | "ghost" | "placard";
  className?: string;
}

/**
 * The card at the center of the felt.
 *
 * IMPORTANT: we use Framer Motion's x/y motion props (with "-50%" strings)
 * so that the centering translate composes with scale/rotateY animations.
 * Mixing Tailwind's `-translate-x-1/2` with Framer-managed transforms
 * causes Framer to overwrite the centering — keep all transforms inside
 * the motion props.
 */
export function CenterCard({
  children,
  widthRatio = 0.6,
  flipKey,
  variant = "card",
  className = "",
}: Props) {
  const cardStyles: React.CSSProperties =
    variant === "card"
      ? {
          background:
            "linear-gradient(180deg, #F7EFD8 0%, #F0E5D0 60%, #D8CBB1 100%)",
          color: "#14110D",
          boxShadow:
            "0 0 0 1.5px rgba(200,162,63,0.6), 0 24px 60px -16px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.6)",
          borderRadius: "6px",
        }
      : variant === "placard"
      ? {
          // Slim casino-dealer style placard — narrow, ivory, gold edge
          background:
            "linear-gradient(180deg, #F0E5D0 0%, #D8CBB1 100%)",
          color: "#14110D",
          boxShadow:
            "0 0 0 1px rgba(200,162,63,0.7), 0 1px 0 rgba(255,255,255,0.5) inset, 0 16px 40px -12px rgba(0,0,0,0.6)",
          borderRadius: "3px",
        }
      : variant === "plaque"
      ? {
          background:
            "linear-gradient(180deg, #E2C268 0%, #B98F2C 50%, #8C6F22 100%)",
          color: "#1A0C08",
          boxShadow:
            "0 0 0 2px #5D4810, 0 0 0 4px rgba(232,221,196,0.15), 0 24px 60px -16px rgba(0,0,0,0.85)",
          borderRadius: "4px",
        }
      : { background: "transparent", color: "var(--cream)" };

  return (
    <motion.div
      key={flipKey}
      initial={{ opacity: 0, scale: 0.92, x: "-50%", y: "-50%" }}
      animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
      exit={{ opacity: 0, scale: 0.92, x: "-50%", y: "-50%" }}
      transition={{
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`absolute z-30 ${className}`}
      style={{
        left: "50%",
        top: "50%",
        width: `${widthRatio * 100}%`,
        maxWidth: "min(58vmin, 520px)",
        padding:
          variant === "placard"
            ? "clamp(14px, 2.5vmin, 22px) clamp(20px, 3.5vmin, 32px)"
            : "clamp(18px, 3vmin, 30px)",
        textAlign: "center",
        ...cardStyles,
      }}
    >
      {children}
    </motion.div>
  );
}
