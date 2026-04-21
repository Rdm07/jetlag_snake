"use client";

import { useEffect, useRef, useState } from "react";

interface MemoryChallengeProps {
  sequence: string[]; // e.g. ["red","blue","green","red"]
  onSubmit: (correct: boolean) => void;
}

const COLORS = ["red", "blue", "green", "yellow"];
const COLOR_STYLES: Record<string, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
};

export default function MemoryChallenge({ sequence, onSubmit }: MemoryChallengeProps) {
  const [phase, setPhase] = useState<"showing" | "input" | "done">("showing");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [playerSeq, setPlayerSeq] = useState<string[]>([]);
  const submitted = useRef(false);

  // Replay sequence animation
  useEffect(() => {
    if (phase !== "showing") return;
    let i = 0;
    const step = () => {
      if (i >= sequence.length) {
        setActiveIdx(null);
        setPhase("input");
        return;
      }
      setActiveIdx(i);
      setTimeout(() => {
        setActiveIdx(null);
        setTimeout(() => {
          i++;
          step();
        }, 200);
      }, 600);
    };
    const t = setTimeout(step, 800);
    return () => clearTimeout(t);
  }, [phase, sequence]);

  function handleColorClick(color: string) {
    if (phase !== "input") return;
    const next = [...playerSeq, color];
    setPlayerSeq(next);

    if (next[next.length - 1] !== sequence[next.length - 1]) {
      // Wrong!
      setPhase("done");
      if (!submitted.current) {
        submitted.current = true;
        onSubmit(false);
      }
      return;
    }

    if (next.length === sequence.length) {
      setPhase("done");
      if (!submitted.current) {
        submitted.current = true;
        onSubmit(true);
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <p className="text-lg font-bold text-white">Memory Challenge</p>
      <p className="text-gray-400 text-sm">
        {phase === "showing"
          ? "Watch the sequence…"
          : phase === "input"
          ? `Repeat: ${playerSeq.length}/${sequence.length}`
          : playerSeq.length === sequence.length ? "Correct! ✅" : "Wrong! ❌"}
      </p>

      <div className="grid grid-cols-2 gap-4">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => handleColorClick(color)}
            disabled={phase !== "input"}
            className={`w-24 h-24 rounded-xl transition-all ${COLOR_STYLES[color]} ${
              activeIdx !== null && sequence[activeIdx] === color
                ? "scale-110 brightness-150"
                : ""
            } disabled:opacity-50`}
          />
        ))}
      </div>
    </div>
  );
}
