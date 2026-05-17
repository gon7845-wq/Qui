import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { chipColorFor } from "../lib/colors";
import { seatPosition } from "./Table";
import type { Player } from "../types";

interface Props {
  /** voterId -> targetId */
  votes: Record<string, string>;
  players: Player[];
  /** which slice of voters to animate so far (0..N) */
  count: number;
  showAll?: boolean;
}

/**
 * Renders small chip tokens that glide from each voter's seat to their target's seat.
 * Tokens stack near the target chip in a small ring.
 */
export function VoteTokens({ votes, players, count, showAll }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const s = Math.min(e.contentRect.width, e.contentRect.height);
        setSize(s);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const positions: Record<string, { x: number; y: number }> = {};
  if (size > 0) {
    players.forEach((p, i) => {
      positions[p.id] = seatPosition(i, players.length, size, 0.4);
    });
  }

  // Stable list of vote tokens with their visual offsets around the target
  const voteEntries = Object.entries(votes); // [voterId, targetId]
  const targetCounts: Record<string, number> = {};
  const tokens = voteEntries.map(([voterId, targetId], idx) => {
    const slot = targetCounts[targetId] ?? 0;
    targetCounts[targetId] = slot + 1;
    return { voterId, targetId, idx, slot };
  });

  const visible = showAll ? tokens.length : count;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {size > 0 && (
        <AnimatePresence>
          {tokens.slice(0, visible).map((t) => {
            const from = positions[t.voterId];
            const to = positions[t.targetId];
            if (!from || !to) return null;
            const voter = players.find((p) => p.id === t.voterId);
            const colors = chipColorFor(voter?.pseudo ?? "?");
            // Spread offset around the target
            const slot = t.slot;
            const ring = Math.floor(slot / 6);
            const inRing = slot % 6;
            const ringR = 18 + ring * 14;
            const ringAngle = (inRing / 6) * Math.PI * 2 + slot * 0.4;
            const offX = Math.cos(ringAngle) * ringR;
            const offY = Math.sin(ringAngle) * ringR;
            const tokenSize = Math.max(18, Math.min(34, size * 0.05));
            return (
              <motion.span
                key={t.voterId}
                initial={{
                  x: from.x,
                  y: from.y,
                  opacity: 0,
                  scale: 0.4,
                }}
                animate={{
                  x: to.x + offX,
                  y: to.y + offY,
                  opacity: 1,
                  scale: 1,
                }}
                transition={{
                  duration: 0.55,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute left-0 top-0"
                style={{
                  width: tokenSize,
                  height: tokenSize,
                  marginLeft: -tokenSize / 2,
                  marginTop: -tokenSize / 2,
                  borderRadius: "50%",
                  background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 50% 50%, ${colors.outer} 0%, ${colors.outerDark} 100%)`,
                  border: "1.5px solid rgba(20,17,13,0.5)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.5), 0 3px 6px rgba(0,0,0,0.5)",
                  zIndex: 25,
                }}
              />
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
