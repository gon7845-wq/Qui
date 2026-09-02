// Consentement publicitaire.
//
// Règle simple, et c'est elle qui rend la bannière non invasive :
//   • aucune réponse (ou refus) → aucun script de régie n'est chargé, on
//     n'affiche que nos propres annonces. Zéro cookie tiers, donc rien à
//     consentir : c'est un état parfaitement légal par défaut.
//   • acceptation → la régie est chargée.
//
// Conséquence : refuser ne casse rien et ne coûte au joueur aucune
// fonctionnalité. Et tant qu'aucune régie n'est configurée, la question ne se
// pose pas du tout — la bannière ne s'affiche jamais.

export type Consent = "accepted" | "refused";

const KEY = "qui_consent";
const VERSION = 1; // à incrémenter si les finalités changent : le choix est redemandé
// La CNIL attend un renouvellement périodique du consentement.
const MAX_AGE_MS = 180 * 24 * 3600 * 1000; // 6 mois

export function readConsent(): Consent | null {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!o || o.v !== VERSION) return null;
    if (o.choice !== "accepted" && o.choice !== "refused") return null;
    if (typeof o.at !== "number" || Date.now() - o.at > MAX_AGE_MS) return null;
    return o.choice;
  } catch {
    return null;
  }
}

export function writeConsent(choice: Consent) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, choice, at: Date.now() }));
  } catch {}
}

export function forgetConsent() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
