// Instagram Reels — Content Publishing API.
// Instagram ne prend pas de fichier : il télécharge la vidéo depuis une URL publique
// (MEDIA_URL, posée par le workflow via une release GitHub). Conteneur → traitement → publication.
// Fonctionne avec « Instagram API with Instagram Login » (graph.instagram.com, par défaut)
// ou « with Facebook Login » (graph.facebook.com + IG_USER_ID obligatoire).

import { env, form, http, sleep, warn } from "../lib/common.mjs";

export const id = "instagram";
export const required = ["IG_ACCESS_TOKEN", "MEDIA_URL"];
export const isConfigured = () => !!env("IG_ACCESS_TOKEN"); // MEDIA_URL est vérifiée à l'envoi

const base = () => `https://${env("IG_GRAPH_HOST", "graph.instagram.com")}/${env("IG_API_VERSION", "v23.0")}`;

export async function publish({ meta, dryRun }) {
  const videoUrl = env("MEDIA_URL");
  const user = env("IG_USER_ID", "me");
  const caption = meta.instagramCaption.slice(0, 2200);
  if (dryRun) return { note: `dry run · ${videoUrl || "MEDIA_URL manquante"}` };
  if (!videoUrl) throw new Error("MEDIA_URL manquante : Instagram a besoin d'une URL publique vers le MP4.");

  let token = env("IG_ACCESS_TOKEN");
  const rotated = {};
  try {
    const fresh = await refreshToken(token);
    if (fresh && fresh !== token) {
      rotated.IG_ACCESS_TOKEN = fresh;
      token = fresh;
    }
  } catch (e) {
    warn(`Instagram : renouvellement du jeton impossible (${e.message}). On continue avec le jeton actuel.`);
  }

  const { body: container } = await http(`${base()}/${user}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form({ media_type: "REELS", video_url: videoUrl, caption, share_to_feed: "true", access_token: token }),
  });

  // Instagram télécharge et transcode : on attend FINISHED (jusqu'à ~5 min).
  const deadline = Date.now() + 5 * 60_000;
  for (;;) {
    await sleep(5000);
    const { body: st } = await http(`${base()}/${container.id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`);
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR" || st.status_code === "EXPIRED") throw new Error(`Conteneur Instagram ${st.status_code} : ${st.status ?? ""}`);
    if (Date.now() > deadline) throw new Error("Instagram : traitement trop long (5 min).");
  }

  const { body: pub } = await http(`${base()}/${user}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form({ creation_id: container.id, access_token: token }),
  });

  let url;
  try {
    const { body: info } = await http(`${base()}/${pub.id}?fields=permalink&access_token=${encodeURIComponent(token)}`);
    url = info.permalink;
  } catch {
    /* le permalien n'est pas indispensable */
  }
  return { id: pub.id, url, rotated: Object.keys(rotated).length ? rotated : undefined };
}

/** Prolonge le jeton longue durée (60 jours glissants). Renvoie le nouveau jeton, ou null. */
export async function refreshToken(token) {
  if (env("IG_ROTATE", "1") === "0") return null;
  const host = env("IG_GRAPH_HOST", "graph.instagram.com");
  if (host === "graph.instagram.com") {
    const { body } = await http(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
    return body.access_token ?? null;
  }
  if (env("IG_APP_ID") && env("IG_APP_SECRET")) {
    const { body } = await http(
      `https://graph.facebook.com/${env("IG_API_VERSION", "v23.0")}/oauth/access_token?` +
        form({ grant_type: "fb_exchange_token", client_id: env("IG_APP_ID"), client_secret: env("IG_APP_SECRET"), fb_exchange_token: token })
    );
    return body.access_token ?? null;
  }
  return null;
}
