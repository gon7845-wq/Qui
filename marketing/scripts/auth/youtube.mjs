// Obtenir YT_REFRESH_TOKEN (une seule fois).
//
// Prérequis (console.cloud.google.com) :
//   1. Un projet, API « YouTube Data API v3 » activée.
//   2. Écran de consentement OAuth : type Externe, statut « En production »
//      (sinon le refresh token expire au bout de 7 jours). Pas besoin de validation Google
//      pour un usage personnel : l'écran « application non validée » s'affiche, continue.
//   3. Identifiants → ID client OAuth → type « Application de bureau ».
//   4. YT_CLIENT_ID / YT_CLIENT_SECRET dans marketing/.env, puis `npm run auth:youtube`.

import { env, form, http, loadEnv } from "../lib/common.mjs";
import { openBrowser, printSecrets, randomState, waitForCallback } from "./_flow.mjs";

loadEnv();
const clientId = env("YT_CLIENT_ID");
const clientSecret = env("YT_CLIENT_SECRET");
if (!clientId || !clientSecret) {
  console.error("Renseigne YT_CLIENT_ID et YT_CLIENT_SECRET dans marketing/.env d'abord.");
  process.exit(1);
}

const port = 53682;
const redirect = `http://localhost:${port}/callback`;
const state = randomState();
const url =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  form({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube.upload",
    access_type: "offline",
    prompt: "consent",
    state,
  });

openBrowser(url);
console.log("Connecte-toi avec le compte Google propriétaire de la chaîne YouTube…");
const { code } = await waitForCallback(port, state);

const { body } = await http("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: form({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirect, grant_type: "authorization_code" }),
});
if (!body.refresh_token) {
  console.error("Pas de refresh_token reçu :", body);
  process.exit(1);
}
printSecrets("YouTube connecté", { YT_CLIENT_ID: clientId, YT_CLIENT_SECRET: clientSecret, YT_REFRESH_TOKEN: body.refresh_token });
