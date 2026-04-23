"use client";

import { STATIONS, NODE_IDS } from "@/data/network";
import type { StationId } from "@/shared/types";

interface StationNodeProps {
  stationId: StationId;
  isSnakeHead: boolean;
  isSnakeBody: boolean;
  blockerColors: Array<"red" | "blue" | "green">;
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
  const baseRadius = isNode ? 5 : 3;

  // Transit-map style: white fill, colored ring for state
  let fillColor = "#ffffff";
  let strokeColor = "#6b7280";
  let strokeWidth = 1.5;

  if (isSnakeHead) {
    fillColor = PLAYER_COLORS[snakeColor];
    strokeColor = "#ffffff";
    strokeWidth = 3;
  } else if (isSnakeBody) {
    fillColor = PLAYER_COLORS[snakeColor] + "99";
    strokeColor = PLAYER_COLORS[snakeColor];
    strokeWidth = 2;
  }

  return (
    <g
      onClick={() => onClick?.(stationId)}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {/* Interchange ring for multi-line node stations */}
      {isNode && !isSnakeHead && (
        <circle
          cx={x} cy={y}
          r={baseRadius + 5}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={2}
          opacity={0.8}
        />
      )}

      {/* Outer glow ring for snake head */}
      {isSnakeHead && (
        <circle
          cx={x} cy={y}
          r={baseRadius + 6}
          fill="none"
          stroke={PLAYER_COLORS[snakeColor]}
          strokeWidth={2}
          opacity={0.5}
        />
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

      {/* Blocker position dots */}
      {blockerColors.map((color, i) => {
        const angle = (i * Math.PI * 2) / Math.max(blockerColors.length, 1) - Math.PI / 2;
        const dx = Math.cos(angle) * (baseRadius + 7);
        const dy = Math.sin(angle) * (baseRadius + 7);
        return (
          <circle
            key={`${color}-${i}`}
            cx={x + dx}
            cy={y + dy}
            r={4}
            fill={PLAYER_COLORS[color]}
            stroke="#000"
            strokeWidth={1}
          />
        );
      })}

      {/* Card icons */}
      {(hasRoadblock || hasBattle) && (
        <text
          x={x + baseRadius + 3}
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
        y={y + baseRadius + 7}
        textAnchor="middle"
        fill="#e5e7eb"
        fontSize={5.5}
        fontWeight={isNode ? "600" : "400"}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {name}
      </text>
    </g>
  );
}
