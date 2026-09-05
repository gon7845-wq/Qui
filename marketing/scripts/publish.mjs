// Publie la vidéo rendue sur les plateformes configurées.
//
//   node scripts/publish.mjs                 → dernier plan, toutes les plateformes configurées
//   node scripts/publish.mjs <slug>          → un plan précis
//   PLATFORMS=youtube,tiktok node scripts/publish.mjs
//   DRY_RUN=1 node scripts/publish.mjs       → montre ce qui partirait, n'envoie rien
//
// Chaque plateforme est indépendante : un échec n'empêche pas les autres.
// Les jetons renouvelés (Instagram, TikTok) sont écrits dans out/rotated-secrets.env
// pour que le workflow mette à jour les secrets GitHub.

import fs from "node:fs";
import path from "node:path";
import { OUT, env, fail, jobDir, latestSlug, loadEnv, log, parseArgs, readJSON, warn, writeJSON } from "./lib/common.mjs";
import * as youtube from "./providers/youtube.mjs";
import * as instagram from "./providers/instagram.mjs";
import * as tiktok from "./providers/tiktok.mjs";
import * as uploadpost from "./providers/uploadpost.mjs";

loadEnv();
const args = parseArgs();
const PROVIDERS = { youtube, instagram, tiktok, uploadpost };

const slug = args._[0] ?? latestSlug();
if (!slug) fail("Aucun plan : lance `node scripts/plan.mjs` puis `node scripts/render.mjs`.");
const dir = jobDir(slug);
const meta = readJSON(path.join(dir, "meta.json"));
const videoPath = path.join(dir, meta.video);
if (!fs.existsSync(videoPath)) fail(`Vidéo absente : ${videoPath} — lance \`node scripts/render.mjs ${slug}\`.`);

const dryRun = env("DRY_RUN") === "1" || args["dry-run"] === true;
const wanted = (args.platforms ?? env("PLATFORMS"))
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Sans PLATFORMS : toutes celles configurées (en dry run : toutes, pour tester la chaîne sans identifiants).
const selected = Object.entries(PROVIDERS).filter(([id, p]) => (wanted.length ? wanted.includes(id) : dryRun || p.isConfigured()));
for (const id of wanted) if (!PROVIDERS[id]) warn(`Plateforme inconnue ignorée : ${id}`);
if (selected.length === 0) {
  const msg = "Aucune plateforme configurée : la vidéo est rendue mais rien n'est publié. Renseigne les secrets (voir marketing/README.md) ou PLATFORMS=…";
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## ${meta.title}\n\n⚠ ${msg}\n\nLa vidéo \`${slug}\` est disponible dans les artifacts de ce run.\n`);
  warn(msg);
  process.exit(0);
}

log(`Publication de ${slug} · ${(fs.statSync(videoPath).size / 1e6).toFixed(1)} Mo · ${selected.map(([id]) => id).join(", ")}${dryRun ? " · DRY RUN" : ""}`);
log(`Titre : ${meta.title}`);

const results = {};
const rotated = {};
let failures = 0;
for (const [id, provider] of selected) {
  const t0 = Date.now();
  try {
    if (!provider.isConfigured()) {
      if (!dryRun) throw new Error(`variables manquantes : ${provider.required.join(", ")}`);
      warn(`${id} : non configuré (${provider.required.join(", ")}) — simulé quand même.`);
    }
    const r = await provider.publish({ videoPath, meta, dryRun });
    results[id] = { ok: true, ...r, seconds: Math.round((Date.now() - t0) / 1000) };
    if (r?.rotated) Object.assign(rotated, r.rotated);
    log(`${id} ✓ ${r?.url ?? r?.id ?? ""} ${r?.note ? `(${r.note})` : ""}`);
  } catch (e) {
    failures++;
    results[id] = { ok: false, error: String(e?.message ?? e) };
    warn(`${id} ✗ ${results[id].error}`);
  }
}

writeJSON(path.join(dir, "result.json"), { slug, publishedAt: new Date().toISOString(), dryRun, results });

if (Object.keys(rotated).length && !dryRun) {
  const lines = Object.entries(rotated).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(path.join(OUT, "rotated-secrets.env"), lines.join("\n") + "\n");
  log(`Jetons renouvelés : ${Object.keys(rotated).join(", ")} → out/rotated-secrets.env`);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = Object.entries(results).map(([id, r]) => `| ${id} | ${r.ok ? "✅" : "❌"} | ${r.ok ? r.url ?? r.id ?? "" : r.error} |`);
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## ${meta.title}\n\n\`${slug}\`${dryRun ? " · dry run" : ""}\n\n| Plateforme | Statut | Lien / erreur |\n|---|---|---|\n${rows.join("\n")}\n`
  );
}

if (failures) fail(`${failures} publication(s) en échec.`);
