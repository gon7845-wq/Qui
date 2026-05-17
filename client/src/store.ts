import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { FinalData, Lobby, RevealData } from "./types";

interface State {
  socket: Socket | null;
  selfId: string | null;
  pseudo: string;
  lobby: Lobby | null;
  reveal: RevealData | null;
  final: FinalData | null;
  errorMsg: string | null;
  view: "home" | "create" | "join" | "lobby" | "game" | "final";

  connect: () => Socket;
  setPseudo: (p: string) => void;
  setView: (v: State["view"]) => void;
  setError: (m: string | null) => void;
  createLobby: (settings: {
    anonymous: boolean;
    voteDuration: number;
    questionCount: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  joinLobby: (code: string) => Promise<{ ok: boolean; error?: string }>;
  leave: () => void;
  vote: (targetId: string) => void;
  startGame: () => void;
  nextRound: () => void;
  updateSettings: (settings: Partial<{
    anonymous: boolean;
    voteDuration: number;
    questionCount: number;
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
  view: "home",

  connect: () => {
    let socket = get().socket;
    if (socket) return socket;
    socket = io({
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socket.on("lobby:update", (lobby: Lobby) => {
      set({ lobby });
      const state = get();
      if (lobby.state === "question" && state.view !== "game") {
        set({ view: "game", reveal: null });
      } else if (lobby.state === "ended" && state.view !== "final") {
        // wait for game:end event
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

  updateSettings: (settings) => {
    get().socket?.emit("lobby:settings", { settings });
  },
}));
