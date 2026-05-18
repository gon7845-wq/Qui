import { useEffect, useRef } from "react";
import type { Phase, RoomState } from "@qui/shared";
import { audio } from "./audio";

/**
 * Binds soundtrack to the room state machine.
 * - lobby → silence (anticipation)
 * - round:question → start tension drone
 * - round:vote → keep tension; ticks in the final 3s
 * - round:reveal:intro → gavel knock
 * - round:reveal:verdict → verdict sting
 * - end → victory fanfare
 *
 * Also fires a `ding` whenever the local player's vote is recorded.
 */
export function useAudio(state: RoomState | null, playerId: string | null): void {
  const prevPhase = useRef<Phase | null>(null);
  const prevVoted = useRef(false);
  const tickTimer = useRef<number | null>(null);

  // Phase transitions
  useEffect(() => {
    if (!state) return;
    const phase = state.phase;
    const prev = prevPhase.current;

    if (prev !== phase) {
      switch (phase) {
        case "round:question":
          // Game just started (from lobby) — knock the gavel once
          if (prev === "lobby" || prev === "round:score" || prev === "end") {
            audio.gavel();
          }
          audio.startTension();
          break;
        case "round:vote":
          audio.startTension();
          break;
        case "round:reveal:intro":
          audio.stopTension();
          audio.gavel();
          break;
        case "round:reveal:verdict":
          audio.verdictSting();
          break;
        case "round:score":
        case "round:reveal:box":
        case "round:reveal:elimination":
          // silent — let the visuals breathe
          break;
        case "end":
          audio.stopTension();
          audio.victoryFanfare();
          break;
        case "lobby":
          audio.stopTension();
          break;
      }
      prevPhase.current = phase;
    }
  }, [state]);

  // Vote-cast ding
  useEffect(() => {
    if (!state || !playerId) return;
    const voted = (state.round?.votedPlayerIds ?? []).includes(playerId);
    if (voted && !prevVoted.current) audio.ding();
    if (!voted && prevVoted.current) {
      // round changed
    }
    prevVoted.current = voted;
  }, [state, playerId]);

  // Tick-tock in the last 3s of voting
  useEffect(() => {
    if (!state) return;
    if (state.phase !== "round:vote" || state.phaseEndsAt === null) {
      if (tickTimer.current !== null) {
        window.clearTimeout(tickTimer.current);
        tickTimer.current = null;
      }
      return;
    }

    const endsAt = state.phaseEndsAt;
    const scheduleNextTick = () => {
      const now = Date.now();
      const msLeft = endsAt - now;
      if (msLeft <= 0) {
        tickTimer.current = null;
        return;
      }
      // Tick once per second in the final 3s window
      if (msLeft <= 3_000) {
        audio.tick();
        tickTimer.current = window.setTimeout(scheduleNextTick, 1_000);
      } else {
        // Wait until we hit the 3s window
        tickTimer.current = window.setTimeout(scheduleNextTick, msLeft - 3_000);
      }
    };

    scheduleNextTick();
    return () => {
      if (tickTimer.current !== null) {
        window.clearTimeout(tickTimer.current);
        tickTimer.current = null;
      }
    };
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audio.stopTension();
    };
  }, []);
}
