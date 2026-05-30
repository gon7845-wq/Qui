import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Avatar } from "./Avatar";
import type { Player } from "../types";

interface Props {
  players: Player[];
  selfId: string | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  selectableIds?: Set<string>;
  voteCounts?: Record<string, number>;
  highlightId?: string | null;
  /** dim everyone who isn't highlighted (verdict moment) */
  dimOthers?: boolean;
}

export function PlayerGrid({
  players,
  selfId,
  selectedId,
  onSelect,
  selectableIds,
  voteCounts,
  highlightId,
  dimOthers,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const n = players.length;
  const cols = n <= 4 ? Math.max(2, n) : n <= 6 ? 3 : n <= 9 ? 3 : 4;
  const gap = 16;
  const cell = w > 0 ? (w - gap * (cols - 1)) / cols : 100;
  const size = Math.round(Math.max(54, Math.min(132, cell - 18)));

  return (
    <div
      ref={ref}
      className="flex flex-wrap items-start justify-center"
      style={{ gap, maxWidth: 680, width: "100%" }}
    >
      {w > 0 &&
        players.map((p, i) => {
          const selectable = !!onSelect && (selectableIds ? selectableIds.has(p.id) : true);
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 20, delay: i * 0.05 }}
            >
              <Avatar
                pseudo={p.pseudo}
                colorKey={p.id}
                emoji={p.avatar}
                size={size}
                isSelf={p.id === selfId}
                isHost={p.isHost}
                selected={selectedId === p.id}
                selectable={selectable}
                onClick={() => onSelect?.(p.id)}
                voteCount={voteCounts?.[p.id]}
                highlight={highlightId === p.id}
                dim={dimOthers && highlightId != null && highlightId !== p.id}
              />
            </motion.div>
          );
        })}
    </div>
  );
}
