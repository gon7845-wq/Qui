// Persistent data store for questions & categories.
// Backed by a JSON file (seeded from questions.js on first run).
// Set DATA_DIR (e.g. a mounted Railway volume at /data) for durable storage.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { QUESTIONS } from "./questions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TONES = ["warm", "spicy", "fun"];

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "questions.json");

// ─── Default seed ───
// Chaque catégorie est reliée à une ambiance (tone) qui pilote sa couleur en jeu
// et le tri du bulletin de fin : warm = le meilleur, spicy = le pire, fun = neutre.
const DEFAULT_CATEGORIES = [
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

// Anciennes catégories par défaut (v1) — utilisées par la migration.
const OLD_DEFAULT_IDS = ["cat-warm", "cat-spicy", "cat-fun"];

function seed() {
  return {
    version: 2,
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    questions: QUESTIONS.map((q) => ({
      id: randomUUID(),
      text: q.text,
      categoryId: "cat-" + q.cat,
      enabled: true,
    })),
  };
}

// Migration non-destructive : ajoute les catégories par défaut manquantes,
// re-classe les questions seed (matchées par texte) hors des anciennes
// catégories v1 vers leur thème, supprime les anciennes catégories devenues vides.
// Ne touche jamais aux questions/catégories ajoutées ou déplacées par l'utilisateur.
function migrate() {
  let changed = false;
  for (const c of DEFAULT_CATEGORIES) {
    if (!data.categories.find((x) => x.id === c.id)) {
      data.categories.push({ ...c });
      changed = true;
    }
  }
  const textToCat = new Map(QUESTIONS.map((q) => [q.text, "cat-" + q.cat]));
  for (const q of data.questions) {
    const target = textToCat.get(q.text);
    if (target && OLD_DEFAULT_IDS.includes(q.categoryId) && q.categoryId !== target) {
      q.categoryId = target;
      changed = true;
    }
  }
  for (const oldId of OLD_DEFAULT_IDS) {
    if (
      data.categories.find((c) => c.id === oldId) &&
      !data.questions.some((q) => q.categoryId === oldId)
    ) {
      data.categories = data.categories.filter((c) => c.id !== oldId);
      changed = true;
    }
  }
  if (changed) {
    data.version = 2;
    persist();
  }
}

// ─── In-memory cache ───
let data = null;

function ensureLoaded() {
  if (data) return data;
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.questions)) {
      data = parsed;
      migrate();
      return data;
    }
  } catch {
    // missing or corrupt → seed below
  }
  data = seed();
  persist();
  return data;
}

function persist() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DATA_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) {
    console.error("[store] persist failed:", e.message);
  }
}

function toneOf(categoryId) {
  const c = ensureLoaded().categories.find((c) => c.id === categoryId);
  return c && TONES.includes(c.tone) ? c.tone : "fun";
}

function clean(s, max = 200) {
  return String(s ?? "").trim().slice(0, max);
}

// ─── Public read ───
export function getData() {
  const d = ensureLoaded();
  const counts = {};
  for (const q of d.questions) counts[q.categoryId] = (counts[q.categoryId] || 0) + 1;
  return {
    categories: d.categories.map((c) => ({ ...c, count: counts[c.id] || 0 })),
    questions: d.questions.map((q) => ({ ...q })),
    stats: {
      total: d.questions.length,
      enabled: d.questions.filter((q) => q.enabled).length,
      byTone: TONES.reduce((acc, t) => {
        acc[t] = d.questions.filter((q) => q.enabled && toneOf(q.categoryId) === t).length;
        return acc;
      }, {}),
    },
  };
}

// Liste publique des catégories avec leur nombre de questions actives.
export function getCategories() {
  const d = ensureLoaded();
  const counts = {};
  for (const q of d.questions) if (q.enabled && clean(q.text)) counts[q.categoryId] = (counts[q.categoryId] || 0) + 1;
  return d.categories.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, tone: c.tone, count: counts[c.id] || 0 }));
}

// ─── Game picker (enabled questions only, optionnellement filtré par catégories) ───
export function pickQuestions(count, categoryIds) {
  const d = ensureLoaded();
  const set = Array.isArray(categoryIds) && categoryIds.length ? new Set(categoryIds) : null;
  const pool = d.questions
    .filter((q) => q.enabled && clean(q.text) && (!set || set.has(q.categoryId)))
    .map((q) => ({ text: q.text, tone: toneOf(q.categoryId) }));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export function enabledCount(categoryIds) {
  const set = Array.isArray(categoryIds) && categoryIds.length ? new Set(categoryIds) : null;
  return ensureLoaded().questions.filter(
    (q) => q.enabled && clean(q.text) && (!set || set.has(q.categoryId))
  ).length;
}

// ─── Categories CRUD ───
export function addCategory({ name, emoji, tone }) {
  const d = ensureLoaded();
  const n = clean(name, 40);
  if (!n) throw new Error("Nom de catégorie requis");
  if (!TONES.includes(tone)) throw new Error("Ambiance invalide");
  const cat = { id: randomUUID(), name: n, emoji: clean(emoji, 4) || "🎲", tone };
  d.categories.push(cat);
  persist();
  return cat;
}

export function updateCategory(id, patch) {
  const d = ensureLoaded();
  const cat = d.categories.find((c) => c.id === id);
  if (!cat) throw new Error("Catégorie introuvable");
  if (patch.name !== undefined) {
    const n = clean(patch.name, 40);
    if (!n) throw new Error("Nom de catégorie requis");
    cat.name = n;
  }
  if (patch.emoji !== undefined) cat.emoji = clean(patch.emoji, 4) || cat.emoji;
  if (patch.tone !== undefined) {
    if (!TONES.includes(patch.tone)) throw new Error("Ambiance invalide");
    cat.tone = patch.tone;
  }
  persist();
  return cat;
}

export function deleteCategory(id, reassignTo) {
  const d = ensureLoaded();
  if (d.categories.length <= 1) throw new Error("Garde au moins une catégorie");
  const cat = d.categories.find((c) => c.id === id);
  if (!cat) throw new Error("Catégorie introuvable");
  const hasQuestions = d.questions.some((q) => q.categoryId === id);
  let target = reassignTo;
  if (hasQuestions) {
    if (!target || target === id || !d.categories.find((c) => c.id === target)) {
      target = d.categories.find((c) => c.id !== id)?.id;
    }
    for (const q of d.questions) if (q.categoryId === id) q.categoryId = target;
  }
  d.categories = d.categories.filter((c) => c.id !== id);
  persist();
  return { ok: true, reassignedTo: hasQuestions ? target : null };
}

// ─── Questions CRUD ───
function assertCategory(d, categoryId) {
  if (!d.categories.find((c) => c.id === categoryId)) throw new Error("Catégorie inconnue");
}

export function addQuestion({ text, categoryId, enabled = true }) {
  const d = ensureLoaded();
  const t = clean(text);
  if (!t) throw new Error("Texte requis");
  assertCategory(d, categoryId);
  const q = { id: randomUUID(), text: t, categoryId, enabled: !!enabled };
  d.questions.unshift(q);
  persist();
  return q;
}

export function addQuestionsBulk(texts, categoryId) {
  const d = ensureLoaded();
  assertCategory(d, categoryId);
  const added = [];
  for (const raw of texts) {
    const t = clean(raw);
    if (!t) continue;
    const q = { id: randomUUID(), text: t, categoryId, enabled: true };
    d.questions.unshift(q);
    added.push(q);
  }
  persist();
  return added;
}

export function updateQuestion(id, patch) {
  const d = ensureLoaded();
  const q = d.questions.find((q) => q.id === id);
  if (!q) throw new Error("Question introuvable");
  if (patch.text !== undefined) {
    const t = clean(patch.text);
    if (!t) throw new Error("Texte requis");
    q.text = t;
  }
  if (patch.categoryId !== undefined) {
    assertCategory(d, patch.categoryId);
    q.categoryId = patch.categoryId;
  }
  if (patch.enabled !== undefined) q.enabled = !!patch.enabled;
  persist();
  return q;
}

export function deleteQuestion(id) {
  const d = ensureLoaded();
  const before = d.questions.length;
  d.questions = d.questions.filter((q) => q.id !== id);
  if (d.questions.length === before) throw new Error("Question introuvable");
  persist();
  return { ok: true };
}
