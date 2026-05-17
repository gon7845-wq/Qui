import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "gold" | "ghost" | "ruby";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "gold",
  size = "md",
  fullWidth,
  className = "",
  disabled,
  children,
  ...rest
}: Props) {
  const base =
    "relative inline-flex items-center justify-center gap-2 font-display tracking-wider uppercase transition-all select-none rounded-full overflow-hidden";
  const sizes = {
    sm: "h-9 px-5 text-[12px]",
    md: "h-12 px-7 text-[13px]",
    lg: "h-14 px-9 text-[15px]",
  };
  const variants: Record<Variant, string> = {
    gold:
      "text-wood-900 disabled:opacity-50 disabled:cursor-not-allowed",
    ghost:
      "border border-cream/30 text-cream hover:border-cream/60 hover:bg-cream/[0.05] disabled:opacity-50 disabled:cursor-not-allowed",
    ruby:
      "bg-ruby_dark text-cream hover:bg-ruby disabled:opacity-50 disabled:cursor-not-allowed",
  };
  const goldBg =
    variant === "gold"
      ? "linear-gradient(180deg, #E9CB6F 0%, #C8A23F 50%, #8C6F22 100%)"
      : undefined;

  return (
    <motion.button
      whileHover={!disabled ? { y: -1 } : undefined}
      whileTap={!disabled ? { y: 1, scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled}
      style={{
        background: goldBg,
        boxShadow:
          variant === "gold"
            ? "0 0 0 1.5px #5D4810, inset 0 1px 0 rgba(255,255,255,0.5), 0 10px 26px -8px rgba(0,0,0,0.6)"
            : undefined,
      }}
      {...(rest as any)}
    >
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
