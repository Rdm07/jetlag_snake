"use client";

import { getEdgePoints } from "@/data/network_edges";
import type { StationId } from "@/shared/types";

interface RailEdgeProps {
  from: StationId;
  to: StationId;
  isThick: boolean;
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

function pathThroughPoints(pts: [number, number][], cornerRadius = 12): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M ${pts[0][0]},${pts[0][1]} L ${pts[1][0]},${pts[1][1]}`;
  }
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const d1 = Math.hypot(cx - px, cy - py);
    const d2 = Math.hypot(nx - cx, ny - cy);
    const t1 = d1 > 0 ? Math.min(cornerRadius, d1 / 2) / d1 : 0;
    const t2 = d2 > 0 ? Math.min(cornerRadius, d2 / 2) / d2 : 0;
    const p1x = cx + (px - cx) * t1;
    const p1y = cy + (py - cy) * t1;
    const p2x = cx + (nx - cx) * t2;
    const p2y = cy + (ny - cy) * t2;
    d += ` L ${p1x.toFixed(1)},${p1y.toFixed(1)} Q ${cx},${cy} ${p2x.toFixed(1)},${p2y.toFixed(1)}`;
  }
  d += ` L ${pts[pts.length - 1][0]},${pts[pts.length - 1][1]}`;
  return d;
}

export default function RailEdge({
  from,
  to,
  isThick,
  isVisited,
  isCursed,
  hasRoadblock,
  snakeColor = "green",
}: RailEdgeProps) {
  const points = getEdgePoints(from, to);
  if (points.length < 2) return null;
  const pathData = pathThroughPoints(points);

  const snakeHex = SNAKE_COLORS[snakeColor] ?? "#22c55e";

  const stroke = isVisited ? snakeHex : isCursed ? "#c084fc" : "#9ca3af";
  const strokeWidth = isVisited
    ? (isThick ? 5 : 3)
    : (isThick ? 2.5 : 1.2);
  const strokeOpacity = isVisited ? 1 : isCursed ? 0.9 : isThick ? 0.75 : 0.55;
  const dashArray = isCursed && !isVisited ? "7 5" : undefined;

  // Midpoint for icon overlay
  const mid = points[Math.floor(points.length / 2)];

  return (
    <g>
      {isVisited && (
        <path
          d={pathData}
          fill="none"
          stroke={snakeHex}
          strokeWidth={strokeWidth + 6}
          strokeOpacity={0.18}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <path
        d={pathData}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
        strokeDasharray={dashArray}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {hasRoadblock && !isVisited && (
        <text
          x={mid[0]}
          y={mid[1]}
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
