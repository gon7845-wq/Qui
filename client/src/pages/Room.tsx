import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MIN_PLAYERS, MAX_PLAYERS, type RoomState } from "@qui/shared";
import { getSocket } from "../lib/socket";
import { useAppStore } from "../lib/store";
import { loadSession, saveSession, clearSession, lastPseudo } from "../lib/session";
import { Avatar } from "../components/Avatar";
import { Gavel } from "../components/Gavel";

type JoinStatus = "idle" | "joining" | "ready" | "needs-pseudo" | "error";

export function Room() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const upperCode = code.toUpperCase();

  const roomState = useAppStore((s) => s.roomState);
  const playerId = useAppStore((s) => s.playerId);
  const setRoomState = useAppStore((s) => s.setRoomState);
  const setPlayerId = useAppStore((s) => s.setPlayerId);

  const [status, setStatus] = useState<JoinStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pseudoDraft, setPseudoDraft] = useState(lastPseudo());

  // Subscribe to state updates
  useEffect(() => {
    const s = getSocket();
    const onState = (state: RoomState) => setRoomState(state);
    s.on("room:state", onState);
    return () => {
      s.off("room:state", onState);
    };
  }, [setRoomState]);

  // Initial join: resume if we have a token, otherwise prompt for pseudo
  useEffect(() => {
    const saved = loadSession(upperCode);
    if (saved) {
      setStatus("joining");
      getSocket().emit(
        "room:join",
        {
          code: upperCode,
          pseudo: saved.pseudo,
          resumeToken: saved.token,
        },
        (res) => {
          if (!res.ok) {
            clearSession(upperCode);
            setStatus("needs-pseudo");
            setError(null); // resuming failed silently — let user re-enter pseudo
            return;
          }
          setPlayerId(res.playerId);
          saveSession({
            roomCode: upperCode,
            playerId: res.playerId,
            token: res.token,
            pseudo: saved.pseudo,
          });
          setStatus("ready");
        }
      );
    } else {
      setStatus("needs-pseudo");
    }
    return () => {
      // best-effort leave on unmount
      getSocket().emit("room:leave");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upperCode]);

  const submitJoin = () => {
    setError(null);
    const p = pseudoDraft.trim();
    if (!p) return setError("Pseudo requis.");
    setStatus("joining");
    getSocket().emit("room:join", { code: upperCode, pseudo: p }, (res) => {
      if (!res.ok) {
        setError(res.error.message);
        setStatus("needs-pseudo");
        return;
      }
      setPlayerId(res.playerId);
      saveSession({
        roomCode: upperCode,
        playerId: res.playerId,
        token: res.token,
        pseudo: p,
      });
      setStatus("ready");
    });
  };

  const leaveRoom = () => {
    getSocket().emit("room:leave");
    clearSession(upperCode);
    setRoomState(null);
    setPlayerId(null);
    navigate("/");
  };

  if (status === "needs-pseudo" || status === "idle") {
    return (
      <JoinGate
        code={upperCode}
        pseudo={pseudoDraft}
        setPseudo={setPseudoDraft}
        error={error}
        onSubmit={submitJoin}
        onCancel={() => navigate("/")}
      />
    );
  }

  if (status === "joining" || !roomState || !playerId) {
    return (
      <div className="min-h-full grid place-items-center">
        <p className="text-court-parchment/60 tracking-widest uppercase animate-pulse">
          Entrée au tribunal…
        </p>
      </div>
    );
  }

  return <Lobby state={roomState} playerId={playerId} onLeave={leaveRoom} />;
}

interface JoinGateProps {
  code: string;
  pseudo: string;
  setPseudo: (v: string) => void;
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}

function JoinGate({ code, pseudo, setPseudo, error, onSubmit, onCancel }: JoinGateProps) {
  return (
    <div className="min-h-full grid place-items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="court-card w-full max-w-md p-8"
      >
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-widest text-court-parchment/50">
            Tribunal
          </p>
          <p className="court-title font-gavel text-5xl tracking-[0.4em] text-court-brass mt-1">
            {code}
          </p>
        </div>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-court-parchment/60">
            Ton pseudo
          </span>
          <input
            className="court-input mt-2"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            placeholder="Maître Loyal"
            autoFocus
          />
        </label>
        {error && (
          <p className="text-court-accuse text-sm mt-3 text-center">{error}</p>
        )}
        <div className="flex gap-3 mt-6">
          <button className="court-btn-ghost flex-1" onClick={onCancel}>
            Retour
          </button>
          <button className="court-btn flex-1" onClick={onSubmit}>
            Rejoindre
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface LobbyProps {
  state: RoomState;
  playerId: string;
  onLeave: () => void;
}

function Lobby({ state, playerId, onLeave }: LobbyProps) {
  const me = state.players.find((p) => p.id === playerId);
  const isHost = me?.isHost === true;
  const canStart = state.players.length >= MIN_PLAYERS;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/r/${state.code}` : "";
  const [copied, setCopied] = useState(false);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="min-h-full px-6 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Gavel size={36} />
            <div>
              <p className="text-xs uppercase tracking-widest text-court-parchment/50">
                Tribunal
              </p>
              <p className="court-title font-gavel text-3xl tracking-[0.35em] text-court-brass">
                {state.code}
              </p>
            </div>
          </div>
          <button className="court-btn-ghost text-sm py-2 px-4" onClick={onLeave}>
            Quitter
          </button>
        </header>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="court-card p-6 sm:p-8"
          >
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="court-title text-2xl text-court-parchment">
                Salle d'audience
              </h2>
              <span className="text-court-parchment/50 text-sm tabular-nums">
                {state.players.length} / {MAX_PLAYERS}
              </span>
            </div>

            <ul className="grid sm:grid-cols-2 gap-3">
              <AnimatePresence initial={false}>
                {state.players.map((p) => (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-3 rounded-lg border border-court-brass/20 bg-court-ink/40 px-3 py-2"
                  >
                    <Avatar seed={p.avatar} size={44} dim={!p.connected} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-court-parchment">
                        {p.pseudo}
                        {p.id === playerId && (
                          <span className="text-court-brass/60 text-xs ml-2">
                            (toi)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-court-parchment/40 tracking-wider uppercase">
                        {p.isHost ? "Juge" : p.connected ? "Présent" : "Absent…"}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            {state.players.length < MIN_PLAYERS && (
              <p className="mt-6 text-sm text-court-parchment/50 text-center">
                Il faut au moins {MIN_PLAYERS} accusés au box.
              </p>
            )}
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="court-card p-6 flex flex-col gap-5"
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-court-parchment/50 mb-2">
                Invite tes accusés
              </p>
              <button
                onClick={copyShare}
                className="w-full text-left rounded-lg border border-court-brass/30 bg-court-ink/50 px-3 py-2 hover:border-court-brass/60 transition"
              >
                <span className="block text-xs text-court-parchment/40 uppercase tracking-wider">
                  {copied ? "Copié !" : "Copier le lien"}
                </span>
                <span className="block truncate text-court-parchment/80 text-sm font-mono">
                  {shareUrl}
                </span>
              </button>
            </div>

            <div className="court-divider" />

            <div>
              <p className="text-xs uppercase tracking-widest text-court-parchment/50 mb-3">
                Réglages
              </p>
              <ul className="text-sm text-court-parchment/70 space-y-1">
                <li>
                  Manches : <strong className="text-court-parchment">{state.settings.rounds}</strong>
                </li>
                <li>
                  Temps de vote :{" "}
                  <strong className="text-court-parchment">
                    {state.settings.voteDurationSec}s
                  </strong>
                </li>
                <li>
                  Scrutin :{" "}
                  <strong className="text-court-parchment">
                    {state.settings.anonymousVotes ? "anonyme" : "public"}
                  </strong>
                </li>
                <li>
                  Vote pour soi :{" "}
                  <strong className="text-court-parchment">
                    {state.settings.allowSelfVote ? "autorisé" : "interdit"}
                  </strong>
                </li>
              </ul>
              {!isHost && (
                <p className="text-court-parchment/40 text-xs mt-3 italic">
                  Le juge ajuste les réglages.
                </p>
              )}
            </div>

            <button
              className="court-btn mt-auto"
              disabled={!isHost || !canStart}
              title={
                !isHost
                  ? "Seul le juge ouvre l'audience"
                  : !canStart
                  ? `Encore ${MIN_PLAYERS - state.players.length} accusé(s)`
                  : ""
              }
            >
              Ouvrir l'audience
            </button>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
