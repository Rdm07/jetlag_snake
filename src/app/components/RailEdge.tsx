"use client";

import { STATIONS, LINE_COLORS } from "@/data/network";
import type { RailLine } from "@/data/network";
import type { StationId } from "@/shared/types";

interface RailEdgeProps {
  from: StationId;
  to: StationId;
  lineName: RailLine;
  isVisited: boolean;
  isCursed: boolean;
  hasRoadblock: boolean;
  snakeColor?: "red" | "blue" | "green";
}

const SNAKE_COLORS: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
};

export default function RailEdge({
  from,
  to,
  lineName,
  isVisited,
  isCursed,
  hasRoadblock,
  snakeColor = "green",
}: RailEdgeProps) {
  const a = STATIONS[from];
  const b = STATIONS[to];
  if (!a || !b) return null;

  const lineColor = LINE_COLORS[lineName] ?? "#4b5563";

  const stroke = isVisited
    ? (SNAKE_COLORS[snakeColor] ?? "#22c55e")
    : isCursed
    ? "#c084fc" // purple-400
    : lineColor;

  const strokeWidth = isVisited ? 5 : 2.5;
  const strokeOpacity = isVisited ? 1 : 0.75;
  const dashArray = isCursed && !isVisited ? "6 4" : undefined;

  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;

  return (
    <g>
      {/* Shadow/glow for visited segments */}
      {isVisited && (
        <line
          x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke={SNAKE_COLORS[snakeColor]}
          strokeWidth={9}
          strokeOpacity={0.25}
          strokeLinecap="round"
        />
      )}
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
        strokeDasharray={dashArray}
        strokeLinecap="round"
      />
      {hasRoadblock && !isVisited && (
        <text
          x={mx}
          y={my}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          🚧
        </text>
      )}
    </g>
  );
}
