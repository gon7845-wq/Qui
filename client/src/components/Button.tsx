import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "soft" | "ghost";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className = "",
  disabled,
  children,
  ...rest
}: Props) {
  const sizes = {
    sm: "h-10 px-5 text-sm",
    md: "h-12 px-7 text-[15px]",
    lg: "h-14 px-9 text-base",
  };

  const variants: Record<Variant, React.CSSProperties> = {
    primary: {
      background: "linear-gradient(135deg, #FF5E8A 0%, #FF9F43 100%)",
      color: "#fff",
      boxShadow: "0 12px 26px -8px rgba(255,94,138,0.6), inset 0 1px 0 rgba(255,255,255,0.45)",
    },
    soft: {
      background: "rgba(255,94,138,0.12)",
      color: "var(--accent-deep)",
    },
    ghost: {
      background: "transparent",
      color: "var(--ink-soft)",
      boxShadow: "inset 0 0 0 2px rgba(110,100,128,0.25)",
    },
  };

  return (
    <motion.button
      whileHover={!disabled ? { y: -2 } : undefined}
      whileTap={!disabled ? { y: 0, scale: 0.97 } : undefined}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`pill inline-flex items-center justify-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed ${sizes[size]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      disabled={disabled}
      style={variants[variant]}
      {...(rest as any)}
    >
      {children}
    </motion.button>
  );
}
