import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "paper" | "danger";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  variant?: Variant;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  fullWidth,
  size = "md",
  className = "",
  children,
  disabled,
  ...rest
}: Props) {
  const base =
    "relative inline-flex items-center justify-center gap-2 font-stamp tracking-wider uppercase transition-all overflow-hidden select-none";
  const sizes = {
    sm: "h-9 px-4 text-[11px]",
    md: "h-12 px-6 text-[12px]",
    lg: "h-14 px-8 text-[14px]",
  };
  const variants: Record<Variant, string> = {
    primary:
      "bg-vermillion text-paper hover:bg-vermillion-dark active:bg-vermillion-dark disabled:opacity-40 disabled:cursor-not-allowed",
    ghost:
      "bg-transparent text-cream border-[1.5px] border-cream/30 hover:border-cream/60 hover:bg-cream/[0.04] disabled:opacity-40 disabled:cursor-not-allowed",
    paper:
      "bg-paper text-ink hover:bg-paper-light active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed",
    danger:
      "bg-transparent text-vermillion border-[1.5px] border-vermillion/50 hover:bg-vermillion/10 disabled:opacity-40 disabled:cursor-not-allowed",
  };

  return (
    <motion.button
      whileHover={!disabled ? { y: -1 } : undefined}
      whileTap={!disabled ? { y: 1 } : undefined}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled}
      {...(rest as any)}
    >
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
