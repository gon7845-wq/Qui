import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { RoomState } from "@qui/shared";
import { getSocket } from "../lib/socket";
import { useAppStore } from "../lib/store";
import { loadSession, saveSession, clearSession, lastPseudo } from "../lib/session";
import { Lobby } from "../game/Lobby";
import { QuestionScreen } from "../game/Question";
import { VoteScreen } from "../game/Vote";
import { RevealScreen } from "../game/Reveal";
import { ScoreScreen } from "../game/Score";
import { EndScreen } from "../game/End";

type JoinStatus = "idle" | "joining" | "ready" | "needs-pseudo";

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

  useEffect(() => {
    const s = getSocket();
    const onState = (state: RoomState) => setRoomState(state);
    s.on("room:state", onState);
    return () => {
      s.off("room:state", onState);
    };
  }, [setRoomState]);

  useEffect(() => {
    const saved = loadSession(upperCode);
    if (saved) {
      setStatus("joining");
      getSocket().emit(
        "room:join",
        { code: upperCode, pseudo: saved.pseudo, resumeToken: saved.token },
        (res) => {
          if (!res.ok) {
            clearSession(upperCode);
            setStatus("needs-pseudo");
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

  return <PhaseRouter state={roomState} playerId={playerId} onLeave={leaveRoom} />;
}

function PhaseRouter({
  state,
  playerId,
  onLeave,
}: {
  state: RoomState;
  playerId: string;
  onLeave: () => void;
}) {
  // Group reveal sub-phases under a single AnimatePresence key bucket so
  // sub-phase transitions cross-fade smoothly.
  const phaseKey = state.phase.startsWith("round:reveal:") ? state.phase : state.phase;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phaseKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="min-h-full"
      >
        {state.phase === "lobby" && (
          <Lobby state={state} playerId={playerId} onLeave={onLeave} />
        )}
        {state.phase === "round:question" && <QuestionScreen state={state} />}
        {state.phase === "round:vote" && (
          <VoteScreen state={state} playerId={playerId} />
        )}
        {state.phase.startsWith("round:reveal:") && <RevealScreen state={state} />}
        {state.phase === "round:score" && <ScoreScreen state={state} />}
        {state.phase === "end" && (
          <EndScreen state={state} playerId={playerId} onLeave={onLeave} />
        )}
      </motion.div>
    </AnimatePresence>
  );
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
