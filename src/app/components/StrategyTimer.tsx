"use client";

import { useEffect, useState } from "react";
import type { SerializableGameState } from "@/shared/types";

interface StrategyTimerProps {
  state: SerializableGameState;
}

export default function StrategyTimer({ state }: StrategyTimerProps) {
  const [timeLeft, setTimeLeft] = useState(300_000);

  useEffect(() => {
    if (!state.strategyEndsAt) return;
    let raf: number;
    function tick() {
      const rem = Math.max(0, state.strategyEndsAt! - Date.now());
      setTimeLeft(rem);
      if (rem > 0) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.strategyEndsAt]);

  if (state.phase !== "strategy") return null;

  const totalSec = Math.ceil(timeLeft / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;

  const snaker = state.snakerId ? state.players?.[state.snakerId] : null;
  const snakerName = snaker?.name ?? "?";
  const snakerColor = snaker?.color ?? "green";

  const colorClasses: Record<string, string> = {
    red: "text-red-400",
    blue: "text-blue-400",
    green: "text-green-400",
  };

  return (
    // pointer-events: none on wrapper so the map beneath is fully clickable
    <div
      className="fixed top-14 left-1/2 z-40 flex flex-col items-center gap-1"
      style={{ transform: "translateX(-50%)", pointerEvents: "none" }}
    >
      {/* Compact banner */}
      <div
        className="bg-gray-900/95 border border-purple-700 rounded-xl px-4 py-2 shadow-xl flex items-center gap-4"
        style={{ pointerEvents: "auto" }}
      >
        <span className="text-purple-300 text-sm font-semibold">🗺️ Strategy Phase</span>
        <span className="text-yellow-400 text-lg font-mono font-bold tabular-nums">
          {String(mins).padStart(1, "0")}:{String(secs).padStart(2, "0")}
        </span>
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <span className={`font-bold ${colorClasses[snakerColor]}`}>🐍 {snakerName}</span>
          {state.blockers?.map((bid) => {
            const p = state.players?.[bid];
            return (
              <span key={bid} className={`font-bold ${colorClasses[p?.color ?? "red"]}`}>
                🛡 {p?.name ?? "?"}
              </span>
            );
          })}
        </div>
      </div>
      <p className="text-gray-500 text-xs" style={{ pointerEvents: "none" }}>
        Click stations to view timetables · Game clock starts when timer ends
      </p>
    </div>
  );
}
