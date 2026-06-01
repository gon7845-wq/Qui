import pg from "pg";
import { randomUUID } from "crypto";
import { QUESTIONS } from "./questions.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL non défini — la base ne fonctionnera pas.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 8,
});

pool.on("error", (e) => console.error("[db] pool error:", e.message));

export function q(text, params) {
  return pool.query(text, params);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Le réseau privé Railway peut mettre quelques secondes à être prêt au boot.
async function waitForDb(attempts = 8) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await q("SELECT 1");
      return;
    } catch (e) {
      console.warn(`[db] connexion (${i}/${attempts})… ${e.message}`);
      await sleep(2000);
    }
  }
  throw new Error("Base inaccessible après plusieurs tentatives");
}

// Catégories globales par défaut (owner_id = NULL)
export const DEFAULT_CATEGORIES = [
  { id: "cat-gentil", name: "Gentillesse", emoji: "💛", tone: "warm" },
  { id: "cat-talents", name: "Talents", emoji: "🦸", tone: "warm" },
  { id: "cat-groupe", name: "Le groupe", emoji: "👥", tone: "warm" },
  { id: "cat-drole", name: "Drôle", emoji: "😂", tone: "fun" },
  { id: "cat-futur", name: "Prédictions", emoji: "🔮", tone: "fun" },
  { id: "cat-absurde", name: "Absurde", emoji: "👽", tone: "fun" },
  { id: "cat-philo", name: "Philo", emoji: "🧠", tone: "fun" },
  { id: "cat-couple", name: "Couple", emoji: "💔", tone: "spicy" },
  { id: "cat-genant", name: "Gênant", emoji: "😬", tone: "spicy" },
  { id: "cat-trash", name: "Sans pitié", emoji: "🔥", tone: "spicy" },
];

export async function initDb() {
  await waitForDb();
  await q(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text UNIQUE,
      name text,
      avatar text,
      provider text,
      premium boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS categories (
      id text PRIMARY KEY,
      name text NOT NULL,
      emoji text NOT NULL DEFAULT '🎲',
      tone text NOT NULL DEFAULT 'fun',
      owner_id text REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS questions (
      id text PRIMARY KEY,
      text text NOT NULL,
      category_id text REFERENCES categories(id) ON DELETE CASCADE,
      enabled boolean NOT NULL DEFAULT true,
      owner_id text REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS auth_tokens (
      token text PRIMARY KEY,
      email text NOT NULL,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await q(`CREATE INDEX IF NOT EXISTS idx_questions_owner ON questions(owner_id);`);
  await q(`CREATE INDEX IF NOT EXISTS idx_categories_owner ON categories(owner_id);`);

  // Seed initial (banque globale) si vide
  const { rows } = await q(`SELECT count(*)::int AS n FROM categories WHERE owner_id IS NULL`);
  if (rows[0].n === 0) {
    console.log("[db] Seed de la banque globale…");
    for (const c of DEFAULT_CATEGORIES) {
      await q(
        `INSERT INTO categories (id, name, emoji, tone, owner_id) VALUES ($1,$2,$3,$4,NULL)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.name, c.emoji, c.tone]
      );
    }
    for (const item of QUESTIONS) {
      await q(
        `INSERT INTO questions (id, text, category_id, enabled, owner_id) VALUES ($1,$2,$3,true,NULL)`,
        [randomUUID(), item.text, "cat-" + item.cat]
      );
    }
    console.log(`[db] Seed terminé : ${QUESTIONS.length} questions.`);
  }
}
