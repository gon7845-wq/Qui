import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { ensureServer, stopServer, api, client, makeLobby, sleep, LOCAL, BASE } from "./helpers.js";

before(ensureServer);
after(stopServer);

const S = { voteDuration: 25, questionCount: 3 };

test("un joueur ne peut pas voler l'identité d'un autre via lobby:rejoin", async () => {
  // Les ids joueurs sont diffusés à toute la table (publicLobby.players[].id).
  // Ils ne doivent donc PAS suffire à reprendre la session de quelqu'un d'autre.
  const L = await makeLobby(S, 2);
  const hostPid = L.players[0].pid;

  const pirate = client();
  await pirate.ready();
  const r = await pirate.ack("lobby:rejoin", { code: L.code, pid: hostPid });
  pirate.close();
  L.close();

  assert.equal(r.ok, false, "connaître l'id public d'un joueur ne doit pas donner sa session (ici : celle de l'hôte)");
});

test("on ne peut pas voter pour un joueur d'un autre lobby", async () => {
  const A = await makeLobby(S, 2);
  const B = await makeLobby(S, 2);
  A.host.send("game:start");
  await A.host.wait("lobby:update", (l) => l.state === "question", 8000);
  A.host.send("game:vote", { targetId: B.players[1].pid });
  await sleep(600);
  const last = [...A.host.log].reverse().find((e) => e.ev === "lobby:update").data;
  assert.equal(last.votesCount, 0, "cible hors lobby → vote rejeté");
  A.close();
  B.close();
});

test("les payloads malformés ne font pas tomber le serveur", async () => {
  const c = client();
  await c.ready();
  const junk = [null, undefined, 0, "chaine", [], { pseudo: { $ne: null } }, { settings: null }];
  for (const j of junk) {
    c.send("game:vote", j);
    c.send("lobby:settings", j);
    c.send("lobby:avatar", j);
    c.send("game:start", j);
    c.send("game:pause", j);
    c.send("game:next", j);
    c.send("lobby:leave", j);
  }
  await c.ack("lobby:join", null).catch(() => {});
  await c.ack("lobby:rejoin", null).catch(() => {});
  await sleep(500);
  c.close();

  const r = await api("/healthz");
  assert.equal(r.status, 200, "le serveur doit encore répondre");
});

test("un jeton signé avec le secret par défaut est rejeté", async () => {
  // Si SESSION_SECRET n'est pas défini en prod, n'importe qui peut se forger
  // une session : ce test le détecte.
  const forged = jwt.sign({ uid: "00000000-0000-4000-8000-000000000000", email: "pirate@test" }, "dev-secret-change-me", {
    expiresIn: "1h",
  });
  const r = await api("/api/me/data", { headers: { Authorization: `Bearer ${forged}` } });
  assert.equal(r.status, 401, `session forgeable sur ${BASE} → SESSION_SECRET non défini`);
});

test("un jeton expiré est rejeté", async () => {
  const secret = process.env.SESSION_SECRET || "dev-secret-change-me";
  const old = jwt.sign({ uid: "x", email: "a@b.c" }, secret, { expiresIn: "-1h" });
  const r = await api("/api/me/data", { headers: { Authorization: `Bearer ${old}` } });
  assert.equal(r.status, 401);
});

test("la clé admin ne donne pas accès à l'espace membre", async () => {
  const key = process.env.ADMIN_PASSWORD || "test-admin";
  const r = await api("/api/me/data", { headers: { "x-admin-key": key } });
  assert.equal(r.status, 401);
});

test("le login admin est limité en fréquence (anti-force brute)", async () => {
  const attempt = () =>
    api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: `essai-${Math.random()}` }),
    });
  const codes = [];
  for (let i = 0; i < 25; i++) codes.push((await attempt()).status);
  assert.ok(codes.includes(429), `25 essais de mot de passe sans blocage (codes vus : ${[...new Set(codes)].join(", ")})`);
});

test("l'envoi de liens magiques est limité en fréquence", { skip: LOCAL ? false : "cible non locale" }, async () => {
  const codes = [];
  for (let i = 0; i < 12; i++) {
    const r = await api("/api/auth/magic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `flood${i}@exemple.test` }),
    });
    codes.push(r.status);
  }
  assert.ok(
    codes.includes(429),
    `12 demandes de lien magique acceptées d'affilée (codes : ${[...new Set(codes)].join(", ")}) — bombardement d'e-mails et quota Resend brûlé`
  );
});

test("la création de lobbies est limitée en fréquence", { skip: LOCAL ? false : "cible non locale" }, async () => {
  const c = client();
  await c.ready();
  let refused = 0;
  for (let i = 0; i < 40; i++) {
    const r = await c.ack("lobby:create", { pseudo: `Spam${i}`, settings: S });
    if (!r?.ok) refused++;
  }
  c.close();
  assert.ok(refused > 0, "40 lobbies créés depuis une seule socket sans aucune limite (saturation mémoire possible)");
});
