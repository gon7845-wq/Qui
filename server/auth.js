import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { q } from "./db.js";

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const APP_URL = (process.env.APP_URL || "http://localhost:3001").replace(/\/$/, "");
const COOKIE = "qui_session";
const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const RESEND_KEY = process.env.RESEND_API_KEY;
const ALLOW_DEV_LOGIN = process.env.ALLOW_DEV_LOGIN === "true";

// ─── Users ───
export async function upsertUser({ email, name, avatar, provider }) {
  email = String(email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Email invalide");
  const found = await q("SELECT id, email FROM users WHERE email = $1", [email]);
  if (found.rows[0]) {
    await q(
      "UPDATE users SET name = COALESCE($2, name), avatar = COALESCE($3, avatar) WHERE id = $1",
      [found.rows[0].id, name || null, avatar || null]
    );
    return found.rows[0];
  }
  const id = randomUUID();
  await q(
    "INSERT INTO users (id, email, name, avatar, provider) VALUES ($1,$2,$3,$4,$5)",
    [id, email, name || null, avatar || null, provider || "email"]
  );
  return { id, email };
}

export async function getUserById(id) {
  if (!id) return null;
  const r = await q("SELECT id, email, name, avatar, premium FROM users WHERE id = $1", [id]);
  return r.rows[0] || null;
}

// ─── Sessions ───
function signSession(user) {
  return jwt.sign({ uid: user.id, email: user.email }, SECRET, { expiresIn: "60d" });
}
function verifySession(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
function setCookie(res, user) {
  res.cookie(COOKIE, signSession(user), {
    httpOnly: true,
    secure: APP_URL.startsWith("https"),
    sameSite: "lax",
    maxAge: 60 * 24 * 3600 * 1000,
    path: "/",
  });
}

export function userIdFromReq(req) {
  const tok = req.cookies?.[COOKIE];
  return tok ? verifySession(tok)?.uid || null : null;
}

export function userIdFromCookieHeader(header) {
  if (!header) return null;
  const part = header.split(";").map((s) => s.trim()).find((s) => s.startsWith(COOKIE + "="));
  if (!part) return null;
  return verifySession(decodeURIComponent(part.slice(COOKIE.length + 1)))?.uid || null;
}

export function requireUser(req, res, next) {
  const uid = userIdFromReq(req);
  if (!uid) return res.status(401).json({ error: "Non connecté" });
  req.uid = uid;
  next();
}

async function sendMagicEmail(email, link) {
  if (!RESEND_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Qui ? <onboarding@resend.dev>",
      to: [email],
      subject: "Ta connexion à Qui ?",
      html: `<div style="font-family:sans-serif"><h2>Connexion à Qui ?</h2><p>Clique pour te connecter (valable 20 min) :</p><p><a href="${link}" style="background:#FF5E8A;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Se connecter →</a></p></div>`,
    }),
  });
  return res.ok;
}

// ─── Routes ───
export function mountAuth(app) {
  app.get("/api/auth/me", async (req, res) => {
    res.json({ user: await getUserById(userIdFromReq(req)) });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie(COOKIE, { path: "/" });
    res.json({ ok: true });
  });

  // ── Google OAuth ──
  app.get("/api/auth/google", (_req, res) => {
    if (!GOOGLE_ID) return res.status(500).send("Google non configuré");
    const params = new URLSearchParams({
      client_id: GOOGLE_ID,
      redirect_uri: `${APP_URL}/api/auth/google/callback`,
      response_type: "code",
      scope: "openid email profile",
      access_type: "online",
      prompt: "select_account",
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const code = req.query.code;
      if (!code) return res.redirect("/?auth=error");
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_ID,
          client_secret: GOOGLE_SECRET,
          redirect_uri: `${APP_URL}/api/auth/google/callback`,
          grant_type: "authorization_code",
        }),
      });
      const tok = await tokenRes.json();
      if (!tok.access_token) return res.redirect("/?auth=error");
      const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      const info = await infoRes.json();
      const user = await upsertUser({
        email: info.email,
        name: info.name,
        avatar: info.picture,
        provider: "google",
      });
      setCookie(res, user);
      res.redirect("/moi");
    } catch (e) {
      console.error("[auth] google callback:", e.message);
      res.redirect("/?auth=error");
    }
  });

  // ── Lien magique ──
  app.post("/api/auth/magic", async (req, res) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      if (!email.includes("@")) return res.status(400).json({ error: "Email invalide" });
      const token = randomUUID();
      await q(
        "INSERT INTO auth_tokens (token, email, expires_at) VALUES ($1,$2, now() + interval '20 minutes')",
        [token, email]
      );
      const link = `${APP_URL}/api/auth/magic/callback?token=${token}`;
      const sent = await sendMagicEmail(email, link);
      if (sent) return res.json({ ok: true });
      if (ALLOW_DEV_LOGIN) return res.json({ ok: true, devLink: link }); // local: pas d'email
      return res.status(500).json({ error: "Envoi d'e-mail non configuré" });
    } catch (e) {
      res.status(500).json({ error: "Erreur" });
    }
  });

  app.get("/api/auth/magic/callback", async (req, res) => {
    try {
      const token = req.query.token;
      if (!token) return res.redirect("/?auth=error");
      const r = await q(
        "DELETE FROM auth_tokens WHERE token = $1 AND expires_at > now() RETURNING email",
        [token]
      );
      const email = r.rows[0]?.email;
      if (!email) return res.redirect("/?auth=expired");
      const user = await upsertUser({ email, provider: "email" });
      setCookie(res, user);
      res.redirect("/moi");
    } catch (e) {
      res.redirect("/?auth=error");
    }
  });

  // ── Dev login (local uniquement) ──
  if (ALLOW_DEV_LOGIN) {
    app.get("/api/auth/dev", async (req, res) => {
      const user = await upsertUser({
        email: String(req.query.email || "dev@local.test"),
        name: String(req.query.name || "Dev"),
        provider: "dev",
      });
      setCookie(res, user);
      res.redirect("/moi");
    });
  }
}
