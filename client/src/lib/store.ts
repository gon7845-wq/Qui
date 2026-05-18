import { create } from "zustand";
import type { RoomState } from "@qui/shared";

interface AppState {
  roomState: RoomState | null;
  playerId: string | null;
  setRoomState: (s: RoomState | null) => void;
  setPlayerId: (id: string | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  roomState: null,
  playerId: null,
  setRoomState: (s) => set({ roomState: s }),
  setPlayerId: (id) => set({ playerId: id }),
  reset: () => set({ roomState: null, playerId: null }),
}));
