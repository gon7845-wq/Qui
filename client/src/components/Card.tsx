import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  glass?: boolean;
  animateKey?: string | number;
}

export function Card({ children, className = "", glass, animateKey }: Props) {
  return (
    <motion.div
      key={animateKey}
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`${glass ? "glass-card" : "soft-card"} ${className}`}
    >
      {children}
    </motion.div>
  );
}
