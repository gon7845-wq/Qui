import { motion } from "framer-motion";
import type { RoomState } from "@qui/shared";
import { Gavel } from "../components/Gavel";

interface Props {
  state: RoomState;
}

export function QuestionScreen({ state }: Props) {
  const q = state.round?.question;
  if (!q) return null;
  const roundLabel = `Manche ${state.round!.index + 1} / ${state.round!.total}`;

  return (
    <div className="min-h-full grid place-items-center px-6 py-12">
      <div className="max-w-3xl w-full text-center">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-xs uppercase tracking-[0.4em] text-court-parchment/50"
        >
          {roundLabel}
        </motion.p>

        <motion.div
          initial={{ scale: 0.7, rotate: -10, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "backOut" }}
          className="my-6 flex justify-center"
        >
          <Gavel size={72} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20, letterSpacing: "0.5em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.03em" }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
          className="court-title text-4xl sm:text-6xl font-black text-court-parchment leading-tight"
        >
          {q.text}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-10 text-court-parchment/40 text-sm tracking-widest uppercase animate-pulse"
        >
          Préparez votre verdict…
        </motion.p>
      </div>
    </div>
  );
}
