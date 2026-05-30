import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { Button } from "../components/Button";
import { Brand } from "../components/Brand";
import { Card } from "../components/Card";

interface Props {
  prefilledCode?: string | null;
}

export function Home({ prefilledCode }: Props) {
  const { pseudo, setPseudo, createLobby, joinLobby, errorMsg, setError } = useStore();
  const [stage, setStage] = useState<"idle" | "host" | "guest" | "config">(
    prefilledCode ? "guest" : "idle"
  );
  const [code, setCode] = useState(prefilledCode ?? "");
  const [busy, setBusy] = useState(false);

  const [anonymous, setAnonymous] = useState(false);
  const [voteDuration, setVoteDuration] = useState(10);
  const [questionCount, setQuestionCount] = useState(8);
  const [allowSelfVote, setAllowSelfVote] = useState(true);

  const canSubmitPseudo = pseudo.trim().length >= 1 && !busy;

  async function handleCreate() {
    if (!canSubmitPseudo) return;
    setBusy(true);
    const r = await createLobby({ anonymous, voteDuration, questionCount, allowSelfVote });
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
    <div className="relative h-full w-full overflow-y-auto no-scrollbar">
      <div className="min-h-full grid place-items-center px-5 py-10">
        <div className="w-full max-w-md flex flex-col items-center gap-7">
          <div className="flex flex-col items-center text-center gap-2">
            <Brand size="lg" />
            <p
              className="font-display text-ink-soft"
              style={{ fontSize: "clamp(15px, 2.4vmin, 19px)", maxWidth: "26ch" }}
            >
              Le groupe révèle le meilleur <span className="tone-text tone-warm">et le pire</span> de chacun.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {stage === "idle" && (
              <Card key="idle" animateKey="idle" className="w-full p-7 flex flex-col gap-3">
                <Button size="lg" fullWidth onClick={() => setStage("host")}>
                  Créer une partie
                </Button>
                <Button variant="soft" size="lg" fullWidth onClick={() => setStage("guest")}>
                  Rejoindre avec un code
                </Button>
                <p className="label text-ink-faint text-center mt-1">3 à 12 joueurs · sur le même wifi ou à distance</p>
              </Card>
            )}

            {stage === "host" && (
              <Card key="host" animateKey="host" className="w-full p-7">
                <Header hint="Tu crées la partie" onBack={() => setStage("idle")} />
                <PrenomInput value={pseudo} onChange={setPseudo} autoFocus />
                <div className="mt-6">
                  <Button fullWidth disabled={!canSubmitPseudo} onClick={() => setStage("config")}>
                    Continuer →
                  </Button>
                </div>
              </Card>
            )}

            {stage === "config" && (
              <Card key="config" animateKey="config" className="w-full p-7">
                <Header hint={`Réglages · ${pseudo}`} onBack={() => setStage("host")} />
                <div className="mt-5 grid gap-4">
                  <Pair label="Temps de vote">
                    {[5, 10, 15, 20].map((v) => (
                      <Pip key={v} active={voteDuration === v} onClick={() => setVoteDuration(v)} label={`${v}s`} />
                    ))}
                  </Pair>
                  <Pair label="Nombre de manches">
                    {[5, 8, 12, 16].map((v) => (
                      <Pip key={v} active={questionCount === v} onClick={() => setQuestionCount(v)} label={`${v}`} />
                    ))}
                  </Pair>
                  <Pair label="Votes">
                    <Pip active={!anonymous} onClick={() => setAnonymous(false)} label="Visibles" />
                    <Pip active={anonymous} onClick={() => setAnonymous(true)} label="Anonymes" />
                  </Pair>
                  <Pair label="Voter pour soi">
                    <Pip active={allowSelfVote} onClick={() => setAllowSelfVote(true)} label="Autorisé" />
                    <Pip active={!allowSelfVote} onClick={() => setAllowSelfVote(false)} label="Interdit" />
                  </Pair>
                </div>
                <div className="mt-6">
                  <Button fullWidth disabled={!canSubmitPseudo} onClick={handleCreate}>
                    {busy ? "Création…" : "C'est parti →"}
                  </Button>
                </div>
              </Card>
            )}

            {stage === "guest" && (
              <Card key="guest" animateKey="guest" className="w-full p-7">
                <Header hint="Tu rejoins une partie" onBack={() => setStage("idle")} />
                <CodeInput value={code} onChange={setCode} autoFocus={!!prefilledCode} />
                <div className="mt-4">
                  <PrenomInput value={pseudo} onChange={setPseudo} autoFocus={!prefilledCode} />
                </div>
                <div className="mt-6">
                  <Button fullWidth disabled={!canSubmitPseudo || code.length < 4} onClick={handleJoin}>
                    {busy ? "Connexion…" : "Rejoindre →"}
                  </Button>
                </div>
              </Card>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-3 font-display text-sm text-white"
            style={{ background: "linear-gradient(135deg,#FF5C7A,#B5179E)", boxShadow: "0 12px 30px -8px rgba(181,23,158,0.5)" }}
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Header({ hint, onBack }: { hint: string; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <span className="label text-ink-faint">{hint}</span>
      <button onClick={onBack} className="label text-ink-soft hover:text-ink transition-colors">
        ← Retour
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
    <label className="block">
      <div className="label text-ink-soft mb-2">Ton prénom</div>
      <input
        autoFocus={autoFocus}
        type="text"
        maxLength={20}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Sam"
        className="w-full rounded-2xl bg-[#FFF1E9] px-4 py-3 font-display text-2xl text-ink outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-[#FF5E8A]"
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
    <label className="block">
      <div className="label text-ink-soft mb-2">Code de la partie</div>
      <input
        autoFocus={autoFocus}
        type="text"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="A2BC"
        className="w-full rounded-2xl bg-[#FFF1E9] px-4 py-3 text-center font-display text-4xl tracking-[0.4em] text-[#E03E73] outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-[#FF5E8A]"
      />
    </label>
  );
}

function Pair({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="label text-ink-soft">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`pill h-9 px-4 text-sm transition-all ${
        active ? "text-white" : "text-ink-soft hover:text-ink"
      }`}
      style={
        active
          ? { background: "linear-gradient(135deg,#FF5E8A,#FF9F43)", boxShadow: "0 6px 16px -6px rgba(255,94,138,0.6)" }
          : { background: "rgba(255,94,138,0.1)" }
      }
    >
      {label}
    </button>
  );
}
