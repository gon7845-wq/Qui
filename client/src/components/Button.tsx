import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "acid" | "ghost" | "cherry" | "dark";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  variant?: Variant;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "acid",
  fullWidth,
  size = "md",
  className = "",
  children,
  disabled,
  ...rest
}: Props) {
  const base =
    "relative inline-flex items-center justify-center gap-2 font-semibold tracking-tight transition-all overline";
  const sizes = {
    sm: "h-9 px-4 text-[12px]",
    md: "h-12 px-5 text-[12px]",
    lg: "h-14 px-6 text-[13px]",
  };
  const variants: Record<Variant, string> = {
    acid:
      "bg-acid text-ink-950 hover:brightness-110 active:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed rounded-full",
    cherry:
      "bg-cherry text-white hover:brightness-110 active:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed rounded-full",
    ghost:
      "bg-white/[0.04] text-white hover:bg-white/[0.08] border border-white/15 disabled:opacity-40 disabled:cursor-not-allowed rounded-full",
    dark:
      "bg-ink-950 text-acid border border-acid/40 hover:bg-acid/10 disabled:opacity-40 disabled:cursor-not-allowed rounded-full",
  };
  return (
    <motion.button
      whileHover={!disabled ? { y: -1 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled}
      {...(rest as any)}
    >
      {children}
    </motion.button>
  );
}
