export type StationId = string;
export type SegmentId = string; // "{fromId}_to_{toId}" — directional
export type PlayerId = string;

export type CardType = "roadblock" | "curse" | "battle" | "powerup";
export type PowerupEffect = "draw2" | "secret_block" | "peek_hand" | "extra_move";

export interface TrainService {
  trainNum: string | number;
  type: string; // "KTX" | "KTX-이음" | "KTX-산천" | "Local"
  depart: string; // "HH:MM"
  arrive: string; // "HH:MM"
}

export interface TrainStop {
  stationId: StationId;
  arrive: string | null;  // null for boarding station
  depart: string | null;  // null for final stop
}

export interface Card {
  id: string;
  type: CardType;
  powerupEffect?: PowerupEffect;
}

export interface Placement {
  card: Card;
  placedBy: PlayerId;
  stationId?: StationId;
  segmentId?: SegmentId;
}

export interface ActiveTrain {
  service: TrainService;
  fromStation: StationId;
  toStation: StationId;
  boardedAtGameMinute: number;
  arrivalGameMinute: number;
  allStops: TrainStop[];        // full stop sequence from boarding onward
  currentStopIdx: number;       // index of current/last reached stop
  deboardWindowOpen: boolean;   // true during dwell time at an intermediate stop
}

export type ChallengeType =
  | "reaction"
  | "memory"
  | "typing"
  | "geoguessr"
  | "chess"
  | "trivia";

export interface ActiveChallenge {
  type: ChallengeType;
  triggeredBy: CardType;
  involvedStation: StationId;
  payload: Record<string, unknown>;
  submissions: Record<PlayerId, unknown>;
  deadline: number; // epoch ms (wall clock)
}

export interface RunRecord {
  snakerId: PlayerId;
  stations: StationId[];
  crashedAt?: StationId;
  length: number;
  endTimeMinutes: number;
}

export type GamePhase =
  | "lobby"
  | "strategy"             // 5-min real-time planning phase before clock starts
  | "blocker_headstart"    // Blockers move freely; Snaker waits (first 60 in-game min)
  | "playing"              // Snaker picks a train
  | "in_transit"           // Snaker on a train; Blockers take actions
  | "challenge"            // Mini-game active
  | "run_end"              // Run over; show results
  | "finished";            // All runs done; show winner

export interface PlayerInfo {
  name: string;
  color: "red" | "blue" | "green";
  role: "snaker" | "blocker";
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;

  // Players — exactly 3: 1 snaker + 2 blockers
  players: Record<PlayerId, PlayerInfo>;
  snakerId: PlayerId;
  blockers: PlayerId[]; // always length 2

  // Clock
  gameTimeMinutes: number;       // minutes since 07:00, range 0–720
  clockAcceleration: number;     // 30 | 60 | 120
  lastRealTimestamp: number;     // epoch ms — used to interpolate client-side

  // Head start
  headstartEndsAt: number;       // game minute when head start ends (always 60)

  // Strategy phase
  strategyEndsAt?: number;       // epoch ms when strategy phase expires

  // Pause
  pausesRemaining: number;       // pauses left this run (2 at start)
  pausedUntil?: number;          // epoch ms when current pause expires

  // Snaker state
  snake: StationId[];            // [start, ..., current_head]
  visitedSegments: Set<SegmentId>;
  activeTrain?: ActiveTrain;

  // Blocker state (per-blocker)
  blockerPositions: Record<PlayerId, StationId | null>;
  blockerHands: Record<PlayerId, Card[]>; // max 5 cards each
  blockerActionsRemaining: number;        // shared pool during in_transit
  blockerActiveTrains: Record<PlayerId, ActiveTrain | undefined>;

  // Card placements on map
  placements: Record<string, Placement>; // key: stationId or segmentId

  // Challenge
  activeChallenge?: ActiveChallenge;

  // Scoring
  completedRuns: RunRecord[];
  winner?: PlayerId | null;
}

// ── WebSocket protocol ──────────────────────────────────────────────────────

export type ClientMessage =
  | { type: "set_name"; name: string }
  | { type: "set_acceleration"; value: 30 | 60 | 120 }
  | { type: "start_game" }
  | { type: "board_train"; playerId: PlayerId; service: TrainService; toStation: StationId; allStops: TrainStop[] }
  | { type: "deboard_train"; playerId: PlayerId }
  | { type: "blocker_play_card"; playerId: PlayerId; card: Card; target: { stationId?: StationId; segmentId?: SegmentId } }
  | { type: "blocker_draw_card"; playerId: PlayerId }
  | { type: "blocker_pass"; playerId: PlayerId }
  | { type: "challenge_submit"; playerId: PlayerId; answer: unknown }
  | { type: "request_pause"; playerId: PlayerId }
  | { type: "start_next_run" };

export type ServerMessage =
  | { type: "state_update"; state: SerializableGameState }
  | { type: "error"; message: string };

// GameState with Set replaced by array for JSON serialization
export type SerializableGameState = Omit<GameState, "visitedSegments"> & {
  visitedSegments: SegmentId[];
};
