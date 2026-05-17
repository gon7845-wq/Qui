import { motion } from "framer-motion";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-6xl md:text-7xl",
};

export function Brand({ size = "md", className = "" }: Props) {
  return (
    <span
      className={`font-display ${sizes[size]} ${className}`}
      style={{
        background:
          "linear-gradient(180deg, #E9CB6F 0%, #C8A23F 50%, #8C6F22 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        textShadow: "0 0 30px rgba(200,162,63,0.25)",
      }}
    >
      QUI
      <motion.span
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        ?
      </motion.span>
    </span>
  );
}
