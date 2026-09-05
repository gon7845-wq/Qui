import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { Hook } from "../components/Hook";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { Display, Label, TonePill } from "../components/Text";
import { EndCard } from "../components/EndCard";
import { Music } from "../components/Music";
import { clamp, pop } from "../lib/anim";
import { DISPLAY } from "../lib/fonts";
import type { RafaleScenario } from "../lib/scenario";
import { COLORS, SAFE, TONE, toneGradient } from "../theme";

export type RafaleProps = {
  scenario: RafaleScenario;
  host: string;
  music?: string | null;
};

export const RAFALE_FPS = 30;
const PER_Q = 66; // 2,2 s par question
const START = 20;
const END_LEN = 90;
export const rafaleFrames = (count: number) => START + count * PER_Q + END_LEN;
export const RAFALE_FRAMES = rafaleFrames(5);

export function Rafale({ scenario, host, music }: RafaleProps) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const n = scenario.questions.length;
  const idx = Math.min(n - 1, Math.max(0, Math.floor((frame - START) / PER_Q)));
  const local = frame - START - idx * PER_Q;
  const q = scenario.questions[idx];
  const endStart = START + n * PER_Q;

  // Entrée par la droite, sortie par la gauche.
  const inS = pop(local, fps, 0, { stiffness: 260, damping: 20 });
  const outT = clamp(local, [PER_Q - 10, PER_Q], [0, 1]);
  const x = (1 - inS) * width * 0.6 - outT * width * 0.7;
  const rot = (1 - inS) * 6 - outT * 6;

  // Le « curseur » hésite entre les joueurs puis se fixe sur l'un d'eux.
  const players = scenario.players;
  const settleAt = PER_Q * 0.55;
  const hover = local < settleAt ? Math.floor(local / 6) % players.length : (idx * 7 + 3) % players.length;
  const settled = local >= settleAt;
  const barPct = clamp(frame, [START, endStart], [0, 1]);

  return (
    <AbsoluteFill style={{ fontFamily: DISPLAY, color: COLORS.ink }}>
      <Background />
      <Music file={music} />

      <div style={{ position: "absolute", top: 96, left: SAFE.side }}>
        <Label size={26}>Question {Math.min(n, idx + 1)} / {n}</Label>
      </div>
      <div style={{ position: "absolute", top: 96, right: SAFE.side }}>
        <Label size={26} color={COLORS.inkFaint}>Qui ?</Label>
      </div>
      {/* Barre de progression globale */}
      <div style={{ position: "absolute", top: 150, left: SAFE.side, right: SAFE.side, height: 10, borderRadius: 999, background: COLORS.hairline }}>
        <div style={{ height: "100%", width: `${barPct * 100}%`, borderRadius: 999, background: toneGradient(scenario.tone) }} />
      </div>

      <Hook text={scenario.hook} start={4} />

      <div
        style={{
          position: "absolute",
          top: 520,
          left: SAFE.side,
          width: width - SAFE.side * 2,
          transform: `translateX(${x}px) rotate(${rot}deg)`,
          opacity: 1 - outT,
        }}
      >
        <Card style={{ textAlign: "center", padding: "56px 52px", minHeight: 420, display: "flex", flexDirection: "column", justifyContent: "center", gap: 30 }}>
          <div>
            <TonePill tone={q.tone} />
          </div>
          <Display size={72}>{q.text}</Display>
          <Label size={24} color={COLORS.inkFaint}>{q.emoji} {q.name}</Label>
        </Card>
      </div>

      {/* Joueurs : le curseur passe de l'un à l'autre puis se fixe */}
      <div style={{ position: "absolute", top: 1080, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 30 }}>
        {players.map((p, i) => {
          const s = pop(frame, fps, START + i * 3, { stiffness: 300, damping: 20 });
          const isHover = i === hover;
          return (
            <div key={p.id} style={{ transform: `scale(${s * (isHover && settled ? 1.06 : 1)})`, opacity: s * (settled && !isHover ? 0.45 : 1) }}>
              <Avatar pseudo={p.pseudo} colorKey={p.id} emoji={p.avatar} size={180} selected={isHover && !settled} highlight={isHover && settled} />
            </div>
          );
        })}
      </div>

      <div style={{ position: "absolute", top: 1400, left: 0, right: 0, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            background: COLORS.ink,
            color: "#fff",
            borderRadius: 999,
            padding: "22px 44px",
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: 42,
            transform: `scale(${1 + Math.sin(frame / 6) * 0.015})`,
          }}
        >
          {scenario.cta}
        </div>
      </div>
      <div style={{ position: "absolute", top: 1500, left: 0, right: 0, textAlign: "center" }}>
        <Label size={24} color={COLORS.inkFaint}>{TONE[scenario.tone].emoji} {TONE[scenario.tone].label} · {n} questions</Label>
      </div>

      <EndCard start={endStart} host={host} tagline="Plus de 300 questions. Une seule règle : le groupe vote." />
    </AbsoluteFill>
  );
}
