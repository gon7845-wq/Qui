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
const DEFAULT_CATEGORIES = [
  { id: "cat-warm", name: "Le meilleur", emoji: "✨", tone: "warm" },
  { id: "cat-spicy", name: "Le pire", emoji: "🔥", tone: "spicy" },
  { id: "cat-fun", name: "Pour rire", emoji: "🎲", tone: "fun" },
];

function seed() {
  const byTone = { warm: "cat-warm", spicy: "cat-spicy", fun: "cat-fun" };
  return {
    version: 1,
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    questions: QUESTIONS.map((q) => ({
      id: randomUUID(),
      text: q.text,
      categoryId: byTone[q.tone] || "cat-fun",
      enabled: true,
    })),
  };
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

// ─── Game picker (enabled questions only) ───
export function pickQuestions(count) {
  const d = ensureLoaded();
  const pool = d.questions
    .filter((q) => q.enabled && clean(q.text))
    .map((q) => ({ text: q.text, tone: toneOf(q.categoryId) }));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export function enabledCount() {
  return ensureLoaded().questions.filter((q) => q.enabled && clean(q.text)).length;
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
