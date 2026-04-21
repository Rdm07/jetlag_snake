"use client";

import { STATIONS, NODE_IDS } from "@/data/network";
import type { StationId, PlayerId } from "@/shared/types";

interface StationNodeProps {
  stationId: StationId;
  isSnakeHead: boolean;
  isSnakeBody: boolean;
  blockerColors: Array<"red" | "blue" | "green">; // colors of blockers present here
  hasRoadblock: boolean;
  hasBattle: boolean;
  snakeColor: "red" | "blue" | "green";
  onClick?: (stationId: StationId) => void;
}

const PLAYER_COLORS: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
};

export default function StationNode({
  stationId,
  isSnakeHead,
  isSnakeBody,
  blockerColors,
  hasRoadblock,
  hasBattle,
  snakeColor,
  onClick,
}: StationNodeProps) {
  const station = STATIONS[stationId];
  if (!station) return null;

  const { x, y, name } = station;
  const isNode = NODE_IDS.has(stationId);
  const baseRadius = isNode ? 9 : 6;

  let fillColor = "#1f2937"; // dark gray default
  let strokeColor = "#6b7280"; // gray-500
  let strokeWidth = 1.5;

  if (isSnakeHead) {
    fillColor = PLAYER_COLORS[snakeColor];
    strokeColor = "#ffffff";
    strokeWidth = 2.5;
  } else if (isSnakeBody) {
    fillColor = PLAYER_COLORS[snakeColor] + "66"; // semi-transparent
    strokeColor = PLAYER_COLORS[snakeColor];
    strokeWidth = 1.5;
  } else if (isNode) {
    strokeColor = "#d1d5db"; // gold-ish for nodes
    strokeWidth = 2;
  }

  return (
    <g
      onClick={() => onClick?.(stationId)}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {/* Gold ring for node stations */}
      {isNode && (
        <circle cx={x} cy={y} r={baseRadius + 4} fill="none" stroke="#fbbf24" strokeWidth={1.5} opacity={0.6} />
      )}

      {/* Main circle */}
      <circle
        cx={x}
        cy={y}
        r={baseRadius}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Blocker position dots (small colored dots around the station) */}
      {blockerColors.map((color, i) => {
        const angle = (i * Math.PI) / 2 - Math.PI / 4;
        const dx = Math.cos(angle) * (baseRadius + 6);
        const dy = Math.sin(angle) * (baseRadius + 6);
        return (
          <circle
            key={color}
            cx={x + dx}
            cy={y + dy}
            r={4}
            fill={PLAYER_COLORS[color]}
            stroke="#000"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Card icons */}
      {(hasRoadblock || hasBattle) && (
        <text
          x={x + baseRadius + 2}
          y={y - baseRadius}
          fontSize={10}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {hasRoadblock ? "🚧" : "⚔️"}
        </text>
      )}

      {/* Station label */}
      <text
        x={x}
        y={y + baseRadius + 10}
        textAnchor="middle"
        fill="#d1d5db"
        fontSize={8}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {name}
      </text>
    </g>
  );
}
