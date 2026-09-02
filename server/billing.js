// Droits VIP, offres et encaissement.
//
// Règle produit : **c'est l'hôte qui paie pour toute la table.** Une partie
// créée par un hôte VIP est sans publicité pour les 12 joueurs. C'est le seul
// modèle qui donne une vraie raison de payer à celui qui organise la soirée.
//
// Le droit VIP vit dans `entitlements` et peut venir de trois sources :
//   stripe   → abonnement ou achat unique sur le web (0 % de commission)
//   play     → achat in-app Android (commission Google, obligatoire dans l'app)
//   appstore → achat in-app iOS
//   manual   → offert / compensation / vente directe (accordé depuis l'admin)
import { createHmac, timingSafeEqual } from "crypto";
import express from "express";
import { q } from "./db.js";

const APP_URL = (process.env.APP_URL || "http://localhost:3001").replace(/\/$/, "");

// ─── Offres ───
// Prix en centimes, affichés par le client. Les `priceId` Stripe sont
// configurés en variables d'environnement (rien de secret ici).
export const PLANS = {
  vip_month: {
    id: "vip_month",
    label: "VIP mensuel",
    price: 299,
    currency: "eur",
    period: "mois",
    mode: "subscription",
    stripePriceId: process.env.STRIPE_PRICE_VIP_MONTH || null,
    pitch: "Zéro pub pour toute ta table, questions privées illimitées.",
  },
  vip_year: {
    id: "vip_year",
    label: "VIP annuel",
    price: 1990,
    currency: "eur",
    period: "an",
    mode: "subscription",
    stripePriceId: process.env.STRIPE_PRICE_VIP_YEAR || null,
    pitch: "Deux mois offerts par rapport au mensuel.",
    best: true,
  },
  vip_night: {
    id: "vip_night",
    label: "Soirée sans pub",
    price: 99,
    currency: "eur",
    period: "24 h",
    mode: "payment",
    durationDays: 1,
    stripePriceId: process.env.STRIPE_PRICE_VIP_NIGHT || null,
    pitch: "Pour une soirée, sans engagement. Le prix d'un café.",
  },
};

// Quota gratuit sur les questions privées : la banque publique reste entière
// (elle fait la viralité du jeu), on ne limite que le contenu perso.
export const FREE_PRIVATE_QUESTIONS = Number(process.env.FREE_PRIVATE_QUESTIONS) || 25;

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || null;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || null;
export const stripeReady = !!STRIPE_KEY;

// ─── Lecture du droit VIP ───
// Appelé à chaque création de partie : un petit cache évite un aller-retour
// base à chaque fois, tout en restant assez frais pour qu'un achat prenne
// effet en moins d'une minute.
const vipCache = new Map(); // userId -> { vip, at }
const VIP_TTL = 30_000;

export function invalidateVip(userId) {
  vipCache.delete(userId);
}

export async function isVip(userId) {
  if (!userId) return false;
  const hit = vipCache.get(userId);
  if (hit && Date.now() - hit.at < VIP_TTL) return hit.vip;
  let vip = false;
  try {
    const { rows } = await q(
      `SELECT
         COALESCE((SELECT premium FROM users WHERE id = $1), false) AS manual,
         EXISTS (
           SELECT 1 FROM entitlements
           WHERE user_id = $1 AND status = 'active'
             AND (expires_at IS NULL OR expires_at > now())
         ) AS paid`,
      [userId]
    );
    vip = !!(rows[0]?.manual || rows[0]?.paid);
  } catch (e) {
    // Une panne base ne doit pas transformer un VIP en cible publicitaire :
    // en cas de doute on garde la dernière valeur connue, sinon non-VIP.
    console.error("[billing] isVip:", e.message);
    return hit ? hit.vip : false;
  }
  vipCache.set(userId, { vip, at: Date.now() });
  return vip;
}

export async function getEntitlement(userId) {
  if (!userId) return null;
  const { rows } = await q(
    `SELECT plan, source, status, expires_at AS "expiresAt" FROM entitlements WHERE user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

export async function grantVip({ userId, plan = "vip", source, expiresAt = null, externalId = null }) {
  await q(
    `INSERT INTO entitlements (user_id, plan, source, status, expires_at, external_id, updated_at)
     VALUES ($1,$2,$3,'active',$4,$5, now())
     ON CONFLICT (user_id) DO UPDATE
       SET plan = EXCLUDED.plan, source = EXCLUDED.source, status = 'active',
           expires_at = EXCLUDED.expires_at, external_id = EXCLUDED.external_id,
           updated_at = now()`,
    [userId, plan, source, expiresAt, externalId]
  );
  invalidateVip(userId);
  return { ok: true };
}

export async function revokeVip(userId, status = "canceled") {
  await q(`UPDATE entitlements SET status = $2, updated_at = now() WHERE user_id = $1`, [userId, status]);
  invalidateVip(userId);
  return { ok: true };
}

// ─── Quota de questions privées ───
export async function privateQuestionUsage(userId) {
  const { rows } = await q(`SELECT COUNT(*)::int AS n FROM questions WHERE owner_id = $1`, [userId]);
  const used = rows[0].n;
  const vip = await isVip(userId);
  return { used, limit: vip ? null : FREE_PRIVATE_QUESTIONS, vip };
}

// Lève une erreur lisible côté client si le quota gratuit est atteint.
export async function assertQuestionQuota(userId, adding = 1) {
  const { used, limit } = await privateQuestionUsage(userId);
  if (limit !== null && used + adding > limit) {
    throw new Error(
      `Limite gratuite atteinte (${limit} questions privées). Passe en VIP pour en créer autant que tu veux.`
    );
  }
}

// ─── Appel Stripe en REST (aucune dépendance à installer) ───
async function stripe(path, params, method = "POST") {
  const body = new URLSearchParams();
  const walk = (obj, prefix = "") => {
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;
      const key = prefix ? `${prefix}[${k}]` : k;
      if (typeof v === "object" && !Array.isArray(v)) walk(v, key);
      else if (Array.isArray(v)) v.forEach((item, i) => walk(item, `${key}[${i}]`));
      else body.append(key, String(v));
    }
  };
  if (params) walk(params);
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "POST" ? body : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Stripe ${res.status}`);
  return json;
}

// Vérifie la signature `Stripe-Signature` (schéma v1 : HMAC-SHA256 de "t.payload").
function verifyStripeSignature(rawBody, header) {
  if (!STRIPE_WEBHOOK_SECRET || !header) return false;
  const parts = Object.fromEntries(
    String(header)
      .split(",")
      .map((p) => p.split("=").map((x) => x.trim()))
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  // rejette les signatures trop anciennes (rejeu)
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = createHmac("sha256", STRIPE_WEBHOOK_SECRET).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ─── Configuration publique (consommée par le client) ───
export function publicBilling() {
  return {
    plans: Object.values(PLANS).map(({ stripePriceId, ...p }) => ({ ...p, buyable: !!stripePriceId && stripeReady })),
    freePrivateQuestions: FREE_PRIVATE_QUESTIONS,
    checkout: stripeReady ? "stripe" : null,
  };
}

// ─── Le webhook a besoin du corps brut : à monter AVANT express.json() ───
export function mountBillingWebhook(app) {
  app.post("/api/billing/webhook", express.raw({ type: "*/*", limit: "1mb" }), async (req, res) => {
    if (!STRIPE_WEBHOOK_SECRET) return res.status(501).json({ error: "Webhook Stripe non configuré" });
    const raw = req.body?.toString("utf8") ?? "";
    if (!verifyStripeSignature(raw, req.headers["stripe-signature"])) {
      return res.status(400).json({ error: "Signature invalide" });
    }
    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      return res.status(400).json({ error: "Corps illisible" });
    }
    try {
      await handleStripeEvent(event);
    } catch (e) {
      console.error("[billing] webhook:", e.message);
      return res.status(500).json({ error: "Erreur de traitement" });
    }
    res.json({ received: true });
  });
}

async function handleStripeEvent(event) {
  const obj = event.data?.object || {};
  switch (event.type) {
    case "checkout.session.completed": {
      const userId = obj.client_reference_id || obj.metadata?.userId;
      const planId = obj.metadata?.planId;
      if (!userId) return;
      const plan = PLANS[planId];
      // Achat unique à durée limitée (« soirée sans pub ») → on pose une date
      // de fin ; abonnement → pas de date, la fin viendra par un autre event.
      const expiresAt =
        plan?.durationDays != null ? new Date(Date.now() + plan.durationDays * 86400_000).toISOString() : null;
      await grantVip({
        userId,
        plan: planId || "vip",
        source: "stripe",
        expiresAt,
        externalId: obj.subscription || obj.id,
      });
      console.log(`[billing] VIP accordé à ${userId} (${planId || "vip"})`);
      return;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const userId = obj.metadata?.userId;
      if (!userId) return;
      const alive = obj.status === "active" || obj.status === "trialing";
      if (alive) {
        await grantVip({
          userId,
          plan: "vip",
          source: "stripe",
          expiresAt: obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : null,
          externalId: obj.id,
        });
      } else {
        await revokeVip(userId, obj.status === "canceled" ? "canceled" : "expired");
      }
      return;
    }
    default:
      return; // les autres events ne nous concernent pas
  }
}

// ─── Routes membre + admin ───
export function mountBilling(app, { requireUser, adminAuth }) {
  // État de l'abonnement + quota, pour l'espace membre
  app.get("/api/billing/state", requireUser, async (req, res) => {
    try {
      const [ent, usage] = await Promise.all([getEntitlement(req.uid), privateQuestionUsage(req.uid)]);
      res.json({ vip: usage.vip, entitlement: ent, usage, ...publicBilling() });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Ouvre une session de paiement Stripe Checkout
  app.post("/api/billing/checkout", requireUser, async (req, res) => {
    const plan = PLANS[req.body?.plan];
    if (!plan) return res.status(400).json({ error: "Offre inconnue" });
    if (!stripeReady) return res.status(501).json({ error: "Paiement non configuré (STRIPE_SECRET_KEY manquante)" });
    if (!plan.stripePriceId) {
      return res.status(501).json({ error: `Tarif Stripe non configuré pour l'offre « ${plan.label} »` });
    }
    try {
      const session = await stripe("checkout/sessions", {
        mode: plan.mode,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        client_reference_id: req.uid,
        metadata: { userId: req.uid, planId: plan.id },
        // pour un abonnement, l'id user doit aussi vivre sur la subscription :
        // les events de renouvellement ne portent pas la session de checkout
        ...(plan.mode === "subscription"
          ? { subscription_data: { metadata: { userId: req.uid, planId: plan.id } } }
          : {}),
        success_url: `${APP_URL}/moi?paiement=ok`,
        cancel_url: `${APP_URL}/moi?paiement=annule`,
        allow_promotion_codes: true,
      });
      res.json({ url: session.url });
    } catch (e) {
      console.error("[billing] checkout:", e.message);
      res.status(502).json({ error: "Impossible d'ouvrir le paiement" });
    }
  });

  // Achats in-app (Play / App Store).
  // Tant que la validation de reçu n'est pas branchée sur les API des stores,
  // on REFUSE : accorder le VIP sur un reçu non vérifié, c'est offrir le
  // produit à quiconque sait envoyer une requête HTTP.
  app.post("/api/billing/mobile-purchase", requireUser, async (req, res) => {
    const store = req.body?.store;
    if (!["play", "appstore"].includes(store)) return res.status(400).json({ error: "Store inconnu" });
    if (typeof req.body?.receipt !== "string" || !req.body.receipt) {
      return res.status(400).json({ error: "Reçu manquant" });
    }
    return res.status(501).json({
      error:
        "Validation des achats in-app pas encore branchée. Il faut créer les produits sur Google Play / App Store Connect, puis configurer GOOGLE_PLAY_SA_JSON / APPSTORE_KEY.",
    });
  });

  // Attribution manuelle : permet de vendre / offrir le VIP dès aujourd'hui,
  // sans attendre Stripe (utile aussi pour le support client).
  app.post("/api/admin/vip", adminAuth, async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const days = req.body?.days == null ? null : Number(req.body.days);
    if (!email.includes("@")) return res.status(400).json({ error: "E-mail invalide" });
    if (days !== null && (!Number.isFinite(days) || days <= 0)) {
      return res.status(400).json({ error: "Durée invalide" });
    }
    try {
      const { rows } = await q("SELECT id FROM users WHERE email = $1", [email]);
      const userId = rows[0]?.id;
      if (!userId) return res.status(404).json({ error: "Aucun compte avec cet e-mail" });
      if (req.body?.revoke) {
        await revokeVip(userId);
        return res.json({ ok: true, vip: false });
      }
      await grantVip({
        userId,
        source: "manual",
        expiresAt: days ? new Date(Date.now() + days * 86400_000).toISOString() : null,
      });
      res.json({ ok: true, vip: true, expiresAt: days ? days + " jours" : "à vie" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}
