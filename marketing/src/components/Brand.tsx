import { useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY } from "../lib/fonts";
import { brandGradient } from "../theme";

/** Logo texte « Qui ? » — le « ? » se balance comme dans l'app. */
export function Brand({ size = 120 }: { size?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rot = Math.sin((frame / (fps * 2.4)) * Math.PI * 2) * 8;
  return (
    <span
      style={{
        fontFamily: DISPLAY,
        fontWeight: 600,
        fontSize: size,
        letterSpacing: "-0.01em",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "baseline",
      }}
    >
      <span style={gradientText}>Qui</span>
      <span style={{ ...gradientText, display: "inline-block", marginLeft: size * 0.03, transform: `rotate(${rot}deg)` }}>?</span>
    </span>
  );
}

const gradientText: React.CSSProperties = {
  background: brandGradient,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};
