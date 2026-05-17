import { motion, type MotionProps } from "framer-motion";
import type { ReactNode } from "react";

type Variant = "coupable" | "innocent" | "suspect" | "verdict" | "scelle";

interface Props {
  variant?: Variant;
  rotate?: number;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  animate?: boolean;
  delay?: number;
}

const variantStyles: Record<Variant, { color: string; border: string }> = {
  coupable: { color: "var(--vermillion-dark)", border: "var(--vermillion-dark)" },
  innocent: { color: "var(--marine)", border: "var(--marine)" },
  suspect: { color: "#3A322A", border: "#3A322A" },
  verdict: { color: "var(--gold)", border: "var(--gold)" },
  scelle: { color: "var(--vermillion)", border: "var(--vermillion)" },
};

const sizes = {
  sm: "text-[11px] px-2 py-1 border",
  md: "text-sm px-3 py-1.5 border-[1.5px]",
  lg: "text-xl px-4 py-2 border-2",
  xl: "text-3xl px-6 py-3 border-[3px]",
};

export function Stamp({
  variant = "coupable",
  rotate = -8,
  children,
  className = "",
  size = "md",
  animate = false,
  delay = 0,
}: Props) {
  const v = variantStyles[variant];
  const initial: MotionProps["initial"] = animate
    ? { scale: 3, opacity: 0, rotate: rotate - 6 }
    : { rotate };
  const target: MotionProps["animate"] = animate
    ? { scale: [3, 0.85, 1.05, 1], opacity: [0, 1, 1, 1], rotate: [rotate - 6, rotate + 2, rotate - 3, rotate] }
    : { rotate };

  return (
    <motion.span
      initial={initial}
      animate={target}
      transition={
        animate
          ? { duration: 0.55, ease: [0.34, 1.56, 0.64, 1], delay, times: [0, 0.5, 0.8, 1] }
          : undefined
      }
      style={{
        color: v.color,
        borderColor: v.border,
        display: "inline-block",
        transformOrigin: "center",
      }}
      className={`font-stamp relative ${sizes[size]} ${className}`}
    >
      <span className="relative z-10">{children}</span>
      {/* Ink grain overlay */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.4,
          mixBlendMode: "screen",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0'/></filter><rect width='100%25' height='100%25' filter='url(%23g)'/></svg>\")",
        }}
      />
    </motion.span>
  );
}
