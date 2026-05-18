import { useEffect, useRef, useState } from "react";

interface Countdown {
  msLeft: number;
  totalMs: number;
  progress: number; // 0..1 elapsed
}

/** Smoothly tracks server-authoritative phase end times via rAF. */
export function useCountdown(endsAt: number | null, totalMs: number): Countdown {
  const [now, setNow] = useState(() => Date.now());
  const startAt = useRef(Date.now());

  useEffect(() => {
    if (endsAt === null) return;
    startAt.current = endsAt - totalMs;
    setNow(Date.now());
    let raf = 0;
    const tick = () => {
      setNow(Date.now());
      if (Date.now() < endsAt) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [endsAt, totalMs]);

  if (endsAt === null) return { msLeft: 0, totalMs, progress: 0 };
  const msLeft = Math.max(0, endsAt - now);
  const progress = totalMs <= 0 ? 1 : Math.min(1, (totalMs - msLeft) / totalMs);
  return { msLeft, totalMs, progress };
}
