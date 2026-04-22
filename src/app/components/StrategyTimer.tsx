"use client";

import { useEffect, useState } from "react";
import type { SerializableGameState } from "@/shared/types";

interface StrategyTimerProps {
  state: SerializableGameState;
}

export default function StrategyTimer({ state }: StrategyTimerProps) {
  const [timeLeft, setTimeLeft] = useState(300);

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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl space-y-6 text-center">
        <div className="text-5xl">🗺️</div>
        <div>
          <h2 className="text-white text-2xl font-bold mb-1">Strategy Phase</h2>
          <p className="text-gray-400 text-sm">
            Plan your moves — game clock starts after this phase.
          </p>
        </div>

        {/* Countdown */}
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Time remaining</p>
          <p className="text-yellow-400 text-5xl font-mono font-bold">
            {String(mins).padStart(1, "0")}:{String(secs).padStart(2, "0")}
          </p>
        </div>

        {/* Role summary */}
        <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-left">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
            This run
          </p>
          <div className="flex items-center gap-2">
            <span className={`font-bold ${colorClasses[snakerColor] ?? "text-green-400"}`}>
              🐍 Snaker
            </span>
            <span className="text-white">{snakerName}</span>
          </div>
          {state.blockers?.map((bid) => {
            const p = state.players?.[bid];
            return (
              <div key={bid} className="flex items-center gap-2">
                <span className={`font-bold ${colorClasses[p?.color ?? "red"] ?? "text-red-400"}`}>
                  🛡 Blocker
                </span>
                <span className="text-white">{p?.name ?? bid}</span>
              </div>
            );
          })}
        </div>

        <p className="text-gray-600 text-xs">
          The map is live — explore stations and check timetables.
        </p>
      </div>
    </div>
  );
}
