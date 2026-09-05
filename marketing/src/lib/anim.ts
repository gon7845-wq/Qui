import { interpolate, spring } from "remotion";

/** Ressort "pop" du jeu (stiffness 320 / damping 20 côté client). */
export function pop(frame: number, fps: number, delay = 0, opts: { stiffness?: number; damping?: number } = {}) {
  return spring({
    frame: frame - delay,
    fps,
    config: { stiffness: opts.stiffness ?? 320, damping: opts.damping ?? 18, mass: 1 },
  });
}

export const clamp = (frame: number, from: [number, number], to: [number, number]) =>
  interpolate(frame, from, to, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Apparition (opacité + translation) entre start et start+len frames. */
export function fadeUp(frame: number, start: number, len = 10, dy = 24) {
  const t = clamp(frame, [start, start + len], [0, 1]);
  return { opacity: t, transform: `translateY(${(1 - t) * dy}px)` };
}

export const secs = (s: number, fps: number) => Math.round(s * fps);
