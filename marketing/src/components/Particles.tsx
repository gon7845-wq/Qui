import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { rng } from "../lib/scenario";
import { CONFETTI_COLORS } from "../theme";

/** Confettis qui tombent du haut, déterministes (graine). */
export function Confetti({ start, seed, count = 70 }: { start: number; seed: string; count?: number }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const r = rng(`confetti:${seed}`);
  const pieces = Array.from({ length: count }, (_, i) => ({
    x: r.next() * width,
    delay: r.next() * 0.5 * fps,
    dur: (2.2 + r.next() * 1.8) * fps,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    w: 12 + r.next() * 16,
    h: 16 + r.next() * 16,
    rot: r.next() * 360,
    round: r.next() > 0.6,
    drift: (r.next() - 0.5) * 160,
  }));
  if (frame < start) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {pieces.map((p, i) => {
        const t = (frame - start - p.delay) / p.dur;
        if (t < 0 || t > 1) return null;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: p.x + Math.sin(t * Math.PI * 2) * p.drift,
              top: -0.12 * height + t * 1.24 * height,
              width: p.w,
              height: p.round ? p.w : p.h,
              background: p.color,
              borderRadius: p.round ? "50%" : 4,
              transform: `rotate(${p.rot + t * 720}deg)`,
              opacity: 1 - t * 0.15,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/** Emojis qui montent depuis le bas de l'écran (VoteReactions du jeu). */
export function Reactions({ start, seed, emoji, count = 28, duration = 90 }: { start: number; seed: string; emoji: string; count?: number; duration?: number }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const r = rng(`react:${seed}`);
  const items = Array.from({ length: count }, () => ({
    x: (0.06 + r.next() * 0.88) * width,
    delay: r.next() * 1.2 * fps,
    dur: (1.4 + r.next() * 1.0) * fps,
    size: 44 + r.next() * 52,
  }));
  if (frame < start || frame > start + duration + 3 * fps) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {items.map((it, i) => {
        let t = (frame - start - it.delay) / it.dur;
        if (t < 0) return null;
        // boucle tant que la fenêtre dure
        if (frame - start > duration) {
          if (t > 1) return null;
        } else {
          t = t % 1;
        }
        const opacity = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: it.x,
              bottom: 0.18 * height + t * 380,
              fontSize: it.size,
              transform: `scale(${0.6 + t * 0.5})`,
              opacity,
            }}
          >
            {emoji}
          </span>
        );
      })}
    </AbsoluteFill>
  );
}
