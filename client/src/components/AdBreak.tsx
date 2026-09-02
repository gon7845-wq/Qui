import { motion } from "framer-motion";
import { useStore } from "../store";
import { AdSlot } from "./AdSlot";
import { useNow } from "../lib/useNow";

// Entracte entre deux manches (état serveur « ad »).
//
// Le rythme est tenu par le serveur (adEndTime) : tous les joueurs voient le
// même compte à rebours, et l'hôte peut abréger — mais seulement après le
// délai minimum décidé par le serveur, pas par le client.
export function AdBreak() {
  const { lobby, selfId, skipAd, config } = useStore();
  const now = useNow(250);
  if (!lobby || !lobby.adEndTime) return null;

  const isHost = lobby.hostId === selfId;
  const remaining = Math.max(0, Math.ceil((lobby.adEndTime - now) / 1000));
  const total = (config?.ads.policy.seconds ?? 7) * 1000;
  const pct = Math.max(0, Math.min(1, (lobby.adEndTime - now) / total));
  const canSkip = isHost && lobby.adSkipAt != null && now >= lobby.adSkipAt;
  const last = lobby.currentRound >= lobby.totalRounds;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 grid place-items-center px-5"
      style={{ background: "var(--bg)" }}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-5">
        <div className="text-center">
          <div className="label text-ink-faint">Entracte</div>
          <div className="font-display text-ink mt-1" style={{ fontSize: "clamp(20px,3.6vmin,26px)" }}>
            {last ? "Les résultats arrivent…" : `Manche ${lobby.currentRound + 1} dans ${remaining}s`}
          </div>
        </div>

        <AdSlot format="interstitial" seed={lobby.currentRound} />

        {/* barre de progression de l'entracte */}
        <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[var(--hairline)]">
          <div
            className="h-full rounded-full brand-gradient"
            style={{ width: `${pct * 100}%`, transition: "width 250ms linear" }}
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          {canSkip ? (
            <button onClick={skipAd} className="label text-ink-soft transition-colors hover:text-ink">
              Passer →
            </button>
          ) : (
            <span className="label text-ink-faint">{isHost ? `Passer dans ${remaining}s` : `${remaining}s`}</span>
          )}
          <a href="/moi" className="label hover:underline" style={{ color: "var(--accent-deep)" }}>
            Retirer les pubs pour toute la table →
          </a>
        </div>
      </div>
    </motion.div>
  );
}
