import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { CategoryMeta, FinalData, Lobby, RevealData } from "./types";

interface State {
  socket: Socket | null;
  selfId: string | null;
  pseudo: string;
  lobby: Lobby | null;
  reveal: RevealData | null;
  final: FinalData | null;
  errorMsg: string | null;
  categories: CategoryMeta[];
  view: "home" | "create" | "join" | "lobby" | "game" | "final";

  connect: () => Socket;
  loadCategories: () => Promise<void>;
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
  view: "home",

  loadCategories: async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) set({ categories: await res.json() });
    } catch {}
  },

  connect: () => {
    let socket = get().socket;
    if (socket) return socket;
    socket = io({
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socket.on("lobby:update", (lobby: Lobby) => {
      set({ lobby });
      if (lobby.state === "question") {
        const { view, reveal } = get();
        if (view !== "game" || reveal) {
          set({ view: "game", reveal: null });
        }
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
    socket.on("connect", () => {
      set({ selfId: socket!.id ?? null });
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
