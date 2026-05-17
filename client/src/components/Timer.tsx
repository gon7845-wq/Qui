import { useEffect, useState } from "react";

interface Props {
  endTime: number;
  duration: number;
  onEnd?: () => void;
}

export function Timer({ endTime, duration, onEnd }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, endTime - now);
  const seconds = Math.ceil(remaining / 1000);
  const pct = Math.max(0, Math.min(1, remaining / (duration * 1000)));
  const urgent = seconds <= 3;

  useEffect(() => {
    if (remaining <= 0 && onEnd) onEnd();
  }, [remaining, onEnd]);

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-baseline gap-2">
        <span className="overline text-cream/55">DÉLIBÉRÉ</span>
        <span
          className={`font-stamp text-6xl tabular-nums ${urgent ? "text-vermillion" : "text-paper"}`}
          style={{
            animation: urgent ? "ticker 0.5s ease-in-out infinite" : undefined,
            textShadow: urgent
              ? "0 0 30px rgba(200,57,47,0.4)"
              : undefined,
          }}
        >
          {String(seconds).padStart(2, "0")}
        </span>
        <span className="overline text-cream/40">SEC</span>
      </div>
      {/* Progress as a hand-drawn ink line */}
      <div
        className="relative h-1 flex-1 overflow-hidden"
        style={{ background: "rgba(232,221,196,0.15)" }}
      >
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-100"
          style={{
            width: `${pct * 100}%`,
            background: urgent ? "var(--vermillion)" : "var(--paper)",
          }}
        />
      </div>
    </div>
  );
}
