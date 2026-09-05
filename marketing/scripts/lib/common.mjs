import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const OUT = path.join(ROOT, "out");

/** Charge marketing/.env (sans écraser les variables déjà présentes). */
export function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[key] === undefined || process.env[key] === "") process.env[key] = val;
  }
}

export const env = (k, fallback = "") => {
  const v = process.env[k];
  return v === undefined || v === "" ? fallback : v;
};

export const appUrl = () => env("QUI_PUBLIC_URL", "https://qui-production-8582.up.railway.app").replace(/\/$/, "");

/** --clé valeur / --clé=valeur / --flag */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      out._.push(a);
      continue;
    }
    const [k, v] = a.slice(2).split(/=(.*)/s);
    if (v !== undefined) out[k] = v;
    else if (argv[i + 1] && !argv[i + 1].startsWith("--")) out[k] = argv[++i];
    else out[k] = true;
  }
  return out;
}

export function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
export function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export function latestSlug() {
  const f = path.join(OUT, "latest.txt");
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8").trim() : null;
}

export function jobDir(slug) {
  return path.join(OUT, slug);
}

/** Date du jour à Paris, au format AAAA-MM-JJ. */
export function todayParis(d = new Date()) {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export const log = (...a) => console.log("•", ...a);
export const warn = (...a) => console.warn("⚠", ...a);

export function fail(msg) {
  console.error("✖", msg);
  process.exit(1);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** fetch qui lève une erreur lisible (statut + début du corps) en cas d'échec. */
export async function http(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const detail = typeof body === "string" ? body.slice(0, 400) : JSON.stringify(body).slice(0, 600);
    throw new Error(`${init.method ?? "GET"} ${url} → HTTP ${res.status} ${detail}`);
  }
  return { res, body };
}

export const form = (obj) => new URLSearchParams(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""));
