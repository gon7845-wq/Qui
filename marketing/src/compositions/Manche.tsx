import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { Hook } from "../components/Hook";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { Display, Label, TonePill, ToneText } from "../components/Text";
import { Confetti, Reactions } from "../components/Particles";
import { EndCard } from "../components/EndCard";
import { Music } from "../components/Music";
import { clamp, fadeUp, pop } from "../lib/anim";
import { DISPLAY } from "../lib/fonts";
import type { MancheScenario } from "../lib/scenario";
import { COLORS, SAFE, TONE, toneGradient } from "../theme";

export type MancheProps = {
  scenario: MancheScenario;
  host: string;
  music?: string | null;
};

// Chronologie (30 i/s). La fenêtre de vote de 10 s du jeu est jouée en accéléré ×2.
export const MANCHE_FPS = 30;
const T = {
  voteStart: 45,
  voteLen: 150,
  tallyLen: 45,
  verdict: 45 + 150 + 45, // 240
  punchline: 330,
  end: 420,
  endLen: 90,
};
export const MANCHE_FRAMES = T.end + T.endLen; // 510 = 17 s
const SPEED = 2;

export function Manche({ scenario, host, music }: MancheProps) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const q = scenario.question;
  const tone = q.tone;
  const meta = TONE[tone];

  const msToFrame = (ms: number) => T.voteStart + Math.round((ms / 1000) * fps) / SPEED;
  const landed = scenario.votes.filter((v) => frame >= msToFrame(v.atMs));
  const tally: Record<string, number> = {};
  const lastVoteFrame: Record<string, number> = {};
  for (const v of landed) {
    tally[v.targetId] = (tally[v.targetId] ?? 0) + 1;
    lastVoteFrame[v.targetId] = msToFrame(v.atMs);
  }
  const winner = scenario.players.find((p) => p.id === scenario.winnerId)!;
  const isVote = frame < T.voteStart + T.voteLen;
  const isTally = !isVote && frame < T.verdict;
  const isVerdict = frame >= T.verdict;
  const remainingMs = Math.max(0, scenario.voteDurationMs - ((frame - T.voteStart) / fps) * 1000 * SPEED);
  const seconds = Math.ceil(remainingMs / 1000);
  const pct = clamp(frame, [T.voteStart, T.voteStart + T.voteLen], [1, 0]);
  const urgent = isVote && seconds <= 3 && frame >= T.voteStart;
  const wiggle = urgent ? Math.sin(frame * 1.2) * 1.5 : 0;

  const cardIn = pop(frame, fps, 0, { stiffness: 240, damping: 18 });
  const verdictIn = pop(frame, fps, T.verdict, { stiffness: 320, damping: 18 });
  const punchIn = pop(frame, fps, T.punchline, { stiffness: 300, damping: 18 });

  // Grille : 3 colonnes.
  const size = 190;
  const gap = 36;
  const cols = 3;
  const itemW = size + 40;
  const gridW = cols * itemW + (cols - 1) * gap;

  return (
    <AbsoluteFill style={{ fontFamily: DISPLAY, color: COLORS.ink }}>
      <Background />
      <Music file={music} />

      {/* Coins comme dans le jeu */}
      <div style={{ position: "absolute", top: 96, left: SAFE.side }}>
        <Label size={26}>Manche {scenario.round} / {scenario.totalRounds}</Label>
      </div>
      <div style={{ position: "absolute", top: 96, right: SAFE.side }}>
        <Label size={26} color={COLORS.inkFaint}>#{scenario.code}</Label>
      </div>

      <Hook text={scenario.hook} start={8} />

      {/* Carte question / verdict */}
      <div
        style={{
          position: "absolute",
          top: 400,
          left: SAFE.side,
          width: width - SAFE.side * 2,
          transform: `scale(${0.9 + cardIn * 0.1}) translateY(${(1 - cardIn) * 40}px)`,
          opacity: cardIn,
        }}
      >
        <Card style={{ textAlign: "center", padding: "44px 48px" }}>
          {!isVerdict ? (
            <>
              <div style={{ marginBottom: 22 }}>
                <TonePill tone={tone} />
              </div>
              <div style={{ display: "block", ...fadeUp(frame, 6, 12, 16) }}>
                <Display size={62}>{q.text}</Display>
              </div>
              <div style={{ marginTop: 34, height: 22, borderRadius: 999, background: COLORS.hairline, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${pct * 100}%`,
                    borderRadius: 999,
                    background: toneGradient(tone),
                    transform: `rotate(${wiggle}deg)`,
                  }}
                />
              </div>
              <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Label size={24} color={COLORS.inkFaint}>
                  {isTally ? `${scenario.players.length}/${scenario.players.length} ont voté` : `${landed.length}/${scenario.players.length} ont voté`}
                </Label>
                {isTally ? (
                  <Display size={40} color={COLORS.inkSoft}>
                    On compte les voix… {meta.emoji}
                  </Display>
                ) : urgent ? (
                  <ToneText tone={tone} size={40}>{seconds}s</ToneText>
                ) : (
                  <Display size={40} color={COLORS.inkSoft}>{frame < T.voteStart ? `${scenario.voteDurationMs / 1000}s` : `${seconds}s`}</Display>
                )}
              </div>
            </>
          ) : (
            <div style={{ transform: `scale(${0.7 + verdictIn * 0.3})`, opacity: verdictIn }}>
              <Label size={20} color={COLORS.inkFaint}>{`« ${q.text} »`}</Label>
              <div style={{ marginTop: 26 }}>
                <Label size={26}>{meta.heading}</Label>
              </div>
              <div style={{ margin: "6px 0 10px", display: "block" }}>
                <ToneText tone={tone} size={winner.pseudo.length > 7 ? 120 : 150}>
                  {winner.pseudo}
                </ToneText>
              </div>
              <Label size={26}>
                {scenario.winnerCount} voix · {meta.subtitle}
              </Label>
            </div>
          )}
        </Card>
      </div>

      {/* Grille des joueurs — s'efface quand la punchline arrive */}
      <div
        style={{
          position: "absolute",
          top: 930,
          left: (width - gridW) / 2,
          width: gridW,
          display: "flex",
          flexWrap: "wrap",
          gap,
          justifyContent: "center",
          opacity: 1 - punchIn,
          transform: `scale(${1 - punchIn * 0.1}) translateY(${punchIn * 60}px)`,
        }}
      >
        {scenario.players.map((p, i) => {
          const s = pop(frame, fps, T.voteStart - 10 + i * 2, { stiffness: 320, damping: 20 });
          const count = isVerdict || isTally ? finalCount(scenario, p.id) : tally[p.id];
          const justVoted = !isVerdict && lastVoteFrame[p.id] != null && frame - lastVoteFrame[p.id] < 12;
          return (
            <div key={p.id} style={{ transform: `scale(${s})`, opacity: s }}>
              <Avatar
                pseudo={p.pseudo}
                colorKey={p.id}
                emoji={p.avatar}
                size={size}
                isHost={p.isHost}
                voteCount={count}
                voteFrame={isVerdict ? T.verdict : lastVoteFrame[p.id]}
                selected={justVoted}
                highlight={isVerdict && p.id === scenario.winnerId}
                dim={isVerdict && p.id !== scenario.winnerId}
              />
            </div>
          );
        })}
      </div>

      {/* Consigne sous la grille */}
      {!isVerdict && (
        <div style={{ position: "absolute", top: 1500, left: 0, right: 0, textAlign: "center", ...fadeUp(frame, T.voteStart, 10) }}>
          <Label size={26}>{isTally ? "Tout le monde a voté ✓" : "👇 Touche une personne"}</Label>
        </div>
      )}

      {/* Punchline : le gagnant seul, en grand, puis la phrase du groupe */}
      {frame >= T.punchline && (
        <div
          style={{
            position: "absolute",
            top: 960,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            transform: `scale(${punchIn})`,
            opacity: punchIn,
          }}
        >
          <Avatar
            pseudo={winner.pseudo}
            colorKey={winner.id}
            emoji={winner.avatar}
            size={250}
            isHost={winner.isHost}
            voteCount={scenario.winnerCount}
            voteFrame={T.punchline}
            highlight
          />
        </div>
      )}
      {frame >= T.punchline && (
        <div
          style={{
            position: "absolute",
            top: 1310,
            left: SAFE.side,
            width: width - SAFE.side * 2,
            transform: `translateY(${(1 - punchIn) * 260}px) scale(${0.9 + punchIn * 0.1}) rotate(${(1 - punchIn) * -2}deg)`,
            opacity: punchIn,
          }}
        >
          <div
            style={{
              background: toneGradient(tone),
              color: "#fff",
              borderRadius: 40,
              padding: "36px 44px",
              textAlign: "center",
              boxShadow: `0 40px 80px -30px ${TONE[tone].b}`,
            }}
          >
            <Display size={46} color="#fff">{scenario.punchline}</Display>
          </div>
        </div>
      )}

      {isVerdict && <Reactions start={T.verdict} seed={scenario.seed} emoji={meta.reaction} duration={T.end - T.verdict - 40} />}
      {isVerdict && tone === "warm" && <Confetti start={T.verdict} seed={scenario.seed} />}

      <EndCard start={T.end} host={host} />
    </AbsoluteFill>
  );
}

function finalCount(s: MancheScenario, id: string) {
  return s.votes.filter((v) => v.targetId === id).length || undefined;
}
