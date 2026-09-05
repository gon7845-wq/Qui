// Obtenir TT_REFRESH_TOKEN (une seule fois ; il est ensuite renouvelé à chaque publication).
//
// Prérequis (developers.tiktok.com) :
//   1. Une app, produits « Login Kit » + « Content Posting API », scopes
//      user.info.basic, video.upload, video.publish.
//   2. Une Redirect URI https enregistrée. Sans serveur dédié, utilise une page du jeu :
//      https://<ton-domaine>/oauth/tiktok — le jeu renvoie sa page d'accueil, l'URL contient
//      le `code`, tu la colles ici. (Le domaine doit être vérifié dans l'app TikTok : fichier
//      ou meta tag à déposer sur le site — voir la console.)
//   3. TT_CLIENT_KEY / TT_CLIENT_SECRET (+ TT_REDIRECT_URI si différente) dans marketing/.env.
//   4. Pour publier en PUBLIC, l'app doit passer l'audit TikTok (formulaire dans la console,
//      avec une démo). Avant ça : SELF_ONLY uniquement (vidéos visibles par toi seul).

import { appUrl, env, form, http, loadEnv } from "../lib/common.mjs";
import { askRedirectedUrl, openBrowser, printSecrets, randomState } from "./_flow.mjs";

loadEnv();
const key = env("TT_CLIENT_KEY");
const secret = env("TT_CLIENT_SECRET");
if (!key || !secret) {
  console.error("Renseigne TT_CLIENT_KEY et TT_CLIENT_SECRET dans marketing/.env d'abord.");
  process.exit(1);
}
const redirect = env("TT_REDIRECT_URI", `${appUrl()}/oauth/tiktok`);
const state = randomState();
const url =
  "https://www.tiktok.com/v2/auth/authorize/?" +
  form({ client_key: key, response_type: "code", scope: "user.info.basic,video.upload,video.publish", redirect_uri: redirect, state });

openBrowser(url);
console.log(`Après connexion, TikTok te renvoie sur ${redirect}?code=…`);
const { code } = await askRedirectedUrl(state);

const { body } = await http("https://open.tiktokapis.com/v2/oauth/token/", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: form({ client_key: key, client_secret: secret, code, grant_type: "authorization_code", redirect_uri: redirect }),
});
if (!body.refresh_token) {
  console.error("Pas de refresh_token reçu :", body);
  process.exit(1);
}
printSecrets("TikTok connecté", {
  TT_CLIENT_KEY: key,
  TT_CLIENT_SECRET: secret,
  TT_REFRESH_TOKEN: body.refresh_token,
  ...(redirect !== `${appUrl()}/oauth/tiktok` ? { TT_REDIRECT_URI: redirect } : {}),
});
console.log(`(open_id : ${body.open_id} · scopes : ${body.scope})`);
