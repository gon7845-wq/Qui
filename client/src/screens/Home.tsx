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
      <div className="absolute inset-0 grid place-items-center px-3 py-6">
        <Table>
          {stage === "idle" && (
            <>
              <SeatInvite
                key="host-seat"
                label="OUVRIR"
                sub="hôte"
                x="22%"
                y="32%"
                onClick={() => setStage("host")}
                accent="#C8A23F"
              />
              <SeatInvite
                key="guest-seat"
                label="REJOINDRE"
                sub="invité·e"
                x="78%"
                y="68%"
                onClick={() => setStage("guest")}
                accent="#E8554A"
              />
            </>
          )}

          <AnimatePresence mode="wait">
            {stage === "idle" && (
              <CenterCard
                key="brand"
                widthRatio={0.55}
                variant="ghost"
              >
                <div className="grid place-items-center gap-3">
                  <Brand size="lg" />
                  <div
                    className="font-serif-i"
                    style={{
                      fontSize: "clamp(14px, 2vmin, 20px)",
                      color: "rgba(232,221,196,0.85)",
                      maxWidth: "30ch",
                    }}
                  >
                    Un jeton, une accusation, un coupable.
                  </div>
                </div>
              </CenterCard>
            )}

            {stage === "host" && (
              <CenterCard key="host" widthRatio={0.55} variant="placard">
                <Header
                  hint="Tu prends la table"
                  onBack={() => setStage("idle")}
                />
                <PrenomInput value={pseudo} onChange={setPseudo} autoFocus />
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    variant="gold"
                    size="md"
                    disabled={!canSubmitPseudo}
                    onClick={() => setStage("config")}
                  >
                    SUITE →
                  </Button>
                </div>
              </CenterCard>
            )}

            {stage === "config" && (
              <CenterCard key="config" widthRatio={0.62} variant="placard">
                <Header
                  hint={`Au nom de ${pseudo}`}
                  onBack={() => setStage("host")}
                />
                <div className="mt-4 grid gap-3 text-left">
                  <Pair label="Durée du vote">
                    {[5, 10, 15, 20].map((v) => (
                      <Pip
                        key={v}
                        active={voteDuration === v}
                        onClick={() => setVoteDuration(v)}
                        label={`${v}s`}
                      />
                    ))}
                  </Pair>
                  <Pair label="Manches">
                    {[5, 8, 12, 16].map((v) => (
                      <Pip
                        key={v}
                        active={questionCount === v}
                        onClick={() => setQuestionCount(v)}
                        label={`${v}`}
                      />
                    ))}
                  </Pair>
                  <Pair label="Scrutin">
                    <Pip
                      active={!anonymous}
                      onClick={() => setAnonymous(false)}
                      label="PUBLIC"
                    />
                    <Pip
                      active={anonymous}
                      onClick={() => setAnonymous(true)}
                      label="ANONYME"
                    />
                  </Pair>
                </div>
                <div className="mt-5 flex justify-end">
                  <Button
                    variant="gold"
                    size="md"
                    disabled={!canSubmitPseudo}
                    onClick={handleCreate}
                  >
                    OUVRIR LA TABLE {busy ? "…" : "→"}
                  </Button>
                </div>
              </CenterCard>
            )}

            {stage === "guest" && (
              <CenterCard key="guest" widthRatio={0.58} variant="placard">
                <Header
                  hint="Tu rejoins une table"
                  onBack={() => setStage("idle")}
                />
                <CodeInput
                  value={code}
                  onChange={setCode}
                  autoFocus={!!prefilledCode}
                />
                <div className="mt-3">
                  <PrenomInput
                    value={pseudo}
                    onChange={setPseudo}
                    autoFocus={!prefilledCode}
                  />
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="gold"
                    size="md"
                    disabled={!canSubmitPseudo || code.length < 4}
                    onClick={handleJoin}
                  >
                    REJOINDRE {busy ? "…" : "→"}
                  </Button>
                </div>
              </CenterCard>
            )}
          </AnimatePresence>
        </Table>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-5 py-2 text-sm font-display tracking-wider"
            style={{
              background:
                "linear-gradient(180deg, #E8554A 0%, #9B2A22 100%)",
              color: "var(--cream)",
              borderRadius: 3,
              boxShadow:
                "0 0 0 1.5px #5A1610, 0 10px 24px -8px rgba(0,0,0,0.6)",
            }}
          >
            ⚠ {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Header({
  hint,
  onBack,
}: {
  hint: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="label text-ink/55">{hint}</span>
      <button
        onClick={onBack}
        className="label text-ink/55 hover:text-ink"
      >
        ← RETOUR
      </button>
    </div>
  );
}

function PrenomInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (s: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="block mt-3 text-left">
      <div className="label text-ink/55 mb-1">TON PRÉNOM</div>
      <input
        autoFocus={autoFocus}
        type="text"
        maxLength={20}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Sam"
        className="w-full bg-transparent font-serif-b text-2xl outline-none placeholder:text-ink/25 border-b border-ink/30 focus:border-ink pb-1 transition-colors"
        style={{ color: "var(--ink)" }}
      />
    </label>
  );
}

function CodeInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (s: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="block text-left">
      <div className="label text-ink/55 mb-1">CODE DE LA TABLE</div>
      <input
        autoFocus={autoFocus}
        type="text"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="A2BC"
        className="w-full bg-transparent font-display text-4xl tracking-[0.4em] outline-none placeholder:text-ink/20 border-b border-ink/30 focus:border-ink pb-1 transition-colors"
        style={{ color: "var(--ruby-dark)" }}
      />
    </label>
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
  x: string;
  y: string;
  onClick: () => void;
  accent: string;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.6, x: "-50%", y: "-50%" }}
      animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
      transition={{
        type: "spring",
        stiffness: 240,
        damping: 22,
        delay: 0.15,
      }}
      whileHover={{ scale: 1.06, y: "calc(-50% - 3px)" }}
      whileTap={{ scale: 0.95, x: "-50%", y: "-50%" }}
      onClick={onClick}
      className="absolute z-20 cursor-pointer"
      style={{
        left: x,
        top: y,
      }}
    >
      <div
        className="relative grid place-items-center"
        style={{
          width: "clamp(96px, 14vmin, 130px)",
          height: "clamp(96px, 14vmin, 130px)",
          borderRadius: "50%",
          border: `1.5px dashed ${accent}AA`,
          background:
            "radial-gradient(circle, rgba(232,221,196,0.06) 0%, transparent 70%)",
        }}
      >
        <div className="text-center px-2">
          <div
            className="font-display tracking-wider"
            style={{
              color: accent,
              fontSize: "clamp(11px, 1.5vmin, 13px)",
              lineHeight: 1.1,
            }}
          >
            {label}
          </div>
          <div
            className="font-serif-i"
            style={{
              color: "rgba(232,221,196,0.7)",
              fontSize: "clamp(10px, 1.3vmin, 12px)",
              marginTop: 4,
            }}
          >
            {sub}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function Pair({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
      <div className="label text-ink/55">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
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
      className={`font-display tracking-wider text-[10px] h-7 px-3 rounded-full border transition-all ${
        active
          ? "bg-wood-900 text-cream border-wood-900"
          : "bg-transparent text-ink/65 border-ink/25 hover:border-ink hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
