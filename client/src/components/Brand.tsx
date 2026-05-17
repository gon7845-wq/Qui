import { motion } from "framer-motion";

interface Props {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "text-3xl",
  md: "text-5xl",
  lg: "text-7xl md:text-8xl",
  xl: "text-[28vw] md:text-[20vw] leading-[0.78]",
};

export function Brand({ size = "md", className = "" }: Props) {
  return (
    <span
      className={`font-stamp ${sizes[size]} ${className}`}
      style={{ color: "var(--paper)", letterSpacing: "-0.01em" }}
    >
      QUI
      <motion.span
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ color: "var(--vermillion)" }}
      >
        ?
      </motion.span>
    </span>
  );
}
