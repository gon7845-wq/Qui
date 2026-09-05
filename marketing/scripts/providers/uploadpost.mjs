// Upload-Post (upload-post.com) — une seule clé API pour TikTok, Instagram et YouTube.
// Tu connectes tes comptes sur leur site (ils portent l'OAuth Google/Meta/TikTok et
// l'audit TikTok), le script envoie la vidéo en une requête multipart.
// Spécification : https://docs.upload-post.com/api/upload-video/
//   Gratuit : 10 envois / mois, sans TikTok.  Basic : 24 $/mois (16 $ à l'année), illimité.

import fs from "node:fs";
import path from "node:path";
import { env, http } from "../lib/common.mjs";

export const id = "uploadpost";
export const required = ["UPLOAD_POST_API_KEY", "UPLOAD_POST_USER"];
export const isConfigured = () => required.every((k) => env(k));

export async function publish({ videoPath, meta, dryRun }) {
  const platforms = env("UPLOAD_POST_PLATFORMS", "tiktok,instagram,youtube").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (dryRun) return { note: `dry run · ${platforms.join("+")} · ${meta.title}` };

  const fd = new FormData();
  fd.append("user", env("UPLOAD_POST_USER"));
  for (const p of platforms) fd.append("platform[]", p);
  fd.append("video", new Blob([fs.readFileSync(videoPath)], { type: "video/mp4" }), path.basename(videoPath));
  fd.append("title", meta.title.slice(0, 100));
  fd.append("description", meta.description);

  // YouTube Shorts
  fd.append("youtube_title", meta.title.replace(/[<>]/g, "").slice(0, 100));
  fd.append("youtube_description", meta.description.slice(0, 5000));
  for (const t of meta.hashtags.map((h) => h.replace(/^#/, "")).slice(0, 30)) fd.append("tags[]", t);
  fd.append("privacyStatus", env("YT_PRIVACY", "public"));
  fd.append("categoryId", "24");
  fd.append("selfDeclaredMadeForKids", "false");
  fd.append("defaultLanguage", "fr");
  fd.append("defaultAudioLanguage", "fr");

  // Instagram Reels
  fd.append("instagram_title", meta.instagramCaption.slice(0, 2200));
  fd.append("media_type", "REELS");
  fd.append("share_to_feed", "true");

  // TikTok
  fd.append("tiktok_title", meta.tiktokTitle.slice(0, 2200));
  fd.append("privacy_level", env("TT_PRIVACY", "PUBLIC_TO_EVERYONE"));
  fd.append("cover_timestamp", "9000");

  // Synchrone : la réponse contient l'URL de chaque publication.
  fd.append("async_upload", "false");

  const { body } = await http("https://api.upload-post.com/api/upload", {
    method: "POST",
    headers: { Authorization: `Apikey ${env("UPLOAD_POST_API_KEY")}` },
    body: fd,
  });

  // Réponse différée (traitement en arrière-plan)
  if (body?.request_id && !body?.results) return { id: body.request_id, note: `${platforms.join("+")} · en cours côté Upload-Post`, raw: body };

  const results = body?.results ?? {};
  const failed = Object.entries(results).filter(([, r]) => !r?.success);
  const urls = Object.entries(results)
    .filter(([, r]) => r?.success && r?.url)
    .map(([p, r]) => `${p}: ${r.url}`);
  if (failed.length) {
    const detail = failed.map(([p, r]) => `${p}: ${r?.error ?? r?.message ?? "échec"}`).join(" · ");
    if (failed.length === Object.keys(results).length) throw new Error(detail);
    return { url: urls.join(" "), note: `partiel — ${detail}`, usage: body.usage, raw: body };
  }
  return {
    url: urls.join(" "),
    note: body?.usage ? `${body.usage.count}/${body.usage.limit} envois ce mois` : undefined,
    raw: body,
  };
}
