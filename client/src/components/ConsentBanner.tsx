import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { Button } from "./Button";

// « Refuser » doit peser autant que « Accepter » : même taille, même forme,
// fond plein. Un bouton fantôme à côté d'un bouton coloré, la CNIL considère
// que ce n'est pas un choix libre.
const NEUTRAL = {
  background: "var(--surface)",
  color: "var(--ink)",
  boxShadow: "inset 0 0 0 1.5px var(--hairline)",
} as const;

// Bandeau de consentement publicitaire.
//
// Trois choix de conception, tous volontaires :
//   • il ne s'affiche QUE si une régie est réellement configurée — sans régie,
//     il n'y a rien à consentir, donc pas de bandeau ;
//   • il ne s'affiche jamais pendant une partie : personne ne coupe une soirée
//     entre amis pour parler de cookies ;
//   • « Refuser » et « Accepter » ont la même taille et le même poids visuel,
//     comme l'exige la CNIL — refuser doit être aussi facile qu'accepter.
export function ConsentBanner() {
  const { config, consent, setConsent, lobby, view } = useStore();
  const [details, setDetails] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  const network = !!config && config.ads.houseOnly === false;
  const midGame = !!lobby && lobby.state !== "waiting" && lobby.state !== "ended";
  const visible = network && consent === null && !midGame && view !== "game";

  // Le bandeau est en position fixe : sans réserver la place, il recouvre le
  // bas des écrans centrés, qui ne défilent pas — le contenu masqué devient
  // alors inatteignable. Les écrans lisent --consent-pad.
  //
  // La mesure est bornée à la moitié de l'écran : une valeur aberrante (mesure
  // prise en pleine animation, police pas encore chargée) déformerait la page
  // au lieu de simplement réserver la place.
  useEffect(() => {
    const root = document.documentElement;
    const clear = () => root.style.setProperty("--consent-pad", "0px");
    if (!visible) {
      clear();
      return;
    }
    const apply = () => {
      const el = ref.current;
      if (!el) return;
      const measured = Math.round(el.getBoundingClientRect().height);
      const pad = Math.min(Math.max(measured, 0), Math.round(window.innerHeight * 0.5));
      root.style.setProperty("--consent-pad", `${pad}px`);
    };
    // après la frame de mise en page, sinon on mesure un élément non encore posé
    const raf = requestAnimationFrame(apply);
    window.addEventListener("resize", apply);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", apply);
      clear();
    };
  }, [visible, details]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          ref={ref}
          role="dialog"
          aria-label="Choix publicitaire"
          className="fixed inset-x-0 bottom-0 z-[60] flex justify-center p-3 sm:p-4"
        >
          <div
            className="w-full max-w-lg rounded-3xl p-5"
            style={{
              background: "var(--card)",
              border: "1px solid var(--hairline)",
              boxShadow: "0 -8px 40px -12px var(--card-shadow)",
            }}
          >
            <div className="font-display text-ink" style={{ fontSize: 17 }}>
              Les pubs financent le jeu
            </div>
            <p className="font-body text-sm text-ink-soft mt-1.5 leading-snug">
              Notre régie peut déposer des cookies pour choisir les annonces. Si tu refuses,
              tu ne verras que nos propres annonces — et aucun cookie publicitaire.
            </p>

            <AnimatePresence>
              {details && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <ul className="mt-3 flex flex-col gap-2 border-t border-[var(--hairline)] pt-3 text-[13px] leading-snug text-ink-soft">
                    <li>
                      <strong className="text-ink">Si tu acceptes</strong> — cookies de notre régie
                      publicitaire, pour sélectionner les annonces et limiter leur répétition.
                    </li>
                    <li>
                      <strong className="text-ink">Si tu refuses</strong> — aucun cookie
                      publicitaire, aucun script de régie chargé. Le jeu fonctionne à l'identique.
                    </li>
                    <li>
                      <strong className="text-ink">Dans tous les cas</strong> — le jeu garde en local
                      ton prénom, ton avatar, ton thème et ta partie en cours. C'est nécessaire pour
                      jouer et ça ne sort pas de ton appareil.
                    </li>
                    <li>
                      <strong className="text-ink">Ton choix</strong> — gardé 6 mois, modifiable à
                      tout moment via « Publicité » sur l'écran d'accueil.
                    </li>
                  </ul>
                  {config?.legal?.privacyUrl && (
                    <a
                      href={config.legal.privacyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="label mt-3 inline-block hover:underline"
                      style={{ color: "var(--accent-deep)" }}
                    >
                      Politique de confidentialité ↗
                    </a>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 flex items-center gap-2">
              <Button size="sm" fullWidth style={NEUTRAL} onClick={() => setConsent("refused")}>
                Refuser
              </Button>
              <Button size="sm" fullWidth onClick={() => setConsent("accepted")}>
                Accepter
              </Button>
            </div>

            <button
              onClick={() => setDetails((d) => !d)}
              className="label text-ink-faint mt-3 w-full text-center transition-colors hover:text-ink-soft"
            >
              {details ? "Masquer les détails" : "Détails"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Point d'entrée pour revenir sur son choix. Discret, et présent seulement
// quand il y a un choix à revoir.
export function ConsentLink({ className = "" }: { className?: string }) {
  const { config, consent, reopenConsent } = useStore();
  if (!config || config.ads.houseOnly !== false || consent === null) return null;
  return (
    <button
      onClick={reopenConsent}
      className={`label text-ink-faint transition-colors hover:text-ink ${className}`}
    >
      Publicité : {consent === "accepted" ? "acceptée" : "refusée"} · changer
    </button>
  );
}
