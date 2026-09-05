// Jetons visuels — copie fidèle de client/src/index.css et tailwind.config.ts.
// (Le bundle Remotion ne peut pas lire le CSS du client, on duplique les valeurs.)

export const COLORS = {
  bg: "#FFF6EC",
  card: "#FFFDFA",
  ink: "#241B33",
  inkSoft: "#6E6480",
  inkFaint: "#ADA3BC",
  surface: "#FFF1E9",
  hairline: "#F0E4D8",
  cardShadow: "rgba(120, 60, 90, 0.28)",
  accent: "#FF5E8A",
  accent2: "#FF9F43",
  accentDeep: "#E03E73",
};

export type Tone = "warm" | "spicy" | "fun";

export const TONE: Record<
  Tone,
  { label: string; emoji: string; reaction: string; a: string; b: string; heading: string; subtitle: string }
> = {
  warm: {
    label: "Le meilleur",
    emoji: "✨",
    reaction: "💛",
    a: "#FFC861",
    b: "#FF7EB3",
    heading: "Le groupe a choisi",
    subtitle: "le plus aimé sur cette question",
  },
  spicy: {
    label: "Le pire",
    emoji: "🔥",
    reaction: "🔥",
    a: "#FF5C7A",
    b: "#B5179E",
    heading: "Le groupe a parlé",
    subtitle: "ça pique un peu",
  },
  fun: {
    label: "Pour rire",
    emoji: "🎲",
    reaction: "💫",
    a: "#8B5CF6",
    b: "#4CC9F0",
    heading: "Et le verdict…",
    subtitle: "voilà la réponse du groupe",
  },
};

export const toneGradient = (t: Tone) => `linear-gradient(135deg, ${TONE[t].a} 0%, ${TONE[t].b} 100%)`;
export const accentGradient = `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accent2} 100%)`;
export const brandGradient = `linear-gradient(110deg, ${COLORS.accent} 0%, ${COLORS.accent2} 55%, #FFD15C 100%)`;

export const PAGE_GRADIENT = "linear-gradient(165deg, #FFF7EC 0%, #FFF1F2 48%, #F3F8FF 100%)";

export const BLOBS = [
  { color: "#FFD0E2", top: -0.14, left: -0.1, size: 0.52, phase: 0 },
  { color: "#FFE6B0", top: -0.08, left: 0.58, size: 0.44, phase: 0.125 },
  { color: "#C6F0DB", top: 0.58, left: -0.08, size: 0.46, phase: 0.29 },
  { color: "#E3D4FF", top: 0.5, left: 0.6, size: 0.48, phase: 0.21 },
  { color: "#FFD9C2", top: 0.3, left: 0.3, size: 0.34, phase: 0.375 },
];

export const CONFETTI_COLORS = ["#FF5E8A", "#FF9F43", "#FFCB45", "#4CC9F0", "#8B5CF6", "#2DD4BF", "#FF6FA3"];

// Palette d'avatars (client/src/lib/colors.ts)
const PALETTES: Array<{ a: string; b: string }> = [
  { a: "#7C5CFC", b: "#B18CFF" },
  { a: "#FF6B9D", b: "#FFA1C4" },
  { a: "#4CC9F0", b: "#7CE0FF" },
  { a: "#2DD4BF", b: "#7CF0DD" },
  { a: "#FFB23E", b: "#FFD08A" },
  { a: "#FF7E5F", b: "#FFB199" },
  { a: "#5BD86B", b: "#9CF0A6" },
  { a: "#F067D8", b: "#FFA3EE" },
];

export function avatarColorFor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

export const CARD_SHADOW = `inset 0 1px 0 rgba(255,255,255,0.08), 0 44px 88px -40px ${COLORS.cardShadow}, 0 12px 28px -16px ${COLORS.cardShadow}`;

// Zone sûre : TikTok / Reels superposent leur interface en bas (~320 px) et à droite (~140 px).
export const SAFE = { top: 200, bottom: 340, side: 72 };
