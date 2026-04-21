"use client";

import { useEffect, useRef, useState } from "react";

interface ReactionChallengeProps {
  onSubmit: (reactionMs: number) => void;
  deadline: number; // epoch ms
}

export default function ReactionChallenge({ onSubmit, deadline }: ReactionChallengeProps) {
  const [phase, setPhase] = useState<"waiting" | "ready" | "done">("waiting");
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitted = useRef(false);

  useEffect(() => {
    // Random delay 1–4s before showing the target
    const delay = 1000 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      setPhase("ready");
      startRef.current = Date.now();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleClick() {
    if (phase === "waiting") {
      // Clicked too early
      setPhase("done");
      setReactionMs(-1);
      if (!submitted.current) {
        submitted.current = true;
        onSubmit(9999); // penalty
      }
      return;
    }
    if (phase === "ready" && startRef.current !== null) {
      const ms = Date.now() - startRef.current;
      setReactionMs(ms);
      setPhase("done");
      if (!submitted.current) {
        submitted.current = true;
        onSubmit(ms);
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <p className="text-lg font-bold text-white">Reaction Challenge</p>
      <p className="text-gray-400 text-sm">Click as fast as possible when the circle turns green!</p>

      <button
        onClick={handleClick}
        className={`w-48 h-48 rounded-full text-xl font-bold transition-colors duration-100 ${
          phase === "waiting"
            ? "bg-red-600 hover:bg-red-500"
            : phase === "ready"
            ? "bg-green-400 text-black animate-pulse"
            : "bg-gray-600"
        }`}
      >
        {phase === "waiting" ? "Wait…" : phase === "ready" ? "NOW!" : "Done"}
      </button>

      {phase === "done" && reactionMs !== null && (
        <p className="text-white text-lg">
          {reactionMs === -1 ? "Too early! ❌" : `${reactionMs}ms ⚡`}
        </p>
      )}
    </div>
  );
}
