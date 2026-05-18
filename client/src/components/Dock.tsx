import { motion } from "framer-motion";

interface Props {
  delay?: number;
}

/** The wooden bar/balustrade in front of the accused stand. */
export function Dock({ delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ delay, duration: 0.6, ease: "easeOut" }}
      style={{ originX: 0.5 }}
      className="relative h-6 w-full mt-2 rounded-md overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg, #4a2c1c 0%, #2a1810 50%, #1a0e08 100%),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 22px)
          `,
          backgroundBlendMode: "overlay",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-court-brass/50" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-black/60" />
    </motion.div>
  );
}
