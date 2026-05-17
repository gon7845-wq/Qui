import { motion } from "framer-motion";

interface Props {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "text-3xl",
  md: "text-5xl",
  lg: "text-7xl md:text-8xl",
  xl: "text-[18vw] md:text-[15vw] leading-[0.85]",
};

export function Brand({ size = "md", className = "" }: Props) {
  return (
    <span className={`italic-display ${sizes[size]} ${className}`}>
      <span className="iridescent-text">Qui</span>
      <motion.span
        initial={{ opacity: 0.4 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="iridescent-text"
        aria-hidden
      >
        {" ?"}
      </motion.span>
    </span>
  );
}
