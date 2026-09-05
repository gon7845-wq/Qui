// Obtenir IG_ACCESS_TOKEN longue durée (60 jours, prolongé automatiquement à chaque publication).
//
// Prérequis (developers.facebook.com) :
//   1. Compte Instagram passé en « Professionnel » (Créateur ou Entreprise) dans l'app Instagram.
//   2. Une app Meta, cas d'usage « Instagram » → « API setup with Instagram business login ».
//      Récupère l'ID d'app Instagram et le secret (section Instagram > API setup).
//   3. Redirect URI https enregistrée (« OAuth redirect URIs »). Sans serveur dédié :
//      https://<ton-domaine>/oauth/instagram (page du jeu, l'URL contient le `code`, tu la colles ici).
//   4. IG_APP_ID / IG_APP_SECRET (+ IG_REDIRECT_URI si différente) dans marketing/.env.
//   Tant que l'app est en mode Développement, ajoute ton compte Instagram comme testeur
//   (Rôles de l'app → Testeurs Instagram, puis accepte l'invitation dans Instagram).

import { appUrl, env, form, http, loadEnv } from "../lib/common.mjs";
import { askRedirectedUrl, openBrowser, printSecrets, randomState } from "./_flow.mjs";

loadEnv();
const appId = env("IG_APP_ID");
const appSecret = env("IG_APP_SECRET");
if (!appId || !appSecret) {
  console.error("Renseigne IG_APP_ID et IG_APP_SECRET dans marketing/.env d'abord.");
  process.exit(1);
}
const redirect = env("IG_REDIRECT_URI", `${appUrl()}/oauth/instagram`);
const version = env("IG_API_VERSION", "v23.0");
const state = randomState();
const url =
  "https://www.instagram.com/oauth/authorize?" +
  form({
    enable_fb_login: "0",
    force_authentication: "1",
    client_id: appId,
    redirect_uri: redirect,
    response_type: "code",
    scope: "instagram_business_basic,instagram_business_content_publish",
    state,
  });

openBrowser(url);
console.log(`Après connexion, Instagram te renvoie sur ${redirect}?code=…`);
const { code } = await askRedirectedUrl(state);

// 1) code → jeton court (1 h)
const { body: shortLived } = await http("https://api.instagram.com/oauth/access_token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: form({ client_id: appId, client_secret: appSecret, grant_type: "authorization_code", redirect_uri: redirect, code: code.replace(/#_$/, "") }),
});
if (!shortLived.access_token) {
  console.error("Échange du code refusé :", shortLived);
  process.exit(1);
}
// 2) jeton court → jeton long (60 jours)
const { body: longLived } = await http(
  `https://graph.instagram.com/access_token?` + form({ grant_type: "ig_exchange_token", client_secret: appSecret, access_token: shortLived.access_token })
);
// 3) identité
const { body: me } = await http(`https://graph.instagram.com/${version}/me?fields=user_id,username,account_type&access_token=${encodeURIComponent(longLived.access_token)}`);

printSecrets(`Instagram connecté (@${me.username}, ${me.account_type})`, {
  IG_APP_ID: appId,
  IG_APP_SECRET: appSecret,
  IG_ACCESS_TOKEN: longLived.access_token,
  IG_USER_ID: me.user_id ?? "me",
});
console.log(`Expire dans ${Math.round((longLived.expires_in ?? 0) / 86400)} jours — prolongé automatiquement à chaque publication.`);
if (me.account_type && me.account_type !== "BUSINESS" && me.account_type !== "MEDIA_CREATOR") {
  console.warn("⚠ Le compte n'est pas professionnel : la publication de Reels par API sera refusée.");
}
