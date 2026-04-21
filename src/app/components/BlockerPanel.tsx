"use client";

import { useState } from "react";
import type {
  SerializableGameState,
  PlayerId,
  Card,
  StationId,
  SegmentId,
  ClientMessage,
} from "@/shared/types";
import { ADJACENCY } from "@/data/network";

interface BlockerPanelProps {
  state: SerializableGameState;
  localPlayerId: PlayerId;
  send: (msg: ClientMessage) => void;
}

const CARD_LABELS: Record<string, string> = {
  roadblock: "🚧 Roadblock",
  curse: "⚡ Curse",
  battle: "⚔️ Battle",
  powerup: "✨ Power-up",
};

const CARD_DESC: Record<string, string> = {
  roadblock: "Place on a station — Snaker must face a challenge to pass",
  curse: "Place on a segment — adds 30min penalty when Snaker crosses",
  battle: "Place on a station — Snaker must beat you in a mini-game",
  draw2: "Draw 2 extra cards",
  secret_block: "Place a hidden Roadblock",
  peek_hand: "See the Snaker's current station",
  extra_move: "Move to any adjacent station for free",
};

export default function BlockerPanel({ state, localPlayerId, send }: BlockerPanelProps) {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [placementTarget, setPlacementTarget] = useState<"station" | "segment">("station");
  const [targetInput, setTargetInput] = useState("");

  const hand = state.blockerHands[localPlayerId] ?? [];
  const currentPos = state.blockerPositions[localPlayerId];
  const actionsLeft = state.blockerActionsRemaining;
  const phase = state.phase;
  const canAct = (phase === "in_transit" || phase === "blocker_headstart") && actionsLeft > 0;

  function handleMove(to: StationId) {
    send({ type: "blocker_move", playerId: localPlayerId, toStation: to });
  }

  function handleDraw() {
    send({ type: "blocker_draw_card", playerId: localPlayerId });
  }

  function handlePass() {
    send({ type: "blocker_pass", playerId: localPlayerId });
  }

  function handlePlayCard() {
    if (!selectedCard) return;

    // Powerup effects that don't need a board target
    if (selectedCard.type === "powerup") {
      send({
        type: "blocker_play_card",
        playerId: localPlayerId,
        card: selectedCard,
        target: {},
      });
      setSelectedCard(null);
      return;
    }

    const target: { stationId?: StationId; segmentId?: SegmentId } = {};
    if (placementTarget === "station") {
      target.stationId = targetInput as StationId;
    } else {
      target.segmentId = targetInput as SegmentId;
    }
    send({
      type: "blocker_play_card",
      playerId: localPlayerId,
      card: selectedCard,
      target,
    });
    setSelectedCard(null);
    setTargetInput("");
  }

  const neighbors = currentPos ? (ADJACENCY[currentPos] ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Position + Move */}
      <div>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">
          Your position
        </p>
        <p className="text-sm text-white font-medium">
          {currentPos?.replace(/_/g, " ") ?? "Unplaced"}
        </p>

        {neighbors.length > 0 && (phase === "blocker_headstart" || canAct) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {neighbors.map((n) => (
              <button
                key={n}
                onClick={() => handleMove(n)}
                className="bg-gray-700 hover:bg-gray-600 rounded px-2 py-1 text-xs"
              >
                → {n.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hand */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
            Hand ({hand.length}/5)
          </p>
          {phase === "in_transit" && (
            <span className="text-xs text-yellow-400">{actionsLeft} actions left</span>
          )}
        </div>

        {hand.length === 0 ? (
          <p className="text-xs text-gray-600">No cards</p>
        ) : (
          <div className="space-y-1">
            {hand.map((card) => (
              <button
                key={card.id}
                onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}
                className={`w-full text-left rounded px-2 py-1.5 text-xs border transition-colors ${
                  selectedCard?.id === card.id
                    ? "border-yellow-500 bg-yellow-900/30"
                    : "border-gray-700 bg-gray-800 hover:bg-gray-700"
                }`}
              >
                <p className="font-medium">{CARD_LABELS[card.type]}</p>
                <p className="text-gray-400">
                  {CARD_DESC[card.powerupEffect ?? card.type] ?? ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Play selected card */}
      {selectedCard && phase === "in_transit" && (
        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium">Place {CARD_LABELS[selectedCard.type]}</p>

          {selectedCard.type !== "powerup" && (
            <>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setPlacementTarget("station")}
                  className={`px-2 py-1 rounded ${placementTarget === "station" ? "bg-yellow-600" : "bg-gray-700"}`}
                >
                  Station
                </button>
                {selectedCard.type === "curse" && (
                  <button
                    onClick={() => setPlacementTarget("segment")}
                    className={`px-2 py-1 rounded ${placementTarget === "segment" ? "bg-yellow-600" : "bg-gray-700"}`}
                  >
                    Segment
                  </button>
                )}
              </div>

              <input
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-600"
                placeholder={
                  placementTarget === "station"
                    ? "station_id (e.g. yongsan)"
                    : "from_to_to (e.g. yongsan_to_daejeon)"
                }
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
              />
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={handlePlayCard}
              disabled={selectedCard.type !== "powerup" && !targetInput}
              className="flex-1 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 rounded text-xs font-bold"
            >
              Play
            </button>
            <button
              onClick={() => setSelectedCard(null)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Draw / Pass actions during in_transit */}
      {phase === "in_transit" && (
        <div className="flex gap-2">
          <button
            onClick={handleDraw}
            disabled={!canAct || hand.length >= 5}
            className="flex-1 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 rounded text-xs"
          >
            Draw Card
          </button>
          <button
            onClick={handlePass}
            className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
          >
            Pass
          </button>
        </div>
      )}
    </div>
  );
}
