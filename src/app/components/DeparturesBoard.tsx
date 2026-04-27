"use client";

import { useEffect, useState } from "react";
import type { SerializableGameState, TrainService, StationId } from "@/shared/types";
import { ADJACENCY } from "@/data/network_edges";

interface DeparturesBoardProps {
  state: SerializableGameState;
  onBoardTrain: (service: TrainService, toStation: StationId) => void;
}

type Timetable = Record<string, TrainService[]>;

function gameMinToHHMM(min: number): string {
  // gameTimeMinutes 0 = 07:00
  const total = Math.floor(min) + 7 * 60;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToGameMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m - 7 * 60;
}

export default function DeparturesBoard({ state, onBoardTrain }: DeparturesBoardProps) {
  const [timetable, setTimetable] = useState<Timetable | null>(null);

  useEffect(() => {
    fetch("/data/timetable.json")
      .then((r) => r.json())
      .then(setTimetable)
      .catch(console.error);
  }, []);

  if (!timetable) {
    return <p className="text-gray-500 text-sm">Loading timetable…</p>;
  }

  const head = state.snake[state.snake.length - 1];
  const visitedSet = new Set(state.snake);
  const neighbors = (ADJACENCY[head] ?? []).filter((n) => !visitedSet.has(n));

  // Gather departures for all unvisited neighbors, depart ≥ now
  const now = state.gameTimeMinutes;

  interface Departure {
    toStation: StationId;
    service: TrainService;
    departMin: number;
    arriveMin: number;
    blocked: boolean;
  }

  const departures: Departure[] = [];
  for (const neighbor of neighbors) {
    const key = `${head}_to_${neighbor}`;
    const services = timetable[key] ?? [];

    const segKey = `${head}_to_${neighbor}`;
    const revSegKey = `${neighbor}_to_${head}`;
    const placement =
      state.placements[neighbor] ??
      state.placements[segKey] ??
      state.placements[revSegKey];
    const blocked = placement?.card?.type === "roadblock" || placement?.card?.type === "battle";

    for (const svc of services) {
      const departMin = hhmmToGameMin(svc.depart);
      if (departMin < now) continue; // already departed
      const arriveMin = hhmmToGameMin(svc.arrive);
      departures.push({ toStation: neighbor, service: svc, departMin, arriveMin, blocked });
      break; // only show next train per neighbor
    }
  }

  departures.sort((a, b) => a.departMin - b.departMin);

  if (departures.length === 0) {
    return (
      <div className="text-sm text-orange-400">
        No more trains available — run ends!
      </div>
    );
  }

  const typeIcon = (type: string) =>
    type.toLowerCase().includes("ktx") ? "🚄" : "🚂";

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
        Departures from {head.replace(/_/g, " ")}
      </p>
      {departures.map(({ toStation, service, departMin, arriveMin, blocked }, i) => {
        const travelMin = arriveMin - departMin;
        const isEarliest = i === 0;

        return (
          <button
            key={`${toStation}-${service.trainNum}`}
            onClick={() => !blocked && onBoardTrain(service, toStation)}
            disabled={blocked}
            className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-colors border ${
              blocked
                ? "border-red-800 bg-red-900/20 opacity-60 cursor-not-allowed"
                : isEarliest
                ? "border-yellow-500 bg-yellow-900/30 hover:bg-yellow-900/50"
                : "border-gray-700 bg-gray-800 hover:bg-gray-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {typeIcon(service.type)} → {toStation.replace(/_/g, " ")}
              </span>
              {blocked && <span>🚧</span>}
              {!blocked && isEarliest && (
                <span className="text-yellow-400 font-bold text-xs">NEXT</span>
              )}
            </div>
            <div className="text-gray-400 mt-0.5">
              {service.depart} → {service.arrive} · {travelMin}min · {service.type} #{service.trainNum}
            </div>
          </button>
        );
      })}
    </div>
  );
}
