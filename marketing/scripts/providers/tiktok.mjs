// TikTok — Content Posting API (Direct Post, envoi du fichier en un seul morceau).
// Le jeton d'accès vit 24 h : on le régénère à chaque publication depuis le refresh token,
// qui est lui-même renouvelé (→ rotated.TT_REFRESH_TOKEN).
// Tant que l'app n'a pas passé l'audit TikTok, seule la confidentialité SELF_ONLY est permise.

import fs from "node:fs";
import { env, form, http, sleep, warn } from "../lib/common.mjs";

export const id = "tiktok";
export const required = ["TT_CLIENT_KEY", "TT_CLIENT_SECRET", "TT_REFRESH_TOKEN"];
export const isConfigured = () => required.every((k) => env(k));

const API = "https://open.tiktokapis.com/v2";
const json = (token) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" });

export async function refreshTokens(refreshToken) {
  const { body } = await http(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form({
      client_key: env("TT_CLIENT_KEY"),
      client_secret: env("TT_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!body.access_token) throw new Error(`TikTok oauth : ${JSON.stringify(body).slice(0, 300)}`);
  return body; // { access_token, refresh_token, expires_in, open_id, scope }
}

export async function publish({ videoPath, meta, dryRun }) {
  const wanted = env("TT_PRIVACY", "PUBLIC_TO_EVERYONE");
  const title = meta.tiktokTitle.slice(0, 2200);
  if (dryRun) return { note: `dry run · ${wanted} · ${title.slice(0, 60)}…` };

  const tokens = await refreshTokens(env("TT_REFRESH_TOKEN"));
  const token = tokens.access_token;
  const rotated = tokens.refresh_token && tokens.refresh_token !== env("TT_REFRESH_TOKEN") ? { TT_REFRESH_TOKEN: tokens.refresh_token } : undefined;

  // Ce que le créateur a le droit de publier (confidentialités, options désactivées…)
  const { body: ci } = await http(`${API}/post/publish/creator_info/query/`, { method: "POST", headers: json(token), body: "{}" });
  if (ci.error?.code && ci.error.code !== "ok") throw new Error(`creator_info : ${ci.error.code} ${ci.error.message ?? ""}`);
  const options = ci.data?.privacy_level_options ?? [];
  let privacy = wanted;
  if (options.length && !options.includes(wanted)) {
    privacy = options.includes("SELF_ONLY") ? "SELF_ONLY" : options[0];
    warn(`TikTok : ${wanted} non autorisé pour ce compte/app (${options.join(", ")}) → ${privacy}. Une app non auditée ne peut publier qu'en privé.`);
  }

  const size = fs.statSync(videoPath).size;
  const { body: init } = await http(`${API}/post/publish/video/init/`, {
    method: "POST",
    headers: json(token),
    body: JSON.stringify({
      post_info: {
        title,
        privacy_level: privacy,
        disable_duet: !!ci.data?.duet_disabled,
        disable_comment: !!ci.data?.comment_disabled,
        disable_stitch: !!ci.data?.stitch_disabled,
        video_cover_timestamp_ms: 9000,
      },
      source_info: { source: "FILE_UPLOAD", video_size: size, chunk_size: size, total_chunk_count: 1 },
    }),
  });
  if (init.error?.code && init.error.code !== "ok") throw new Error(`video/init : ${init.error.code} ${init.error.message ?? ""}`);
  const { publish_id, upload_url } = init.data;

  await http(upload_url, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(size), "Content-Range": `bytes 0-${size - 1}/${size}` },
    body: fs.readFileSync(videoPath),
  });

  // Traitement côté TikTok (généralement < 1 min).
  const deadline = Date.now() + 5 * 60_000;
  let status = "PROCESSING_UPLOAD";
  let postIds = [];
  while (Date.now() < deadline) {
    await sleep(5000);
    const { body: st } = await http(`${API}/post/publish/status/fetch/`, { method: "POST", headers: json(token), body: JSON.stringify({ publish_id }) });
    status = st.data?.status ?? status;
    postIds = st.data?.publicaly_available_post_id ?? postIds;
    if (status === "PUBLISH_COMPLETE") break;
    if (status === "FAILED") throw new Error(`TikTok : publication échouée (${st.data?.fail_reason ?? "raison inconnue"})`);
  }
  if (status !== "PUBLISH_COMPLETE") warn(`TikTok : statut final ${status} (la vidéo apparaîtra probablement d'ici quelques minutes).`);

  const postId = postIds[0];
  return {
    id: publish_id,
    url: postId ? `https://www.tiktok.com/@/video/${postId}` : undefined,
    note: privacy,
    rotated,
  };
}
