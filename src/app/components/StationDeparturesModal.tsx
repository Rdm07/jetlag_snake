"use client";

import { useMemo } from "react";
import type { StationId, TrainService, TrainStop } from "@/shared/types";
import { STATIONS } from "@/data/network";
import { ADJACENCY } from "@/data/network_edges";
import type { Timetable, Leg } from "@/lib/trainRoutes";
import { buildTrainStops, hhmmToGameMin } from "@/lib/trainRoutes";

interface StationDeparturesModalProps {
  stationId: StationId;
  timetable: Timetable;
  trainIndex: Map<string, Leg[]>;
  gameTimeMinutes: number;
  playerPosition: StationId | null;
  playerRole: "snaker" | "blocker";
  snakeStations: StationId[];
  disableBoarding?: boolean; // e.g. during strategy phase
  onBoard: (service: TrainService, toStation: StationId, allStops: TrainStop[]) => void;
  onClose: () => void;
}

interface DepartureRow {
  service: TrainService;
  toStation: StationId;
  toStationName: string;
  stops: TrainStop[];
}

export default function StationDeparturesModal({
  stationId,
  timetable,
  trainIndex,
  gameTimeMinutes,
  playerPosition,
  playerRole,
  snakeStations,
  disableBoarding = false,
  onBoard,
  onClose,
}: StationDeparturesModalProps) {
  const stationName = STATIONS[stationId]?.name ?? stationId;
  const neighbors = ADJACENCY[stationId] ?? [];

  const departures = useMemo<DepartureRow[]>(() => {
    const rows: DepartureRow[] = [];
    for (const neighbor of neighbors) {
      const key = `${stationId}_to_${neighbor}`;
      const entries = timetable[key] ?? [];
      for (const entry of entries) {
        const departMin = hhmmToGameMin(entry.depart);
        if (departMin < gameTimeMinutes) continue;
        const stops = buildTrainStops(trainIndex, entry.trainNum, stationId, entry.depart);
        rows.push({
          service: {
            trainNum: entry.trainNum,
            type: entry.type,
            depart: entry.depart,
            arrive: entry.arrive,
          },
          toStation: neighbor,
          toStationName: STATIONS[neighbor]?.name ?? neighbor,
          stops,
        });
      }
    }
    rows.sort((a, b) => hhmmToGameMin(a.service.depart) - hhmmToGameMin(b.service.depart));
    return rows;
  }, [stationId, timetable, trainIndex, gameTimeMinutes, neighbors]);

  const atStation = playerPosition === stationId;

  const trainIcon = (type: string) => type.includes("KTX") ? "🚄" : "🚂";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div>
            <h2 className="text-white font-bold text-lg">{stationName}</h2>
            <p className="text-gray-400 text-xs">
              {departures.length === 0
                ? "No upcoming departures"
                : `${departures.length} departure${departures.length !== 1 ? "s" : ""}`}
              {disableBoarding && (
                <span className="ml-2 text-purple-400">· Strategy phase (view only)</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none px-2"
          >
            ×
          </button>
        </div>

        {/* Not-at-station notice */}
        {!atStation && !disableBoarding && (
          <div className="px-4 py-2 bg-yellow-900/40 border-b border-yellow-700/40 text-yellow-300 text-xs">
            You are not at this station — you can view trains but cannot board.
          </div>
        )}

        {/* Departures list */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-800/60">
          {departures.length === 0 ? (
            <div className="px-4 py-10 text-center text-gray-500 text-sm">
              No trains departing from {stationName} for the rest of the day.
            </div>
          ) : (
            departures.map((dep) => {
              const key = `${dep.service.trainNum}-${dep.service.depart}-${dep.toStation}`;
              const isSnakerBlocked = playerRole === "snaker" && snakeStations.includes(dep.toStation);
              const boardDisabled = disableBoarding || !atStation || isSnakerBlocked;

              return (
                <div key={key} className="px-4 py-3 hover:bg-gray-800/40 transition-colors">
                  {/* Train header row */}
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{trainIcon(dep.service.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold">
                          → {dep.toStationName}
                        </span>
                        <span className="text-gray-500 text-xs">#{dep.service.trainNum}</span>
                        <span className="text-gray-500 text-xs">{dep.service.type}</span>
                        {isSnakerBlocked && (
                          <span className="text-red-400 text-xs font-medium">✗ already visited</span>
                        )}
                      </div>
                      <div className="text-sm mt-0.5">
                        <span className="text-green-400 font-mono">{dep.service.depart}</span>
                        <span className="text-gray-500 mx-1">→</span>
                        <span className="text-blue-400 font-mono">{dep.service.arrive}</span>
                      </div>
                    </div>

                    {/* Board button */}
                    {disableBoarding ? (
                      <span className="shrink-0 text-xs text-purple-400 px-2 py-1">
                        View only
                      </span>
                    ) : (
                      <button
                        disabled={boardDisabled}
                        onClick={() => {
                          if (!boardDisabled) {
                            onBoard(dep.service, dep.toStation, dep.stops);
                            onClose();
                          }
                        }}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                          !boardDisabled
                            ? "bg-blue-600 hover:bg-blue-500 text-white"
                            : "bg-gray-700 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        Board
                      </button>
                    )}
                  </div>

                  {/* Stop sequence — always shown */}
                  {dep.stops.length > 0 && (
                    <div className="mt-2 ml-8 space-y-0.5">
                      {dep.stops.map((stop, si) => {
                        const isFirst = si === 0;
                        const isLast = si === dep.stops.length - 1;
                        const name = STATIONS[stop.stationId]?.name ?? stop.stationId;
                        return (
                          <div
                            key={`${stop.stationId}-${si}`}
                            className="flex items-center gap-2 text-xs"
                          >
                            {/* Timeline dot */}
                            <div className="flex flex-col items-center w-3 shrink-0">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isFirst
                                    ? "bg-green-500"
                                    : isLast
                                    ? "bg-red-500"
                                    : "bg-gray-500"
                                }`}
                              />
                            </div>
                            <span
                              className={`flex-1 truncate ${
                                isFirst || isLast ? "text-gray-200 font-medium" : "text-gray-400"
                              }`}
                            >
                              {name}
                            </span>
                            <span className="text-gray-600 shrink-0 font-mono">
                              {isFirst
                                ? `dep ${stop.depart}`
                                : isLast
                                ? `arr ${stop.arrive}`
                                : `${stop.arrive ?? ""} – ${stop.depart ?? ""}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
