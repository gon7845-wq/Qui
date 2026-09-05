// Rend la vidéo planifiée (out/<slug>/props.json) en MP4 H.264 1080×1920.
//
//   node scripts/render.mjs            → dernier plan (out/latest.txt)
//   node scripts/render.mjs <slug>     → un plan précis
//   node scripts/render.mjs --still    → en plus, une image de couverture (cover.jpg)

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, fail, jobDir, latestSlug, log, parseArgs, readJSON } from "./lib/common.mjs";

const args = parseArgs();
const slug = args._[0] ?? latestSlug();
if (!slug) fail("Aucun plan : lance d'abord `node scripts/plan.mjs`.");

const dir = jobDir(slug);
const meta = readJSON(path.join(dir, "meta.json"));
const props = path.join(dir, "props.json");
const video = path.join(dir, meta.video);

function remotion(cmdArgs) {
  // Sous Windows, npx est un .cmd : il faut passer par le shell, avec une commande déjà assemblée.
  const quote = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
  const r =
    process.platform === "win32"
      ? spawnSync(["npx", "remotion", ...cmdArgs].map(quote).join(" "), { cwd: ROOT, stdio: "inherit", shell: true })
      : spawnSync("npx", ["remotion", ...cmdArgs], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) fail(`remotion ${cmdArgs[0]} a échoué (code ${r.status})`);
}

log(`Rendu ${slug} (${meta.template}) → ${path.relative(ROOT, video)}`);
const t0 = Date.now();
remotion(["render", "src/index.ts", meta.template, video, `--props=${props}`, "--log=warn"]);
if (!fs.existsSync(video)) fail("Le fichier vidéo n'a pas été produit.");
const mb = (fs.statSync(video).size / 1e6).toFixed(1);
log(`OK en ${Math.round((Date.now() - t0) / 1000)} s · ${mb} Mo`);

if (args.still) {
  const cover = path.join(dir, "cover.jpg");
  // Image du verdict / de la 2e question / du bulletin complet : le moment le plus parlant.
  const frame = { manche: 300, rafale: 130, bulletin: 260 }[meta.template] ?? 60;
  remotion(["still", "src/index.ts", meta.template, cover, `--props=${props}`, `--frame=${frame}`, "--log=warn"]);
  log(`Couverture → ${path.relative(ROOT, cover)}`);
}
