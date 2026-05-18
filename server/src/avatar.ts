import type { AvatarSeed } from "@qui/shared";

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function avatarFromPseudo(pseudo: string): AvatarSeed {
  const h = hash32(pseudo.toLowerCase());
  const hue = h % 360;
  const toge = ((h >>> 9) % 3) as 0 | 1 | 2;
  const cleaned = pseudo.trim().replace(/[^\p{L}\p{N}]/gu, "");
  const initials = (cleaned.slice(0, 1) + (cleaned.slice(1, 2) || "")).toUpperCase();
  return { hue, toge, initials: initials || "?" };
}
