import { useMemo } from "react";

interface Props {
  emoji: string;
  /** how many reactions to float up */
  count: number;
}

/** Emojis that drift upward across the screen — tone-colored celebration / roast. */
export function VoteReactions({ emoji, count }: Props) {
  const items = useMemo(
    () =>
      Array.from({ length: Math.min(count, 40) }, (_, i) => ({
        id: i,
        left: 6 + Math.random() * 88,
        delay: Math.random() * 1.2,
        dur: 1.4 + Math.random() * 1.0,
        size: 22 + Math.random() * 26,
      })),
    [count, emoji]
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {items.map((it) => (
        <span
          key={it.id}
          className="absolute bottom-[18%]"
          style={{
            left: `${it.left}%`,
            fontSize: it.size,
            animation: `float-up ${it.dur}s ease-out ${it.delay}s infinite`,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}
