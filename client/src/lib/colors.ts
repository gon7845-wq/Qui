// Deterministic chip color palette per pseudo
const PALETTES: Array<{
  outer: string;
  outerDark: string;
  inner: string;
  innerDark: string;
}> = [
  { outer: "#F0E5D0", outerDark: "#B8AC8A", inner: "#F7EFD8", innerDark: "#C9BC9B" }, // ivory
  { outer: "#C8392F", outerDark: "#7A1E18", inner: "#E8554A", innerDark: "#9B2A22" }, // ruby
  { outer: "#1F3A82", outerDark: "#0F1F4D", inner: "#3B5CB8", innerDark: "#152858" }, // marine
  { outer: "#246B4A", outerDark: "#103A26", inner: "#3B9468", innerDark: "#154A2E" }, // emerald
  { outer: "#C8A23F", outerDark: "#8C6F22", inner: "#E9CB6F", innerDark: "#9D7D27" }, // gold
  { outer: "#7E2D8C", outerDark: "#4A1554", inner: "#A04BB0", innerDark: "#5C1F69" }, // plum
  { outer: "#E27A2F", outerDark: "#8C4214", inner: "#F0A050", innerDark: "#A55418" }, // orange
  { outer: "#3F8BA8", outerDark: "#1F4D63", inner: "#5DAACA", innerDark: "#2A6680" }, // teal
];

export function chipColorFor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

export function caseNumberFor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 17 + s.charCodeAt(i)) >>> 0;
  return String((h % 9000) + 1000);
}
