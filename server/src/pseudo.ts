import { MAX_PSEUDO_LENGTH } from "@qui/shared";

function hasControlChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

export function sanitizePseudo(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_PSEUDO_LENGTH) return null;
  if (hasControlChar(trimmed)) return null;
  return trimmed;
}
