"use client";

import { STATIONS, LINE_COLORS, LINE_SPEEDS } from "@/data/network";
import { getEdgePoints } from "@/data/network_edges";
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

const SPEED_WIDTHS: Record<string, { base: number; visited: number; glow: number }> = {
  ktx:      { base: 2,   visited: 4,   glow: 8  },
  regional: { base: 1.5, visited: 3,   glow: 6  },
  local:    { base: 1,   visited: 2.5, glow: 5  },
};

const SPEED_OPACITY: Record<string, number> = {
  ktx:      0.85,
  regional: 0.70,
  local:    0.60,
};

/**
 * Build an SVG path string through the given points, with smooth rounded corners
 * at each intermediate waypoint using quadratic bezier curves.
 */
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
  lineName,
  isVisited,
  isCursed,
  hasRoadblock,
  snakeColor = "green",
}: RailEdgeProps) {
  const a = STATIONS[from];
  const b = STATIONS[to];
  if (!a || !b) return null;

  const points = getEdgePoints(from, to);
  const pathData = pathThroughPoints(points);

  const speed = LINE_SPEEDS[lineName] ?? "local";
  const widths = SPEED_WIDTHS[speed];
  const baseOpacity = SPEED_OPACITY[speed];
  const lineColor = LINE_COLORS[lineName] ?? "#4b5563";

  const stroke = isVisited
    ? (SNAKE_COLORS[snakeColor] ?? "#22c55e")
    : isCursed
    ? "#c084fc"
    : lineColor;

  const strokeWidth = isVisited ? widths.visited : widths.base;
  const strokeOpacity = isVisited ? 1 : isCursed ? 0.9 : baseOpacity;
  const dashArray = isCursed && !isVisited ? "7 5" : undefined;

  // Midpoint for icon overlay
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;

  return (
    <g>
      {/* Glow layer for visited segments */}
      {isVisited && (
        <path
          d={pathData}
          fill="none"
          stroke={SNAKE_COLORS[snakeColor]}
          strokeWidth={widths.glow}
          strokeOpacity={0.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Main edge */}
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

      {/* Roadblock icon at segment midpoint */}
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
