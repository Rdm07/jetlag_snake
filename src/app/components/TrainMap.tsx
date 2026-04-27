"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { STATIONS, LINE_COLORS, LINE_SPEEDS } from "@/data/network";
import { EDGES, getEdgeLine, getEdgePoints } from "@/data/network_edges";
import type { SerializableGameState, StationId, PlayerId, ActiveTrain } from "@/shared/types";
import { hhmmToGameMin, positionAlongPolyline } from "@/lib/trainRoutes";
import RailEdge from "./RailEdge";
import StationNode from "./StationNode";

interface TrainMapProps {
  state: SerializableGameState | null;
  onStationClick?: (stationId: StationId) => void;
  localPlayerId: PlayerId;
}

// SVG coordinate space matches south_korea.svg (800×1200).
// viewBox is cropped to the area that contains all KTX stations.
const VIEWBOX = "0 140 800 820";

const PLAYER_HEX_COLORS: Record<string, string> = {
  red:   "#ef4444",
  blue:  "#3b82f6",
  green: "#22c55e",
};

// ── Player dot component ────────────────────────────────────────────────────
function PlayerDot({
  x,
  y,
  color,
  label,
}: {
  x: number;
  y: number;
  color: string;
  label: string;
}) {
  return (
    <g>
      {/* Pulsing ring — pure SVG animation */}
      <circle cx={x} cy={y} r={6} fill="none" stroke={color} strokeWidth={1.5}>
        <animate attributeName="r" from="6" to="20" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.75" to="0" dur="1.8s" repeatCount="indefinite" />
      </circle>
      {/* Shadow */}
      <circle cx={x} cy={y} r={8} fill="#000" fillOpacity={0.4} />
      {/* Main dot */}
      <circle cx={x} cy={y} r={7} fill={color} stroke="#fff" strokeWidth={1.5} />
      {/* Initial label */}
      <text
        x={x}
        y={y + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={8}
        fontWeight="bold"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {label}
      </text>
    </g>
  );
}

// ── Interpolate position along a train's route ──────────────────────────────
function usePlayerDots(state: SerializableGameState | null) {
  const [dots, setDots] = useState<
    Array<{ id: string; x: number; y: number; color: string; label: string }>
  >([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!state) return;

    function computeDots() {
      if (!state) return;
      const now = Date.now();
      const realElapsedMin = (now - state.lastRealTimestamp) / 1000 / 60;
      const gameNow = state.gameTimeMinutes + realElapsedMin * state.clockAcceleration;

      const result: typeof dots = [];

      function addDot(
        train: ActiveTrain,
        playerId: string,
        color: string,
        label: string
      ) {
        const stops = train.allStops;
        if (!stops || stops.length < 2) return;

        const fromStop = stops[train.currentStopIdx];
        const toStop = stops[train.currentStopIdx + 1];
        if (!toStop) return; // at final stop, no movement

        const departTimeStr = fromStop.depart;
        const arriveTimeStr = toStop.arrive;
        if (!departTimeStr || !arriveTimeStr) return;

        const departMin = hhmmToGameMin(departTimeStr);
        const arriveMin = hhmmToGameMin(arriveTimeStr);
        const segDuration = arriveMin - departMin;

        let t = segDuration > 0 ? (gameNow - departMin) / segDuration : 0;
        t = Math.max(0, Math.min(1, t));

        // Get edge point path (with waypoints)
        const points = getEdgePoints(fromStop.stationId, toStop.stationId);
        if (points.length < 2) {
          // Fallback: use station coordinates directly
          const a = STATIONS[fromStop.stationId];
          const b = STATIONS[toStop.stationId];
          if (!a || !b) return;
          result.push({
            id: playerId,
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            color,
            label,
          });
          return;
        }

        const [x, y] = positionAlongPolyline(points, t);
        result.push({ id: playerId, x, y, color, label });
      }

      // Snaker
      if (state.activeTrain && state.snakerId) {
        const color = PLAYER_HEX_COLORS[state.players[state.snakerId]?.color ?? "green"];
        const label = (state.players[state.snakerId]?.name ?? "S")[0].toUpperCase();
        addDot(state.activeTrain, state.snakerId, color, label);
      }

      // Blockers
      for (const bid of state.blockers ?? []) {
        const train = state.blockerActiveTrains?.[bid];
        if (!train) continue;
        const color = PLAYER_HEX_COLORS[state.players[bid]?.color ?? "red"];
        const label = (state.players[bid]?.name ?? "B")[0].toUpperCase();
        addDot(train, bid, color, label);
      }

      setDots(result);
      rafRef.current = requestAnimationFrame(computeDots);
    }

    rafRef.current = requestAnimationFrame(computeDots);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [state]);

  return dots;
}

// ── Main component ──────────────────────────────────────────────────────────
export default function TrainMap({ state, onStationClick, localPlayerId }: TrainMapProps) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const playerDots = usePlayerDots(state);

  // Native (non-passive) wheel handler
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.88;
      setTransform((t) => ({ ...t, scale: Math.min(4, Math.max(0.4, t.scale * factor)) }));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  const lastTouchDist = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      dragging.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && dragging.current) {
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
    } else if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const factor = dist / lastTouchDist.current;
      lastTouchDist.current = dist;
      setTransform((t) => ({ ...t, scale: Math.min(4, Math.max(0.4, t.scale * factor)) }));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    dragging.current = false;
    lastTouchDist.current = null;
  }, []);

  const snakeSet = new Set<StationId>(state?.snake ?? []);
  const visitedSegments = new Set<string>(state?.visitedSegments ?? []);
  const snakeHead = state?.snake?.[state.snake.length - 1] ?? null;
  const snakerId = state?.snakerId ?? null;
  const placements = state?.placements ?? {};
  const snakeColor = (snakerId && state?.players?.[snakerId]?.color) ?? "green";

  const blockerAtStation: Record<StationId, Array<"red" | "blue" | "green">> = {};
  for (const blockerId of state?.blockers ?? []) {
    const pos = state?.blockerPositions?.[blockerId];
    if (pos) {
      if (!blockerAtStation[pos]) blockerAtStation[pos] = [];
      const color = state?.players?.[blockerId]?.color ?? "red";
      blockerAtStation[pos].push(color as "red" | "blue" | "green");
    }
  }

  function isSegmentVisited(a: StationId, b: StationId) {
    return visitedSegments.has(`${a}_to_${b}`) || visitedSegments.has(`${b}_to_${a}`);
  }

  function getPlacement(key: string) { return placements[key]; }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-gray-950 rounded-lg overflow-hidden select-none"
      style={{ touchAction: "none" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "center center",
          transition: dragging.current ? "none" : "transform 0.05s ease-out",
        }}
      >
        {/* Korea map — SVG polyline map, tinted dark green via CSS filter */}
        <image
          href="/maps/south_korea.svg"
          x={0} y={0} width={800} height={1200}
          style={{ filter: "brightness(0.18) sepia(1) hue-rotate(85deg) saturate(6)" }}
        />

        {/* Rail edges */}
        {EDGES.map(([a, b]) => {
          const segAB = `${a}_to_${b}`;
          const segBA = `${b}_to_${a}`;
          const visited = isSegmentVisited(a, b);
          const isCursed =
            getPlacement(segAB)?.card?.type === "curse" ||
            getPlacement(segBA)?.card?.type === "curse";
          const hasRoadblock =
            getPlacement(segAB)?.card?.type === "roadblock" ||
            getPlacement(segBA)?.card?.type === "roadblock";

          return (
            <RailEdge
              key={segAB}
              from={a}
              to={b}
              lineName={getEdgeLine(a, b)}
              isVisited={visited}
              isCursed={isCursed}
              hasRoadblock={hasRoadblock}
              snakeColor={snakeColor as "red" | "blue" | "green"}
            />
          );
        })}

        {/* Station nodes */}
        {Object.keys(STATIONS).map((sid) => {
          const stationId = sid as StationId;
          const stPlacement = getPlacement(stationId);
          return (
            <StationNode
              key={stationId}
              stationId={stationId}
              isSnakeHead={stationId === snakeHead}
              isSnakeBody={snakeSet.has(stationId) && stationId !== snakeHead}
              blockerColors={blockerAtStation[stationId] ?? []}
              hasRoadblock={stPlacement?.card?.type === "roadblock"}
              hasBattle={stPlacement?.card?.type === "battle"}
              snakeColor={snakeColor as "red" | "blue" | "green"}
              onClick={onStationClick}
            />
          );
        })}

        {/* Animated player dots for in-transit players */}
        {playerDots.map((dot) => (
          <PlayerDot
            key={dot.id}
            x={dot.x}
            y={dot.y}
            color={dot.color}
            label={dot.label}
          />
        ))}
      </svg>

      <button
        className="absolute bottom-3 right-3 bg-gray-800 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
        onClick={(e) => {
          e.stopPropagation();
          setTransform({ x: 0, y: 0, scale: 1 });
        }}
      >
        Reset view
      </button>
    </div>
  );
}
