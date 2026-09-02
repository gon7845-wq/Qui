// Lanceur de tests.
//
//   npm test                          → démarre un serveur local (DATABASE_URL requis) et teste
//   TEST_BASE_URL=https://… npm test  → teste une instance déjà déployée (prod)
//
// Les tests qui écrivent en base ou saturent le serveur sont automatiquement
// ignorés quand la cible n'est pas locale (voir helpers.js → LOCAL).
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PORT = process.env.TEST_PORT || "3999";
let base = process.env.TEST_BASE_URL;
let server = null;

async function waitHealth(url, tries = 60) {
  let last = "";
  for (let i = 0; i < tries; i++) {
    try {
      if ((await fetch(`${url}/healthz`)).ok) return true;
    } catch (e) {
      last = e.message;
    }
    if (server && server.exitCode !== null) throw new Error("le serveur de test s'est arrêté au démarrage");
    await sleep(500);
  }
  throw new Error(`serveur injoignable sur ${url} (${last})`);
}

if (!base) {
  if (!process.env.DATABASE_URL) {
    console.error(
      "\n  DATABASE_URL manquant.\n" +
        "  → Postgres local :  DATABASE_URL='postgresql://…/qui_test?sslmode=disable' npm test\n" +
        "  → ou viser la prod : TEST_BASE_URL='https://…' npm test\n"
    );
    process.exit(1);
  }
  base = `http://localhost:${PORT}`;
  console.log(`[test] démarrage du serveur sur ${base}…`);
  // Ces valeurs sont partagées entre le serveur ET les tests : ceux-ci ont
  // besoin de signer un JWT de session et une signature de webhook Stripe.
  // Les durées de pub et le quota sont raccourcis pour garder la suite rapide.
  Object.assign(process.env, {
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "test-admin",
    SESSION_SECRET: process.env.SESSION_SECRET || "secret-de-test-non-trivial",
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "whsec_test",
    ALLOW_DEV_LOGIN: "true",
    AD_EVERY_ROUNDS: process.env.AD_EVERY_ROUNDS || "2",
    AD_SECONDS: process.env.AD_SECONDS || "3",
    AD_SKIP_AFTER: process.env.AD_SKIP_AFTER || "1",
    FREE_PRIVATE_QUESTIONS: process.env.FREE_PRIVATE_QUESTIONS || "3",
  });
  server = spawn(process.execPath, [path.resolve(__dirname, "../index.js")], {
    env: { ...process.env, PORT },
    stdio: ["ignore", process.env.TEST_VERBOSE ? "inherit" : "ignore", "inherit"],
  });
  await waitHealth(base);
  console.log("[test] serveur prêt.");
} else {
  base = base.replace(/\/$/, "");
  console.log(`[test] cible externe : ${base}`);
  await waitHealth(base);
}

const files = fs
  .readdirSync(__dirname)
  .filter((f) => f.endsWith(".test.js"))
  .sort()
  .map((f) => path.join(__dirname, f));

const runner = spawn(
  process.execPath,
  ["--test", "--test-concurrency=1", "--test-force-exit", "--test-reporter=spec", ...files],
  { env: { ...process.env, TEST_BASE_URL: base }, stdio: "inherit" }
);

runner.on("exit", (code) => {
  if (server) server.kill();
  process.exit(code ?? 1);
});
