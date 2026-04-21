"use client";

import { STATIONS } from "@/data/network";
import type { StationId, SegmentId } from "@/shared/types";

interface RailEdgeProps {
  from: StationId;
  to: StationId;
  isVisited: boolean;
  isCursed: boolean;
  hasRoadblock: boolean;
  snakeColor?: string; // e.g. "red" | "blue" | "green"
}

const LINE_COLORS: Record<string, string> = {
  // Default unvisited edge color
  default: "#4b5563", // gray-600
};

function segmentId(a: StationId, b: StationId): SegmentId {
  return `${a}_to_${b}`;
}

export default function RailEdge({
  from,
  to,
  isVisited,
  isCursed,
  hasRoadblock,
  snakeColor = "green",
}: RailEdgeProps) {
  const a = STATIONS[from];
  const b = STATIONS[to];
  if (!a || !b) return null;

  const colorMap: Record<string, string> = {
    red: "#ef4444",
    blue: "#3b82f6",
    green: "#22c55e",
  };

  const stroke = isVisited
    ? (colorMap[snakeColor] ?? "#22c55e")
    : isCursed
    ? "#a855f7"
    : "#4b5563";

  const strokeWidth = isVisited ? 4 : 2;
  const dashArray = isCursed && !isVisited ? "6 4" : undefined;

  // Midpoint for icon overlay
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;

  return (
    <g>
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
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
