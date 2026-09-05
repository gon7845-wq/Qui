// Décide la vidéo du jour : template, graine, scénario, métadonnées de publication.
// Déterministe : la même date produit toujours la même vidéo (pas d'état à stocker).
//
//   node scripts/plan.mjs                      → vidéo du jour
//   node scripts/plan.mjs --template rafale    → force un format
//   node scripts/plan.mjs --seed test-42       → force une graine (variantes, tests)
//   node scripts/plan.mjs --date 2026-09-10    → simule un autre jour
//   node scripts/plan.mjs --tone spicy         → force la tonalité (manche / rafale)

import fs from "node:fs";
import path from "node:path";
import { buildMetadata, buildScenario, TEMPLATES, hashString, rng } from "../src/lib/scenario.js";
import { OUT, ROOT, appUrl, jobDir, loadEnv, log, parseArgs, todayParis, writeJSON } from "./lib/common.mjs";

loadEnv();
const args = parseArgs();

const date = args.date ?? todayParis();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`--date attend AAAA-MM-JJ, reçu ${date}`);

// Rotation hebdomadaire : la « manche » est le format le plus fort, elle revient le plus souvent.
const ROTATION = ["manche", "manche", "rafale", "manche", "bulletin", "manche", "rafale"];
const dayIndex = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
const template = args.template && args.template !== "auto" ? args.template : ROTATION[dayIndex % ROTATION.length];
if (!TEMPLATES.includes(template)) throw new Error(`--template doit être l'un de : ${TEMPLATES.join(", ")}`);

const seed = args.seed ? String(args.seed) : date;
const opts = {};
if (args.tone) opts.tone = args.tone;
if (args.mood) opts.mood = args.mood;

const scenario = buildScenario(template, seed, opts);
const url = appUrl();
const meta = buildMetadata(template, scenario, url);

// Musique : première piste libre de droits trouvée dans public/music, choisie par la graine.
const musicDir = path.join(ROOT, "public", "music");
const tracks = fs.existsSync(musicDir) ? fs.readdirSync(musicDir).filter((f) => /\.(mp3|m4a|wav|ogg)$/i.test(f)).sort() : [];
const music = tracks.length ? rng(`music:${seed}`).pick(tracks) : null;

const slug = args.seed ? `${date}-${template}-${hashString(seed).toString(36).slice(0, 6)}` : `${date}-${template}`;
const dir = jobDir(slug);
fs.mkdirSync(dir, { recursive: true });

writeJSON(path.join(dir, "props.json"), { scenario, host: meta.host, music });
writeJSON(path.join(dir, "meta.json"), {
  slug,
  date,
  template,
  seed,
  appUrl: url,
  music,
  video: "video.mp4",
  ...meta,
});
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "latest.txt"), slug + "\n");

// Sortie GitHub Actions (si présent)
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `slug=${slug}\ntemplate=${template}\ntitle=${meta.title}\n`);
}

log(`Plan : ${slug}`);
log(`Template : ${template} · graine : ${seed}${music ? ` · musique : ${music}` : " · sans musique"}`);
log(`Titre : ${meta.title}`);
if (template === "manche") log(`Question : ${scenario.question.text} → ${scenario.players.find((p) => p.id === scenario.winnerId).pseudo} (${scenario.winnerCount} voix)`);
if (template === "rafale") log(`Questions : ${scenario.questions.map((q) => q.text).join(" | ")}`);
if (template === "bulletin") log(`Joueur : ${scenario.player.pseudo} (${scenario.mood})`);
console.log(slug);
