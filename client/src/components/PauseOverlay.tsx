import { motion } from "framer-motion";
import { Button } from "./Button";
import { VoteReactions } from "./VoteReactions";

export function PauseOverlay({ isHost, onResume }: { isHost: boolean; onResume: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 grid place-items-center px-6"
      style={{
        background: "rgba(36,27,51,0.32)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <VoteReactions emoji="🍿" count={14} />

      <motion.div
        initial={{ scale: 0.7, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="glass-card w-full max-w-sm px-8 py-9 text-center"
      >
        <motion.div
          animate={{ rotate: [-7, 7, -7], scale: [1, 1.08, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: 64, lineHeight: 1 }}
        >
          ⏸️
        </motion.div>
        <div className="font-display brand-gradient mt-2" style={{ fontSize: "clamp(30px,7vmin,48px)" }}>
          Pause
        </div>
        <div className="label text-ink-soft mt-1">On débriefe… et on rigole 🍿</div>

        <div className="mt-7">
          {isHost ? (
            <Button fullWidth onClick={onResume}>
              ▶ Reprendre
            </Button>
          ) : (
            <div className="label text-ink-faint">En attente de l'hôte…</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
