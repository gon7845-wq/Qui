import { useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY } from "../lib/fonts";
import { pop } from "../lib/anim";
import { COLORS, SAFE } from "../theme";

/**
 * Accroche en haut de l'écran : la phrase qui arrête le pouce.
 * Fond blanc cassé opaque pour rester lisible quel que soit le fond.
 */
export function Hook({ text, start = 0 }: { text: string; start?: number }) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const s = pop(frame, fps, start, { stiffness: 260, damping: 16 });
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE.top,
        left: SAFE.side,
        width: width - SAFE.side * 2,
        display: "flex",
        justifyContent: "center",
        transform: `scale(${0.85 + s * 0.15}) rotate(${(1 - s) * -3}deg)`,
        opacity: Math.min(1, s * 1.4),
      }}
    >
      <div
        style={{
          background: COLORS.ink,
          color: "#fff",
          borderRadius: 36,
          padding: "26px 40px",
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: 58,
          lineHeight: 1.15,
          textAlign: "center",
          boxShadow: "0 30px 60px -24px rgba(36,27,51,0.55)",
          maxWidth: 900,
        }}
      >
        {text}
      </div>
    </div>
  );
}
