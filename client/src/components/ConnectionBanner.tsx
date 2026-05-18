import { AnimatePresence, motion } from "framer-motion";
import { useConnectionStatus } from "../lib/useConnectionStatus";

export function ConnectionBanner() {
  const status = useConnectionStatus();
  if (status === "connected") return null;

  return (
    <AnimatePresence>
      <motion.div
        key="conn"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        role="status"
        aria-live="polite"
        className="fixed top-0 inset-x-0 z-40 bg-court-accuse/90 text-court-parchment py-2 px-4 text-center text-sm font-medium tracking-wider"
      >
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-court-parchment animate-pulse" />
          {status === "disconnected"
            ? "Connexion perdue — reconnexion en cours…"
            : "Reconnexion au tribunal…"}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
