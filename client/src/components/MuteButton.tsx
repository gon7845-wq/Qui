import { useEffect, useState } from "react";
import { audio } from "../lib/audio";

interface Props {
  className?: string;
}

export function MuteButton({ className = "" }: Props) {
  const [muted, setMuted] = useState(audio.isMuted());

  useEffect(() => {
    const unsub = audio.subscribe((m) => setMuted(m));
    return () => {
      unsub();
    };
  }, []);

  return (
    <button
      onClick={() => audio.toggleMute()}
      aria-label={muted ? "Activer le son" : "Couper le son"}
      title={muted ? "Activer le son" : "Couper le son"}
      className={`fixed top-4 right-4 z-50 w-10 h-10 rounded-full grid place-items-center
        border border-court-brass/40 bg-court-ink/70 backdrop-blur-sm
        text-court-parchment hover:border-court-brass hover:bg-court-ink/90
        transition shadow-lg
        ${className}
      `}
    >
      {muted ? <IconMuted /> : <IconSound />}
    </button>
  );
}

function IconSound() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10v4h3l5 4V6L6 10H3z" fill="currentColor" stroke="none" />
      <path d="M14 9c1.5 1.5 1.5 4.5 0 6" />
      <path d="M16.5 6.5c3 3 3 8 0 11" />
    </svg>
  );
}

function IconMuted() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10v4h3l5 4V6L6 10H3z" fill="currentColor" stroke="none" />
      <path d="M16 9l5 6M21 9l-5 6" />
    </svg>
  );
}
