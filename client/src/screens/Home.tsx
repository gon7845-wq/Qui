import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { Button } from "../components/Button";
import { Brand } from "../components/Brand";
import { Table } from "../components/Table";
import { CenterCard } from "../components/CenterCard";

interface Props {
  prefilledCode?: string | null;
}

/**
 * Home isn't a magazine page anymore — it's the empty table itself.
 * Two empty seats blink at the edges (host / guest), the center card
 * holds the brand + the chosen action.
 */
export function Home({ prefilledCode }: Props) {
  const { pseudo, setPseudo, createLobby, joinLobby, errorMsg, setError } =
    useStore();
  const [stage, setStage] = useState<"idle" | "host" | "guest" | "config">(
    prefilledCode ? "guest" : "idle"
  );
  const [code, setCode] = useState(prefilledCode ?? "");
  const [busy, setBusy] = useState(false);

  const [anonymous, setAnonymous] = useState(false);
  const [voteDuration, setVoteDuration] = useState(10);
  const [questionCount, setQuestionCount] = useState(8);

  const canSubmitPseudo = pseudo.trim().length >= 1 && !busy;

  async function handleCreate() {
    if (!canSubmitPseudo) return;
    setBusy(true);
    const r = await createLobby({ anonymous, voteDuration, questionCount });
    setBusy(false);
    if (!r.ok) setError(r.error ?? "Erreur");
  }

  async function handleJoin() {
    if (!canSubmitPseudo || code.trim().length < 4) return;
    setBusy(true);
    const r = await joinLobby(code);
    setBusy(false);
    if (!r.ok) setError(r.error ?? "Erreur");
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* The table fills the screen */}
      <div className="absolute inset-0 grid place-items-center px-3 py-6">
        <Table>
          {/* Empty seats at the edge invite to play */}
          <EmptySeats activeStage={stage} onPick={(s) => setStage(s)} />

          {/* Center card */}
          <AnimatePresence mode="wait">
            {stage === "idle" && (
              <CenterCard
                key="brand"
                widthRatio={0.7}
                variant="ghost"
                className="!bg-transparent"
              >
                <Brand size="lg" />
                <div
                  className="font-serif-i text-xl md:text-2xl mt-3"
                  style={{ color: "var(--cream)" }}
                >
                  Un jeton, une accusation, un coupable.
                </div>
                <div
                  className="label mt-6"
                  style={{ color: "var(--gold-light)" }}
                >
                  ↓ CHOISIS UN SIÈGE ↓
                </div>
              </CenterCard>
            )}

            {stage === "host" && (
              <CenterCard key="host">
                <PseudoStep
                  title="Tu prends la table"
                  hint="Tu fixes les règles."
                  pseudo={pseudo}
                  setPseudo={setPseudo}
                  onSubmit={() => setStage("config")}
                  canSubmit={canSubmitPseudo}
                  cta="RÉGLER LA PARTIE →"
                  onBack={() => setStage("idle")}
                />
              </CenterCard>
            )}

            {stage === "config" && (
              <CenterCard key="config" widthRatio={0.7}>
                <ConfigStep
                  pseudo={pseudo}
                  setPseudo={setPseudo}
                  anonymous={anonymous}
                  setAnonymous={setAnonymous}
                  voteDuration={voteDuration}
                  setVoteDuration={setVoteDuration}
                  questionCount={questionCount}
                  setQuestionCount={setQuestionCount}
                  onSubmit={handleCreate}
                  busy={busy}
                  canSubmit={canSubmitPseudo}
                  onBack={() => setStage("host")}
                />
              </CenterCard>
            )}

            {stage === "guest" && (
              <CenterCard key="guest">
                <JoinStep
                  pseudo={pseudo}
                  setPseudo={setPseudo}
                  code={code}
                  setCode={setCode}
                  onSubmit={handleJoin}
                  busy={busy}
                  canSubmit={canSubmitPseudo && code.length >= 4}
                  onBack={() => setStage("idle")}
                  prefilledCode={!!prefilledCode}
                />
              </CenterCard>
            )}
          </AnimatePresence>
        </Table>
      </div>

      {/* Error toast */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 plaque px-5 py-2 text-sm"
            style={{ background: "linear-gradient(180deg, #E8554A 0%, #9B2A22 100%)", color: "var(--cream)", borderColor: "#5A1610" }}
          >
            ⚠ {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Two empty chip-shaped seats around the table inviting to pick a role. */
function EmptySeats({
  activeStage,
  onPick,
}: {
  activeStage: "idle" | "host" | "guest" | "config";
  onPick: (s: "host" | "guest") => void;
}) {
  if (activeStage !== "idle") return null;
  return (
    <>
      {/* Host seat — top-left */}
      <SeatInvite
        label="OUVRIR LA TABLE"
        sub="Hôte"
        angle="20%"
        x="22%"
        y="22%"
        onClick={() => onPick("host")}
        accent="#C8A23F"
      />
      {/* Guest seat — bottom-right */}
      <SeatInvite
        label="REJOINDRE"
        sub="Invité·e"
        x="78%"
        y="78%"
        onClick={() => onPick("guest")}
        accent="#E8554A"
      />
    </>
  );
}

function SeatInvite({
  label,
  sub,
  x,
  y,
  onClick,
  accent,
}: {
  label: string;
  sub: string;
  angle?: string;
  x: string;
  y: string;
  onClick: () => void;
  accent: string;
}) {
  return (
    <motion.button
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.2 }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="absolute z-20"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className="relative grid place-items-center"
        style={{
          width: "clamp(96px, 16vmin, 160px)",
          height: "clamp(96px, 16vmin, 160px)",
          borderRadius: "50%",
          border: `2px dashed ${accent}80`,
          background:
            "radial-gradient(circle, rgba(232,221,196,0.07) 0%, transparent 70%)",
          animation: "spot-pulse 3s ease-in-out infinite",
        }}
      >
        <div className="text-center px-3">
          <div
            className="font-display tracking-wider"
            style={{ color: accent, fontSize: "clamp(11px, 1.6vmin, 14px)" }}
          >
            {label}
          </div>
          <div
            className="font-serif-i text-cream/75"
            style={{ fontSize: "clamp(11px, 1.4vmin, 13px)", marginTop: 2 }}
          >
            {sub}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function PseudoStep({
  title,
  hint,
  pseudo,
  setPseudo,
  onSubmit,
  canSubmit,
  cta,
  onBack,
}: {
  title: string;
  hint: string;
  pseudo: string;
  setPseudo: (p: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  cta: string;
  onBack: () => void;
}) {
  return (
    <div className="text-left">
      <div className="flex items-baseline justify-between">
        <div className="label text-ink/55">{hint}</div>
        <button onClick={onBack} className="label text-ink/55 hover:text-ink">
          ← RETOUR
        </button>
      </div>
      <div className="font-serif-i text-3xl md:text-4xl mt-1 leading-tight">
        {title}
      </div>
      <input
        autoFocus
        type="text"
        maxLength={20}
        value={pseudo}
        onChange={(e) => setPseudo(e.target.value)}
        placeholder="Ton prénom"
        className="w-full bg-transparent font-display text-4xl md:text-5xl outline-none placeholder:text-ink/25 mt-4 border-b border-ink/20 pb-2"
        style={{ color: "var(--ink)" }}
      />
      <div className="mt-5 flex justify-end">
        <Button variant="gold" disabled={!canSubmit} onClick={onSubmit}>
          {cta}
        </Button>
      </div>
    </div>
  );
}

function ConfigStep({
  pseudo,
  setPseudo,
  anonymous,
  setAnonymous,
  voteDuration,
  setVoteDuration,
  questionCount,
  setQuestionCount,
  onSubmit,
  busy,
  canSubmit,
  onBack,
}: {
  pseudo: string;
  setPseudo: (p: string) => void;
  anonymous: boolean;
  setAnonymous: (b: boolean) => void;
  voteDuration: number;
  setVoteDuration: (n: number) => void;
  questionCount: number;
  setQuestionCount: (n: number) => void;
  onSubmit: () => void;
  busy: boolean;
  canSubmit: boolean;
  onBack: () => void;
}) {
  return (
    <div className="text-left">
      <div className="flex items-baseline justify-between">
        <div className="label text-ink/55">Règles de la table</div>
        <button onClick={onBack} className="label text-ink/55 hover:text-ink">
          ← RETOUR
        </button>
      </div>
      <div className="font-serif-i text-2xl md:text-3xl mt-1 leading-tight">
        Au nom de :
        <input
          type="text"
          maxLength={20}
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          className="bg-transparent font-serif-b outline-none border-b border-ink/30 ml-2 w-[8ch]"
          style={{ color: "var(--ink)" }}
        />
      </div>

      <div className="mt-5 space-y-4">
        <Pair label="Durée du vote" value={`${voteDuration}s`}>
          <div className="flex gap-2">
            {[5, 10, 15, 20].map((v) => (
              <Pip
                key={v}
                active={voteDuration === v}
                onClick={() => setVoteDuration(v)}
                label={`${v}s`}
              />
            ))}
          </div>
        </Pair>
        <Pair label="Manches" value={`${questionCount}`}>
          <div className="flex gap-2">
            {[5, 8, 12, 16].map((v) => (
              <Pip
                key={v}
                active={questionCount === v}
                onClick={() => setQuestionCount(v)}
                label={`${v}`}
              />
            ))}
          </div>
        </Pair>
        <Pair label="Votes" value={anonymous ? "Anonymes" : "Publics"}>
          <Pip
            active={anonymous}
            onClick={() => setAnonymous(!anonymous)}
            label="ANONYMES"
          />
        </Pair>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          variant="gold"
          size="lg"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          OUVRIR LA TABLE {busy ? "..." : "→"}
        </Button>
      </div>
    </div>
  );
}

function JoinStep({
  pseudo,
  setPseudo,
  code,
  setCode,
  onSubmit,
  busy,
  canSubmit,
  onBack,
  prefilledCode,
}: {
  pseudo: string;
  setPseudo: (p: string) => void;
  code: string;
  setCode: (c: string) => void;
  onSubmit: () => void;
  busy: boolean;
  canSubmit: boolean;
  onBack: () => void;
  prefilledCode: boolean;
}) {
  return (
    <div className="text-left">
      <div className="flex items-baseline justify-between">
        <div className="label text-ink/55">Tu rejoins une table</div>
        <button onClick={onBack} className="label text-ink/55 hover:text-ink">
          ← RETOUR
        </button>
      </div>
      <div className="mt-3">
        <label className="label text-ink/55">Code de la table</label>
        <input
          autoFocus={!!prefilledCode}
          type="text"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="A2BC"
          className="block w-full bg-transparent font-display text-5xl md:text-6xl outline-none placeholder:text-ink/20 tracking-[0.3em] mt-1 border-b border-ink/20 pb-2"
          style={{ color: "var(--ruby-dark)" }}
        />
      </div>
      <div className="mt-4">
        <label className="label text-ink/55">Ton prénom</label>
        <input
          autoFocus={!prefilledCode}
          type="text"
          maxLength={20}
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="Sam"
          className="block w-full bg-transparent font-serif-b text-3xl outline-none placeholder:text-ink/25 mt-1 border-b border-ink/20 pb-2"
          style={{ color: "var(--ink)" }}
        />
      </div>
      <div className="mt-5 flex justify-end">
        <Button variant="gold" disabled={!canSubmit} onClick={onSubmit}>
          REJOINDRE {busy ? "..." : "→"}
        </Button>
      </div>
    </div>
  );
}

function Pair({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div>
        <div className="label text-ink/55">{label}</div>
        <div className="font-serif-i text-xl">{value}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Pip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-display tracking-wider text-[11px] h-8 px-3 rounded-full border transition-all ${
        active
          ? "bg-wood-900 text-cream border-wood-900"
          : "bg-transparent text-ink/70 border-ink/30 hover:border-ink"
      }`}
    >
      {label}
    </button>
  );
}
