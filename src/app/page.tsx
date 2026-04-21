"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function makeRoomCode() {
  return Math.random().toString(36).toUpperCase().slice(2, 6);
}

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white gap-8 p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Jet Lag Snake</h1>
        <p className="text-gray-400">South Korea · KTX Edition</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-lg"
          onClick={() => router.push(`/room/${makeRoomCode()}`)}
        >
          Create Room
        </button>

        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 uppercase tracking-widest text-center font-mono"
            placeholder="XXXX"
            maxLength={4}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter" && joinCode.length === 4) {
                router.push(`/room/${joinCode}`);
              }
            }}
          />
          <button
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-bold disabled:opacity-40"
            disabled={joinCode.length !== 4}
            onClick={() => router.push(`/room/${joinCode}`)}
          >
            Join
          </button>
        </div>
      </div>

      <p className="text-gray-600 text-xs text-center max-w-xs">
        3 players: 1 Snaker builds the longest non-repeating rail path. 2 Blockers try to stop them.
      </p>
    </main>
  );
}
