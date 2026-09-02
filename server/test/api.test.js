import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { ensureServer, stopServer, api, BASE } from "./helpers.js";

before(ensureServer);
after(stopServer);

test("healthz répond ok", async () => {
  const r = await api("/healthz");
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});

test("le SPA est servi sur la racine et les routes profondes", async () => {
  for (const p of ["/", "/r/ABCD", "/moi", "/admin"]) {
    const r = await api(p);
    assert.equal(r.status, 200, `${p} devrait renvoyer 200`);
    const html = await r.text();
    assert.match(html, /<div id="root">/, `${p} devrait servir index.html`);
  }
});

test("GET /api/categories renvoie la banque publique avec des compteurs", async () => {
  const r = await api("/api/categories");
  assert.equal(r.status, 200);
  const cats = await r.json();
  assert.ok(Array.isArray(cats) && cats.length >= 10, "au moins 10 catégories globales");
  for (const c of cats) {
    assert.ok(c.id && c.name && c.emoji, "catégorie complète");
    assert.ok(["warm", "spicy", "fun"].includes(c.tone), `tone valide (${c.tone})`);
    assert.equal(typeof c.count, "number");
    assert.equal(c.private, false, "aucune catégorie privée pour un visiteur anonyme");
  }
  const total = cats.reduce((s, c) => s + c.count, 0);
  assert.ok(total >= 300, `banque suffisante pour jouer (${total} questions)`);
});

test("l'API admin refuse sans clé et avec une mauvaise clé", async () => {
  for (const h of [{}, { "x-admin-key": "mauvais-mot-de-passe" }]) {
    const r = await api("/api/admin/data", { headers: h });
    assert.equal(r.status, 401);
  }
  const r = await api("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "mauvais" }),
  });
  // 429 est aussi un refus : le test anti-force brute plus bas peut avoir
  // épuisé le quota de cette IP sur un run précédent.
  assert.ok([401, 429].includes(r.status), `refus attendu, reçu ${r.status}`);
});

test("l'espace membre refuse sans session", async () => {
  for (const p of ["/api/me/data", "/api/me/questions"]) {
    const r = await api(p, { method: p.endsWith("data") ? "GET" : "POST" });
    assert.equal(r.status, 401, `${p} devrait exiger une session`);
  }
});

test("un JWT bidon est rejeté", async () => {
  const r = await api("/api/me/data", { headers: { Authorization: "Bearer pas.un.jwt" } });
  assert.equal(r.status, 401);
});

test("/api/auth/me renvoie user:null pour un anonyme", async () => {
  const r = await api("/api/auth/me");
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { user: null });
});

test("le lien magique refuse un e-mail invalide", async () => {
  const r = await api("/api/auth/magic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "pas-un-email" }),
  });
  assert.equal(r.status, 400);
});

test("en-têtes de sécurité de base présents", async () => {
  const r = await api("/");
  const missing = [];
  if (!r.headers.get("content-security-policy")) missing.push("Content-Security-Policy");
  if (!r.headers.get("x-content-type-options")) missing.push("X-Content-Type-Options");
  if (!r.headers.get("referrer-policy")) missing.push("Referrer-Policy");
  if (r.headers.get("x-powered-by")) missing.push("X-Powered-By exposé (à retirer)");
  assert.deepEqual(missing, [], `en-têtes manquants sur ${BASE}`);
});

test("les assets buildés sont servis avec un cache long", async () => {
  const html = await (await api("/")).text();
  const m = html.match(/\/assets\/[A-Za-z0-9._-]+\.js/);
  if (!m) return; // pas de build (dev) → rien à vérifier
  const r = await api(m[0]);
  assert.equal(r.status, 200);
  const cc = r.headers.get("cache-control") || "";
  assert.match(cc, /max-age=(?!0)\d+/, `les assets hashés devraient être cachés longtemps (reçu: "${cc}")`);
});
