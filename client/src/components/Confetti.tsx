import { useMemo } from "react";

const COLORS = ["#FF5E8A", "#FF9F43", "#FFCB45", "#4CC9F0", "#8B5CF6", "#2DD4BF", "#FF6FA3"];

interface Props {
  count?: number;
  /** change to replay the burst */
  seed?: string | number;
}

/** One-shot confetti burst falling from the top. Dependency-free (CSS). */
export function Confetti({ count = 80, seed = 0 }: Props) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        dur: 2.2 + Math.random() * 1.8,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 8,
        h: 8 + Math.random() * 8,
        rot: Math.random() * 360,
        round: Math.random() > 0.6,
      })),
    [count, seed]
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: p.w,
            height: p.round ? p.w : p.h,
            background: p.color,
            borderRadius: p.round ? "50%" : 2,
            transform: `rotate(${p.rot}deg)`,
            animation: `confetti-fall ${p.dur}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
