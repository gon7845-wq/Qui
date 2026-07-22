import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playCountdown } from "../lib/sound";
import { useNow } from "../lib/useNow";

export function Countdown({ endTime }: { endTime: number }) {
  const now = useNow(80);

  useEffect(() => {
    playCountdown();
  }, [endTime]);

  const remaining = (endTime - now) / 1000;
  const label = remaining > 0 ? String(Math.min(3, Math.ceil(remaining))) : "GO";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={label}
          initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 1.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 16 }}
          className={`font-display ${label === "GO" ? "brand-gradient" : "tone-text tone-warm"}`}
          style={{ fontSize: "min(42vmin, 280px)", lineHeight: 1 }}
        >
          {label}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
