import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@qui/shared";
import { customAlphabet } from "nanoid";

const gen = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);

export function generateRoomCode(taken: Set<string>): string {
  // 32^4 = ~1M codes — collisions vanishingly rare under realistic load
  for (let i = 0; i < 20; i++) {
    const code = gen();
    if (!taken.has(code)) return code;
  }
  throw new Error("Could not generate unique room code");
}
