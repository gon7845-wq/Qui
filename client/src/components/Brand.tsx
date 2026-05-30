import { motion } from "framer-motion";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "text-3xl",
  md: "text-5xl",
  lg: "text-7xl md:text-8xl",
};

export function Brand({ size = "md", className = "" }: Props) {
  return (
    <span className={`font-display brand-gradient inline-flex items-baseline ${sizes[size]} ${className}`}>
      Qui
      <motion.span
        animate={{ rotate: [0, -8, 8, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="inline-block ml-0.5"
      >
        ?
      </motion.span>
    </span>
  );
}
