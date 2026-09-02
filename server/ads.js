// Politique publicitaire et régies.
//
// Deux emplacements, choisis pour ne pas casser le rythme d'une soirée :
//   • bannière  — pendant la révélation, le lobby et l'écran final. Les yeux
//                 sont déjà sur l'écran, personne n'attend.
//   • entracte  — écran plein entre deux manches, toutes N manches, et juste
//                 avant les résultats finaux (pic d'attention de la partie).
//
// Rien ne s'affiche si l'hôte est VIP : c'est lui qui paie pour la table.
// Si aucune régie n'est configurée, on sert des « pubs maison » (autopromo)
// pour que l'emplacement ne soit jamais vide et travaille pour le VIP.

export const AD_POLICY = {
  // Toutes les 3 manches : sur une partie de 8 manches ça fait 2 entractes
  // plus celui d'avant-résultats. Au-delà, on fatigue la table.
  everyRounds: clampInt(process.env.AD_EVERY_ROUNDS, 3, 1, 20),
  seconds: clampInt(process.env.AD_SECONDS, 7, 3, 30),
  // l'hôte peut abréger l'entracte après ce délai
  skipAfter: clampInt(process.env.AD_SKIP_AFTER, 4, 0, 30),
};

function clampInt(raw, def, min, max) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.round(n)));
}

// Identifiants de régie — publics par nature (ils finissent dans le HTML).
const NETWORKS = {
  adsense: {
    client: process.env.ADSENSE_CLIENT || null, // ex. ca-pub-1234567890123456
    banner: process.env.ADSENSE_SLOT_BANNER || null,
    interstitial: process.env.ADSENSE_SLOT_INTERSTITIAL || null,
  },
  admob: {
    appId: process.env.ADMOB_APP_ID || null,
    banner: process.env.ADMOB_UNIT_BANNER || null,
    interstitial: process.env.ADMOB_UNIT_INTERSTITIAL || null,
  },
};

// Autopromo servie quand aucune régie n'est branchée (ou en secours si la
// régie ne remplit pas). Elle pousse le VIP et le partage : les deux choses
// qui rapportent réellement.
export const HOUSE_ADS = [
  {
    id: "vip-night",
    kind: "vip",
    title: "Une soirée sans pub ?",
    body: "1 € pour la soirée. Pas de pub pour toi ni pour tes invités.",
    cta: "Voir l'offre",
    href: "/moi?offre=vip_night",
    tone: "warm",
  },
  {
    id: "vip-year",
    kind: "vip",
    title: "VIP à l'année",
    body: "Zéro pub à toutes tes parties + questions privées illimitées.",
    cta: "Passer VIP",
    href: "/moi?offre=vip_year",
    tone: "spicy",
  },
  {
    id: "private-questions",
    kind: "feature",
    title: "Tes propres questions",
    body: "Crée les questions qui parlent de VOTRE groupe. C'est là que le jeu devient drôle.",
    cta: "Créer mes questions",
    href: "/moi",
    tone: "fun",
  },
  {
    id: "share",
    kind: "share",
    title: "Invite la bande",
    body: "Le jeu est meilleur à 6 qu'à 3. Envoie le lien au reste du groupe.",
    cta: "Copier le lien",
    href: null,
    tone: "warm",
  },
];

// Ce que le client a besoin de savoir. Aucun secret ici.
export function publicAds() {
  const adsense = NETWORKS.adsense.client ? NETWORKS.adsense : null;
  const admob = NETWORKS.admob.appId ? NETWORKS.admob : null;
  return {
    policy: AD_POLICY,
    adsense,
    admob,
    // aucune régie branchée → le client affiche uniquement l'autopromo
    houseOnly: !adsense && !admob,
    house: HOUSE_ADS,
  };
}
