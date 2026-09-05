// Upload-Post (upload-post.com) — un seul jeton pour TikTok, Instagram et YouTube.
// Raccourci pour démarrer sans créer trois apps développeur : tu connectes tes comptes
// sur leur site, ils gèrent l'OAuth et l'audit TikTok. Gratuit jusqu'à 10 envois / mois.
// Vérifie le format exact des champs sur https://docs.upload-post.com si l'API évolue.

import fs from "node:fs";
import path from "node:path";
import { env, http } from "../lib/common.mjs";

export const id = "uploadpost";
export const required = ["UPLOAD_POST_API_KEY", "UPLOAD_POST_USER"];
export const isConfigured = () => required.every((k) => env(k));

export async function publish({ videoPath, meta, dryRun }) {
  const platforms = env("UPLOAD_POST_PLATFORMS", "tiktok,instagram,youtube").split(",").map((s) => s.trim()).filter(Boolean);
  if (dryRun) return { note: `dry run · ${platforms.join("+")}` };

  const fd = new FormData();
  fd.append("user", env("UPLOAD_POST_USER"));
  fd.append("title", meta.tiktokTitle.slice(0, 2200));
  fd.append("description", meta.description);
  for (const p of platforms) fd.append("platform[]", p);
  fd.append("video", new Blob([fs.readFileSync(videoPath)], { type: "video/mp4" }), path.basename(videoPath));

  const { body } = await http("https://api.upload-post.com/api/upload", {
    method: "POST",
    headers: { Authorization: `Apikey ${env("UPLOAD_POST_API_KEY")}` },
    body: fd,
  });
  return { id: body?.request_id ?? body?.id, note: platforms.join("+"), raw: body };
}
