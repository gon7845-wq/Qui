// Dégradé déterministe par pseudo pour les avatars
const PALETTES: Array<{ a: string; b: string }> = [
  { a: "#7C5CFC", b: "#B18CFF" }, // violet
  { a: "#FF6B9D", b: "#FFA1C4" }, // pink
  { a: "#4CC9F0", b: "#7CE0FF" }, // cyan
  { a: "#2DD4BF", b: "#7CF0DD" }, // teal
  { a: "#FFB23E", b: "#FFD08A" }, // amber
  { a: "#FF7E5F", b: "#FFB199" }, // coral
  { a: "#5BD86B", b: "#9CF0A6" }, // lime
  { a: "#F067D8", b: "#FFA3EE" }, // magenta
];

export function avatarColorFor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

export type Tone = "warm" | "spicy" | "fun";

export const TONE: Record<
  Tone,
  { label: string; emoji: string; reaction: string; a: string; b: string }
> = {
  warm: { label: "Le meilleur", emoji: "✨", reaction: "💛", a: "#FFC861", b: "#FF7EB3" },
  spicy: { label: "Le pire", emoji: "🔥", reaction: "🔥", a: "#FF5C7A", b: "#B5179E" },
  fun: { label: "Pour rire", emoji: "🎲", reaction: "💫", a: "#8B5CF6", b: "#4CC9F0" },
};

export function tone(t?: string): Tone {
  return t === "warm" || t === "spicy" || t === "fun" ? t : "fun";
}
