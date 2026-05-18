import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, RoomState } from "@qui/shared";
import { Room } from "./room.js";
import { generateRoomCode } from "./codeGen.js";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(private io: IO) {}

  public createRoom(host: { pseudo: string }): { room: Room } {
    const code = generateRoomCode(new Set(this.rooms.keys()));
    const room = new Room(
      code,
      host,
      (state) => this.broadcast(code, state),
      (msg, meta) => console.log(`[room ${code}] ${msg}`, meta ?? ""),
      (c) => this.deleteRoom(c)
    );
    this.rooms.set(code, room);
    return { room };
  }

  public getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  public deleteRoom(code: string): void {
    const r = this.rooms.get(code);
    if (!r) return;
    r.destroy();
    this.rooms.delete(code);
  }

  private broadcast(code: string, state: RoomState): void {
    this.io.to(roomChannel(code)).emit("room:state", state);
  }
}

export function roomChannel(code: string): string {
  return `room:${code}`;
}
