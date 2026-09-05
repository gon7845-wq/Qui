import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Brand } from "./Brand";
import { Display, Label } from "./Text";
import { BODY, DISPLAY } from "../lib/fonts";
import { clamp, pop } from "../lib/anim";
import { COLORS, accentGradient, toneGradient } from "../theme";

/**
 * Écran final : marque, promesse, adresse du jeu.
 * `start` = frame d'entrée ; le reste de la vidéo est masqué par un voile qui monte.
 */
export function EndCard({ start, host, tagline }: { start: number; host: string; tagline?: string }) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  if (frame < start) return null;
  const f = frame - start;
  const veil = clamp(f, [0, 12], [height, 0]);
  const s1 = pop(f, fps, 6, { stiffness: 220, damping: 16 });
  const s2 = pop(f, fps, 14);
  const s3 = pop(f, fps, 22);
  const s4 = pop(f, fps, 30, { stiffness: 260, damping: 14 });
  const bounce = 1 + Math.sin((f / fps) * Math.PI * 2 * 0.9) * 0.02;

  return (
    <AbsoluteFill style={{ transform: `translateY(${veil}px)` }}>
      <AbsoluteFill style={{ background: COLORS.bg }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44, padding: 80 }}>
        <div style={{ transform: `scale(${s1})` }}>
          <Brand size={260} />
        </div>
        <div style={{ opacity: s2, transform: `translateY(${(1 - s2) * 30}px)`, textAlign: "center", maxWidth: 820 }}>
          <Display size={54} color={COLORS.inkSoft}>
            {tagline ?? "Le groupe révèle le meilleur et le pire de chacun."}
          </Display>
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center", opacity: s3 }}>
          {[
            ["✨ Gratuit", "warm"],
            ["👥 3 à 12 joueurs", "fun"],
            ["📱 Rien à installer", "spicy"],
          ].map(([t, tone]) => (
            <span
              key={t}
              style={{
                background: toneGradient(tone as "warm" | "fun" | "spicy"),
                color: "#fff",
                borderRadius: 999,
                padding: "18px 34px",
                fontFamily: BODY,
                fontWeight: 700,
                fontSize: 30,
              }}
            >
              {t}
            </span>
          ))}
        </div>
        <div style={{ transform: `scale(${s4 * bounce})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, marginTop: 20 }}>
          <div
            style={{
              background: accentGradient,
              color: "#fff",
              borderRadius: 999,
              padding: "34px 64px",
              fontFamily: DISPLAY,
              fontWeight: 600,
              fontSize: 46,
              boxShadow: "0 30px 60px -18px rgba(255,94,138,0.6), inset 0 2px 0 rgba(255,255,255,0.45)",
              whiteSpace: "nowrap",
            }}
          >
            {host}
          </div>
          <Label size={28} color={COLORS.inkFaint}>
            Lien en bio 👆 · à jouer ce soir
          </Label>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
