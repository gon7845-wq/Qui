import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { createHmac, randomUUID } from "crypto";
import { ensureServer, stopServer, api, client, makeLobby, sleep, LOCAL } from "./helpers.js";

before(ensureServer);
after(stopServer);

const ADMIN = process.env.ADMIN_PASSWORD || "test-admin";
const SECRET = process.env.SESSION_SECRET || "secret-de-test-non-trivial";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_test";

const adminHeaders = { "Content-Type": "application/json", "x-admin-key": ADMIN };

// Crée un compte via le dev-login (local seulement) et renvoie son id + un
// jeton de session utilisable par la socket comme par l'API.
async function makeUser(email = `t-${randomUUID()}@exemple.test`) {
  const r = await api(`/api/auth/dev?email=${encodeURIComponent(email)}&name=Test`, { redirect: "manual" });
  assert.ok(r.status === 302 || r.status === 200, `dev-login indisponible (HTTP ${r.status})`);
  const cookie = (r.headers.get("set-cookie") || "").split(";")[0];
  const me = await (await api("/api/auth/me", { headers: { cookie } })).json();
  assert.ok(me.user?.id, "le compte devrait être créé");
  return { id: me.user.id, email, token: jwt.sign({ uid: me.user.id, email }, SECRET, { expiresIn: "1h" }) };
}

const authed = (token) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

async function grantVip(email, body = {}) {
  const r = await api("/api/admin/vip", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, ...body }),
  });
  return { status: r.status, body: await r.json() };
}

// ─── Configuration publique ───

test("/api/config expose la politique pub et les offres, sans rien de secret", async () => {
  const r = await api("/api/config");
  assert.equal(r.status, 200);
  const cfg = await r.json();

  assert.ok(cfg.ads.policy.everyRounds >= 1, "cadence des entractes");
  assert.ok(cfg.ads.policy.seconds >= 3, "durée d'un entracte");
  assert.ok(Array.isArray(cfg.ads.house) && cfg.ads.house.length > 0, "des pubs maison en secours");
  assert.ok(Array.isArray(cfg.billing.plans) && cfg.billing.plans.length >= 2, "au moins deux offres");
  for (const p of cfg.billing.plans) {
    assert.ok(p.price > 0 && p.label && p.period, "offre complète");
    assert.equal(typeof p.buyable, "boolean");
  }

  const raw = JSON.stringify(cfg);
  for (const leak of ["sk_", "whsec_", "STRIPE", "SESSION_SECRET", ADMIN]) {
    assert.ok(!raw.includes(leak), `la config publique ne doit pas contenir « ${leak} »`);
  }
});

// ─── Publicité en partie ───

test("hôte sans compte : la table est marquée « avec publicité »", async () => {
  const L = await makeLobby({ voteDuration: 3, questionCount: 3 }, 2);
  const upd = await L.host.wait("lobby:update", (l) => l.players.length === 3);
  assert.equal(upd.ads, true);
  L.close();
});

// Joue une manche : attend la question, fait voter tout le monde, attend la
// révélation, puis demande la suite. `questionCount` est ramené à 3 minimum
// par le serveur — une partie de test fait donc toujours au moins 3 manches.
async function playRound(L, round, targetPid) {
  await L.host.wait("lobby:update", (l) => l.state === "question" && l.currentRound === round, 8000);
  L.players.forEach((p) => p.c.send("game:vote", { targetId: targetPid }));
  await L.host.wait("game:reveal", (r) => r.round === round, 8000);
  L.host.send("game:next");
}

test("un entracte s'intercale toutes les N manches, puis avant les résultats", async () => {
  const cfg = await (await api("/api/config")).json();
  const every = cfg.ads.policy.everyRounds;
  const L = await makeLobby({ voteDuration: 3, questionCount: 3 }, 2);
  const target = L.players[1].pid;
  L.host.send("game:start");

  for (let round = 1; round <= 3; round++) {
    await playRound(L, round, target);
    const last = round === 3;
    const expectAd = last || round % every === 0;

    if (expectAd) {
      const ad = await L.host.next("lobby:update", (l) => l.state === "ad", 8000);
      assert.ok(ad.adEndTime > Date.now(), `manche ${round} : l'entracte porte une fin de minuterie`);
      assert.ok(ad.adSkipAt >= Date.now() - 1000, `manche ${round} : et un moment où on peut passer`);
    } else {
      assert.ok(
        await L.host.never("lobby:update", (l) => l.state === "ad", 800),
        `manche ${round} : pas d'entracte hors de la cadence`
      );
    }
  }

  const end = await L.host.wait("game:end", null, (cfg.ads.policy.seconds + 6) * 1000);
  assert.equal(end.finalRanking.length, 3, "la partie se termine bien après l'entracte");
  L.close();
});

test("l'hôte ne peut pas passer l'entracte avant le délai serveur ; un invité jamais", async () => {
  const cfg = await (await api("/api/config")).json();
  const L = await makeLobby({ voteDuration: 3, questionCount: 3 }, 2);
  const target = L.players[1].pid;
  L.host.send("game:start");

  // on va jusqu'au premier entracte (cadence) sans attendre la fin de partie
  for (let round = 1; round <= cfg.ads.policy.everyRounds; round++) {
    await playRound(L, round, target);
  }
  await L.host.next("lobby:update", (l) => l.state === "ad", 8000);

  // trop tôt : la demande est ignorée
  L.host.send("game:adskip");
  assert.ok(
    await L.host.never("lobby:update", (l) => l.state !== "ad", 500),
    "passer l'entracte immédiatement ne doit rien faire"
  );

  // un invité n'a pas la main, même après le délai
  await sleep(cfg.ads.policy.skipAfter * 1000 + 300);
  L.players[1].c.send("game:adskip");
  assert.ok(
    await L.host.never("lobby:update", (l) => l.state !== "ad", 500),
    "un invité ne doit pas pouvoir passer l'entracte"
  );

  // l'hôte, lui, peut désormais abréger : la manche suivante démarre
  L.host.send("game:adskip");
  const next = await L.host.next(
    "lobby:update",
    (l) => l.state === "question" && l.currentRound === cfg.ads.policy.everyRounds + 1,
    5000
  );
  assert.equal(next.adEndTime, null, "la minuterie d'entracte est remise à zéro");
  L.close();
});

test("hôte VIP : aucune publicité pour toute la table", { skip: LOCAL ? false : "compte de test requis" }, async () => {
  const u = await makeUser();
  const g = await grantVip(u.email);
  assert.equal(g.status, 200);
  assert.equal(g.body.vip, true);

  // la socket porte le jeton de session : le serveur reconnaît l'hôte
  const host = client({ token: u.token });
  await host.ready();
  const res = await host.ack("lobby:create", { pseudo: "VIP", settings: { voteDuration: 3, questionCount: 3 } });
  assert.equal(res.ok, true);
  assert.equal(res.lobby.ads, false, "la table d'un hôte VIP ne doit pas être publicitaire");

  // et le jeu ne doit jamais passer par l'état « ad »
  const guests = [];
  for (const p of ["A", "B"]) {
    const c = client();
    await c.ready();
    await c.ack("lobby:join", { code: res.code, pseudo: p });
    guests.push(c);
  }
  host.send("game:start");
  for (const round of [1, 2, 3]) {
    await host.wait("lobby:update", (l) => l.state === "question" && l.currentRound === round, 8000);
    host.send("game:vote", { targetId: res.selfId });
    guests.forEach((c) => c.send("game:vote", { targetId: res.selfId }));
    await host.wait("game:reveal", (r) => r.round === round, 8000);
    host.send("game:next");
  }
  await host.wait("game:end", null, 8000);
  assert.ok(
    !host.log.some((e) => e.ev === "lobby:update" && e.data.state === "ad"),
    "aucun entracte ne doit apparaître pour un hôte VIP"
  );

  host.close();
  guests.forEach((c) => c.close());
});

// ─── Quota gratuit sur les questions privées ───

test("le quota gratuit de questions privées est appliqué, et levé pour un VIP", { skip: LOCAL ? false : "compte de test requis" }, async () => {
  const u = await makeUser();
  const cfg = await (await api("/api/config")).json();
  const limit = cfg.billing.freePrivateQuestions;
  assert.ok(limit > 0 && limit < 50, `quota de test raisonnable (${limit})`);

  const cat = await (
    await api("/api/me/categories", {
      method: "POST",
      headers: authed(u.token),
      body: JSON.stringify({ name: "Perso", emoji: "🎲", tone: "fun" }),
    })
  ).json();
  assert.ok(cat.id, "catégorie privée créée");

  const add = (text) =>
    api("/api/me/questions", {
      method: "POST",
      headers: authed(u.token),
      body: JSON.stringify({ text, categoryId: cat.id }),
    });

  for (let i = 0; i < limit; i++) {
    assert.equal((await add(`Qui ${i} ?`)).status, 200, `question ${i + 1} dans le quota`);
  }
  const over = await add("Une de trop ?");
  assert.equal(over.status, 400, "au-delà du quota, l'ajout doit être refusé");
  assert.match((await over.json()).error, /VIP/i, "le message doit expliquer comment débloquer");

  // en VIP, plus de limite
  assert.equal((await grantVip(u.email)).status, 200);
  assert.equal((await add("Débloquée par le VIP")).status, 200);

  const state = await (await api("/api/billing/state", { headers: authed(u.token) })).json();
  assert.equal(state.vip, true);
  assert.equal(state.usage.limit, null, "un VIP n'a plus de plafond");
  assert.equal(state.usage.used, limit + 1);
});

// ─── Attribution manuelle du VIP (vente directe / geste commercial) ───

test("l'attribution manuelle du VIP est réservée à l'admin", async () => {
  const r = await api("/api/admin/vip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "quelquun@exemple.test" }),
  });
  assert.equal(r.status, 401);
});

test("VIP manuel : accord daté, révocation, e-mail inconnu", { skip: LOCAL ? false : "compte de test requis" }, async () => {
  const u = await makeUser();

  const inconnu = await grantVip("personne-ici@exemple.test");
  assert.equal(inconnu.status, 404);

  const mauvaiseDuree = await grantVip(u.email, { days: -3 });
  assert.equal(mauvaiseDuree.status, 400);

  assert.equal((await grantVip(u.email, { days: 1 })).status, 200);
  let state = await (await api("/api/billing/state", { headers: authed(u.token) })).json();
  assert.equal(state.vip, true);
  assert.equal(state.entitlement.source, "manual");
  assert.ok(new Date(state.entitlement.expiresAt) > new Date(), "date de fin dans le futur");

  // le cache VIP est invalidé à l'écriture : l'effet est immédiat, pas d'attente
  assert.equal((await grantVip(u.email, { revoke: true })).status, 200);
  state = await (await api("/api/billing/state", { headers: authed(u.token) })).json();
  assert.equal(state.vip, false, "après révocation, le compte redevient non-VIP");
});

// ─── Paiement ───

test("le paiement refuse une offre inconnue et signale une config manquante", { skip: LOCAL ? false : "compte de test requis" }, async () => {
  const u = await makeUser();

  const bad = await api("/api/billing/checkout", {
    method: "POST",
    headers: authed(u.token),
    body: JSON.stringify({ plan: "offre-bidon" }),
  });
  assert.equal(bad.status, 400);

  const r = await api("/api/billing/checkout", {
    method: "POST",
    headers: authed(u.token),
    body: JSON.stringify({ plan: "vip_year" }),
  });
  // Sans clés Stripe on attend un 501 explicite ; avec des clés, une URL.
  if (r.status === 501) {
    assert.match((await r.json()).error, /configur/i, "le message doit dire ce qui manque");
  } else {
    assert.equal(r.status, 200);
    assert.match((await r.json()).url, /^https:\/\/checkout\.stripe\.com/);
  }
});

test("le paiement exige une session", async () => {
  const r = await api("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: "vip_year" }),
  });
  assert.equal(r.status, 401);
});

test("un achat in-app non vérifié n'accorde JAMAIS le VIP", { skip: LOCAL ? false : "compte de test requis" }, async () => {
  const u = await makeUser();
  const r = await api("/api/billing/mobile-purchase", {
    method: "POST",
    headers: authed(u.token),
    body: JSON.stringify({ store: "play", receipt: "reçu-inventé-de-toutes-pièces" }),
  });
  assert.equal(r.status, 501, "tant que la validation de reçu n'est pas branchée, on refuse");

  const state = await (await api("/api/billing/state", { headers: authed(u.token) })).json();
  assert.equal(state.vip, false, "un reçu non vérifié ne doit pas rendre VIP");
});

// ─── Webhook Stripe ───

function stripeSig(payload, secret = WEBHOOK_SECRET, t = Math.floor(Date.now() / 1000)) {
  const v1 = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

function postWebhook(payload, sig) {
  return api("/api/billing/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(sig ? { "stripe-signature": sig } : {}) },
    body: payload,
  });
}

test("le webhook rejette une signature absente, fausse ou périmée", async () => {
  const payload = JSON.stringify({ type: "checkout.session.completed", data: { object: {} } });

  assert.equal((await postWebhook(payload)).status, 400, "sans signature");
  assert.equal((await postWebhook(payload, "t=1,v1=deadbeef")).status, 400, "signature fausse");
  assert.equal(
    (await postWebhook(payload, stripeSig(payload, "whsec_pas_le_bon"))).status,
    400,
    "signature d'un autre secret"
  );
  const vieux = Math.floor(Date.now() / 1000) - 3600;
  assert.equal((await postWebhook(payload, stripeSig(payload, WEBHOOK_SECRET, vieux))).status, 400, "signature périmée");
});

test("un paiement Stripe signé accorde le VIP", { skip: LOCAL ? false : "compte de test requis" }, async () => {
  const u = await makeUser();
  const payload = JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_" + randomUUID(),
        client_reference_id: u.id,
        metadata: { userId: u.id, planId: "vip_night" },
      },
    },
  });
  const r = await postWebhook(payload, stripeSig(payload));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { received: true });

  const state = await (await api("/api/billing/state", { headers: authed(u.token) })).json();
  assert.equal(state.vip, true, "le paiement doit rendre VIP");
  assert.equal(state.entitlement.source, "stripe");
  // « soirée sans pub » = achat unique daté, pas un abonnement sans fin
  assert.ok(state.entitlement.expiresAt, "l'offre à la soirée doit avoir une date de fin");
  const jours = (new Date(state.entitlement.expiresAt) - Date.now()) / 86400_000;
  assert.ok(jours > 0 && jours <= 1.1, `fin attendue sous 24 h (reçu ${jours.toFixed(2)} j)`);
});

test("une résiliation d'abonnement Stripe retire le VIP", { skip: LOCAL ? false : "compte de test requis" }, async () => {
  const u = await makeUser();
  assert.equal((await grantVip(u.email)).status, 200);

  const payload = JSON.stringify({
    type: "customer.subscription.deleted",
    data: { object: { id: "sub_test", status: "canceled", metadata: { userId: u.id } } },
  });
  assert.equal((await postWebhook(payload, stripeSig(payload))).status, 200);

  const state = await (await api("/api/billing/state", { headers: authed(u.token) })).json();
  assert.equal(state.vip, false, "après résiliation, plus de VIP");
});
