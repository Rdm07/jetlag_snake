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
import { STATIONS } from "@/data/network";

interface BlockerPanelProps {
  state: SerializableGameState;
  localPlayerId: PlayerId;
  // Station (or segment) selected by clicking the map — null if nothing selected
  selectedTarget: { stationId?: StationId; segmentId?: SegmentId } | null;
  onClearTarget: () => void;
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
  curse: "Place on a segment — adds 30 min penalty when Snaker crosses",
  battle: "Place on a station — Snaker must beat you in a mini-game",
  draw2: "Draw 2 extra cards",
  secret_block: "Place a hidden Roadblock",
  peek_hand: "See the Snaker's current station",
  extra_move: "Move to any adjacent station for free",
};

export default function BlockerPanel({
  state,
  localPlayerId,
  selectedTarget,
  onClearTarget,
  send,
}: BlockerPanelProps) {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const hand = state.blockerHands?.[localPlayerId] ?? [];
  const currentPos = state.blockerPositions?.[localPlayerId];
  const actionsLeft = state.blockerActionsRemaining;
  const phase = state.phase;
  const canAct = phase === "in_transit" && actionsLeft > 0;

  const blockerTrain = state.blockerActiveTrains?.[localPlayerId];
  const isBlockerInTransit = !!blockerTrain;
  const deboardWindowOpen = blockerTrain?.deboardWindowOpen ?? false;
  const snakerHead = state.snake?.[state.snake.length - 1];

  /** Returns null if playable, or a reason string if blocked */
  function cardBlockReason(card: Card): string | null {
    if (!canAct) return "No actions remaining";
    if (card.type === "curse") {
      if (isBlockerInTransit && !deboardWindowOpen) return "Board your train first";
    } else if (card.type === "roadblock") {
      if (isBlockerInTransit) return "Must be at a station";
    } else if (card.type === "battle") {
      if (isBlockerInTransit) return "Must be at a station";
      if (selectedTarget?.stationId && selectedTarget.stationId === snakerHead) {
        return "Snaker is already there";
      }
    }
    return null;
  }

  function handlePlayCard() {
    if (!selectedCard) return;

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

    if (!selectedTarget || (!selectedTarget.stationId && !selectedTarget.segmentId)) return;

    send({
      type: "blocker_play_card",
      playerId: localPlayerId,
      card: selectedCard,
      target: selectedTarget,
    });
    setSelectedCard(null);
    onClearTarget();
  }

  function handleDraw() {
    send({ type: "blocker_draw_card", playerId: localPlayerId });
  }

  function handlePass() {
    send({ type: "blocker_pass", playerId: localPlayerId });
  }

  const posName = currentPos ? (STATIONS[currentPos]?.name ?? currentPos.replace(/_/g, " ")) : "Unplaced";

  // Determine what target is needed for the selected card
  const needsStation =
    selectedCard &&
    (selectedCard.type === "roadblock" || selectedCard.type === "battle" || selectedCard.type === "curse");
  const needsSegment = selectedCard?.type === "curse";

  const targetLabel = selectedTarget?.stationId
    ? STATIONS[selectedTarget.stationId]?.name ?? selectedTarget.stationId
    : selectedTarget?.segmentId
    ? selectedTarget.segmentId.replace(/_to_/g, " → ").replace(/_/g, " ")
    : null;

  const hasValidTarget =
    selectedTarget && (selectedTarget.stationId || selectedTarget.segmentId);

  const playBlockReason = selectedCard ? cardBlockReason(selectedCard) : null;
  const canPlay = selectedCard && !playBlockReason && (selectedCard.type === "powerup" || hasValidTarget);

  return (
    <div className="space-y-4">
      {/* Position */}
      <div>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">
          Your position
        </p>
        <p className="text-sm text-white font-medium">{posName}</p>
        {isBlockerInTransit && (
          <p className="text-xs text-blue-400 mt-0.5">
            🚂 On train
            {deboardWindowOpen && (
              <span className="text-yellow-400 ml-1">— stopped, can deboard</span>
            )}
          </p>
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
          <p className="text-xs text-gray-600">No cards in hand</p>
        ) : (
          <div className="space-y-1">
            {hand.map((card) => {
              const reason = canAct ? cardBlockReason(card) : "Waiting for Snaker";
              const isBlocked = !!reason;
              const isSelected = selectedCard?.id === card.id;

              return (
                <button
                  key={card.id}
                  disabled={isBlocked}
                  onClick={() => setSelectedCard(isSelected ? null : card)}
                  title={reason ?? ""}
                  className={`w-full text-left rounded px-2 py-1.5 text-xs border transition-colors ${
                    isSelected
                      ? "border-yellow-500 bg-yellow-900/30"
                      : isBlocked
                      ? "border-gray-800 bg-gray-900 opacity-50 cursor-not-allowed"
                      : "border-gray-700 bg-gray-800 hover:bg-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{CARD_LABELS[card.type]}</p>
                    {isBlocked && (
                      <span className="text-red-400 text-xs">{reason}</span>
                    )}
                  </div>
                  <p className="text-gray-400">
                    {CARD_DESC[card.powerupEffect ?? card.type] ?? ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Target selection / card placement */}
      {selectedCard && phase === "in_transit" && !playBlockReason && (
        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium">
            Play {CARD_LABELS[selectedCard.type]}
          </p>

          {selectedCard.type !== "powerup" && (
            <div className="text-xs text-gray-400">
              {needsSegment && !selectedTarget?.segmentId ? (
                <p className="text-yellow-400">
                  Click a station on the map to select a target
                  {needsSegment && " (for Curse, click a segment — any adjacent station)"}
                </p>
              ) : targetLabel ? (
                <div className="flex items-center gap-2">
                  <span className="text-white">Target: {targetLabel}</span>
                  <button
                    onClick={onClearTarget}
                    className="text-gray-500 hover:text-red-400 text-xs"
                  >
                    × clear
                  </button>
                </div>
              ) : (
                <p className="text-yellow-400">
                  Click a station on the map to select target
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handlePlayCard}
              disabled={!canPlay}
              className="flex-1 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs font-bold"
            >
              Play
            </button>
            <button
              onClick={() => { setSelectedCard(null); onClearTarget(); }}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Draw / Pass */}
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
            disabled={actionsLeft === 0}
            className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded text-xs"
          >
            Pass
          </button>
        </div>
      )}
    </div>
  );
}
