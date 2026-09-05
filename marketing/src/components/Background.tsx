import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { BLOBS, PAGE_GRADIENT } from "../theme";

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

/** Fond du jeu : dégradé papier chaud + blobs flous qui dérivent + grain. */
export function Background() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vmax = Math.max(width, height);
  const t = frame / (fps * 24); // un cycle de dérive = 24 s, comme le CSS

  return (
    <AbsoluteFill style={{ background: PAGE_GRADIENT, overflow: "hidden" }}>
      {BLOBS.map((b, i) => {
        const p = (t + b.phase) * Math.PI * 2;
        const dx = Math.sin(p) * 0.045 * width;
        const dy = Math.cos(p * 0.8) * 0.05 * height;
        const scale = 1 + Math.sin(p * 1.3) * 0.06;
        const size = b.size * vmax;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: b.top * height,
              left: b.left * width,
              width: size,
              height: size,
              borderRadius: "50%",
              background: b.color,
              opacity: 0.6,
              filter: "blur(90px)",
              transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
            }}
          />
        );
      })}
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.5, mixBlendMode: "soft-light" }} />
    </AbsoluteFill>
  );
}
