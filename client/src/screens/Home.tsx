import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { Button } from "../components/Button";
import { Marquee } from "../components/Marquee";

const TEASE_QUESTIONS = [
  "QUI EST LE PLUS GENTIL ?",
  "QUI MENT LE PLUS ?",
  "QUI SERA RICHE ?",
  "QUI FINIRA SEUL ?",
  "QUI A LE PLUS GRAND CŒUR ?",
  "QUI SURVIVRAIT À KOH-LANTA ?",
  "QUI EST LE PLUS TOXIQUE ?",
  "QUI SE MARIERA EN PREMIER ?",
];

interface Props {
  prefilledCode?: string | null;
}

export function Home({ prefilledCode }: Props) {
  const { pseudo, setPseudo, createLobby, joinLobby, errorMsg, setError } =
    useStore();
  const [mode, setMode] = useState<"main" | "create" | "join">(
    prefilledCode ? "join" : "main"
  );
  const [code, setCode] = useState(prefilledCode ?? "");
  const [busy, setBusy] = useState(false);

  const [anonymous, setAnonymous] = useState(false);
  const [voteDuration, setVoteDuration] = useState(10);
  const [questionCount, setQuestionCount] = useState(8);

  const canSubmit = pseudo.trim().length >= 1 && !busy;

  async function handleCreate() {
    if (!canSubmit) return;
    setBusy(true);
    const r = await createLobby({ anonymous, voteDuration, questionCount });
    setBusy(false);
    if (!r.ok) setError(r.error ?? "Erreur");
  }

  async function handleJoin() {
    if (!canSubmit || !code.trim()) return;
    setBusy(true);
    const r = await joinLobby(code);
    setBusy(false);
    if (!r.ok) setError(r.error ?? "Erreur");
  }

  return (
    <div className="relative z-10 min-h-screen">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 pt-6 md:px-10">
        <div className="overline text-pearl/50 flex items-center gap-2">
          <Spark />
          Nº01 — JEU DE VOTE
        </div>
        <div className="overline text-pearl/50 hidden sm:flex items-center gap-2">
          ÉD. 2026 / IRIDESCENT
          <Spark />
        </div>
      </header>

      <main className="px-6 md:px-10 pt-8 md:pt-12 pb-32">
        <div className="mx-auto max-w-6xl">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="overline text-pearl/40 mb-4">
              ↳ UN JEU DE VOTE ENTRE POTES
            </div>
            <h1 className="italic-display iridescent-text text-[28vw] md:text-[20vw] leading-[0.85] tracking-tight">
              Qui<span>&nbsp;?</span>
            </h1>
            <div className="hr-line mt-8" />
            <p className="mt-8 max-w-xl text-lg text-pearl/75 leading-snug">
              Une question.{" "}
              <em className="italic-display text-2xl chrome-text">
                5 secondes.
              </em>{" "}
              Un coupable.
              <br />
              Pas d'inscription. Juste un pseudo, un lien, et c'est parti.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {mode === "main" && (
              <motion.div
                key="main"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="mt-16 grid gap-4 md:grid-cols-2 max-w-3xl"
              >
                <ActionCard
                  badge="01"
                  title="Créer"
                  desc="Tu choisis les règles. Tu lances l'enfer."
                  cta="CRÉER UN LOBBY →"
                  variant="iri"
                  onClick={() => setMode("create")}
                />
                <ActionCard
                  badge="02"
                  title="Rejoindre"
                  desc="Quelqu'un t'a envoyé un code ?"
                  cta="REJOINDRE →"
                  variant="glass"
                  onClick={() => setMode("join")}
                />
              </motion.div>
            )}

            {mode === "create" && (
              <motion.section
                key="create"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="mt-16 max-w-2xl"
              >
                <div className="mb-6 flex items-baseline justify-between">
                  <h2 className="italic-display text-5xl iridescent-text">
                    Nouvelle partie
                  </h2>
                  <button
                    onClick={() => setMode("main")}
                    className="overline text-pearl/50 hover:text-pearl"
                  >
                    ← RETOUR
                  </button>
                </div>

                <Field label="Ton pseudo" hint="20 caractères max">
                  <input
                    autoFocus
                    type="text"
                    maxLength={20}
                    value={pseudo}
                    onChange={(e) => setPseudo(e.target.value)}
                    placeholder="Sam"
                    className="w-full bg-transparent text-3xl italic-display outline-none placeholder:text-pearl/20"
                  />
                </Field>

                <Field label="Durée du vote" hint={`${voteDuration} sec`}>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step={1}
                    value={voteDuration}
                    onChange={(e) => setVoteDuration(Number(e.target.value))}
                    className="w-full"
                  />
                </Field>

                <Field
                  label="Nombre de questions"
                  hint={`${questionCount} questions`}
                >
                  <input
                    type="range"
                    min={3}
                    max={20}
                    step={1}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full"
                  />
                </Field>

                <div className="mt-6 flex items-center justify-between rounded-2xl glass p-5">
                  <div>
                    <div className="font-semibold tracking-tight">
                      Votes anonymes
                    </div>
                    <div className="mt-1 text-sm text-pearl/55">
                      Si actif, on voit le score mais pas qui a voté quoi.
                    </div>
                  </div>
                  <Toggle
                    checked={anonymous}
                    onChange={() => setAnonymous(!anonymous)}
                  />
                </div>

                <div className="mt-8">
                  <Button
                    variant="iri"
                    size="lg"
                    fullWidth
                    disabled={!canSubmit}
                    onClick={handleCreate}
                  >
                    LANCER LE LOBBY {busy ? "..." : "→"}
                  </Button>
                </div>
              </motion.section>
            )}

            {mode === "join" && (
              <motion.section
                key="join"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="mt-16 max-w-2xl"
              >
                <div className="mb-6 flex items-baseline justify-between">
                  <h2 className="italic-display text-5xl iridescent-text">
                    Rejoindre
                  </h2>
                  <button
                    onClick={() => setMode("main")}
                    className="overline text-pearl/50 hover:text-pearl"
                  >
                    ← RETOUR
                  </button>
                </div>

                <Field label="Ton pseudo">
                  <input
                    autoFocus={!prefilledCode}
                    type="text"
                    maxLength={20}
                    value={pseudo}
                    onChange={(e) => setPseudo(e.target.value)}
                    placeholder="Sam"
                    className="w-full bg-transparent text-3xl italic-display outline-none placeholder:text-pearl/20"
                  />
                </Field>

                <Field label="Code du lobby">
                  <input
                    autoFocus={!!prefilledCode}
                    type="text"
                    maxLength={4}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="A2BC"
                    className="w-full bg-transparent font-mono text-5xl uppercase tracking-[0.3em] outline-none placeholder:text-pearl/20"
                  />
                </Field>

                <div className="mt-8">
                  <Button
                    variant="iri"
                    size="lg"
                    fullWidth
                    disabled={!canSubmit || code.length < 4}
                    onClick={handleJoin}
                  >
                    REJOINDRE {busy ? "..." : "→"}
                  </Button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Marquee teaser */}
      <div className="fixed bottom-0 left-0 right-0">
        <Marquee items={TEASE_QUESTIONS} />
      </div>

      {/* Error toast */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full glass px-5 py-3"
            style={{ borderColor: "rgba(255,184,225,0.4)" }}
          >
            <span className="overline text-iris-rose">⚠ {errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Spark() {
  return (
    <span
      className="text-iris-rose"
      style={{ animation: "sparkle 3s ease-in-out infinite" }}
      aria-hidden
    >
      ✦
    </span>
  );
}

function ActionCard({
  badge,
  title,
  desc,
  cta,
  variant,
  onClick,
}: {
  badge: string;
  title: string;
  desc: string;
  cta: string;
  variant: "iri" | "glass";
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl p-7 text-left transition-all ${
        variant === "iri" ? "iri-fill text-ink-900" : "glass text-pearl hover:bg-white/[0.07]"
      }`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`overline ${variant === "iri" ? "text-ink-900/60" : "text-pearl/40"}`}
        >
          {badge}
        </span>
        <span
          className={`overline ${variant === "iri" ? "text-ink-900/60" : "text-pearl/40"}`}
        >
          →
        </span>
      </div>
      <div className="mt-12">
        <div className="italic-display text-6xl">{title}</div>
        <div
          className={`mt-2 text-sm ${variant === "iri" ? "text-ink-900/70" : "text-pearl/55"}`}
        >
          {desc}
        </div>
        <div
          className={`mt-8 overline ${variant === "iri" ? "text-ink-900" : "iridescent-text"}`}
        >
          {cta}
        </div>
      </div>
    </motion.button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="overline text-pearl/55">{label}</span>
        {hint && <span className="overline text-pearl/35">{hint}</span>}
      </div>
      <div className="glass rounded-2xl px-5 py-4">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative h-7 w-12 rounded-full transition-colors ${
        checked ? "" : "bg-white/10"
      }`}
      style={
        checked
          ? {
              background:
                "linear-gradient(120deg, #FFB8E1, #DDA0FF, #9ED3FF)",
            }
          : undefined
      }
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 h-5 w-5 rounded-full shadow-md ${
          checked ? "left-[22px] bg-ink-900" : "left-0.5 bg-white"
        }`}
      />
    </button>
  );
}
