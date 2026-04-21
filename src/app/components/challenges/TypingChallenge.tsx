"use client";

import { useEffect, useRef, useState } from "react";

const SENTENCES = [
  "The KTX train from Seoul to Busan travels at over two hundred and fifty kilometers per hour through the Korean countryside.",
  "Gyeongju was the ancient capital of the Silla kingdom and is known for its royal tombs and historic temples.",
  "Passengers boarding at Yongsan station must present their tickets before entering the high-speed rail platform.",
  "The Gangneung line opened in two thousand and eighteen for the PyeongChang Winter Olympics bringing fast rail to the east coast.",
  "Dokdo is a group of small islets located in the East Sea administered by South Korea as part of North Gyeongsang Province.",
];

interface TypingChallengeProps {
  sentence: string;
  onSubmit: (wpm: number, perfect: boolean) => void;
}

export default function TypingChallenge({ sentence, onSubmit }: TypingChallengeProps) {
  const [typed, setTyped] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const submitted = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (done) return;
    const val = e.target.value;

    if (!startTime) setStartTime(Date.now());
    setTyped(val);

    if (val === sentence) {
      const elapsed = (Date.now() - (startTime ?? Date.now())) / 1000 / 60;
      const words = sentence.split(" ").length;
      const wpm = Math.round(words / elapsed);
      setDone(true);
      if (!submitted.current) {
        submitted.current = true;
        onSubmit(wpm, true);
      }
    }
  }

  // Render characters with color coding
  const chars = sentence.split("").map((ch, i) => {
    if (i >= typed.length)
      return (
        <span key={i} className="text-gray-500">
          {ch}
        </span>
      );
    if (typed[i] === ch)
      return (
        <span key={i} className="text-green-400">
          {ch}
        </span>
      );
    return (
      <span key={i} className="text-red-400 bg-red-900/30">
        {ch}
      </span>
    );
  });

  return (
    <div className="flex flex-col gap-4 py-4">
      <p className="text-lg font-bold text-white">Typing Challenge</p>
      <p className="text-gray-400 text-xs">Type the sentence below with 100% accuracy. No mistakes!</p>

      <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm leading-relaxed">{chars}</div>

      <input
        ref={inputRef}
        value={typed}
        onChange={handleChange}
        disabled={done}
        className="bg-gray-900 border border-gray-700 rounded px-3 py-2 font-mono text-sm text-white w-full outline-none focus:border-blue-500"
        placeholder="Start typing…"
        spellCheck={false}
        autoComplete="off"
      />

      {done && (
        <p className="text-green-400 font-bold text-center">Complete! ✅</p>
      )}
    </div>
  );
}
