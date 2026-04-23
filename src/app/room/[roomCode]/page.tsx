"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import PartySocket from "partysocket";
import type {
  SerializableGameState,
  ClientMessage,
  PlayerId,
  StationId,
  SegmentId,
  TrainService,
  TrainStop,
} from "@/shared/types";
import TrainMap from "@/app/components/TrainMap";
import GameClock from "@/app/components/GameClock";
import Lobby from "@/app/components/Lobby";
import InTransitOverlay from "@/app/components/InTransitOverlay";
import BlockerPanel from "@/app/components/BlockerPanel";
import ChallengeHost from "@/app/components/challenges/ChallengeHost";
import StationDeparturesModal from "@/app/components/StationDeparturesModal";
import PauseButton from "@/app/components/PauseButton";
import StrategyTimer from "@/app/components/StrategyTimer";
import { useToast } from "@/app/components/Toast";
import type { Timetable } from "@/lib/trainRoutes";
import { buildTrainIndex } from "@/lib/trainRoutes";

const PARTYKIT_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";

function getOrCreatePlayerId(): PlayerId {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("jetlag_player_id");
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem("jetlag_player_id", id);
  }
  return id;
}

export default function RoomPage() {
  const params = useParams();
  const roomCode = (params?.roomCode as string) ?? "";

  const [state, setState] = useState<SerializableGameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<PlayerId>(getOrCreatePlayerId);
  const socketRef = useRef<PartySocket | null>(null);
  const { addToast, ToastContainer } = useToast();

  // Timetable + train index (loaded once)
  const [timetable, setTimetable] = useState<Timetable>({});
  const trainIndex = useMemo(() => buildTrainIndex(timetable), [timetable]);

  // Station click → departures modal
  const [clickedStation, setClickedStation] = useState<StationId | null>(null);

  // Blocker card placement target (set by clicking a station on the map)
  const [selectedTarget, setSelectedTarget] = useState<{
    stationId?: StationId;
    segmentId?: SegmentId;
  } | null>(null);
  const [pendingCardPlacement, setPendingCardPlacement] = useState(false);

  const send = useCallback((msg: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg));
  }, []);

  // Load timetable
  useEffect(() => {
    fetch("/data/timetable.json")
      .then((r) => r.json())
      .then((data) => setTimetable(data))
      .catch(() => {});
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (!roomCode) return;

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomCode,
      id: localPlayerId,
    });
    socketRef.current = socket;

    socket.addEventListener("message", (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "state_update") {
          setState((prev) => {
            const next = msg.state as SerializableGameState;
            if (prev) {
              const prevKeys = new Set(Object.keys(prev.placements ?? {}));
              for (const key of Object.keys(next.placements ?? {})) {
                if (!prevKeys.has(key)) {
                  const p = next.placements[key];
                  const by = next.players[p.placedBy]?.name ?? "A blocker";
                  addToast(`${by} placed ${p.card.type} at ${key.replace(/_/g, " ")}`);
                }
              }
            }
            return next;
          });
        }
      } catch {}
    });

    return () => socket.close();
  }, [roomCode, localPlayerId]);

  const handleStationClick = useCallback((stationId: StationId) => {
    if (pendingCardPlacement) {
      // Set as card placement target instead of opening departures
      setSelectedTarget({ stationId });
      setPendingCardPlacement(false);
      return;
    }
    setClickedStation(stationId);
  }, [pendingCardPlacement]);

  const handleBoardTrain = useCallback((service: TrainService, toStation: StationId, allStops: TrainStop[]) => {
    send({ type: "board_train", playerId: localPlayerId, service, toStation, allStops });
  }, [send, localPlayerId]);

  const handleDeboard = useCallback(() => {
    send({ type: "deboard_train", playerId: localPlayerId });
  }, [send, localPlayerId]);

  const handleSoloTest = useCallback(() => {
    send({ type: "solo_test" });
  }, [send]);

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Connecting to room {roomCode}…
      </div>
    );
  }

  const phase = state.phase;
  const role = state.players[localPlayerId]?.role;
  const isTestMode = Object.keys(state.players).some((id) => id.startsWith("__bot"));

  // Current player position (for departures modal)
  const playerPosition: StationId | null =
    role === "snaker"
      ? state.snake?.[state.snake.length - 1] ?? null
      : state.blockerPositions?.[localPlayerId] ?? null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-300">
            Room <span className="text-white font-mono">{roomCode}</span>
          </span>
          <button
            className="text-xs text-gray-500 hover:text-gray-300 bg-gray-800 px-2 py-0.5 rounded"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              addToast("Invite link copied!");
            }}
          >
            Copy invite
          </button>
        </div>
        {phase !== "lobby" && <GameClock state={state} />}
        <div className="flex items-center gap-2">
          {isTestMode ? (
            <div className="flex gap-1">
              {Object.entries(state.players).map(([id, p]) => (
                <button
                  key={id}
                  onClick={() => setLocalPlayerId(id)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    id === localPlayerId
                      ? "bg-yellow-500 text-black font-bold"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">
              {state.players[localPlayerId]?.name ?? "…"} —{" "}
              {state.players[localPlayerId]?.role ?? "joining"}
            </span>
          )}
          <PauseButton state={state} localPlayerId={localPlayerId} send={send} />
        </div>
      </header>
      <ToastContainer />

      {/* Strategy phase overlay (shown over the map) */}
      {phase === "strategy" && <StrategyTimer state={state} />}

      {/* Departures modal */}
      {clickedStation && (
        <StationDeparturesModal
          stationId={clickedStation}
          timetable={timetable}
          trainIndex={trainIndex}
          gameTimeMinutes={state.gameTimeMinutes}
          playerPosition={playerPosition}
          playerRole={role ?? "blocker"}
          snakeStations={state.snake ?? []}
          disableBoarding={state.phase === "strategy"}
          onBoard={handleBoardTrain}
          onClose={() => setClickedStation(null)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {phase === "lobby" ? (
          <Lobby
            state={state}
            localPlayerId={localPlayerId}
            onSetName={(name) => send({ type: "set_name", name })}
            onSetAcceleration={(value) => send({ type: "set_acceleration", value })}
            onStartGame={() => send({ type: "start_game" })}
            onSoloTest={handleSoloTest}
          />
        ) : (
          <div className="flex flex-1 gap-0 overflow-hidden">
            {/* Map */}
            <div className="flex-1 overflow-hidden">
              <TrainMap
                state={state}
                localPlayerId={localPlayerId}
                onStationClick={handleStationClick}
              />
            </div>

            {/* Side panel */}
            <aside className="w-72 border-l border-gray-800 flex flex-col overflow-y-auto p-3 gap-3 text-sm">
              <PhasePanel
                state={state}
                localPlayerId={localPlayerId}
                send={send}
                selectedTarget={selectedTarget}
                onClearTarget={() => setSelectedTarget(null)}
                onDeboard={handleDeboard}
              />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase-specific side panel
// ---------------------------------------------------------------------------

function PhasePanel({
  state,
  localPlayerId,
  send,
  selectedTarget,
  onClearTarget,
  onDeboard,
}: {
  state: SerializableGameState;
  localPlayerId: PlayerId;
  send: (msg: ClientMessage) => void;
  selectedTarget: { stationId?: StationId; segmentId?: SegmentId } | null;
  onClearTarget: () => void;
  onDeboard: () => void;
}) {
  const role = state.players[localPlayerId]?.role;
  const phase = state.phase;

  if (phase === "strategy") {
    return (
      <div className="space-y-2">
        <p className="font-semibold text-purple-400">Strategy Phase</p>
        <p className="text-gray-400 text-xs">
          Review the map and plan your route. Click any station to see its timetable.
        </p>
      </div>
    );
  }

  if (phase === "blocker_headstart") {
    if (role !== "snaker") {
      return (
        <div className="space-y-3">
          <p className="font-semibold text-yellow-400">Head Start Phase</p>
          <p className="text-gray-400 text-xs">
            Click stations on the map to board trains and position yourself.
          </p>
          <InTransitOverlay state={state} localPlayerId={localPlayerId} onDeboard={onDeboard} />
          <BlockerPanel
            state={state}
            localPlayerId={localPlayerId}
            selectedTarget={selectedTarget}
            onClearTarget={onClearTarget}
            send={send}
          />
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <p className="font-semibold text-yellow-400">Head Start Phase</p>
        <p className="text-gray-400 text-sm">
          Blockers are positioning. Your turn begins at 08:00 in-game.
        </p>
      </div>
    );
  }

  if (phase === "playing") {
    const snaker = state.players[state.snakerId];
    if (role === "snaker") {
      return (
        <div className="space-y-3">
          <p className="font-semibold text-green-400">Your Turn</p>
          <p className="text-gray-400 text-xs">
            Click a station on the map to view departures and board a train.
          </p>
          <div className="text-xs text-gray-500">
            Current head:{" "}
            <span className="text-white">
              {state.snake?.[state.snake.length - 1]?.replace(/_/g, " ") ?? "?"}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Snake length: <span className="text-white">{state.snake?.length ?? 0}</span>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <p className="font-semibold text-green-400">{snaker?.name} is choosing a train</p>
        <p className="text-gray-500 text-xs">Snake length: {state.snake?.length ?? 0} station(s)</p>
        <InTransitOverlay state={state} localPlayerId={localPlayerId} onDeboard={onDeboard} />
      </div>
    );
  }

  if (phase === "in_transit") {
    return (
      <div className="space-y-4">
        <InTransitOverlay state={state} localPlayerId={localPlayerId} onDeboard={onDeboard} />
        {role !== "snaker" && (
          <BlockerPanel
            state={state}
            localPlayerId={localPlayerId}
            selectedTarget={selectedTarget}
            onClearTarget={onClearTarget}
            send={send}
          />
        )}
      </div>
    );
  }

  if (phase === "challenge") {
    return <ChallengeHost state={state} localPlayerId={localPlayerId} send={send} />;
  }

  if (phase === "run_end") {
    const lastRun = state.completedRuns?.[state.completedRuns.length - 1];
    return (
      <div className="space-y-2">
        <p className="font-semibold text-orange-400">Run Over</p>
        {lastRun && (
          <p className="text-gray-300 text-xs">
            {state.players[lastRun.snakerId]?.name} reached {lastRun.length} station(s)
          </p>
        )}
        <button
          onClick={() => send({ type: "start_next_run" })}
          className="w-full py-2 bg-green-700 hover:bg-green-600 rounded text-sm"
        >
          Next Run
        </button>
      </div>
    );
  }

  if (phase === "finished") {
    const winner = state.winner ? state.players[state.winner] : null;
    return (
      <div className="space-y-2">
        <p className="font-bold text-yellow-300 text-lg">Game Over!</p>
        {winner && (
          <p className="text-white">
            Winner: <span className="font-bold">{winner.name}</span>
          </p>
        )}
        <div className="space-y-1">
          {state.completedRuns?.map((r, i) => (
            <div key={i} className="text-xs text-gray-400">
              {state.players[r.snakerId]?.name}: {r.length} stations
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
