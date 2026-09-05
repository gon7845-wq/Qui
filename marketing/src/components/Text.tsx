import type { CSSProperties, ReactNode } from "react";
import { BODY, DISPLAY } from "../lib/fonts";
import { COLORS, TONE, type Tone, toneGradient } from "../theme";

/** Petit libellé en capitales espacées (classe .label du jeu). */
export function Label({ children, color = COLORS.inkSoft, size = 24, style }: { children: ReactNode; color?: string; size?: number; style?: CSSProperties }) {
  return (
    <span
      style={{
        fontFamily: BODY,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Display({ children, size = 56, color = COLORS.ink, style }: { children: ReactNode; size?: number; color?: string; style?: CSSProperties }) {
  return (
    <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: size, lineHeight: 1.12, letterSpacing: "-0.01em", color, ...style }}>
      {children}
    </span>
  );
}

export function ToneText({ tone, children, size = 56, style }: { tone: Tone; children: ReactNode; size?: number; style?: CSSProperties }) {
  return (
    <span
      style={{
        fontFamily: DISPLAY,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1.05,
        letterSpacing: "-0.01em",
        background: toneGradient(tone),
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        // Le dégradé sur texte perd l'anti-aliasing sub-pixel : on épaissit un poil.
        paddingBottom: "0.08em",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function TonePill({ tone, size = 22 }: { tone: Tone; size?: number }) {
  const meta = TONE[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.4,
        background: toneGradient(tone),
        color: "#fff",
        borderRadius: 999,
        padding: `${size * 0.45}px ${size * 1.1}px`,
        fontFamily: BODY,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      {meta.emoji} {meta.label}
    </span>
  );
}
