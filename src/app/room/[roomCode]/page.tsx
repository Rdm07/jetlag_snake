"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import PartySocket from "partysocket";
import type {
  SerializableGameState,
  ClientMessage,
  PlayerId,
  TrainService,
  StationId,
} from "@/shared/types";
import TrainMap from "@/app/components/TrainMap";
import GameClock from "@/app/components/GameClock";
import Lobby from "@/app/components/Lobby";
import DeparturesBoard from "@/app/components/DeparturesBoard";
import InTransitOverlay from "@/app/components/InTransitOverlay";
import BlockerPanel from "@/app/components/BlockerPanel";
import ChallengeHost from "@/app/components/challenges/ChallengeHost";
import { useToast } from "@/app/components/Toast";

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
  const [localPlayerId] = useState<PlayerId>(getOrCreatePlayerId);
  const socketRef = useRef<PartySocket | null>(null);
  const { addToast, ToastContainer } = useToast();

  const send = useCallback((msg: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg));
  }, []);

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

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Connecting to room {roomCode}…
      </div>
    );
  }

  const phase = state.phase;

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white">
      {/* Header bar */}
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
        <span className="text-gray-400 text-sm">
          {state.players[localPlayerId]?.name ?? "…"} —{" "}
          {state.players[localPlayerId]?.role ?? "joining"}
        </span>
      </header>
      <ToastContainer />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {phase === "lobby" ? (
          <Lobby
            state={state}
            localPlayerId={localPlayerId}
            onSetName={(name) => send({ type: "set_name", name })}
            onSetAcceleration={(value) => send({ type: "set_acceleration", value })}
            onStartGame={() => send({ type: "start_game" })}
          />
        ) : (
          <div className="flex flex-1 gap-0 overflow-hidden">
            {/* Map — takes most space */}
            <div className="flex-1 overflow-hidden">
              <TrainMap
                state={state}
                localPlayerId={localPlayerId}
              />
            </div>

            {/* Side panel placeholder — filled in later sections */}
            <aside className="w-72 border-l border-gray-800 flex flex-col overflow-y-auto p-3 gap-3 text-sm">
              <PhasePanel
                state={state}
                localPlayerId={localPlayerId}
                send={send}
              />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase-specific side panel (simplified for now — fleshed out in later sections)
// ---------------------------------------------------------------------------

function PhasePanel({
  state,
  localPlayerId,
  send,
}: {
  state: SerializableGameState;
  localPlayerId: PlayerId;
  send: (msg: ClientMessage) => void;
}) {
  const role = state.players[localPlayerId]?.role;
  const phase = state.phase;

  if (phase === "blocker_headstart") {
    if (role !== "snaker") {
      return (
        <div className="space-y-3">
          <p className="font-semibold text-yellow-400">Head Start Phase</p>
          <p className="text-gray-400 text-xs">Move to strategic positions before the Snaker boards.</p>
          <BlockerPanel state={state} localPlayerId={localPlayerId} send={send} />
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <p className="font-semibold text-yellow-400">Head Start Phase</p>
        <p className="text-gray-400 text-sm">
          Blockers are positioning. You may board trains at 08:00 in-game.
        </p>
      </div>
    );
  }

  if (phase === "playing") {
    const snaker = state.players[state.snakerId];
    if (role === "snaker") {
      return (
        <DeparturesBoard
          state={state}
          onBoardTrain={(service, toStation) =>
            send({ type: "snaker_board_train", service, toStation })
          }
        />
      );
    }
    return (
      <div className="space-y-2">
        <p className="font-semibold text-green-400">{snaker?.name} is choosing a train</p>
        <p className="text-gray-500 text-xs">Snake length: {state.snake.length} station(s)</p>
      </div>
    );
  }

  if (phase === "in_transit") {
    return (
      <div className="space-y-4">
        <InTransitOverlay state={state} />
        {role !== "snaker" && (
          <BlockerPanel state={state} localPlayerId={localPlayerId} send={send} />
        )}
      </div>
    );
  }

  if (phase === "challenge") {
    return <ChallengeHost state={state} localPlayerId={localPlayerId} send={send} />;
  }

  if (phase === "run_end") {
    const lastRun = state.completedRuns[state.completedRuns.length - 1];
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
          {state.completedRuns.map((r, i) => (
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
