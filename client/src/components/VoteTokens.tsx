import { motion } from "framer-motion";

interface Props {
  count: number;
  doubled?: boolean;
  delay?: number;
}

/** Row of brass coins above an accused — one per vote (×2 = bigger, accent). */
export function VoteTokens({ count, doubled = false, delay = 0 }: Props) {
  const items = Array.from({ length: Math.min(count, 12) });
  return (
    <div className="flex gap-1 justify-center min-h-[10px]">
      {items.map((_, i) => (
        <motion.span
          key={i}
          initial={{ scale: 0, y: -8, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{
            delay: delay + i * 0.05,
            duration: 0.25,
            ease: "backOut",
          }}
          className={`block w-2 h-2 rounded-full ${
            doubled
              ? "bg-court-accuse shadow-[0_0_6px_rgba(255,59,59,0.6)]"
              : "bg-court-brass shadow-[0_0_6px_rgba(201,163,90,0.5)]"
          }`}
        />
      ))}
    </div>
  );
}
