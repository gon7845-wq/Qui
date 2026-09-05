// YouTube Shorts — YouTube Data API v3, envoi « resumable » en une passe.
// Une vidéo verticale de moins de 3 minutes est classée Short automatiquement.
// Coût quota : 1600 unités / envoi (quota par défaut 10 000 / jour).

import fs from "node:fs";
import { env, form, http } from "../lib/common.mjs";

export const id = "youtube";
export const required = ["YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"];
export const isConfigured = () => required.every((k) => env(k));

export async function accessToken() {
  const { body } = await http("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form({
      client_id: env("YT_CLIENT_ID"),
      client_secret: env("YT_CLIENT_SECRET"),
      refresh_token: env("YT_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
  });
  return body.access_token;
}

export async function publish({ videoPath, meta, dryRun }) {
  const privacy = env("YT_PRIVACY", "public");
  const snippet = {
    title: meta.title.replace(/[<>]/g, "").slice(0, 100),
    description: meta.description.slice(0, 5000),
    tags: meta.hashtags.map((h) => h.replace(/^#/, "")).slice(0, 30),
    categoryId: "24", // Divertissement
    defaultLanguage: "fr",
    defaultAudioLanguage: "fr",
  };
  if (dryRun) return { note: `dry run · ${privacy} · ${snippet.title}` };

  const token = await accessToken();
  const size = fs.statSync(videoPath).size;
  const { res: init } = await http(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(size),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify({ snippet, status: { privacyStatus: privacy, selfDeclaredMadeForKids: false } }),
    }
  );
  const location = init.headers.get("location");
  if (!location) throw new Error("YouTube n'a pas renvoyé d'URL d'envoi (Location).");

  const { body } = await http(location, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(size) },
    body: fs.readFileSync(videoPath),
  });
  return { id: body.id, url: `https://youtube.com/shorts/${body.id}`, note: privacy };
}
