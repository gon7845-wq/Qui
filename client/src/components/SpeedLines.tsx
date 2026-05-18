import { motion } from "framer-motion";

interface Props {
  color?: string;
  durationMs?: number;
}

/**
 * Manga-style radial speed-lines behind dramatic moments.
 * Pure CSS — built from a conic-gradient mask.
 */
export function SpeedLines({ color = "#c9a35a", durationMs = 700 }: Props) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: [0, 0.8, 0.6, 0], scale: [0.5, 1.2, 1.4, 1.6] }}
      transition={{ duration: durationMs / 1000, times: [0, 0.15, 0.5, 1] }}
      className="pointer-events-none absolute inset-0 grid place-items-center"
    >
      <div
        className="w-[200vmin] h-[200vmin] opacity-70 mix-blend-screen"
        style={{
          background: `repeating-conic-gradient(from 0deg, ${color} 0deg 1.2deg, transparent 1.2deg 6deg)`,
          maskImage:
            "radial-gradient(circle, transparent 22%, black 35%, black 65%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(circle, transparent 22%, black 35%, black 65%, transparent 90%)",
          animation: "spin 1.4s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}
