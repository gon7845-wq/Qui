// Couche de données (PostgreSQL). Banque globale = owner_id NULL.
// Un ownerId optionnel permet de cibler le contenu privé d'un membre.
import { randomUUID } from "crypto";
import { q } from "./db.js";

export const TONES = ["warm", "spicy", "fun"];

function clean(s, max = 200) {
  return String(s ?? "").trim().slice(0, max);
}
function tone(t) {
  return TONES.includes(t) ? t : "fun";
}

// ─── Lecture admin (banque globale) ───
export async function getData() {
  const cats = await q(
    `SELECT c.id, c.name, c.emoji, c.tone, COUNT(qu.id)::int AS count
     FROM categories c
     LEFT JOIN questions qu ON qu.category_id = c.id AND qu.owner_id IS NULL
     WHERE c.owner_id IS NULL
     GROUP BY c.id ORDER BY c.created_at`
  );
  const qs = await q(
    `SELECT id, text, category_id AS "categoryId", enabled
     FROM questions WHERE owner_id IS NULL ORDER BY created_at DESC`
  );
  const toneById = Object.fromEntries(cats.rows.map((c) => [c.id, c.tone]));
  const stats = {
    total: qs.rows.length,
    enabled: qs.rows.filter((x) => x.enabled).length,
    byTone: TONES.reduce((acc, t) => {
      acc[t] = qs.rows.filter((x) => x.enabled && toneById[x.categoryId] === t).length;
      return acc;
    }, {}),
  };
  return { categories: cats.rows, questions: qs.rows, stats };
}

// Liste publique des catégories (count = questions actives)
export async function getCategories(ownerId = null) {
  const { rows } = await q(
    `SELECT c.id, c.name, c.emoji, c.tone,
            COUNT(qu.id) FILTER (WHERE qu.enabled)::int AS count
     FROM categories c
     LEFT JOIN questions qu ON qu.category_id = c.id
     WHERE c.owner_id IS NOT DISTINCT FROM $1
     GROUP BY c.id ORDER BY c.created_at`,
    [ownerId]
  );
  return rows;
}

// ─── Pioche du jeu ───
export async function pickQuestions(count, categoryIds, ownerId = null) {
  const cats = Array.isArray(categoryIds) && categoryIds.length ? categoryIds : null;
  const { rows } = await q(
    `SELECT qu.text, c.tone
     FROM questions qu JOIN categories c ON c.id = qu.category_id
     WHERE qu.enabled = true
       AND (qu.owner_id IS NULL OR qu.owner_id = $1)
       AND ($2::text[] IS NULL OR qu.category_id = ANY($2))`,
    [ownerId, cats]
  );
  const pool = rows.map((r) => ({ text: r.text, tone: tone(r.tone) }));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export async function enabledCount(categoryIds, ownerId = null) {
  const cats = Array.isArray(categoryIds) && categoryIds.length ? categoryIds : null;
  const { rows } = await q(
    `SELECT COUNT(*)::int AS n FROM questions qu
     WHERE qu.enabled = true
       AND (qu.owner_id IS NULL OR qu.owner_id = $1)
       AND ($2::text[] IS NULL OR qu.category_id = ANY($2))`,
    [ownerId, cats]
  );
  return rows[0].n;
}

// ─── Catégories CRUD ───
export async function addCategory({ name, emoji, tone: t }, ownerId = null) {
  const n = clean(name, 40);
  if (!n) throw new Error("Nom de catégorie requis");
  if (!TONES.includes(t)) throw new Error("Ambiance invalide");
  const id = randomUUID();
  const { rows } = await q(
    `INSERT INTO categories (id, name, emoji, tone, owner_id) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,emoji,tone`,
    [id, n, clean(emoji, 4) || "🎲", t, ownerId]
  );
  return rows[0];
}

export async function updateCategory(id, patch, ownerId = null) {
  const sets = [];
  const vals = [];
  let i = 1;
  if (patch.name !== undefined) {
    const n = clean(patch.name, 40);
    if (!n) throw new Error("Nom de catégorie requis");
    sets.push(`name = $${i++}`);
    vals.push(n);
  }
  if (patch.emoji !== undefined) {
    sets.push(`emoji = $${i++}`);
    vals.push(clean(patch.emoji, 4) || "🎲");
  }
  if (patch.tone !== undefined) {
    if (!TONES.includes(patch.tone)) throw new Error("Ambiance invalide");
    sets.push(`tone = $${i++}`);
    vals.push(patch.tone);
  }
  if (!sets.length) return { ok: true };
  vals.push(id, ownerId);
  const { rowCount } = await q(
    `UPDATE categories SET ${sets.join(", ")} WHERE id = $${i++} AND owner_id IS NOT DISTINCT FROM $${i}`,
    vals
  );
  if (!rowCount) throw new Error("Catégorie introuvable");
  return { ok: true };
}

export async function deleteCategory(id, reassignTo, ownerId = null) {
  const all = await q(`SELECT id FROM categories WHERE owner_id IS NOT DISTINCT FROM $1`, [ownerId]);
  if (all.rows.length <= 1) throw new Error("Garde au moins une catégorie");
  if (!all.rows.find((c) => c.id === id)) throw new Error("Catégorie introuvable");
  const cnt = await q(`SELECT COUNT(*)::int AS n FROM questions WHERE category_id = $1`, [id]);
  let reassignedTo = null;
  if (cnt.rows[0].n > 0) {
    let target = reassignTo;
    if (!target || target === id || !all.rows.find((c) => c.id === target)) {
      target = all.rows.find((c) => c.id !== id)?.id;
    }
    await q(`UPDATE questions SET category_id = $1 WHERE category_id = $2`, [target, id]);
    reassignedTo = target;
  }
  await q(`DELETE FROM categories WHERE id = $1`, [id]);
  return { ok: true, reassignedTo };
}

// ─── Questions CRUD ───
async function assertCategory(categoryId, ownerId) {
  const { rowCount } = await q(
    `SELECT 1 FROM categories WHERE id = $1 AND owner_id IS NOT DISTINCT FROM $2`,
    [categoryId, ownerId]
  );
  if (!rowCount) throw new Error("Catégorie inconnue");
}

export async function addQuestion({ text, categoryId, enabled = true }, ownerId = null) {
  const t = clean(text);
  if (!t) throw new Error("Texte requis");
  await assertCategory(categoryId, ownerId);
  const id = randomUUID();
  const { rows } = await q(
    `INSERT INTO questions (id, text, category_id, enabled, owner_id) VALUES ($1,$2,$3,$4,$5)
     RETURNING id, text, category_id AS "categoryId", enabled`,
    [id, t, categoryId, !!enabled, ownerId]
  );
  return rows[0];
}

export async function addQuestionsBulk(texts, categoryId, ownerId = null) {
  await assertCategory(categoryId, ownerId);
  const added = [];
  for (const raw of texts) {
    const t = clean(raw);
    if (!t) continue;
    await q(
      `INSERT INTO questions (id, text, category_id, enabled, owner_id) VALUES ($1,$2,$3,true,$4)`,
      [randomUUID(), t, categoryId, ownerId]
    );
    added.push(t);
  }
  return { ok: true, added: added.length };
}

export async function updateQuestion(id, patch, ownerId = null) {
  const sets = [];
  const vals = [];
  let i = 1;
  if (patch.text !== undefined) {
    const t = clean(patch.text);
    if (!t) throw new Error("Texte requis");
    sets.push(`text = $${i++}`);
    vals.push(t);
  }
  if (patch.categoryId !== undefined) {
    await assertCategory(patch.categoryId, ownerId);
    sets.push(`category_id = $${i++}`);
    vals.push(patch.categoryId);
  }
  if (patch.enabled !== undefined) {
    sets.push(`enabled = $${i++}`);
    vals.push(!!patch.enabled);
  }
  if (!sets.length) return { ok: true };
  vals.push(id, ownerId);
  const { rowCount } = await q(
    `UPDATE questions SET ${sets.join(", ")} WHERE id = $${i++} AND owner_id IS NOT DISTINCT FROM $${i}`,
    vals
  );
  if (!rowCount) throw new Error("Question introuvable");
  return { ok: true };
}

export async function deleteQuestion(id, ownerId = null) {
  const { rowCount } = await q(
    `DELETE FROM questions WHERE id = $1 AND owner_id IS NOT DISTINCT FROM $2`,
    [id, ownerId]
  );
  if (!rowCount) throw new Error("Question introuvable");
  return { ok: true };
}
