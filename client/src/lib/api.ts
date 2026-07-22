import { Capacitor } from "@capacitor/core";

// URL du serveur de production (utilisée par l'app native Capacitor).
// Sur le web, on reste en URLs relatives : client et serveur partagent le domaine.
const PROD_URL = "https://qui-production-8582.up.railway.app";

export const isNative = Capacitor.isNativePlatform();

const configured = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
export const API_BASE = configured ?? (isNative ? PROD_URL : "");

// Origine à utiliser pour les liens partagés (invitation /r/CODE) :
// toujours le site web, jouable sans installer l'app.
export const SHARE_ORIGIN = API_BASE || window.location.origin;

// ─── Token de session (app native : les cookies ne traversent pas les WebViews) ───
const TOKEN_KEY = "qui_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

// fetch vers l'API : préfixe la base, joint le token si présent.
// Sur le web le cookie de session part automatiquement (même origine).
export function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { ...((opts.headers as Record<string, string>) || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...opts, headers });
}
