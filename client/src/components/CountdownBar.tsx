interface Props {
  msLeft: number;
  totalMs: number;
  /** progress 0..1 (already smoothed) */
  progress: number;
  warn?: boolean;
}

export function CountdownBar({ msLeft, progress, warn = false }: Props) {
  const seconds = Math.ceil(msLeft / 1000);
  const danger = warn || msLeft < 3_000;
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] uppercase tracking-[0.3em] text-court-parchment/50">
          Temps
        </span>
        <span
          className={`font-gavel text-2xl tabular-nums tracking-widest ${
            danger ? "text-court-accuse" : "text-court-brass"
          }`}
        >
          {seconds.toString().padStart(2, "0")}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-court-ink/70 overflow-hidden border border-court-brass/20">
        <div
          className={`h-full transition-[width] duration-100 linear ${
            danger
              ? "bg-gradient-to-r from-court-accuse to-court-blood"
              : "bg-gradient-to-r from-court-brass to-[#9c7a3a]"
          }`}
          style={{ width: `${(1 - progress) * 100}%` }}
        />
      </div>
    </div>
  );
}
