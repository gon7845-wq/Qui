import { useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY } from "../lib/fonts";
import { pop } from "../lib/anim";
import { COLORS, avatarColorFor } from "../theme";

interface Props {
  pseudo: string;
  colorKey: string;
  emoji?: string;
  size?: number;
  isHost?: boolean;
  voteCount?: number;
  /** frame à laquelle le compteur est apparu (pour le petit pop) */
  voteFrame?: number;
  highlight?: boolean;
  dim?: boolean;
  selected?: boolean;
}

export function Avatar({ pseudo, colorKey, emoji, size = 200, isHost, voteCount, voteFrame, highlight, dim, selected }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = avatarColorFor(colorKey);
  const badgeScale = voteCount ? pop(frame, fps, voteFrame ?? 0, { stiffness: 420, damping: 16 }) : 0;
  const badge = Math.max(40, size * 0.3);

  const shadow = highlight
    ? `0 0 0 8px #fff, 0 0 0 16px ${c.a}, 0 28px 68px -16px ${c.a}cc, 0 0 100px ${c.a}99`
    : selected
    ? `0 0 0 8px #fff, 0 0 0 16px ${COLORS.accent}, 0 24px 52px -16px rgba(255,94,138,0.5)`
    : `0 16px 40px -16px ${c.a}aa, inset 0 4px 0 rgba(255,255,255,0.4)`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: size * 0.1,
        width: size + 40,
        opacity: dim ? 0.35 : 1,
        transform: `scale(${highlight ? 1.08 : 1})`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: `linear-gradient(145deg, ${c.a} 0%, ${c.b} 100%)`,
          boxShadow: shadow,
          color: "#fff",
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: Math.round(size * 0.42),
          textShadow: "0 2px 6px rgba(0,0,0,0.18)",
        }}
      >
        <span style={{ fontSize: emoji ? Math.round(size * 0.55) : undefined, lineHeight: 1, textShadow: emoji ? "none" : undefined }}>
          {emoji ?? pseudo.slice(0, 1).toUpperCase()}
        </span>
        {isHost && (
          <span
            style={{
              position: "absolute",
              top: -size * 0.03,
              right: -size * 0.03,
              width: badge * 0.8,
              height: badge * 0.8,
              borderRadius: "50%",
              background: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: badge * 0.45,
              boxShadow: "0 6px 16px rgba(63,39,120,0.3)",
            }}
          >
            👑
          </span>
        )}
        {typeof voteCount === "number" && voteCount > 0 && (
          <span
            style={{
              position: "absolute",
              bottom: -badge * 0.25,
              right: -badge * 0.1,
              minWidth: badge,
              height: badge,
              padding: `0 ${badge * 0.28}px`,
              borderRadius: 999,
              background: "#fff",
              color: COLORS.ink,
              display: "grid",
              placeItems: "center",
              fontFamily: DISPLAY,
              fontWeight: 600,
              fontSize: badge * 0.55,
              boxShadow: "0 8px 24px -4px rgba(63,39,120,0.35)",
              transform: `scale(${badgeScale})`,
              textShadow: "none",
            }}
          >
            {voteCount}
          </span>
        )}
      </div>
      <span
        style={{
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: Math.max(26, size * 0.19),
          color: COLORS.ink,
          maxWidth: size + 40,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {pseudo}
      </span>
    </div>
  );
}
