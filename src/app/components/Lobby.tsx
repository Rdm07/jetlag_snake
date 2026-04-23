"use client";

import type { SerializableGameState, PlayerId } from "@/shared/types";

interface LobbyProps {
  state: SerializableGameState;
  localPlayerId: PlayerId;
  onSetName: (name: string) => void;
  onSetAcceleration: (val: 30 | 60 | 120) => void;
  onStartGame: () => void;
  onSoloTest?: () => void;
}

export default function Lobby({
  state,
  localPlayerId,
  onSetName,
  onSetAcceleration,
  onStartGame,
  onSoloTest,
}: LobbyProps) {
  const playerList = Object.entries(state.players);
  const localPlayer = state.players[localPlayerId];
  const canStart = playerList.length >= 3;

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto mt-12 p-6 bg-gray-900 rounded-xl">
      <div>
        <h2 className="text-xl font-bold mb-1">Room: {state.roomCode}</h2>
        <p className="text-gray-400 text-sm">Share this code with 2 friends</p>
      </div>

      {/* Name entry */}
      {!localPlayer && (
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500"
            placeholder="Your name"
            maxLength={20}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) onSetName(val);
              }
            }}
          />
          <button
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
            onClick={(e) => {
              const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
              const val = input.value.trim();
              if (val) onSetName(val);
            }}
          >
            Join
          </button>
        </div>
      )}

      {/* Player list */}
      <div className="space-y-2">
        <p className="text-sm text-gray-400">Players ({playerList.length}/3)</p>
        {playerList.map(([id, p]) => (
          <div key={id} className="flex items-center gap-2 bg-gray-800 rounded px-3 py-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor:
                  p.color === "red" ? "#ef4444" : p.color === "blue" ? "#3b82f6" : "#22c55e",
              }}
            />
            <span className="font-medium">{p.name}</span>
            {id === localPlayerId && <span className="text-gray-500 text-xs">(you)</span>}
          </div>
        ))}
        {playerList.length < 3 &&
          Array(3 - playerList.length)
            .fill(null)
            .map((_, i) => (
              <div key={i} className="bg-gray-800/50 rounded px-3 py-2 text-gray-600 text-sm">
                Waiting for player…
              </div>
            ))}
      </div>

      {/* Acceleration */}
      <div>
        <p className="text-sm text-gray-400 mb-2">Clock speed</p>
        <div className="flex gap-2">
          {([30, 60, 120] as const).map((val) => (
            <button
              key={val}
              onClick={() => onSetAcceleration(val)}
              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                state.clockAcceleration === val
                  ? "bg-yellow-500 text-black"
                  : "bg-gray-800 hover:bg-gray-700 text-white"
              }`}
            >
              {val}×
            </button>
          ))}
        </div>
      </div>

      {/* Start */}
      <button
        onClick={onStartGame}
        disabled={!canStart || !localPlayer}
        className="w-full py-3 rounded-lg font-bold text-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-green-600 hover:bg-green-500 text-white"
      >
        {canStart ? "Start Game" : `Need ${3 - playerList.length} more player(s)`}
      </button>

      {/* Solo test */}
      {onSoloTest && (
        <button
          onClick={onSoloTest}
          className="w-full py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          Solo Test (3-player sim, 120×)
        </button>
      )}
    </div>
  );
}
