import type { Tone } from "./colors";

export type Mood = "loved" | "roasted" | "mixed" | "quiet";

// {name} est remplacé par le prénom du joueur.
const POOLS: Record<Mood, string[]> = {
  // 💛 le groupe valorise — taquin mais bienveillant
  loved: [
    "{name}, la personne que tout le monde veut dans son équipe. 🥹",
    "Officiellement validé·e par le groupe. {name} peut être fier·e.",
    "Si la gentillesse était une monnaie, {name} serait millionnaire.",
    "{name} : la preuve vivante que les gens bien existent encore.",
    "Le groupe a parlé : on garde {name}. 💛",
    "Le genre de personne qu'on présente à sa mère sans stresser, ce·tte {name}.",
    "Un sans-faute. {name} repart la tête haute et le cœur plein.",
    "Tout le monde mérite un·e {name} dans sa vie.",
    "{name} rayonne tellement que même les votes piquants ont eu pitié.",
    "Note du groupe : 20/20. {name}, tu peux dormir tranquille.",
  ],
  // 🔥 le groupe chambre — moquerie assumée
  roasted: [
    "{name}, le groupe t'aime… mais à distance. 🔥",
    "Aïe. {name} ressort de cette soirée avec quelques cicatrices.",
    "Ça va {name}, t'es encore debout après ça ? Respect.",
    "Le groupe a été honnête. Brutal, mais honnête. Courage {name}.",
    "{name} : le personnage que tout le monde adore… détester.",
    "On t'aime quand même {name}. Enfin… on essaie.",
    "Capture d'écran sauvegardée. {name} ne s'en remettra pas. 😬",
    "Le jury a délibéré : coupable sur toute la ligne, {name}.",
    "C'est pas de la méchanceté {name}, c'est de la lucidité collective.",
    "{name}, la prochaine fois, ramène un avocat. ⚖️",
  ],
  // 😏 mi-ange mi-démon
  mixed: [
    "{name} : un peu ange, un peu démon. Le combo parfait.",
    "Impossible à ranger dans une case, {name}. On abandonne.",
    "Le groupe est partagé… comme toujours avec toi, {name}.",
    "Mi-figue mi-raisin : c'est tout {name}.",
    "Le groupe te trouve… intéressant·e. Prends ça comme tu veux, {name}.",
    "Ni totalement saint·e, ni totalement diable. Suspect, {name}.",
    "Un dossier compliqué, ce·tte {name}.",
    "{name}, tu fais l'unanimité… dans le désaccord.",
  ],
  // 🤫 personne ne l'a voté·e
  quiet: [
    "{name} ? Le groupe a préféré rester discret. Trop pur·e pour ce jeu. 🤫",
    "Zéro vote pour {name} : soit un·e saint·e, soit un mystère.",
    "{name} passe entre les gouttes. Bien joué… ou trop transparent·e ?",
    "Le groupe n'a rien à te reprocher, {name}. Suspect, mais on note.",
    "{name}, l'agent secret de la soirée. Personne ne t'a cerné·e. 🕵️",
  ],
};

const MOOD_TONE: Record<Mood, Tone> = {
  loved: "warm",
  roasted: "spicy",
  mixed: "fun",
  quiet: "fun",
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function moodFor(warm: number, spicy: number, total: number): Mood {
  if (total === 0) return "quiet";
  if (warm > spicy * 1.2) return "loved";
  if (spicy > warm * 1.2) return "roasted";
  return "mixed";
}

/** Punchline déterministe (stable par joueur) selon ce que le groupe a voté. */
export function punchlineFor(
  name: string,
  opts: { id: string; warm: number; spicy: number; total: number }
): { text: string; tone: Tone; mood: Mood } {
  const mood = moodFor(opts.warm, opts.spicy, opts.total);
  const pool = POOLS[mood];
  const line = pool[hash(opts.id + mood) % pool.length];
  return { text: line.replace(/\{name\}/g, name), tone: MOOD_TONE[mood], mood };
}
