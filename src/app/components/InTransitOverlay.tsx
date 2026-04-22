"use client";

import { useEffect, useState } from "react";
import type { SerializableGameState, PlayerId, ActiveTrain } from "@/shared/types";
import { STATIONS } from "@/data/network";
import { hhmmToGameMin } from "@/lib/trainRoutes";

interface InTransitOverlayProps {
  state: SerializableGameState;
  localPlayerId: PlayerId;
  onDeboard: () => void;
}

function useGameTime(state: SerializableGameState) {
  const [gameNow, setGameNow] = useState(state.gameTimeMinutes);
  useEffect(() => {
    let raf: number;
    function tick() {
      const realElapsed = (Date.now() - state.lastRealTimestamp) / 1000 / 60;
      setGameNow(state.gameTimeMinutes + realElapsed * state.clockAcceleration);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.gameTimeMinutes, state.lastRealTimestamp, state.clockAcceleration]);
  return gameNow;
}

function StopList({
  train,
  gameNow,
  acceleration,
}: {
  train: ActiveTrain;
  gameNow: number;
  acceleration: number;
}) {
  const stops = train.allStops;
  if (!stops || stops.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {stops.map((stop, i) => {
        const isPast = i < train.currentStopIdx;
        const isCurrent = i === train.currentStopIdx;
        const isFuture = i > train.currentStopIdx;
        const name = STATIONS[stop.stationId]?.name ?? stop.stationId;

        let deboardCountdown: string | null = null;
        if (isCurrent && train.deboardWindowOpen && stop.depart) {
          const departGameMin = hhmmToGameMin(stop.depart);
          const remGameMin = Math.max(0, departGameMin - gameNow);
          const remRealSec = Math.ceil((remGameMin / acceleration) * 60);
          deboardCountdown = `${remRealSec}s`;
        }

        return (
          <div
            key={`${stop.stationId}-${i}`}
            className={`flex items-center gap-2 text-xs px-1 ${
              isPast ? "opacity-40" : isCurrent ? "opacity-100" : "opacity-60"
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 border ${
                isPast
                  ? "bg-gray-600 border-gray-500"
                  : isCurrent
                  ? "bg-blue-400 border-blue-300"
                  : "bg-transparent border-gray-500"
              }`}
            />
            <span className={`flex-1 truncate ${isCurrent ? "text-white font-semibold" : "text-gray-400"}`}>
              {isPast ? "✓ " : ""}{name}
            </span>
            {stop.arrive && (
              <span className="text-gray-500 shrink-0">{stop.arrive}</span>
            )}
            {deboardCountdown && (
              <span className="text-yellow-400 shrink-0 font-mono">{deboardCountdown}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TrainCard({
  label,
  train,
  gameNow,
  acceleration,
  canDeboard,
  onDeboard,
}: {
  label: string;
  train: ActiveTrain;
  gameNow: number;
  acceleration: number;
  canDeboard: boolean;
  onDeboard: () => void;
}) {
  const remGameMin = Math.max(0, train.arrivalGameMinute - gameNow);
  const remRealSec = Math.ceil((remGameMin / acceleration) * 60);
  const fromName = STATIONS[train.fromStation]?.name ?? train.fromStation;
  const toName = STATIONS[train.toStation]?.name ?? train.toStation;

  return (
    <div className="bg-gray-800 rounded-lg p-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-blue-400 font-semibold text-xs">{label}</span>
        <div className="flex gap-2">
          {canDeboard && train.currentStopIdx === 0 && !train.deboardWindowOpen && (
            <button
              onClick={onDeboard}
              className="bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium px-2 py-0.5 rounded"
              title="Cancel and return to boarding station"
            >
              Cancel trip
            </button>
          )}
          {canDeboard && train.deboardWindowOpen && (
            <button
              onClick={onDeboard}
              className="bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full animate-pulse"
            >
              Deboard!
            </button>
          )}
        </div>
      </div>
      <p className="text-white font-medium">
        {fromName} → {toName}
      </p>
      <p className="text-gray-400 text-xs">
        {train.service.type} #{train.service.trainNum} &nbsp;·&nbsp;
        {train.service.depart} → {train.service.arrive}
      </p>
      <div className="text-center">
        <p className="text-xs text-gray-500">Arrives in</p>
        <p className="text-xl font-mono font-bold text-blue-300">
          {Math.floor(remGameMin)}m {Math.round((remGameMin % 1) * 60)}s
          <span className="text-xs text-gray-500 ml-2">({remRealSec}s real)</span>
        </p>
      </div>
      <StopList train={train} gameNow={gameNow} acceleration={acceleration} />
    </div>
  );
}

export default function InTransitOverlay({ state, localPlayerId, onDeboard }: InTransitOverlayProps) {
  const gameNow = useGameTime(state);

  const isSnaker = localPlayerId === state.snakerId;
  const isBlocker = state.blockers?.includes(localPlayerId);

  const blockerTrain = isBlocker ? state.blockerActiveTrains?.[localPlayerId] : undefined;
  const hasAnything = state.activeTrain || blockerTrain;

  if (!hasAnything) return null;

  return (
    <div className="space-y-3">
      <p className="font-semibold text-blue-400">🚄 In Transit</p>

      {/* Snaker train */}
      {state.activeTrain && (
        <TrainCard
          label="Snaker's Train"
          train={state.activeTrain}
          gameNow={gameNow}
          acceleration={state.clockAcceleration}
          canDeboard={isSnaker}
          onDeboard={onDeboard}
        />
      )}

      {/* Local blocker's own train */}
      {blockerTrain && (
        <TrainCard
          label="Your Train"
          train={blockerTrain}
          gameNow={gameNow}
          acceleration={state.clockAcceleration}
          canDeboard={isBlocker}
          onDeboard={onDeboard}
        />
      )}

      {/* Other blockers' trains */}
      {state.blockers
        ?.filter((bid) => bid !== localPlayerId && state.blockerActiveTrains?.[bid])
        .map((bid) => {
          const train = state.blockerActiveTrains![bid]!;
          const name = state.players?.[bid]?.name ?? bid;
          return (
            <TrainCard
              key={bid}
              label={`${name}'s Train`}
              train={train}
              gameNow={gameNow}
              acceleration={state.clockAcceleration}
              canDeboard={false}
              onDeboard={() => {}}
            />
          );
        })}

      {/* Shared blocker action pool (shown during snaker's in_transit) */}
      {state.phase === "in_transit" && (
        <div className="bg-gray-900 rounded p-2 text-xs text-gray-400">
          <span className="font-semibold text-white">{state.blockerActionsRemaining}</span> blocker
          actions remaining
        </div>
      )}
    </div>
  );
}
