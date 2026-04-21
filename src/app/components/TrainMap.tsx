"use client";

import { useRef, useState, useCallback } from "react";
import { STATIONS, EDGES } from "@/data/network";
import type { SerializableGameState, StationId, PlayerId } from "@/shared/types";
import RailEdge from "./RailEdge";
import StationNode from "./StationNode";

interface TrainMapProps {
  state: SerializableGameState | null;
  onStationClick?: (stationId: StationId) => void;
  localPlayerId: PlayerId;
}

// SVG viewBox dimensions (matches coordinate space in network.ts)
const VIEW_W = 650;
const VIEW_H = 620;

export default function TrainMap({ state, onStationClick, localPlayerId }: TrainMapProps) {
  // Pan & zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

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

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    setTransform((t) => ({ ...t, scale: Math.min(4, Math.max(0.4, t.scale * factor)) }));
  }, []);

  // Touch handling for mobile
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

  // Derive display data from game state
  const snakeSet = new Set<StationId>(state?.snake ?? []);
  const visitedSegments = new Set<string>(state?.visitedSegments ?? []);
  const snakeHead = state?.snake?.[state.snake.length - 1] ?? null;
  const snakerId = state?.snakerId ?? null;
  const placements = state?.placements ?? {};

  // Snaker color
  const snakeColor =
    (snakerId && state?.players?.[snakerId]?.color) ?? "green";

  // Blocker positions: stationId → list of colors
  const blockerAtStation: Record<StationId, Array<"red" | "blue" | "green">> = {};
  for (const blockerId of state?.blockers ?? []) {
    const pos = state?.blockerPositions?.[blockerId];
    if (pos) {
      if (!blockerAtStation[pos]) blockerAtStation[pos] = [];
      const color = state?.players?.[blockerId]?.color ?? "red";
      blockerAtStation[pos].push(color as "red" | "blue" | "green");
    }
  }

  // Which segments are visited (both directions stored)
  function isSegmentVisited(a: StationId, b: StationId) {
    return visitedSegments.has(`${a}_to_${b}`) || visitedSegments.has(`${b}_to_${a}`);
  }

  // Card placements
  function getPlacement(key: string) {
    return placements[key];
  }

  return (
    <div
      className="relative w-full h-full bg-gray-950 rounded-lg overflow-hidden select-none"
      style={{ touchAction: "none" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "center center",
          transition: dragging.current ? "none" : "transform 0.05s ease-out",
        }}
      >
        {/* Edges */}
        {EDGES.map(([a, b]) => {
          const segAB = `${a}_to_${b}`;
          const segBA = `${b}_to_${a}`;
          const visited = isSegmentVisited(a, b);
          const placementAB = getPlacement(segAB);
          const placementBA = getPlacement(segBA);
          const isCursed =
            placementAB?.card?.type === "curse" || placementBA?.card?.type === "curse";
          const hasRoadblock =
            placementAB?.card?.type === "roadblock" || placementBA?.card?.type === "roadblock";

          return (
            <RailEdge
              key={segAB}
              from={a}
              to={b}
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
          const hasRoadblock = stPlacement?.card?.type === "roadblock";
          const hasBattle = stPlacement?.card?.type === "battle";

          return (
            <StationNode
              key={stationId}
              stationId={stationId}
              isSnakeHead={stationId === snakeHead}
              isSnakeBody={snakeSet.has(stationId) && stationId !== snakeHead}
              blockerColors={blockerAtStation[stationId] ?? []}
              hasRoadblock={hasRoadblock}
              hasBattle={hasBattle}
              snakeColor={snakeColor as "red" | "blue" | "green"}
              onClick={onStationClick}
            />
          );
        })}
      </svg>

      {/* Reset zoom button */}
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
