import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { Button } from "../components/Button";
import { Marquee } from "../components/Marquee";
import { Brand } from "../components/Brand";

const TEASE = [
  "QUI EST LE PLUS TOXIQUE ?",
  "QUI MENT LE PLUS ?",
  "QUI FINIRA SEUL ?",
  "QUI A LE PLUS GRAND CŒUR ?",
  "QUI SURVIVRAIT À KOH-LANTA ?",
  "QUI SE MARIERA EN PREMIER ?",
  "QUI A DÉJÀ STALKÉ SON EX ?",
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
      <header className="flex items-center justify-between px-6 pt-6 md:px-10">
        <div className="overline text-paper/55">
          ✚ TRIBUNAL DU MAUVAIS GOÛT ✚
        </div>
        <div className="overline text-paper/55 hidden sm:block">
          AUDIENCE Nº01
        </div>
      </header>

      <main className="px-6 md:px-10 pt-8 pb-32">
        <div className="mx-auto max-w-6xl">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="overline text-paper/60 mb-3">
              ↳ JEU DE VERDICT ENTRE POTES
            </div>
            <h1 className="leading-[0.78]">
              <Brand size="xl" />
            </h1>
            <div className="gold-rule mt-8 max-w-3xl" />
            <p className="mt-8 max-w-2xl font-serif-italic text-2xl md:text-3xl text-cream leading-tight">
              Une affaire. Dix secondes. Un coupable.
              <br />
              <span className="text-paper/70 text-xl">
                Pas d'inscription. Tu rejoins le jury, tu rends ton verdict,
                tu vis avec ta conscience.
              </span>
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
                className="mt-16 grid gap-4 md:grid-cols-2 max-w-4xl"
              >
                <ActionCard
                  badge="ACTE I"
                  title="Ouvrir l'audience"
                  desc="Tu choisis les charges, la durée, la solennité."
                  cta="OUVRIR L'AUDIENCE →"
                  variant="primary"
                  onClick={() => setMode("create")}
                />
                <ActionCard
                  badge="ACTE II"
                  title="Rejoindre le jury"
                  desc="On t'a passé un code de salle d'audience ?"
                  cta="REJOINDRE LE JURY →"
                  variant="paper"
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
                className="mt-14 max-w-2xl"
              >
                <DossierHeader
                  caseTitle="Ouverture d'audience"
                  caseNo="DOSSIER 001/A"
                  onBack={() => setMode("main")}
                />

                <div className="paper rounded-[3px] p-7 md:p-9">
                  <Field label="Nom au registre" hint="20 caractères max">
                    <input
                      autoFocus
                      type="text"
                      maxLength={20}
                      value={pseudo}
                      onChange={(e) => setPseudo(e.target.value)}
                      placeholder="Sam"
                      className="w-full bg-transparent font-serif text-3xl outline-none placeholder:text-ink/25"
                    />
                  </Field>

                  <Field
                    label="Durée du délibéré"
                    hint={`${voteDuration} sec`}
                  >
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
                    label="Nombre d'affaires"
                    hint={`${questionCount} affaires`}
                  >
                    <input
                      type="range"
                      min={3}
                      max={20}
                      step={1}
                      value={questionCount}
                      onChange={(e) =>
                        setQuestionCount(Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </Field>

                  <div className="flex items-center justify-between pt-5 border-t border-dashed border-ink/20">
                    <div>
                      <div className="font-serif text-xl text-ink">
                        Scrutin anonyme
                      </div>
                      <div className="font-typewriter text-[11px] text-ink/55 uppercase tracking-wider mt-1">
                        Le verdict est public, l'identité des votants est scellée
                      </div>
                    </div>
                    <Toggle
                      checked={anonymous}
                      onChange={() => setAnonymous(!anonymous)}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={!canSubmit}
                    onClick={handleCreate}
                  >
                    OUVRIR L'AUDIENCE {busy ? "..." : "→"}
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
                className="mt-14 max-w-2xl"
              >
                <DossierHeader
                  caseTitle="Convocation au jury"
                  caseNo="JURY 002/B"
                  onBack={() => setMode("main")}
                />

                <div className="paper rounded-[3px] p-7 md:p-9">
                  <Field label="Nom au registre">
                    <input
                      autoFocus={!prefilledCode}
                      type="text"
                      maxLength={20}
                      value={pseudo}
                      onChange={(e) => setPseudo(e.target.value)}
                      placeholder="Sam"
                      className="w-full bg-transparent font-serif text-3xl outline-none placeholder:text-ink/25"
                    />
                  </Field>

                  <Field label="Code de la salle d'audience">
                    <input
                      autoFocus={!!prefilledCode}
                      type="text"
                      maxLength={4}
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="A2BC"
                      className="w-full bg-transparent font-stamp text-5xl uppercase tracking-[0.4em] outline-none placeholder:text-ink/25"
                    />
                  </Field>
                </div>

                <div className="mt-6">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={!canSubmit || code.length < 4}
                    onClick={handleJoin}
                  >
                    REJOINDRE LE JURY {busy ? "..." : "→"}
                  </Button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0">
        <Marquee items={TEASE} />
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 bg-vermillion-dark text-paper font-stamp px-5 py-3 text-xs uppercase tracking-wider"
          >
            ⚠ {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DossierHeader({
  caseTitle,
  caseNo,
  onBack,
}: {
  caseTitle: string;
  caseNo: string;
  onBack: () => void;
}) {
  return (
    <div className="mb-6 flex items-baseline justify-between">
      <div>
        <div className="overline text-paper/55 mb-1">{caseNo}</div>
        <h2 className="font-serif-italic text-5xl text-paper">{caseTitle}</h2>
      </div>
      <button
        onClick={onBack}
        className="overline text-paper/60 hover:text-paper"
      >
        ← RETOUR
      </button>
    </div>
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
  variant: "primary" | "paper";
  onClick: () => void;
}) {
  if (variant === "primary") {
    return (
      <motion.button
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="group relative overflow-hidden rounded-[3px] bg-vermillion p-7 text-left text-paper transition-colors"
        style={{
          boxShadow: "0 20px 50px -20px rgba(155,42,34,0.7)",
        }}
      >
        <div className="flex items-start justify-between">
          <span className="font-stamp text-xs tracking-widest text-paper/80">
            {badge}
          </span>
          <span className="font-stamp text-xs text-paper/80">→</span>
        </div>
        <div className="mt-14">
          <div className="font-serif-italic text-6xl leading-[0.95]">
            {title}
          </div>
          <div className="mt-3 font-typewriter text-[12px] uppercase tracking-wider text-paper/75">
            {desc}
          </div>
          <div className="mt-8 font-stamp text-xs tracking-widest text-paper">
            {cta}
          </div>
        </div>
      </motion.button>
    );
  }
  // paper
  return (
    <motion.button
      whileHover={{ y: -4, rotate: 0.5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="paper group relative overflow-hidden rounded-[3px] p-7 text-left"
      style={{ transform: "rotate(-0.5deg)" }}
    >
      <div className="relative z-10 flex items-start justify-between">
        <span className="font-stamp text-xs tracking-widest text-ink/55">
          {badge}
        </span>
        <span className="font-stamp text-xs text-ink/55">→</span>
      </div>
      <div className="relative z-10 mt-14">
        <div className="font-serif-italic text-6xl leading-[0.95] text-ink">
          {title}
        </div>
        <div className="mt-3 font-typewriter text-[12px] uppercase tracking-wider text-ink/65">
          {desc}
        </div>
        <div className="mt-8 font-stamp text-xs tracking-widest text-vermillion-dark">
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
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-typewriter text-[11px] uppercase tracking-widest text-ink/65">
          {label}
        </span>
        {hint && (
          <span className="font-typewriter text-[11px] uppercase tracking-widest text-ink/45">
            {hint}
          </span>
        )}
      </div>
      {children}
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
      className={`relative h-7 w-12 transition-colors ${
        checked ? "bg-vermillion" : "bg-ink/15"
      }`}
      style={{ borderRadius: "2px" }}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 h-6 w-5 ${
          checked ? "left-[26px] bg-paper" : "left-0.5 bg-paper"
        }`}
        style={{ borderRadius: "2px" }}
      />
    </button>
  );
}
