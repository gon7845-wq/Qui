import type { CSSProperties, ReactNode } from "react";
import { CARD_SHADOW, COLORS } from "../theme";

/** Carte « sticker » du jeu : bord fin + ombre chaude en couches. */
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: COLORS.card,
        borderRadius: 56,
        border: `3px solid ${COLORS.hairline}`,
        boxShadow: CARD_SHADOW,
        padding: 56,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
