// Génération DÉTERMINISTE d'un scénario de vidéo à partir d'une graine.
// Fichier JS pur : utilisé à la fois par les scripts Node (plan.mjs, métadonnées)
// et par le bundle Remotion (rendu). Aucune dépendance.

import { QUESTIONS } from "../../../server/questions.js";
import { PUNCHLINES } from "../data/punchlines.js";

export const TEMPLATES = /** @type {const} */ (["manche", "rafale", "bulletin"]);

/** Même définition que server/db.js → DEFAULT_CATEGORIES (dupliquée : db.js importe pg). */
export const CATEGORIES = {
  gentil: { name: "Gentillesse", emoji: "💛", tone: "warm" },
  talents: { name: "Talents", emoji: "🦸", tone: "warm" },
  groupe: { name: "Le groupe", emoji: "👥", tone: "warm" },
  drole: { name: "Drôle", emoji: "😂", tone: "fun" },
  futur: { name: "Prédictions", emoji: "🔮", tone: "fun" },
  absurde: { name: "Absurde", emoji: "👽", tone: "fun" },
  philo: { name: "Philo", emoji: "🧠", tone: "fun" },
  couple: { name: "Couple", emoji: "💔", tone: "spicy" },
  genant: { name: "Gênant", emoji: "😬", tone: "spicy" },
  trash: { name: "Sans pitié", emoji: "🔥", tone: "spicy" },
};

const NAMES = [
  ["Léa", "🦊"], ["Hugo", "😎"], ["Inès", "🦄"], ["Théo", "🐸"], ["Camille", "🐼"], ["Nassim", "🌶️"],
  ["Chloé", "🍩"], ["Yanis", "🐙"], ["Manon", "🐨"], ["Lucas", "🦖"], ["Sarah", "🎀"], ["Mehdi", "🐯"],
  ["Jade", "🍕"], ["Enzo", "👽"], ["Lina", "🌸"], ["Rayan", "🦁"], ["Emma", "🐵"], ["Adam", "🎃"],
  ["Zoé", "🐝"], ["Louis", "🥑"], ["Nour", "🌙"], ["Tom", "🛸"], ["Aya", "🍓"], ["Sami", "🎧"],
];

// Accroches affichées en haut de la vidéo (ce que voit quelqu'un qui scrolle).
export const HOOKS = {
  spicy: [
    "Tes potes votent. Tu peux pas te défendre. 😬",
    "Le jeu qui a failli briser notre groupe 🔥",
    "Ne joue pas à ça si t'es fragile 💀",
    "Quand le groupe est enfin HONNÊTE… 🔥",
    "On a posé la question. Le groupe a tranché. 😬",
    "Le vote le plus violent de la soirée 💀",
  ],
  warm: [
    "Le jeu qui fait pleurer les potes (en bien) 🥹",
    "Enfin un jeu qui dit du bien de toi 💛",
    "6 potes, 1 vote, 1 seul cœur en or 💛",
    "Ce que tes amis pensent VRAIMENT de toi 🥹",
  ],
  fun: [
    "Le jeu de soirée qu'on n'a pas lâché 🎲",
    "Le meilleur jeu pour un apéro à 6 🎲",
    "Aucun débat possible : le groupe a voté 🎲",
    "Un vote. Zéro pitié. Beaucoup de rires 😂",
  ],
};

// ─── PRNG (mulberry32) ───────────────────────────────────────────────────────
export function hashString(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) || 1;
}

export function rng(seed) {
  let a = typeof seed === "number" ? seed >>> 0 : hashString(String(seed));
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      const a2 = [...arr];
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
  };
}

// ─── Données ─────────────────────────────────────────────────────────────────
export function allQuestions(filter = {}) {
  return QUESTIONS.filter((q) => CATEGORIES[q.cat])
    // espace insécable avant « ? » pour que le point d'interrogation ne passe pas seul à la ligne
    .map((q) => ({ text: q.text.replace(/ ([?!:;])/g, " $1"), cat: q.cat, ...CATEGORIES[q.cat] }))
    .filter((q) => (filter.tone ? q.tone === filter.tone : true))
    .filter((q) => (filter.maxLen ? q.text.length <= filter.maxLen : true));
}

export function pickPlayers(r, n) {
  return r.shuffle(NAMES).slice(0, n).map(([pseudo, avatar], i) => ({
    id: `p${i}-${pseudo.toLowerCase()}`,
    pseudo,
    avatar,
    isHost: i === 0,
  }));
}

export function punchlineFor(r, name, mood) {
  const pool = PUNCHLINES[mood];
  return r.pick(pool).replace(/\{name\}/g, name);
}

const MOOD_FOR_TONE = { warm: "loved", spicy: "roasted", fun: "mixed" };

// ─── Scénarios ───────────────────────────────────────────────────────────────

/**
 * Une manche complète : question → votes en direct → verdict → punchline.
 * Une répartition de votes "à suspense" : un gagnant net mais pas unanime.
 */
export function buildManche(seed, opts = {}) {
  const r = rng(`manche:${seed}`);
  const pool = allQuestions({ tone: opts.tone, maxLen: 70 });
  const question = opts.question ?? r.pick(pool);
  const players = pickPlayers(r, opts.playerCount ?? 6);
  const winner = r.pick(players);
  const runnerUp = r.pick(players.filter((p) => p.id !== winner.id));

  // Chaque joueur vote une fois, à un moment différent de la fenêtre de 10 s.
  const voteDurationMs = 10_000;
  const times = r
    .shuffle(players.map((_, i) => 1200 + (i * (voteDurationMs - 3200)) / players.length + r.int(0, 500)))
    .sort((a, b) => a - b);
  const votes = players.map((voter, i) => {
    const roll = r.next();
    let target;
    if (roll < 0.62 && voter.id !== winner.id) target = winner.id;
    else if (roll < 0.85) target = runnerUp.id;
    else target = r.pick(players.filter((p) => p.id !== voter.id)).id;
    return { voterId: voter.id, targetId: target, atMs: Math.round(times[i]) };
  });
  // Garantit un gagnant net.
  const tally = {};
  for (const v of votes) tally[v.targetId] = (tally[v.targetId] ?? 0) + 1;
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
    const flip = votes.find((v) => v.targetId === sorted[1][0] && v.voterId !== sorted[0][0]);
    if (flip) flip.targetId = sorted[0][0];
  }
  const finalTally = {};
  for (const v of votes) finalTally[v.targetId] = (finalTally[v.targetId] ?? 0) + 1;
  const winnerId = Object.entries(finalTally).sort((a, b) => b[1] - a[1])[0][0];
  const winnerPlayer = players.find((p) => p.id === winnerId);

  return {
    seed: String(seed),
    hook: r.pick(HOOKS[question.tone]),
    code: codeFrom(r),
    round: r.int(2, 6),
    totalRounds: 8,
    question,
    players,
    votes,
    voteDurationMs,
    winnerId,
    winnerCount: finalTally[winnerId],
    punchline: punchlineFor(r, winnerPlayer.pseudo, MOOD_FOR_TONE[question.tone]),
  };
}

/** Rafale : 5 questions qui s'enchaînent, le spectateur "vote" mentalement. */
export function buildRafale(seed, opts = {}) {
  const r = rng(`rafale:${seed}`);
  const tone = opts.tone ?? r.pick(["spicy", "spicy", "fun", "warm"]);
  const pool = r.shuffle(allQuestions({ tone, maxLen: 64 }));
  const questions = pool.slice(0, opts.count ?? 5);
  const hooks = {
    spicy: ["Tague le pote qui correspond 👇", "Réponds honnêtement en commentaire 😬"],
    warm: ["Tague la personne à qui tu penses 💛", "Envoie ça à ton pote en or 🥹"],
    fun: ["Tague le coupable 👇", "Réponds en commentaire 😂"],
  };
  return {
    seed: String(seed),
    tone,
    hook: r.pick(HOOKS[tone]),
    cta: r.pick(hooks[tone]),
    questions,
    players: pickPlayers(r, 4),
  };
}

/** Bulletin : le portrait d'un joueur par le groupe en fin de partie. */
export function buildBulletin(seed, opts = {}) {
  const r = rng(`bulletin:${seed}`);
  const players = pickPlayers(r, 6);
  const player = players[r.int(0, players.length - 1)];
  const mood = opts.mood ?? r.pick(["roasted", "roasted", "loved", "mixed"]);
  // 4 lignes maximum : au-delà la carte déborde de la zone sûre (interface TikTok/Reels).
  const wantSpicy = mood === "roasted" ? 3 : mood === "loved" ? 1 : 2;
  const wantWarm = mood === "loved" ? 3 : mood === "roasted" ? 1 : 2;
  const spicy = r.shuffle(allQuestions({ tone: "spicy", maxLen: 60 })).slice(0, wantSpicy);
  const warm = r.shuffle(allQuestions({ tone: "warm", maxLen: 60 })).slice(0, wantWarm);
  const entries = [...spicy, ...warm]
    .map((q) => ({ text: q.text, tone: q.tone, count: r.int(2, 5) }))
    .sort((a, b) => b.count - a.count);
  const total = entries.reduce((s, e) => s + e.count, 0);
  const headline = entries[0];
  return {
    seed: String(seed),
    hook: r.pick([
      "Fin de partie : le groupe fait ton portrait 📋",
      "Ce que le groupe pense VRAIMENT de toi 😬",
      "Ton bulletin de soirée, par tes potes 🔥",
    ]),
    player,
    players,
    mood,
    entries,
    total,
    headline,
    punchline: punchlineFor(r, player.pseudo, mood),
    rank: mood === "roasted" ? 0 : r.int(0, 2),
  };
}

export function buildScenario(template, seed, opts) {
  switch (template) {
    case "manche":
      return buildManche(seed, opts);
    case "rafale":
      return buildRafale(seed, opts);
    case "bulletin":
      return buildBulletin(seed, opts);
    default:
      throw new Error(`Template inconnu : ${template}`);
  }
}

function codeFrom(r) {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: 4 }, () => letters[r.int(0, letters.length - 1)]).join("");
}

// ─── Métadonnées de publication ──────────────────────────────────────────────
const HASHTAGS_BASE = ["#jeudesoirée", "#soirée", "#entrepotes", "#jeuentreamis", "#apéro", "#humour", "#quijeu"];

export function buildMetadata(template, scenario, appUrl) {
  const host = appUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  let headline;
  if (template === "manche") headline = `${scenario.question.text} ${TONE_EMOJI[scenario.question.tone]}`;
  else if (template === "rafale") headline = `${scenario.questions[0].text} ${TONE_EMOJI[scenario.tone]}`;
  else headline = `Le portrait de ${scenario.player.pseudo} par ses potes 📋`;

  const title = truncate(`${headline} | Qui ? le jeu de soirée`, 100);
  const body =
    `${scenario.hook}\n\n` +
    `Qui ? — le jeu où le groupe révèle le meilleur et le pire de chacun.\n` +
    `Gratuit · 3 à 12 joueurs · sur téléphone, rien à installer.\n` +
    `👉 ${appUrl}`;
  const tags = [...HASHTAGS_BASE];
  const tagsText = tags.join(" ");
  return {
    title,
    headline,
    description: `${body}\n\n${tagsText} #shorts`,
    instagramCaption: `${scenario.hook}\n\nQui ? — le jeu où le groupe révèle le meilleur et le pire de chacun. Gratuit, 3 à 12 joueurs, rien à installer. Lien en bio 👆\n\n${tagsText} #reels #jeu`,
    tiktokTitle: truncate(`${scenario.hook} ${host} ${tagsText} #pourtoi #fyp`, 2200),
    hashtags: tags,
    host,
  };
}

const TONE_EMOJI = { warm: "💛", spicy: "🔥", fun: "🎲" };

function truncate(s, n) {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}
