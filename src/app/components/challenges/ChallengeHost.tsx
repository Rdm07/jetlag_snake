"use client";

import type { SerializableGameState, PlayerId, ClientMessage } from "@/shared/types";
import ReactionChallenge from "./ReactionChallenge";
import MemoryChallenge from "./MemoryChallenge";
import TypingChallenge from "./TypingChallenge";
import TriviaChallenge from "./TriviaChallenge";
import ChessChallenge from "./ChessChallenge";

interface ChallengeHostProps {
  state: SerializableGameState;
  localPlayerId: PlayerId;
  send: (msg: ClientMessage) => void;
}

export default function ChallengeHost({ state, localPlayerId, send }: ChallengeHostProps) {
  const challenge = state.activeChallenge;
  if (!challenge) return null;

  function submit(answer: unknown) {
    send({ type: "challenge_submit", playerId: localPlayerId, answer });
  }

  const { type, payload } = challenge;

  switch (type) {
    case "reaction":
      return (
        <ReactionChallenge
          deadline={challenge.deadline}
          onSubmit={(ms) => submit(ms)}
        />
      );
    case "memory":
      return (
        <MemoryChallenge
          sequence={(payload.sequence as string[]) ?? ["red", "green", "blue"]}
          onSubmit={(correct) => submit(correct)}
        />
      );
    case "typing":
      return (
        <TypingChallenge
          sentence={(payload.sentence as string) ?? "The quick brown fox"}
          onSubmit={(wpm, perfect) => submit({ wpm, perfect })}
        />
      );
    case "trivia":
      return (
        <TriviaChallenge
          question={payload.question as Parameters<typeof TriviaChallenge>[0]["question"]}
          onSubmit={(correct) => submit(correct)}
        />
      );
    case "chess":
      return <ChessChallenge onSubmit={(snakerWon) => submit(snakerWon)} />;
    case "geoguessr":
      return (
        <div className="py-8 text-center text-gray-400">
          <p className="font-bold text-white mb-2">GeoGuessr Challenge 🗺️</p>
          <p className="text-sm">Look at the landmark photo and guess its location on the mini-map.</p>
          <p className="text-xs mt-2 text-gray-600">(GeoGuessr component — coming soon)</p>
        </div>
      );
    default:
      return <p className="text-gray-400">Unknown challenge type: {type}</p>;
  }
}
