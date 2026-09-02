import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { ensureServer, stopServer, client, makeLobby, sleep } from "./helpers.js";

before(ensureServer);
after(stopServer);

const S = { voteDuration: 3, questionCount: 3 };

const lastUpdate = (c) => [...c.log].reverse().find((e) => e.ev === "lobby:update").data;

// Enchaîne les manches restantes en votant pour `targetPid`, en sautant les
// 9 s de révélation via game:next (réservé à l'hôte). `done` = manches déjà jouées.
async function finishGame(L, targetPid, rounds, done = 0) {
  for (let round = done + 1; round <= rounds; round++) {
    if (round > 1) {
      L.host.send("game:next");
      await L.host.wait("lobby:update", (l) => l.state === "question" && l.currentRound === round, 8000);
      L.players.forEach((p) => p.c.send("game:vote", { targetId: targetPid }));
      await L.host.wait("game:reveal", (r) => r.round === round, 8000);
    }
  }
  L.host.send("game:next");
  return L.host.wait("game:end", null, 12000);
}

test("création : code à 4 caractères et hôte seul dans le lobby", async () => {
  const c = client();
  await c.ready();
  const r = await c.ack("lobby:create", { pseudo: "Sam", settings: S });
  assert.equal(r.ok, true);
  assert.match(r.code, /^[A-Z0-9]{4}$/);
  assert.equal(r.lobby.state, "waiting");
  assert.equal(r.lobby.players.length, 1);
  assert.equal(r.lobby.players[0].isHost, true);
  assert.equal(r.lobby.hostId, r.selfId);
  assert.equal(r.lobby.settings.voteDuration, 3);
  assert.equal(r.lobby.settings.questionCount, 3);
  c.close();
});

test("le pseudo est nettoyé (vide → Anonyme, tronqué à 20)", async () => {
  const c = client();
  await c.ready();
  const a = await c.ack("lobby:create", { pseudo: "   ", settings: S });
  assert.equal(a.lobby.players[0].pseudo, "Anonyme");
  c.close();

  const c2 = client();
  await c2.ready();
  const b = await c2.ack("lobby:create", { pseudo: "x".repeat(50), settings: S });
  assert.equal(b.lobby.players[0].pseudo, "x".repeat(20));
  c2.close();
});

test("les réglages hors bornes sont ramenés dans les limites", async () => {
  const c = client();
  await c.ready();
  const r = await c.ack("lobby:create", {
    pseudo: "Sam",
    settings: { voteDuration: 999, questionCount: -5, categories: "pas-un-tableau" },
  });
  assert.equal(r.lobby.settings.voteDuration, 30);
  assert.equal(r.lobby.settings.questionCount, 3);
  assert.deepEqual(r.lobby.settings.categories, []);
  c.close();
});

test("rejoindre : code inconnu, casse ignorée, lobby plein", async () => {
  const bad = client();
  await bad.ready();
  const r1 = await bad.ack("lobby:join", { code: "ZZZZ", pseudo: "X" });
  assert.equal(r1.ok, false);
  assert.match(r1.error, /introuvable/i);

  const L = await makeLobby(S, 0);
  const lower = client();
  await lower.ready();
  const r2 = await lower.ack("lobby:join", { code: L.code.toLowerCase(), pseudo: "Min" });
  assert.equal(r2.ok, true, "le code doit être insensible à la casse");

  const extra = [];
  for (let i = 0; i < 10; i++) {
    const g = client();
    await g.ready();
    const r = await g.ack("lobby:join", { code: L.code, pseudo: `P${i}` });
    assert.equal(r.ok, true, `le joueur ${i + 3} devrait entrer`);
    extra.push(g);
  }
  const thirteenth = client();
  await thirteenth.ready();
  const r3 = await thirteenth.ack("lobby:join", { code: L.code, pseudo: "Trop" });
  assert.equal(r3.ok, false);
  assert.match(r3.error, /plein/i);

  bad.close();
  lower.close();
  thirteenth.close();
  extra.forEach((c) => c.close());
  L.close();
});

test("il faut 3 joueurs pour lancer", async () => {
  const L = await makeLobby(S, 1);
  L.host.send("game:start");
  const err = await L.host.wait("error:msg", null, 4000);
  assert.match(err.message, /3 joueurs/i);
  assert.ok(await L.host.never("lobby:update", (l) => l.state !== "waiting"), "la partie ne doit pas démarrer");
  L.close();
});

test("seul l'hôte peut lancer la partie et changer les réglages", async () => {
  const L = await makeLobby(S, 2);
  const guest = L.players[1].c;

  guest.send("game:start");
  assert.ok(await guest.never("lobby:update", (l) => l.state === "countdown"), "un invité ne doit pas pouvoir lancer");

  guest.send("lobby:settings", { settings: { questionCount: 16 } });
  await sleep(400);
  assert.equal(lastUpdate(L.host).settings.questionCount, 3, "un invité ne doit pas pouvoir changer les réglages");

  L.host.send("lobby:settings", { settings: { questionCount: 5, anonymous: true } });
  const upd = await L.host.wait("lobby:update", (l) => l.settings.questionCount === 5);
  assert.equal(upd.settings.anonymous, true);
  L.close();
});

test("partie complète : décompte, votes, révélation, scores, classement final", async () => {
  const L = await makeLobby({ voteDuration: 3, questionCount: 3, anonymous: false }, 2);
  const [host, j1, j2] = L.players;

  L.host.send("game:start");
  const cd = await L.host.wait("lobby:update", (l) => l.state === "countdown");
  assert.ok(cd.countdownEndTime > Date.now(), "countdownEndTime dans le futur");

  const q1 = await L.host.wait("lobby:update", (l) => l.state === "question" && l.currentRound === 1, 8000);
  assert.equal(q1.totalRounds, 3);
  assert.ok(q1.currentQuestion && q1.currentQuestion.text.length > 5, "une question est distribuée");
  assert.ok(["warm", "spicy", "fun"].includes(q1.currentQuestion.tone));
  assert.ok(q1.roundEndTime > Date.now());

  const seen = new Set();
  let expected = 0;

  for (let round = 1; round <= 3; round++) {
    const q = await L.host.wait("lobby:update", (l) => l.state === "question" && l.currentRound === round, 8000);
    assert.ok(!seen.has(q.currentQuestion.text), "pas de question répétée dans la même partie");
    seen.add(q.currentQuestion.text);

    host.c.send("game:vote", { targetId: j1.pid });
    j1.c.send("game:vote", { targetId: j1.pid });
    j2.c.send("game:vote", { targetId: round === 3 ? j2.pid : j1.pid });

    const rev = await L.host.wait("game:reveal", (r) => r.round === round, 8000);
    const byId = Object.fromEntries(rev.ranked.map((r) => [r.id, r.count]));
    assert.equal(byId[j1.pid], round === 3 ? 2 : 3, `manche ${round} : décompte de J1`);
    assert.equal(byId[j2.pid], round === 3 ? 1 : 0, `manche ${round} : décompte de J2`);
    assert.equal(rev.ranked[0].id, j1.pid, "le plus cité arrive en tête");
    assert.ok(rev.votes && Object.keys(rev.votes).length === 3, "votes visibles en mode non anonyme");
    expected += round === 3 ? 2 : 3;

    if (round < 3) L.host.send("game:next");
  }

  const end = await L.host.wait("game:end", null, 14000);
  assert.equal(end.finalRanking[0].id, j1.pid);
  assert.equal(end.finalRanking[0].score, expected, "score = total des voix reçues");
  assert.equal(end.history.length, 3);
  assert.equal(end.finalRanking.length, 3);
  L.close();
});

test("la manche se conclut dès que tout le monde a voté (avant la fin du chrono)", async () => {
  const L = await makeLobby({ voteDuration: 25, questionCount: 3 }, 2);
  L.host.send("game:start");
  await L.host.wait("lobby:update", (l) => l.state === "question", 8000);
  const t0 = Date.now();
  L.players.forEach((p) => p.c.send("game:vote", { targetId: L.players[0].pid }));
  await L.host.wait("game:reveal", null, 8000);
  assert.ok(Date.now() - t0 < 5000, "ne doit pas attendre les 25s");
  L.close();
});

test("le chrono conclut la manche même si personne ne vote", async () => {
  const L = await makeLobby({ voteDuration: 3, questionCount: 3 }, 2);
  L.host.send("game:start");
  await L.host.wait("lobby:update", (l) => l.state === "question", 8000);
  const rev = await L.host.wait("game:reveal", null, 9000);
  assert.ok(rev.ranked.every((r) => r.count === 0), "aucune voix");
  L.close();
});

test("on peut changer son vote tant que la manche dure", async () => {
  const L = await makeLobby({ voteDuration: 25, questionCount: 3 }, 2);
  const [host, j1, j2] = L.players;
  L.host.send("game:start");
  await L.host.wait("lobby:update", (l) => l.state === "question", 8000);

  host.c.send("game:vote", { targetId: j1.pid });
  await L.host.wait("lobby:update", (l) => l.votesCount === 1);
  host.c.send("game:vote", { targetId: j2.pid });
  await sleep(300);
  assert.equal(lastUpdate(L.host).votesCount, 1, "changer de vote ne doit pas en ajouter un second");

  j1.c.send("game:vote", { targetId: j2.pid });
  j2.c.send("game:vote", { targetId: j2.pid });
  const rev = await L.host.wait("game:reveal", null, 8000);
  const byId = Object.fromEntries(rev.ranked.map((r) => [r.id, r.count]));
  assert.equal(byId[j2.pid], 3, "le dernier vote compte");
  assert.equal(byId[j1.pid], 0);
  L.close();
});

test("« voter pour soi : interdit » est respecté côté serveur", async () => {
  const L = await makeLobby({ voteDuration: 25, questionCount: 3, allowSelfVote: false }, 2);
  L.host.send("game:start");
  await L.host.wait("lobby:update", (l) => l.state === "question", 8000);
  L.host.send("game:vote", { targetId: L.players[0].pid });
  await sleep(600);
  assert.equal(lastUpdate(L.host).votesCount, 0, "le vote pour soi doit être rejeté");
  L.close();
});

test("un vote pour un joueur inexistant est ignoré", async () => {
  const L = await makeLobby({ voteDuration: 25, questionCount: 3 }, 2);
  L.host.send("game:start");
  await L.host.wait("lobby:update", (l) => l.state === "question", 8000);
  L.host.send("game:vote", { targetId: "joueur-fantome" });
  await sleep(600);
  assert.equal(lastUpdate(L.host).votesCount, 0);
  L.close();
});

test("mode anonyme : les votes nominatifs ne quittent pas le serveur", async () => {
  const L = await makeLobby({ voteDuration: 3, questionCount: 3, anonymous: true }, 2);
  L.host.send("game:start");
  await L.host.wait("lobby:update", (l) => l.state === "question", 8000);
  L.players.forEach((p) => p.c.send("game:vote", { targetId: L.players[1].pid }));
  const rev = await L.host.wait("game:reveal", null, 8000);
  assert.equal(rev.anonymous, true);
  assert.equal(rev.votes, null, "aucun détail de vote en anonyme");
  const end = await finishGame(L, L.players[1].pid, 3, 1);
  assert.ok(end.history.every((h) => h.votes === null), "l'historique final ne doit rien révéler");
  L.close();
});

test("pause puis reprise par l'hôte", async () => {
  const L = await makeLobby({ voteDuration: 20, questionCount: 3 }, 2);
  L.host.send("game:start");
  await L.host.wait("lobby:update", (l) => l.state === "question", 8000);
  L.host.send("game:pause");
  const p = await L.host.next("lobby:update", (l) => l.paused === true);
  assert.equal(p.state, "question");

  L.players[1].c.send("game:resume");
  await sleep(400);
  assert.equal(lastUpdate(L.host).paused, true, "seul l'hôte reprend");

  L.host.send("game:resume");
  const r = await L.host.next("lobby:update", (l) => l.paused === false);
  assert.ok(r.roundEndTime > Date.now(), "le chrono repart");
  L.close();
});

test("reconnexion : on retrouve sa place et l'état de la manche", async () => {
  const L = await makeLobby({ voteDuration: 25, questionCount: 3 }, 2);
  const victim = L.players[2];
  L.host.send("game:start");
  await L.host.wait("lobby:update", (l) => l.state === "question", 8000);

  victim.c.close();
  await L.host.next("lobby:update", (l) => l.players.some((p) => p.id === victim.pid && !p.connected), 5000);

  const back = client();
  await back.ready();
  const r = await back.ack("lobby:rejoin", { code: L.code, pid: victim.pid, secret: victim.secret });
  assert.equal(r.ok, true);
  assert.equal(r.selfId, victim.pid);
  assert.equal(r.lobby.state, "question");
  assert.ok(r.lobby.currentQuestion && r.lobby.currentQuestion.text, "la question en cours est renvoyée");
  const upd = await L.host.next("lobby:update", (l) => l.players.some((p) => p.id === victim.pid && p.connected), 5000);
  assert.equal(upd.players.length, 3);
  back.close();
  L.close();
});

test("reconnexion avec un pid ou un code inconnu est refusée", async () => {
  const L = await makeLobby(S, 2);
  const c = client();
  await c.ready();
  assert.equal((await c.ack("lobby:rejoin", { code: L.code, pid: "inexistant" })).ok, false);
  assert.equal((await c.ack("lobby:rejoin", { code: "ZZZZ", pid: "x" })).ok, false);
  c.close();
  L.close();
});

test("on ne peut pas rejoindre une partie déjà lancée", async () => {
  const L = await makeLobby({ voteDuration: 25, questionCount: 3 }, 2);
  L.host.send("game:start");
  await L.host.wait("lobby:update", (l) => l.state === "countdown", 8000);
  const late = client();
  await late.ready();
  const r = await late.ack("lobby:join", { code: L.code, pseudo: "Retard" });
  assert.equal(r.ok, false);
  assert.match(r.error, /en cours/i);
  late.close();
  L.close();
});

test("« Rejouer » remet les scores à zéro et renvoie au lobby", async () => {
  const L = await makeLobby({ voteDuration: 3, questionCount: 3 }, 2);
  L.host.send("game:start");
  await L.host.wait("lobby:update", (l) => l.state === "question", 8000);
  L.players.forEach((p) => p.c.send("game:vote", { targetId: L.players[1].pid }));
  await L.host.wait("game:reveal", null, 8000);
  const end = await finishGame(L, L.players[1].pid, 3, 1);
  assert.ok(end.finalRanking.some((r) => r.score > 0));

  L.host.send("game:tolobby");
  const back = await L.host.next("lobby:update", (l) => l.state === "waiting" && l.currentRound === 0, 6000);
  assert.ok(back.players.every((p) => p.score === 0), "scores remis à zéro");
  assert.equal(back.currentQuestion, null);
  L.close();
});

test("si l'hôte quitte, le rôle passe à un autre joueur", async () => {
  const L = await makeLobby(S, 2);
  const oldHost = L.players[0].pid;
  L.host.send("lobby:leave");
  const upd = await L.players[1].c.next("lobby:update", (l) => l.hostId !== oldHost, 6000);
  assert.equal(upd.players.length, 2);
  const h = upd.players.find((p) => p.id === upd.hostId);
  assert.ok(h && h.isHost);
  L.close();
});

test("l'avatar est limité à 4 caractères et diffusé", async () => {
  const L = await makeLobby(S, 2);
  L.host.send("lobby:avatar", { avatar: "🦄" });
  await L.host.next("lobby:update", (l) => l.players[0].avatar === "🦄");
  L.host.send("lobby:avatar", { avatar: "🦄🦄🦄🦄🦄🦄" });
  const b = await L.host.next("lobby:update", (l) => l.players[0].avatar.length > 2);
  assert.equal([...b.players[0].avatar].length, 4);
  L.close();
});
