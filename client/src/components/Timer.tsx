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
      <div
        className={`italic-display text-6xl tabular-nums ${
          urgent ? "" : "iridescent-text"
        }`}
        style={{
          color: urgent ? "#FFB8E1" : undefined,
          textShadow: urgent
            ? "0 0 30px rgba(255,184,225,0.5), 0 0 60px rgba(255,184,225,0.3)"
            : undefined,
          animation: urgent ? "ticker 0.5s ease-in-out infinite" : undefined,
        }}
      >
        {seconds}
      </div>
      <div
        className="relative h-2 flex-1 overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-100"
          style={{
            width: `${pct * 100}%`,
            background: urgent
              ? "linear-gradient(to right, #FFB8E1, #FF8FBE)"
              : "linear-gradient(to right, #9ED3FF, #DDA0FF, #FFB8E1)",
            backgroundSize: "200% 100%",
            animation: urgent ? undefined : "shimmer 4s linear infinite",
            boxShadow: urgent
              ? "0 0 20px rgba(255,184,225,0.5)"
              : "0 0 24px rgba(221,160,255,0.4)",
          }}
        />
      </div>
    </div>
  );
}
