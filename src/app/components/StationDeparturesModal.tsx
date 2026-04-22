"use client";

import { useState, useMemo } from "react";
import type { StationId, TrainService, TrainStop } from "@/shared/types";
import { STATIONS, ADJACENCY } from "@/data/network";
import type { Timetable, Leg } from "@/lib/trainRoutes";
import { buildTrainStops, hhmmToGameMin } from "@/lib/trainRoutes";

interface StationDeparturesModalProps {
  stationId: StationId;
  timetable: Timetable;
  trainIndex: Map<string, Leg[]>;
  gameTimeMinutes: number;
  // Position of the player requesting the modal
  playerPosition: StationId | null;
  playerRole: "snaker" | "blocker";
  // Stations already in the snake (snaker cannot revisit)
  snakeStations: StationId[];
  onBoard: (service: TrainService, toStation: StationId, allStops: TrainStop[]) => void;
  onClose: () => void;
}

interface DepartureRow {
  service: TrainService;
  toStation: StationId;
  toStationName: string;
  stops: TrainStop[];
}

function hhmmToDisplay(hhmm: string) {
  return hhmm;
}

export default function StationDeparturesModal({
  stationId,
  timetable,
  trainIndex,
  gameTimeMinutes,
  playerPosition,
  playerRole,
  snakeStations,
  onBoard,
  onClose,
}: StationDeparturesModalProps) {
  const [expandedTrain, setExpandedTrain] = useState<string | null>(null);

  const stationName = STATIONS[stationId]?.name ?? stationId;
  const neighbors = ADJACENCY[stationId] ?? [];

  // Collect all departures from this station to adjacent stations
  const departures = useMemo<DepartureRow[]>(() => {
    const rows: DepartureRow[] = [];
    for (const neighbor of neighbors) {
      const key = `${stationId}_to_${neighbor}`;
      const entries = timetable[key] ?? [];
      for (const entry of entries) {
        const departMin = hhmmToGameMin(entry.depart);
        if (departMin < gameTimeMinutes) continue; // already departed
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
    // Sort by departure time
    rows.sort((a, b) => hhmmToGameMin(a.service.depart) - hhmmToGameMin(b.service.depart));
    return rows;
  }, [stationId, timetable, trainIndex, gameTimeMinutes, neighbors]);

  const atStation = playerPosition === stationId;
  const canBoard = atStation;

  const trainIcon = (type: string) => {
    if (type.includes("KTX")) return "🚄";
    return "🚂";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div>
            <h2 className="text-white font-bold text-lg">{stationName}</h2>
            <p className="text-gray-400 text-xs">
              {departures.length === 0
                ? "No upcoming departures"
                : `${departures.length} departure${departures.length !== 1 ? "s" : ""} available`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Not-at-station notice */}
        {!atStation && (
          <div className="px-4 py-2 bg-yellow-900/40 border-b border-yellow-700/40 text-yellow-300 text-xs">
            You are not at this station — you can view trains but cannot board.
          </div>
        )}

        {/* Departures list */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-800">
          {departures.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No trains departing from {stationName} for the rest of the day.
            </div>
          ) : (
            departures.map((dep, idx) => {
              const key = `${dep.service.trainNum}-${dep.service.depart}-${dep.toStation}`;
              const expanded = expandedTrain === key;
              const isSnakerBlocked = playerRole === "snaker" && snakeStations.includes(dep.toStation);

              return (
                <div key={key} className="px-4 py-3">
                  {/* Main row */}
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{trainIcon(dep.service.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm truncate">
                          → {dep.toStationName}
                        </span>
                        <span className="text-gray-500 text-xs shrink-0">
                          #{dep.service.trainNum}
                        </span>
                        {isSnakerBlocked && (
                          <span className="text-red-400 text-xs shrink-0">visited</span>
                        )}
                      </div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        <span className="text-green-400">{dep.service.depart}</span>
                        {" → "}
                        <span className="text-blue-400">{dep.service.arrive}</span>
                        <span className="text-gray-500 ml-2">{dep.service.type}</span>
                      </div>
                    </div>

                    {/* Expand stops */}
                    {dep.stops.length > 2 && (
                      <button
                        onClick={() => setExpandedTrain(expanded ? null : key)}
                        className="text-gray-400 hover:text-white text-xs shrink-0"
                      >
                        {dep.stops.length - 1} stops {expanded ? "▲" : "▼"}
                      </button>
                    )}

                    {/* Board button */}
                    <button
                      disabled={!canBoard || isSnakerBlocked}
                      onClick={() => {
                        if (canBoard && !isSnakerBlocked) {
                          onBoard(dep.service, dep.toStation, dep.stops);
                          onClose();
                        }
                      }}
                      className={`shrink-0 px-3 py-1 rounded text-sm font-medium transition-colors ${
                        canBoard && !isSnakerBlocked
                          ? "bg-blue-600 hover:bg-blue-500 text-white"
                          : "bg-gray-700 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      Board
                    </button>
                  </div>

                  {/* Expanded stop list */}
                  {expanded && dep.stops.length > 0 && (
                    <div className="mt-2 ml-8 space-y-1">
                      {dep.stops.map((stop, si) => (
                        <div key={`${stop.stationId}-${si}`} className="flex items-center gap-2 text-xs">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              si === 0
                                ? "bg-green-500"
                                : si === dep.stops.length - 1
                                ? "bg-red-500"
                                : "bg-gray-500"
                            }`}
                          />
                          <span className="text-gray-300 w-32 truncate">
                            {STATIONS[stop.stationId]?.name ?? stop.stationId}
                          </span>
                          <span className="text-gray-500">
                            {stop.arrive ? `arr ${stop.arrive}` : ""}
                            {stop.depart ? ` dep ${stop.depart}` : ""}
                          </span>
                        </div>
                      ))}
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
