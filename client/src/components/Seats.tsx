import { useEffect, useRef, useState } from "react";
import { Chip } from "./Chip";
import { seatPosition } from "./Table";
import type { Player } from "../types";

interface Props {
  players: Player[];
  selfId: string | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** which IDs can be selected (defaults to all if onSelect is provided) */
  selectableIds?: Set<string>;
  voteCounts?: Record<string, number>;
  highlightId?: string | null;
  /** smaller chips, e.g. final screen */
  chipScale?: number;
}

/** Renders the chips of all seated players around the felt circle. */
export function Seats({
  players,
  selfId,
  selectedId,
  onSelect,
  selectableIds,
  voteCounts,
  highlightId,
  chipScale = 1,
}: Props) {
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

  // Chip size scales with felt size and player count
  const baseChip = Math.max(56, Math.min(110, size * 0.16));
  const crowdAdjust = players.length > 6 ? 0.85 : players.length > 8 ? 0.72 : 1;
  const chipSize = Math.round(baseChip * crowdAdjust * chipScale);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {size > 0 &&
        players.map((p, i) => {
          const { x, y } = seatPosition(i, players.length, size, 0.4);
          const selectable = !!onSelect && (selectableIds ? selectableIds.has(p.id) : true);
          const isHighlight = highlightId === p.id;
          return (
            <div
              key={p.id}
              className="absolute"
              style={{
                left: x,
                top: y,
                transform: `translate(-50%, -50%)`,
                zIndex: isHighlight ? 20 : 10,
              }}
            >
              <Chip
                pseudo={p.pseudo}
                size={chipSize}
                isSelf={p.id === selfId}
                isHost={p.isHost}
                selected={selectedId === p.id}
                selectable={selectable}
                onClick={() => onSelect?.(p.id)}
                voteCount={voteCounts?.[p.id]}
                glow={isHighlight}
              />
            </div>
          );
        })}
    </div>
  );
}
