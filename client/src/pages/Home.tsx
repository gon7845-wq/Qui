import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MAX_PSEUDO_LENGTH, ROOM_CODE_LENGTH } from "@qui/shared";
import { getSocket } from "../lib/socket";
import { saveSession, lastPseudo } from "../lib/session";
import { Gavel } from "../components/Gavel";

export function Home() {
  const navigate = useNavigate();
  const [pseudo, setPseudo] = useState(lastPseudo());
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [pseudo, code]);

  const onCreate = () => {
    setError(null);
    const p = pseudo.trim();
    if (!p) return setError("Choisis un pseudo.");
    setBusy("create");
    getSocket().emit("room:create", { pseudo: p }, (res) => {
      setBusy(null);
      if (!res.ok) return setError(res.error.message);
      saveSession({
        roomCode: res.code,
        playerId: res.playerId,
        token: res.token,
        pseudo: p,
      });
      navigate(`/r/${res.code}`);
    });
  };

  const onJoin = () => {
    setError(null);
    const p = pseudo.trim();
    const c = code.trim().toUpperCase();
    if (!p) return setError("Choisis un pseudo.");
    if (c.length !== ROOM_CODE_LENGTH)
      return setError(`Le code fait ${ROOM_CODE_LENGTH} caractères.`);
    setBusy("join");
    getSocket().emit("room:join", { code: c, pseudo: p }, (res) => {
      setBusy(null);
      if (!res.ok) return setError(res.error.message);
      saveSession({
        roomCode: c,
        playerId: res.playerId,
        token: res.token,
        pseudo: p,
      });
      navigate(`/r/${c}`);
    });
  };

  return (
    <div className="min-h-full grid place-items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="court-card w-full max-w-md p-8 sm:p-10"
      >
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <motion.div
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "backOut" }}
          >
            <Gavel size={64} />
          </motion.div>
          <h1 className="court-title text-5xl sm:text-6xl font-black text-court-parchment">
            QUI&nbsp;?
          </h1>
          <p className="text-court-parchment/70 text-sm tracking-wider uppercase">
            Le tribunal des accusations amicales
          </p>
        </div>

        <div className="court-divider mb-8" />

        <div className="flex flex-col gap-4">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-court-parchment/60">
              Ton pseudo
            </span>
            <input
              className="court-input mt-2"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value.slice(0, MAX_PSEUDO_LENGTH))}
              placeholder="Maître Loyal"
              maxLength={MAX_PSEUDO_LENGTH}
              autoFocus
            />
          </label>

          <button
            className="court-btn mt-2"
            onClick={onCreate}
            disabled={busy !== null}
          >
            {busy === "create" ? "Création…" : "Ouvrir un tribunal"}
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="h-px flex-1 bg-court-brass/20" />
            <span className="text-xs uppercase tracking-widest text-court-parchment/40">
              ou
            </span>
            <div className="h-px flex-1 bg-court-brass/20" />
          </div>

          <label className="block">
            <span className="text-xs uppercase tracking-widest text-court-parchment/60">
              Code à 4 caractères
            </span>
            <input
              className="court-input mt-2 text-center tracking-[0.4em] font-gavel text-2xl uppercase"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().slice(0, ROOM_CODE_LENGTH))
              }
              placeholder="X X X X"
              maxLength={ROOM_CODE_LENGTH}
            />
          </label>

          <button
            className="court-btn-ghost"
            onClick={onJoin}
            disabled={busy !== null}
          >
            {busy === "join" ? "Connexion…" : "Rejoindre"}
          </button>

          {error && (
            <p
              role="alert"
              aria-live="assertive"
              className="text-court-accuse text-sm mt-2 text-center"
            >
              {error}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
