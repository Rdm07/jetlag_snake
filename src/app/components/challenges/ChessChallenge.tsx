"use client";

import { useState, useRef } from "react";

interface ChessChallengeProps {
  onSubmit: (snakerWon: boolean) => void;
}

export default function ChessChallenge({ onSubmit }: ChessChallengeProps) {
  const [result, setResult] = useState<"snaker" | "blocker" | null>(null);
  const submitted = useRef(false);

  function handleReport(winner: "snaker" | "blocker") {
    setResult(winner);
    if (!submitted.current) {
      submitted.current = true;
      onSubmit(winner === "snaker");
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <p className="text-lg font-bold text-white">Chess Challenge ♟️</p>
      <p className="text-gray-400 text-sm text-center">
        Open a 1-minute game on Lichess.org. The Snaker plays White. Return here to report the result.
      </p>

      <a
        href="https://lichess.org/setup/friend?variant=standard&timeMode=1&time=1&increment=0&color=white"
        target="_blank"
        rel="noopener noreferrer"
        className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm"
      >
        Open Lichess game →
      </a>

      {result === null ? (
        <div className="flex gap-4">
          <button
            onClick={() => handleReport("snaker")}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-bold"
          >
            Snaker won ✅
          </button>
          <button
            onClick={() => handleReport("blocker")}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm font-bold"
          >
            Blocker won ❌
          </button>
        </div>
      ) : (
        <p className={`font-bold text-lg ${result === "snaker" ? "text-green-400" : "text-red-400"}`}>
          {result === "snaker" ? "Snaker wins!" : "Blocker wins!"}
        </p>
      )}
    </div>
  );
}
