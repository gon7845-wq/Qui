// Aide commune aux flux OAuth « une fois pour toutes » (exécutés sur ton poste).
// Deux modes : callback local (http://localhost:PORT/callback) ou « colle l'URL »
// quand la plateforme exige une redirection https (TikTok, Instagram).

import http from "node:http";
import readline from "node:readline";
import { spawn } from "node:child_process";
import crypto from "node:crypto";

export const randomState = () => crypto.randomBytes(12).toString("hex");

export function openBrowser(url) {
  console.log("\nOuvre cette adresse dans ton navigateur :\n\n  " + url + "\n");
  try {
    if (process.platform === "win32") spawn("cmd", ["/c", "start", "", url.replace(/&/g, "^&")], { stdio: "ignore", detached: true }).unref();
    else if (process.platform === "darwin") spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    else spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
  } catch {
    /* l'URL est affichée, ça suffit */
  }
}

/** Attend la redirection sur http://localhost:port/callback et renvoie les paramètres de requête. */
export function waitForCallback(port, expectedState) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const params = Object.fromEntries(url.searchParams);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1 style='font-family:sans-serif'>Connexion réussie ✅</h1><p>Tu peux fermer cet onglet et revenir au terminal.</p>");
      server.close();
      if (expectedState && params.state !== expectedState) reject(new Error("state OAuth inattendu"));
      else if (params.error) reject(new Error(`OAuth : ${params.error} ${params.error_description ?? ""}`));
      else resolve(params);
    });
    server.listen(port, "127.0.0.1");
    setTimeout(() => {
      server.close();
      reject(new Error("Délai dépassé (5 min)."));
    }, 5 * 60_000).unref();
  });
}

/** Demande à l'utilisateur de coller l'URL complète sur laquelle il a été redirigé. */
export async function askRedirectedUrl(expectedState) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((r) => rl.question("Colle ici l'URL complète de la page sur laquelle tu as été redirigé·e :\n> ", r));
  rl.close();
  const url = new URL(answer.trim());
  const params = Object.fromEntries(url.searchParams);
  if (expectedState && params.state && params.state !== expectedState) throw new Error("state OAuth inattendu");
  if (params.error) throw new Error(`OAuth : ${params.error} ${params.error_description ?? ""}`);
  if (!params.code) throw new Error("Aucun paramètre `code` dans l'URL collée.");
  return params;
}

export function printSecrets(title, secrets) {
  console.log(`\n✅ ${title}\n`);
  console.log("À mettre dans marketing/.env (local) ET dans les Secrets GitHub du dépôt :\n");
  for (const [k, v] of Object.entries(secrets)) console.log(`${k}=${v}`);
  console.log("");
}
