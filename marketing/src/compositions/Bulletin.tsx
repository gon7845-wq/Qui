import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { Hook } from "../components/Hook";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { Display, Label, ToneText } from "../components/Text";
import { Confetti, Reactions } from "../components/Particles";
import { EndCard } from "../components/EndCard";
import { Music } from "../components/Music";
import { pop } from "../lib/anim";
import { BODY, DISPLAY } from "../lib/fonts";
import type { BulletinScenario } from "../lib/scenario";
import { COLORS, SAFE, TONE, toneGradient } from "../theme";

export type BulletinProps = {
  scenario: BulletinScenario;
  host: string;
  music?: string | null;
};

export const BULLETIN_FPS = 30;
const END = 330; // 11 s
export const BULLETIN_FRAMES = END + 90;

const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_LABELS = ["La personne la plus citée", "2ᵉ plus cité·e", "3ᵉ plus cité·e"];
const MOOD_TONE = { loved: "warm", roasted: "spicy", mixed: "fun" } as const;

export function Bulletin({ scenario, host, music }: BulletinProps) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const tone = MOOD_TONE[scenario.mood];
  const cardIn = pop(frame, fps, 0, { stiffness: 240, damping: 18 });
  const medalIn = pop(frame, fps, 30, { stiffness: 320, damping: 14 });
  const punchIn = pop(frame, fps, 60, { stiffness: 300, damping: 18 });
  const headIn = pop(frame, fps, 100, { stiffness: 300, damping: 18 });
  const rowsStart = 140;

  return (
    <AbsoluteFill style={{ fontFamily: DISPLAY, color: COLORS.ink }}>
      <Background />
      <Music file={music} />

      <Hook text={scenario.hook} start={6} />

      <div
        style={{
          position: "absolute",
          top: 420,
          left: SAFE.side,
          width: width - SAFE.side * 2,
          transform: `scale(${0.92 + cardIn * 0.08}) translateY(${(1 - cardIn) * 50}px)`,
          opacity: cardIn,
        }}
      >
        <Card style={{ padding: "44px 44px 40px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 18 }}>
            {scenario.total > 0 && scenario.rank < 3 && (
              <span
                style={{
                  transform: `scale(${medalIn}) rotate(${(1 - medalIn) * -20}deg)`,
                  background: "rgba(255,94,138,0.12)",
                  borderRadius: 999,
                  padding: "12px 26px",
                  fontFamily: BODY,
                  fontWeight: 700,
                  fontSize: 26,
                }}
              >
                {MEDALS[scenario.rank]} {MEDAL_LABELS[scenario.rank]}
              </span>
            )}
            <Avatar pseudo={scenario.player.pseudo} colorKey={scenario.player.id} emoji={scenario.player.avatar} size={170} isHost={scenario.player.isHost} />

            <div
              style={{
                transform: `scale(${0.8 + punchIn * 0.2}) translateY(${(1 - punchIn) * 12}px)`,
                opacity: punchIn,
                background: toneGradient(tone),
                color: "#fff",
                borderRadius: 32,
                padding: "26px 34px",
              }}
            >
              <Display size={36} color="#fff">{scenario.punchline}</Display>
            </div>

            <div style={{ opacity: headIn, transform: `translateY(${(1 - headIn) * 16}px)`, marginTop: 6 }}>
              <Label size={22} color={COLORS.inkFaint}>Le groupe te voit surtout comme</Label>
              <div style={{ marginTop: 6 }}>
                <ToneText tone={scenario.headline.tone} size={44}>{scenario.headline.text}</ToneText>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 14 }}>
            {scenario.entries.map((e, i) => {
              const s = pop(frame, fps, rowsStart + i * 14, { stiffness: 280, damping: 22 });
              const badge = pop(frame, fps, rowsStart + i * 14 + 8, { stiffness: 420, damping: 16 });
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 24,
                    background: COLORS.surface,
                    borderRadius: 30,
                    padding: "18px 28px",
                    opacity: s,
                    transform: `translateX(${(1 - s) * -60}px)`,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: BODY, fontWeight: 600, fontSize: 28, lineHeight: 1.2, color: COLORS.ink, textAlign: "left" }}>
                    <span style={{ fontSize: 30 }}>{TONE[e.tone].emoji}</span>
                    {e.text}
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      background: toneGradient(e.tone),
                      color: "#fff",
                      borderRadius: 999,
                      padding: "10px 22px",
                      fontFamily: DISPLAY,
                      fontWeight: 600,
                      fontSize: 30,
                      transform: `scale(${badge})`,
                    }}
                  >
                    ×{e.count}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {tone === "spicy" && <Reactions start={60} seed={scenario.seed} emoji="🔥" count={18} duration={120} />}
      {tone === "warm" && <Confetti start={60} seed={scenario.seed} count={60} />}

      <EndCard start={END} host={host} tagline="En fin de partie, chacun repart avec son portrait." />
    </AbsoluteFill>
  );
}
