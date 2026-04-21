"use client";

import { useEffect, useState } from "react";
import type { SerializableGameState } from "@/shared/types";

interface GameClockProps {
  state: SerializableGameState;
}

export default function GameClock({ state }: GameClockProps) {
  const [displayMin, setDisplayMin] = useState(state.gameTimeMinutes);

  useEffect(() => {
    let raf: number;
    function tick() {
      const now = Date.now();
      const realElapsed = (now - state.lastRealTimestamp) / 1000 / 60;
      const gameMins = state.gameTimeMinutes + realElapsed * state.clockAcceleration;
      setDisplayMin(Math.min(gameMins, 720));
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.gameTimeMinutes, state.lastRealTimestamp, state.clockAcceleration]);

  // Convert game minutes to wall-clock: 0 min = 07:00
  const totalMin = Math.floor(displayMin) + 7 * 60;
  const hh = Math.floor(totalMin / 60) % 24;
  const mm = totalMin % 60;
  const label = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;

  const phaseName: Record<string, string> = {
    lobby: "Lobby",
    blocker_headstart: "Head Start",
    playing: "Playing",
    in_transit: "In Transit",
    challenge: "Challenge!",
    run_end: "Run Over",
    finished: "Game Over",
  };

  return (
    <div className="flex items-center gap-3 bg-gray-900 rounded px-3 py-1.5">
      <span className="font-mono text-yellow-400 text-xl font-bold tracking-widest">{label}</span>
      <span className="text-gray-400 text-xs">{phaseName[state.phase] ?? state.phase}</span>
      <span className="text-gray-600 text-xs">{state.clockAcceleration}×</span>
    </div>
  );
}
