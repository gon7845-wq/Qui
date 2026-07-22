import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { CategoryMeta, FinalData, Lobby, RevealData, User } from "./types";
import { API_BASE, apiFetch, getToken, setToken } from "./lib/api";

const SESSION_KEY = "qui_session";
function saveSession(code: string, pid: string) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ code, pid }));
  } catch {}
}
function readSession(): { code: string; pid: string } | null {
  try {
    const o = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return o && o.code && o.pid ? o : null;
  } catch {
    return null;
  }
}
function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

const THEME_KEY = "qui_theme";
function initialTheme(): "light" | "dark" {
  // le script inline de index.html a déjà lu localStorage et posé data-theme
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

interface State {
  socket: Socket | null;
  selfId: string | null;
  pseudo: string;
  lobby: Lobby | null;
  reveal: RevealData | null;
  final: FinalData | null;
  errorMsg: string | null;
  categories: CategoryMeta[];
  user: User | null;
  theme: "light" | "dark";
  view: "home" | "create" | "join" | "lobby" | "game" | "final";

  toggleTheme: () => void;
  connect: () => Socket;
  loadCategories: () => Promise<void>;
  loadMe: () => Promise<void>;
  logout: () => Promise<void>;
  setPseudo: (p: string) => void;
  setView: (v: State["view"]) => void;
  setError: (m: string | null) => void;
  createLobby: (settings: {
    anonymous: boolean;
    voteDuration: number;
    questionCount: number;
    allowSelfVote: boolean;
    categories: string[];
  }) => Promise<{ ok: boolean; error?: string }>;
  joinLobby: (code: string) => Promise<{ ok: boolean; error?: string }>;
  leave: () => void;
  vote: (targetId: string) => void;
  startGame: () => void;
  nextRound: () => void;
  backToLobby: () => void;
  pause: () => void;
  resume: () => void;
  setAvatar: (emoji: string) => void;
  updateSettings: (settings: Partial<{
    anonymous: boolean;
    voteDuration: number;
    questionCount: number;
    allowSelfVote: boolean;
    categories: string[];
  }>) => void;
}

export const useStore = create<State>((set, get) => ({
  socket: null,
  selfId: null,
  pseudo: "",
  lobby: null,
  reveal: null,
  final: null,
  errorMsg: null,
  categories: [],
  user: null,
  theme: initialTheme(),
  view: "home",

  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    document.documentElement.dataset.theme = next;
    set({ theme: next });
  },

  loadCategories: async () => {
    try {
      const res = await apiFetch("/api/categories");
      if (res.ok) set({ categories: await res.json() });
    } catch {}
  },

  loadMe: async () => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.ok) set({ user: (await res.json()).user || null });
    } catch {}
  },

  logout: async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setToken(null);
    set({ user: null });
  },

  connect: () => {
    let socket = get().socket;
    if (socket) return socket;
    socket = io(API_BASE || undefined, {
      transports: ["websocket", "polling"],
      reconnection: true,
      // App native : le cookie de session ne traverse pas, on passe le token
      auth: (cb) => cb({ token: getToken() }),
    });
    socket.on("lobby:update", (lobby: Lobby) => {
      if (lobby.state === "question" || lobby.state === "countdown") {
        set({ lobby, view: "game", reveal: null });
      } else if (lobby.state === "waiting" && get().view !== "lobby") {
        // retour au lobby (ex: "Rejouer")
        set({ lobby, view: "lobby", reveal: null, final: null });
      } else {
        set({ lobby });
      }
    });
    socket.on("game:reveal", (data: RevealData) => {
      set({ reveal: data });
    });
    socket.on("game:end", (data: FinalData) => {
      set({ final: data, view: "final", reveal: null });
    });
    socket.on("error:msg", ({ message }: { message: string }) => {
      set({ errorMsg: message });
      setTimeout(() => set({ errorMsg: null }), 3000);
    });
    // À chaque (re)connexion, on tente de reprendre la partie en cours
    socket.on("connect", () => {
      const sess = readSession();
      if (!sess) return;
      // si l'URL pointe vers un autre lobby, on ne reprend pas l'ancien
      const m = window.location.pathname.match(/^\/r\/([A-Z0-9]{4})/i);
      const pathCode = m ? m[1].toUpperCase() : null;
      if (pathCode && pathCode !== sess.code) return;
      socket!.emit("lobby:rejoin", sess, (res: any) => {
        if (res?.ok) {
          const view =
            res.lobby.state === "ended"
              ? "final"
              : res.lobby.state === "waiting"
              ? "lobby"
              : "game";
          set({
            lobby: res.lobby,
            selfId: res.selfId,
            reveal: res.reveal || null,
            final: res.final || null,
            view,
          });
          if (res.code) window.history.replaceState(null, "", `/r/${res.code}`);
        } else {
          clearSession();
        }
      });
    });
    set({ socket });
    return socket;
  },

  setPseudo: (p) => set({ pseudo: p }),
  setView: (v) => set({ view: v }),
  setError: (m) => set({ errorMsg: m }),

  createLobby: (settings) =>
    new Promise((resolve) => {
      const s = get().connect();
      s.emit(
        "lobby:create",
        { pseudo: get().pseudo, settings },
        (res: any) => {
          if (res?.ok) {
            set({
              lobby: res.lobby,
              selfId: res.selfId,
              view: "lobby",
            });
            saveSession(res.code, res.selfId);
            window.history.replaceState(null, "", `/r/${res.code}`);
            resolve({ ok: true });
          } else {
            resolve({ ok: false, error: res?.error || "Erreur" });
          }
        }
      );
    }),

  joinLobby: (code) =>
    new Promise((resolve) => {
      const s = get().connect();
      s.emit(
        "lobby:join",
        { code: code.toUpperCase().trim(), pseudo: get().pseudo },
        (res: any) => {
          if (res?.ok) {
            set({
              lobby: res.lobby,
              selfId: res.selfId,
              view: "lobby",
            });
            saveSession(res.code, res.selfId);
            window.history.replaceState(null, "", `/r/${res.code}`);
            resolve({ ok: true });
          } else {
            resolve({ ok: false, error: res?.error || "Erreur" });
          }
        }
      );
    }),

  leave: () => {
    const s = get().socket;
    s?.emit("lobby:leave");
    clearSession();
    set({ lobby: null, reveal: null, final: null, view: "home" });
    window.history.replaceState(null, "", "/");
  },

  vote: (targetId) => {
    get().socket?.emit("game:vote", { targetId });
  },

  startGame: () => {
    get().socket?.emit("game:start");
  },

  nextRound: () => {
    get().socket?.emit("game:next");
  },

  backToLobby: () => {
    get().socket?.emit("game:tolobby");
  },

  pause: () => {
    get().socket?.emit("game:pause");
  },

  resume: () => {
    get().socket?.emit("game:resume");
  },

  setAvatar: (emoji) => {
    get().socket?.emit("lobby:avatar", { avatar: emoji });
  },

  updateSettings: (settings) => {
    get().socket?.emit("lobby:settings", { settings });
  },
}));
