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
    "{name}, trésor national. On lance une pétition pour te cloner.",
    "Même les jours de pluie deviennent supportables avec {name}.",
    "Le groupe propose {name} pour le prix Nobel de la gentillesse.",
    "On a vérifié : {name} n'a aucun défaut. C'est suspect, mais on valide.",
    "{name}, tu es la personne qu'on appelle, pas celle qu'on évite. Respect.",
    "Si {name} était une boisson, ce serait un chocolat chaud un soir d'hiver.",
    "Le groupe a un crush platonique total sur {name}.",
    "{name} : zéro ennemi, 100% d'amour. Comment tu fais ?",
    "Officiel : {name} est beaucoup trop pur·e pour ce monde.",
    "On t'aurait bien chambré·e {name}, mais t'es vraiment trop adorable.",
    "Le groupe te décerne le titre de meilleure personne ici. Sans débat, {name}.",
    "Un cœur en or, des intentions en platine : c'est {name}.",
    "{name} mériterait qu'on lui rappelle plus souvent à quel point il·elle compte.",
    "Le soleil est jaloux de {name}.",
    "Garde {name} précieusement, on n'en fabrique plus des comme ça.",
    "{name}, tu es la raison pour laquelle ce groupe tient encore debout.",
    "Petit rappel officiel : {name} est une pépite. Le groupe a tranché.",
    "Coincés sur une île déserte, on choisit {name} les yeux fermés.",
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
    "Le groupe a transformé {name} en punching-ball ce soir. Avec amour.",
    "{name}, ton thérapeute va avoir du travail après ça.",
    "On a voté. Tu as perdu. Bienvenue, {name}. 🎤⬇️",
    "{name} : recherché·e dans douze départements pour crimes contre le groupe.",
    "Le groupe te tend un miroir, {name}. Désolé pour ce que tu y vois.",
    "Respire {name}, c'est qu'un jeu… mais ils le pensaient quand même.",
    "{name}, tu viens de débloquer le succès « roast intégral ». 🏆🔥",
    "Sondage express : 100% pensent que tu l'as bien cherché, {name}.",
    "{name}, même tes amis t'ont balancé. C'est ça, la vraie famille.",
    "Le groupe te condamne à trois tournées pour te faire pardonner, {name}.",
    "Plot twist : le vrai méchant du film, c'était {name} depuis le début.",
    "{name}, t'inquiète, on dira du bien de toi… à ton enterrement.",
    "Le karma a pris des notes ce soir, {name}.",
    "{name} : sponsorisé·e par le drama depuis sa naissance.",
    "On t'a pas raté, {name}. Vraiment pas.",
    "Félicitations {name}, tu es la villain origin story de quelqu'un ici.",
    "Le groupe a parlé avec son cœur. Son cœur n'aime pas {name}. 💀",
    "{name}, tu repars avec une thérapie de groupe gratuite. De rien.",
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
    "50% t'adorent, 50% se méfient. L'équilibre parfait, {name}.",
    "{name} : deux saveurs selon l'éclairage.",
    "Le groupe n'a pas tranché : génie ou danger public ? {name}, à toi de voir.",
    "{name}, tu es le plat épicé qu'on commande sans savoir si on va regretter.",
    "Trop gentil·le pour être méchant·e, trop malin·e pour être tout gentil·le. {name}.",
    "Le groupe te classe « chaotique neutre », {name}. C'est un compliment. Peut-être.",
    "On t'aime, on te craint. C'est ça, l'effet {name}.",
    "{name} : comme la météo. Imprévisible, mais on s'y fait.",
    "Le groupe te met dans la case « à surveiller », {name}. Affectueusement.",
    "Un personnage à twists, {name}. On sait jamais sur quel pied danser.",
    "{name}, t'es la définition vivante de « ça dépend des jours ».",
    "Le jury hésite encore : héros ou cas social ? {name}, départage-les.",
    "{name} : cinquante nuances de « euh… ».",
    "Mystère et boule de gomme. Le groupe n'a pas percé {name}.",
    "{name}, tu coches toutes les cases. Les bonnes ET les mauvaises.",
  ],
  // 🤫 personne ne l'a voté·e
  quiet: [
    "{name} ? Le groupe a préféré rester discret. Trop pur·e pour ce jeu. 🤫",
    "Zéro vote pour {name} : soit un·e saint·e, soit un mystère.",
    "{name} passe entre les gouttes. Bien joué… ou trop transparent·e ?",
    "Le groupe n'a rien à te reprocher, {name}. Suspect, mais on note.",
    "{name}, l'agent secret de la soirée. Personne ne t'a cerné·e. 🕵️",
    "Aucun vote. {name} a soit un alibi en béton, soit un bon avocat.",
    "{name}, tellement lisse que les votes ont glissé. Impressionnant.",
    "Le groupe a presque oublié que {name} était là. Discrétion niveau ninja. 🥷",
    "{name} : casier vierge. Pour l'instant.",
    "Personne n'a osé voter contre {name}. La peur ou le respect ? On sait pas.",
    "{name}, tu as traversé la soirée sans une égratignure. Coïncidence ? J'crois pas.",
    "Le groupe te cherche encore, {name}. T'étais où exactement ?",
    "{name} : si discret·e qu'on vérifierait presque que tu jouais vraiment.",
    "Zéro vote, zéro scandale. {name}, parfait·e ou très très prudent·e ?",
    "Le groupe n'a aucune info sur {name}. Témoin protégé. 🔒",
    "Le crime parfait, {name} : être totalement oublié·e.",
    "Prix de la transparence décerné à {name}. Littéralement, personne ne t'a vu·e.",
    "{name} : invisible, mais pas innocent·e, on parie.",
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
