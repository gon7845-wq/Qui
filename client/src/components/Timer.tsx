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
    <div className="flex items-center gap-3">
      <div
        className={`italic-display text-5xl tabular-nums ${
          urgent ? "text-cherry" : "text-acid"
        }`}
        style={{
          textShadow: urgent
            ? "0 0 30px rgba(255,51,102,0.4)"
            : "0 0 30px rgba(219,255,0,0.3)",
          animation: urgent ? "ticker 0.5s ease-in-out infinite" : undefined,
        }}
      >
        {seconds}
      </div>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-100"
          style={{
            width: `${pct * 100}%`,
            background: urgent ? "var(--cherry)" : "var(--acid)",
            boxShadow: urgent
              ? "0 0 20px rgba(255,51,102,0.6)"
              : "0 0 20px rgba(219,255,0,0.4)",
          }}
        />
      </div>
    </div>
  );
}
