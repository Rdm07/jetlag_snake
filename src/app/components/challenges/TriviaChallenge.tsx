"use client";

import { useRef, useState } from "react";

interface TriviaQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface TriviaChallengeProps {
  question: TriviaQuestion;
  onSubmit: (correct: boolean) => void;
}

export default function TriviaChallenge({ question, onSubmit }: TriviaChallengeProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const submitted = useRef(false);

  function handleSelect(option: string) {
    if (selected !== null) return;
    setSelected(option);
    if (!submitted.current) {
      submitted.current = true;
      onSubmit(option === question.answer);
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <p className="text-lg font-bold text-white">Trivia Challenge</p>
      <p className="text-gray-300 font-medium">{question.question}</p>

      <div className="grid grid-cols-1 gap-2">
        {question.options.map((opt) => {
          let style = "bg-gray-800 hover:bg-gray-700 border-gray-700";
          if (selected !== null) {
            if (opt === question.answer) style = "bg-green-800 border-green-500";
            else if (opt === selected) style = "bg-red-800 border-red-500";
            else style = "bg-gray-800 border-gray-700 opacity-50";
          }
          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={selected !== null}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${style}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <p
          className={`text-center font-bold ${
            selected === question.answer ? "text-green-400" : "text-red-400"
          }`}
        >
          {selected === question.answer ? "Correct! ✅" : `Wrong! The answer was: ${question.answer} ❌`}
        </p>
      )}
    </div>
  );
}
