"use client";

import { useEffect, useState } from "react";
import type { SerializableGameState, PlayerId, ClientMessage } from "@/shared/types";

interface PauseButtonProps {
  state: SerializableGameState;
  localPlayerId: PlayerId;
  send: (msg: ClientMessage) => void;
}

const HIDDEN_PHASES = new Set(["lobby", "strategy", "run_end", "finished"]);

export default function PauseButton({ state, localPlayerId, send }: PauseButtonProps) {
  const [countdown, setCountdown] = useState(0);

  const isPaused = !!(state.pausedUntil && Date.now() < state.pausedUntil);

  useEffect(() => {
    if (!state.pausedUntil) return;
    let raf: number;
    function tick() {
      const rem = Math.max(0, Math.ceil((state.pausedUntil! - Date.now()) / 1000));
      setCountdown(rem);
      if (rem > 0) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.pausedUntil]);

  if (HIDDEN_PHASES.has(state.phase)) return null;

  return (
    <>
      {/* Pause button in header */}
      <button
        onClick={() => send({ type: "request_pause", playerId: localPlayerId })}
        disabled={state.pausesRemaining <= 0 || isPaused}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          isPaused
            ? "bg-yellow-600 text-white cursor-default"
            : state.pausesRemaining > 0
            ? "bg-gray-700 hover:bg-gray-600 text-white"
            : "bg-gray-800 text-gray-600 cursor-not-allowed"
        }`}
        title={state.pausesRemaining <= 0 ? "No pauses remaining" : "Pause game for 1 minute"}
      >
        {isPaused ? `⏸ Paused (${countdown}s)` : `⏸ Pause (${state.pausesRemaining} left)`}
      </button>

      {/* Full-screen overlay when paused */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="text-6xl">⏸</div>
            <h2 className="text-white text-3xl font-bold">Game Paused</h2>
            <p className="text-gray-300 text-lg">Resuming in</p>
            <p className="text-yellow-400 text-6xl font-mono font-bold">{countdown}s</p>
            <p className="text-gray-500 text-sm">
              {state.pausesRemaining} pause{state.pausesRemaining !== 1 ? "s" : ""} remaining this run
            </p>
          </div>
        </div>
      )}
    </>
  );
}
