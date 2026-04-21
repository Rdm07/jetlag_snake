"use client";

import { useEffect, useState } from "react";
import type { SerializableGameState } from "@/shared/types";

interface InTransitOverlayProps {
  state: SerializableGameState;
}

export default function InTransitOverlay({ state }: InTransitOverlayProps) {
  const [remainingMins, setRemainingMins] = useState(0);

  useEffect(() => {
    if (!state.activeTrain) return;
    let raf: number;
    function tick() {
      if (!state.activeTrain) return;
      const now = Date.now();
      const realElapsed = (now - state.lastRealTimestamp) / 1000 / 60;
      const gameNow = state.gameTimeMinutes + realElapsed * state.clockAcceleration;
      const rem = Math.max(0, state.activeTrain.arrivalGameMinute - gameNow);
      setRemainingMins(rem);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  if (!state.activeTrain) return null;

  const { service, fromStation, toStation } = state.activeTrain;
  const realSecs = (remainingMins / state.clockAcceleration) * 60;
  const realSecsInt = Math.ceil(realSecs);

  return (
    <div className="space-y-3">
      <p className="font-semibold text-blue-400">🚄 In Transit</p>
      <div className="bg-gray-800 rounded-lg p-3 text-sm space-y-1">
        <p className="text-white font-medium">
          {fromStation.replace(/_/g, " ")} → {toStation.replace(/_/g, " ")}
        </p>
        <p className="text-gray-400">
          {service.type} #{service.trainNum}
        </p>
        <p className="text-gray-400">
          {service.depart} → {service.arrive}
        </p>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-500">Arrives in (game time)</p>
        <p className="text-2xl font-mono font-bold text-blue-300">
          {Math.floor(remainingMins)}m {Math.round((remainingMins % 1) * 60)}s
        </p>
        <p className="text-xs text-gray-600">~{realSecsInt}s real time</p>
      </div>

      <div className="bg-gray-900 rounded p-2 text-xs text-gray-400">
        <span className="font-semibold text-white">{state.blockerActionsRemaining}</span> blocker
        actions remaining
      </div>
    </div>
  );
}
