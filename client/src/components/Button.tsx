import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "iri" | "glass" | "chrome" | "danger";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  variant?: Variant;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "iri",
  fullWidth,
  size = "md",
  className = "",
  children,
  disabled,
  ...rest
}: Props) {
  const base =
    "relative inline-flex items-center justify-center gap-2 font-semibold tracking-tight transition-all overline rounded-full overflow-hidden";
  const sizes = {
    sm: "h-9 px-4 text-[12px]",
    md: "h-12 px-5 text-[12px]",
    lg: "h-14 px-7 text-[13px]",
  };
  const variants: Record<Variant, string> = {
    iri:
      "iri-fill text-ink-900 hover:brightness-105 active:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:saturate-50",
    glass:
      "glass text-pearl hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed",
    chrome:
      "bg-gradient-to-b from-white/95 via-iris-silver to-white/95 text-ink-900 hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed",
    danger:
      "bg-white/[0.04] text-iris-rose border border-iris-rose/40 hover:bg-iris-rose/10 disabled:opacity-40 disabled:cursor-not-allowed",
  };
  return (
    <motion.button
      whileHover={!disabled ? { y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled}
      {...(rest as any)}
    >
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
