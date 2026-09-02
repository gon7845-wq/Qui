// Utilitaires de test : démarre le serveur (ou cible une URL existante) et
// fournit un client socket.io qui garde l'historique des événements reçus.
import { io } from "socket.io-client";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// TEST_BASE_URL est posé par test/run.js (serveur local démarré pour l'occasion)
// ou par l'utilisateur pour viser un déploiement existant.
export const BASE = (process.env.TEST_BASE_URL || "http://localhost:3999").replace(/\/$/, "");
// LOCAL = cible jetable → on s'autorise les tests qui écrivent en base ou saturent le serveur.
export const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let child = null;

export async function ensureServer() {
  // En principe run.js a déjà démarré le serveur ; ce fallback sert quand on
  // lance un seul fichier de test à la main (node --test test/game.test.js).
  if (!process.env.TEST_BASE_URL && !child) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL requis pour les tests locaux (ou TEST_BASE_URL pour viser un déploiement)");
    }
    child = spawn(process.execPath, [path.resolve(__dirname, "../index.js")], {
      env: { ...process.env, PORT: "3999", ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "test-admin" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const tail = [];
    const keep = (d) => {
      tail.push(String(d));
      if (tail.length > 40) tail.shift();
      if (process.env.TEST_VERBOSE) process.stderr.write(`[srv] ${d}`);
    };
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    child.on("exit", (c) => {
      if (c !== null && c !== 0) process.stderr.write(`[srv] sorti (code ${c}) :\n${tail.join("")}`);
    });
  }
  await waitHealth();
}

export function stopServer() {
  if (child) {
    child.kill();
    child = null;
  }
}

async function waitHealth(tries = 60) {
  let last = "";
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${BASE}/healthz`);
      if (r.ok) return;
      last = `HTTP ${r.status}`;
    } catch (e) {
      last = e.message;
    }
    await sleep(500);
  }
  throw new Error(`Serveur injoignable sur ${BASE} (${last})`);
}

export function api(path, opts = {}) {
  return fetch(`${BASE}${path}`, opts);
}

const TRACKED = ["lobby:update", "game:reveal", "game:end", "error:msg"];

// Client socket.io de test : `wait()` regarde d'abord l'historique, ce qui évite
// les courses entre l'émission d'un événement et le début de l'attente.
export function client(auth) {
  const s = io(BASE, {
    transports: ["websocket"],
    reconnection: false,
    forceNew: true,
    auth: auth || {},
  });
  const log = [];
  const waiters = [];

  for (const ev of TRACKED) {
    s.on(ev, (data) => {
      log.push({ ev, data });
      for (let i = waiters.length - 1; i >= 0; i--) {
        const w = waiters[i];
        if (w.ev === ev && (!w.pred || safe(w.pred, data))) {
          clearTimeout(w.timer);
          waiters.splice(i, 1);
          w.resolve(data);
        }
      }
    });
  }
  const safe = (fn, d) => {
    try {
      return fn(d);
    } catch {
      return false;
    }
  };

  const c = {
    raw: s,
    log,
    ready: () =>
      new Promise((res, rej) => {
        if (s.connected) return res();
        s.once("connect", res);
        s.once("connect_error", (e) => rej(new Error(`connect_error: ${e.message}`)));
      }),
    ack: (ev, payload) =>
      new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error(`pas d'accusé de réception pour ${ev}`)), 8000);
        s.emit(ev, payload, (r) => {
          clearTimeout(t);
          res(r);
        });
      }),
    send: (ev, payload) => s.emit(ev, payload),
    // wait() accepte un événement déjà reçu (évite les courses) ; next() exige
    // un événement postérieur à l'appel — indispensable pour vérifier l'effet
    // d'une action quand l'historique contient déjà un état qui matche.
    next(ev, pred, timeout = 10000) {
      return c.wait(ev, pred, timeout, true);
    },
    wait(ev, pred, timeout = 10000, futureOnly = false) {
      if (!futureOnly) {
        const hit = log.find((e) => e.ev === ev && (!pred || safe(pred, e.data)));
        if (hit) return Promise.resolve(hit.data);
      }
      return new Promise((resolve, reject) => {
        const w = { ev, pred, resolve };
        w.timer = setTimeout(() => {
          const i = waiters.indexOf(w);
          if (i >= 0) waiters.splice(i, 1);
          reject(new Error(`timeout (${timeout}ms) en attendant « ${ev} »`));
        }, timeout);
        waiters.push(w);
      });
    },
    // Vérifie qu'un événement n'arrive PAS dans le délai donné. On ignore
    // l'historique : ce qui compte est ce qui se passe *après* l'appel.
    async never(ev, pred, ms = 1200) {
      try {
        await c.next(ev, pred, ms);
        return false;
      } catch {
        return true;
      }
    },
    clear() {
      log.length = 0;
    },
    close() {
      s.removeAllListeners();
      s.close();
    },
  };
  return c;
}

// Crée un lobby + (n-1) invités, tout le monde connecté et à jour.
export async function makeLobby(settings = {}, guests = 2) {
  const host = client();
  await host.ready();
  const res = await host.ack("lobby:create", { pseudo: "Hôte", settings });
  if (!res?.ok) throw new Error(`création échouée : ${res?.error}`);
  const code = res.code;
  const players = [{ c: host, pid: res.selfId, secret: res.secret, pseudo: "Hôte" }];
  for (let i = 0; i < guests; i++) {
    const g = client();
    await g.ready();
    const pseudo = `J${i + 1}`;
    const r = await g.ack("lobby:join", { code, pseudo });
    if (!r?.ok) throw new Error(`join échoué : ${r?.error}`);
    players.push({ c: g, pid: r.selfId, secret: r.secret, pseudo });
  }
  return { code, host, players, close: () => players.forEach((p) => p.c.close()) };
}
