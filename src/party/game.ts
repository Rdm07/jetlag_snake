import type * as Party from "partykit/server";
import type {
  GameState,
  SerializableGameState,
  ClientMessage,
  ServerMessage,
  PlayerId,
  Card,
  StationId,
  ActiveTrain,
  TrainStop,
} from "../shared/types";
import { ADJACENCY, NODE_IDS } from "../data/network_edges";
import triviaData from "../data/challenges/trivia.json";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(len = 4) {
  return Math.random().toString(36).toUpperCase().slice(2, 2 + len);
}

function makeCard(type: Card["type"], effect?: Card["powerupEffect"]): Card {
  return { id: makeId(6), type, powerupEffect: effect };
}

const CARD_DECK_TEMPLATE: Omit<Card, "id">[] = [
  { type: "roadblock" },
  { type: "roadblock" },
  { type: "roadblock" },
  { type: "curse" },
  { type: "curse" },
  { type: "battle" },
  { type: "battle" },
  { type: "powerup", powerupEffect: "draw2" },
  { type: "powerup", powerupEffect: "secret_block" },
  { type: "powerup", powerupEffect: "peek_hand" },
  { type: "powerup", powerupEffect: "extra_move" },
];

function drawCards(hand: Card[], count: number): Card[] {
  const drawn: Card[] = [];
  for (let i = 0; i < count; i++) {
    const tmpl = CARD_DECK_TEMPLATE[Math.floor(Math.random() * CARD_DECK_TEMPLATE.length)];
    drawn.push({ ...tmpl, id: makeId(6) });
  }
  return [...hand, ...drawn].slice(0, 5);
}

function timeToGameMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m - 7 * 60; // minutes from 07:00
}

function toSerializable(state: GameState): SerializableGameState {
  return {
    ...state,
    visitedSegments: Array.from(state.visitedSegments),
  };
}

function broadcast(room: Party.Room, state: GameState) {
  const msg: ServerMessage = { type: "state_update", state: toSerializable(state) };
  room.broadcast(JSON.stringify(msg));
}

// ---------------------------------------------------------------------------
// Default initial state
// ---------------------------------------------------------------------------

function makeInitialState(roomCode: string): GameState {
  return {
    roomCode,
    phase: "lobby",
    players: {},
    snakerId: "",
    blockers: [],
    gameTimeMinutes: 0,
    clockAcceleration: 60,
    lastRealTimestamp: Date.now(),
    headstartEndsAt: 60,
    strategyEndsAt: undefined,
    pausesRemaining: 2,
    pausedUntil: undefined,
    snake: [],
    visitedSegments: new Set(),
    activeTrain: undefined,
    blockerPositions: {},
    blockerHands: {},
    blockerActionsRemaining: 0,
    blockerActiveTrains: {},
    placements: {},
    activeChallenge: undefined,
    completedRuns: [],
    winner: undefined,
  };
}

// ---------------------------------------------------------------------------
// PartyKit Server
// ---------------------------------------------------------------------------

export default class GameServer implements Party.Server {
  state: GameState;
  clockInterval: ReturnType<typeof setInterval> | null = null;

  constructor(readonly room: Party.Room) {
    this.state = makeInitialState(room.id);
  }

  async onStart() {
    const stored = await this.room.storage.get<string>("state");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        parsed.visitedSegments = new Set(parsed.visitedSegments ?? []);
        // Ensure new fields exist after deserialization
        parsed.blockerActiveTrains = parsed.blockerActiveTrains ?? {};
        parsed.pausesRemaining = parsed.pausesRemaining ?? 2;
        parsed.pausedUntil = parsed.pausedUntil ?? undefined;
        parsed.strategyEndsAt = parsed.strategyEndsAt ?? undefined;
        this.state = parsed;
        const activePhases = ["strategy", "blocker_headstart", "playing", "in_transit", "challenge"];
        if (activePhases.includes(this.state.phase)) {
          this.startClock();
        }
      } catch {
        // corrupt storage — start fresh
      }
    }
  }

  async saveState() {
    await this.room.storage.put("state", JSON.stringify(toSerializable(this.state)));
  }

  async onConnect(conn: Party.Connection) {
    const msg: ServerMessage = { type: "state_update", state: toSerializable(this.state) };
    conn.send(JSON.stringify(msg));
  }

  async onClose(_conn: Party.Connection) {
    // Players persist on disconnect for reconnection
  }

  // ----------------------------------------------------------
  // Message handling
  // ----------------------------------------------------------

  async onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }

    const s = this.state;

    switch (msg.type) {
      case "set_name": {
        if (!s.players[sender.id]) {
          s.players[sender.id] = {
            name: msg.name,
            color: (["red", "blue", "green"] as const)[Object.keys(s.players).length % 3],
            role: "blocker",
          };
        } else {
          s.players[sender.id].name = msg.name;
        }
        break;
      }

      case "set_acceleration": {
        if (s.phase === "lobby") {
          s.clockAcceleration = msg.value;
        }
        break;
      }

      case "start_game": {
        if (s.phase !== "lobby") break;
        const playerIds = Object.keys(s.players);
        if (playerIds.length < 3) break;

        const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
        s.snakerId = shuffled[0];
        s.blockers = [shuffled[1], shuffled[2]];
        s.players[s.snakerId].role = "snaker";
        for (const bid of s.blockers) s.players[bid].role = "blocker";

        this.startRun();
        break;
      }

      case "solo_test": {
        if (s.phase !== "lobby") break;

        // Ensure the real player is registered
        if (!s.players[sender.id]) {
          s.players[sender.id] = { name: "You", color: "green", role: "blocker" };
        }

        // Add two bot players with deterministic IDs
        const ALL_COLORS: Array<"red" | "blue" | "green"> = ["red", "blue", "green"];
        const usedColors = new Set(Object.values(s.players).map((p) => p.color));
        const freeColors = ALL_COLORS.filter((c) => !usedColors.has(c));

        if (!s.players["__bot1__"]) {
          s.players["__bot1__"] = { name: "Bot 1", color: freeColors[0] ?? "red", role: "blocker" };
        }
        if (!s.players["__bot2__"]) {
          s.players["__bot2__"] = { name: "Bot 2", color: freeColors[1] ?? "blue", role: "blocker" };
        }

        // Use 120× speed for test runs so trains arrive quickly
        s.clockAcceleration = 120;

        const ids = Object.keys(s.players);
        const shuffled2 = [...ids].sort(() => Math.random() - 0.5);
        s.snakerId = shuffled2[0];
        s.blockers = [shuffled2[1], shuffled2[2]];
        s.players[s.snakerId].role = "snaker";
        for (const bid of s.blockers) s.players[bid].role = "blocker";

        this.startRun();
        break;
      }

      // ── Board a train (snaker OR blocker) ──────────────────────────────────
      case "board_train": {
        const { playerId, service, toStation, allStops } = msg;
        const isSnaker = playerId === s.snakerId;
        const isBlocker = s.blockers.includes(playerId);
        if (!isSnaker && !isBlocker) break;

        const travelMin = timeToGameMin(service.arrive) - timeToGameMin(service.depart);

        const train: ActiveTrain = {
          service,
          fromStation: isSnaker ? s.snake[s.snake.length - 1] : s.blockerPositions[playerId] ?? toStation,
          toStation,
          boardedAtGameMinute: s.gameTimeMinutes,
          arrivalGameMinute: s.gameTimeMinutes + travelMin,
          allStops,
          currentStopIdx: 0,
          deboardWindowOpen: false,
        };

        if (isSnaker) {
          if (s.phase !== "playing") break;
          const head = s.snake[s.snake.length - 1];
          if (!ADJACENCY[head]?.includes(toStation)) break;
          if (s.snake.includes(toStation)) break;
          s.activeTrain = train;
          s.blockerActionsRemaining = Math.floor(travelMin / 15) + 1;
          s.phase = "in_transit";
        } else {
          // Blocker boards a train in headstart or in_transit
          if (s.phase !== "blocker_headstart" && s.phase !== "in_transit" && s.phase !== "playing") break;
          const currentPos = s.blockerPositions[playerId];
          if (currentPos !== train.fromStation) break;
          s.blockerActiveTrains[playerId] = train;
        }
        break;
      }

      // ── Deboard a train ────────────────────────────────────────────────────
      case "deboard_train": {
        const { playerId } = msg;
        const isSnaker = playerId === s.snakerId;
        const isBlocker = s.blockers.includes(playerId);

        if (isSnaker) {
          const train = s.activeTrain;
          if (!train) break;
          // Allow deboard: at deboard window (intermediate stop) OR at idx 0 (cancel before departure)
          const canDeboard = train.deboardWindowOpen || train.currentStopIdx === 0;
          if (!canDeboard) break;
          const currentStop = train.allStops[train.currentStopIdx];
          if (!currentStop) break;

          if (train.currentStopIdx === 0) {
            // Cancel: return to boarding station without extending snake
            s.activeTrain = undefined;
            s.blockerActionsRemaining = 0;
            s.phase = "playing";
          } else {
            // Deboard at intermediate stop — extend snake to that stop
            s.snake = [...s.snake, currentStop.stationId];
            s.visitedSegments.add(`${train.fromStation}_to_${currentStop.stationId}`);
            s.visitedSegments.add(`${currentStop.stationId}_to_${train.fromStation}`);
            s.activeTrain = undefined;
            s.blockerActionsRemaining = 0;
            s.phase = "playing";
          }
        } else if (isBlocker) {
          const train = s.blockerActiveTrains[playerId];
          if (!train) break;
          const canDeboard = train.deboardWindowOpen || train.currentStopIdx === 0;
          if (!canDeboard) break;
          const currentStop = train.allStops[train.currentStopIdx];
          if (!currentStop) break;
          s.blockerPositions[playerId] = currentStop.stationId;
          delete s.blockerActiveTrains[playerId];
        }
        break;
      }

      case "blocker_draw_card": {
        if (s.phase !== "in_transit") break;
        const { playerId } = msg;
        if (!s.blockers.includes(playerId)) break;
        if (s.blockerActionsRemaining <= 0) break;
        s.blockerHands[playerId] = drawCards(s.blockerHands[playerId] ?? [], 1);
        s.blockerActionsRemaining = Math.max(0, s.blockerActionsRemaining - 1);
        break;
      }

      case "blocker_play_card": {
        if (s.phase !== "in_transit") break;
        const { playerId, card, target } = msg;
        if (!s.blockers.includes(playerId)) break;
        if (s.blockerActionsRemaining <= 0) break;

        // ── Card placement rule enforcement ─────────────────────────────────
        const blockerTrain = s.blockerActiveTrains[playerId];
        const isInTransit = !!blockerTrain;
        const deboardWindowOpen = blockerTrain?.deboardWindowOpen ?? false;

        if (card.type === "curse") {
          // Curse: allowed if blocker not in transit OR in deboard window
          if (isInTransit && !deboardWindowOpen) break;
        } else if (card.type === "roadblock") {
          // Roadblock: only when fully deboarded
          if (isInTransit) break;
        } else if (card.type === "battle") {
          // Battle: only when deboarded AND snaker not at target station
          if (isInTransit) break;
          const snakerHead = s.snake[s.snake.length - 1];
          if (target.stationId && target.stationId === snakerHead) break;
        }

        const hand = s.blockerHands[playerId] ?? [];
        const idx = hand.findIndex((c) => c.id === card.id);
        if (idx === -1) break;
        s.blockerHands[playerId] = [...hand.slice(0, idx), ...hand.slice(idx + 1)];

        const key = target.stationId ?? target.segmentId ?? "";
        if (key) {
          s.placements[key] = { card, placedBy: playerId, ...target };
        }
        s.blockerActionsRemaining = Math.max(0, s.blockerActionsRemaining - 1);
        break;
      }

      case "blocker_pass": {
        if (s.phase !== "in_transit") break;
        s.blockerActionsRemaining = 0;
        break;
      }

      case "request_pause": {
        const activePhases = ["blocker_headstart", "playing", "in_transit", "challenge"];
        if (!activePhases.includes(s.phase)) break;
        if (s.pausesRemaining <= 0) break;
        if (s.pausedUntil && Date.now() < s.pausedUntil) break; // already paused
        s.pausedUntil = Date.now() + 60_000; // 1 real minute
        s.pausesRemaining -= 1;
        break;
      }

      case "challenge_submit": {
        if (s.phase !== "challenge" || !s.activeChallenge) break;
        const { playerId, answer } = msg;
        s.activeChallenge.submissions[playerId] = answer;
        this.tryResolveChallenge();
        break;
      }

      case "start_next_run": {
        if (s.phase !== "run_end") break;
        this.rotateRoles();
        this.startRun();
        break;
      }
    }

    await this.saveState();
    broadcast(this.room, s);
  }

  // ----------------------------------------------------------
  // Game logic helpers
  // ----------------------------------------------------------

  startRun() {
    const s = this.state;
    const allStations = Object.keys(ADJACENCY) as StationId[];

    s.snake = ["yongsan"];
    s.visitedSegments = new Set();
    s.activeTrain = undefined;
    s.placements = {};
    s.activeChallenge = undefined;
    s.gameTimeMinutes = 0;
    s.lastRealTimestamp = Date.now();
    s.headstartEndsAt = 60;
    s.blockerActionsRemaining = 0;
    s.blockerActiveTrains = {};
    s.pausesRemaining = 2;
    s.pausedUntil = undefined;

    // Strategy phase: 5 real minutes before clock starts
    s.phase = "strategy";
    s.strategyEndsAt = Date.now() + 5 * 60 * 1000;

    for (const bid of s.blockers) {
      const randomIdx = Math.floor(Math.random() * allStations.length);
      s.blockerPositions[bid] = allStations[randomIdx];
      s.blockerHands[bid] = drawCards([], 3);
    }

    this.startClock();
  }

  rotateRoles() {
    const s = this.state;
    const allIds = [s.snakerId, ...s.blockers];
    const bestRun = s.completedRuns.reduce(
      (best, r) => (r.length > (best?.length ?? -1) ? r : best),
      null as (typeof s.completedRuns)[0] | null
    );

    const nonWinners = allIds.filter((id) => id !== bestRun?.snakerId);
    const nextSnaker = nonWinners[Math.floor(Math.random() * nonWinners.length)];
    const nextBlockers = allIds.filter((id) => id !== nextSnaker) as [PlayerId, PlayerId];

    s.snakerId = nextSnaker;
    s.blockers = nextBlockers;
    for (const id of allIds) {
      s.players[id].role = id === nextSnaker ? "snaker" : "blocker";
    }
  }

  startClock() {
    if (this.clockInterval) return;
    this.clockInterval = setInterval(() => {
      this.tick();
    }, 5000);
  }

  tick() {
    const s = this.state;
    const terminalPhases = ["lobby", "run_end", "finished"];
    if (terminalPhases.includes(s.phase)) return;

    const now = Date.now();

    // ── Strategy phase: wait for real timer to expire ──────────────────────
    if (s.phase === "strategy") {
      if (now >= (s.strategyEndsAt ?? 0)) {
        s.phase = "blocker_headstart";
        s.lastRealTimestamp = now;
      }
      this.saveState();
      broadcast(this.room, s);
      return;
    }

    // ── Pause: skip time advancement while paused ──────────────────────────
    if (s.pausedUntil && now < s.pausedUntil) {
      s.lastRealTimestamp = now; // keep timestamp fresh so no time debt accrues
      broadcast(this.room, s);
      return;
    }

    // ── Advance game clock ────────────────────────────────────────────────
    const realElapsed = (now - s.lastRealTimestamp) / 1000 / 60;
    const gameMinsElapsed = realElapsed * s.clockAcceleration;
    s.gameTimeMinutes += gameMinsElapsed;
    s.lastRealTimestamp = now;

    // ── Headstart end ─────────────────────────────────────────────────────
    if (s.phase === "blocker_headstart" && s.gameTimeMinutes >= s.headstartEndsAt) {
      s.phase = "playing";
    }

    // ── Advance blocker trains ────────────────────────────────────────────
    for (const bid of s.blockers) {
      const train = s.blockerActiveTrains[bid];
      if (!train) continue;
      this.advanceTrain(train, s.gameTimeMinutes, (stationId) => {
        s.blockerPositions[bid] = stationId;
      }, () => {
        // Auto-deboard at final stop
        const finalStop = train.allStops[train.allStops.length - 1];
        if (finalStop) s.blockerPositions[bid] = finalStop.stationId;
        delete s.blockerActiveTrains[bid];
        // Node reward
        if (s.blockerPositions[bid] && NODE_IDS.has(s.blockerPositions[bid]!)) {
          s.blockerHands[bid] = drawCards(s.blockerHands[bid] ?? [], 1);
        }
      });
    }

    // ── Snaker train: intermediate stops + final arrival ──────────────────
    if (s.phase === "in_transit" && s.activeTrain) {
      this.advanceTrain(s.activeTrain, s.gameTimeMinutes, () => {
        // intermediate stop: snaker stays on train, no position update
      }, () => {
        this.handleArrival();
      });
    }

    // ── 19:00 cutoff ──────────────────────────────────────────────────────
    if (s.gameTimeMinutes >= 720 && !terminalPhases.includes(s.phase)) {
      this.endRun(false);
    }

    this.saveState();
    broadcast(this.room, s);
  }

  /**
   * Advance a train's position through its stops based on current game time.
   * Calls onIntermediateStop when the train arrives at an intermediate stop.
   * Calls onFinalStop when the train reaches its final destination.
   * Returns true if the final stop was reached this tick.
   */
  advanceTrain(
    train: ActiveTrain,
    gameTimeMinutes: number,
    onIntermediateStop: (stationId: StationId) => void,
    onFinalStop: () => void
  ): boolean {
    const stops = train.allStops;

    // Walk through stops beyond currentStopIdx
    let changed = false;
    while (train.currentStopIdx < stops.length - 1) {
      const nextStop = stops[train.currentStopIdx + 1];
      if (!nextStop.arrive) break;
      const nextArriveMin = timeToGameMin(nextStop.arrive);
      if (gameTimeMinutes < nextArriveMin) break;

      // Arrived at next stop
      train.currentStopIdx++;
      train.deboardWindowOpen = true;
      onIntermediateStop(nextStop.stationId);
      changed = true;

      // Check if this is the final stop (depart === null)
      if (nextStop.depart === null) {
        onFinalStop();
        return true;
      }
    }

    // Close deboard window once train has departed the current intermediate stop
    if (train.deboardWindowOpen && train.currentStopIdx < stops.length - 1) {
      const currentStop = stops[train.currentStopIdx];
      if (currentStop.depart) {
        const departMin = timeToGameMin(currentStop.depart);
        if (gameTimeMinutes >= departMin) {
          train.deboardWindowOpen = false;
        }
      }
    }

    return false;
  }

  handleArrival() {
    const s = this.state;
    if (!s.activeTrain) return;

    const { toStation, fromStation } = s.activeTrain;

    // Check for curse on segment
    const segKey = `${fromStation}_to_${toStation}`;
    const cursePlacement = s.placements[segKey];
    if (cursePlacement?.card?.type === "curse") {
      s.gameTimeMinutes += 30;
      delete s.placements[segKey];
    }

    // Check for roadblock / battle at destination
    const stationPlacement = s.placements[toStation];
    if (stationPlacement?.card?.type === "roadblock" || stationPlacement?.card?.type === "battle") {
      const isBattle = stationPlacement.card.type === "battle";
      const challengeType = isBattle ? "reaction" : this.pickChallengeType();
      const payload = this.buildChallengePayload(challengeType);

      s.phase = "challenge";
      s.activeChallenge = {
        type: challengeType,
        triggeredBy: stationPlacement.card.type,
        involvedStation: toStation,
        payload,
        submissions: {},
        deadline: Date.now() + 45_000,
      };
      return;
    }

    // Normal arrival
    s.snake = [...s.snake, toStation];
    s.visitedSegments.add(`${fromStation}_to_${toStation}`);
    s.visitedSegments.add(`${toStation}_to_${fromStation}`);
    s.activeTrain = undefined;
    s.blockerActionsRemaining = 0;
    s.phase = "playing";

    const neighbors = ADJACENCY[toStation] ?? [];
    const hasOnwardMove = neighbors.some((n) => !s.snake.includes(n));
    if (!hasOnwardMove) {
      this.endRun(false);
    }
  }

  pickChallengeType(): "reaction" | "memory" | "typing" | "trivia" {
    const types = ["reaction", "memory", "typing", "trivia"] as const;
    return types[Math.floor(Math.random() * types.length)];
  }

  buildChallengePayload(type: string): Record<string, unknown> {
    if (type === "trivia") {
      const q = triviaData[Math.floor(Math.random() * triviaData.length)];
      return { question: q };
    }
    if (type === "memory") {
      const colors = ["red", "blue", "green", "yellow"];
      const len = 4 + Math.floor(Math.random() * 3);
      const sequence = Array.from({ length: len }, () =>
        colors[Math.floor(Math.random() * colors.length)]
      );
      return { sequence };
    }
    if (type === "typing") {
      const sentences = [
        "The KTX train from Seoul to Busan travels at over two hundred and fifty kilometers per hour.",
        "Gyeongju was the ancient capital of the Silla kingdom and is famous for its royal tombs.",
        "Passengers boarding at Yongsan station must present their tickets before entering the platform.",
        "The Gangneung line opened in two thousand and eighteen for the PyeongChang Winter Olympics.",
        "Dokdo is a group of small islets in the East Sea administered by South Korea.",
      ];
      return { sentence: sentences[Math.floor(Math.random() * sentences.length)] };
    }
    return {};
  }

  tryResolveChallenge() {
    const s = this.state;
    if (!s.activeChallenge) return;

    const { triggeredBy, involvedStation, submissions } = s.activeChallenge;
    const snakerSubmission = submissions[s.snakerId];

    if (triggeredBy === "roadblock") {
      if (snakerSubmission === undefined) return;
      const passed =
        typeof snakerSubmission === "boolean"
          ? snakerSubmission
          : typeof snakerSubmission === "number"
          ? snakerSubmission < 500
          : false;

      s.activeChallenge = undefined;
      if (passed) {
        this.completeArrival(involvedStation);
      } else {
        this.endRun(true);
      }
    } else if (triggeredBy === "battle") {
      const presentBlockers = s.blockers.filter(
        (bid) => s.blockerPositions[bid] === involvedStation
      );
      const allSubmitted =
        snakerSubmission !== undefined &&
        presentBlockers.every((bid) => submissions[bid] !== undefined);

      if (!allSubmitted) return;

      const snakerVal = snakerSubmission as number;
      const snakerWon = presentBlockers.some((bid) => {
        const bVal = submissions[bid] as number;
        return snakerVal < bVal;
      });

      s.activeChallenge = undefined;
      if (snakerWon) {
        this.completeArrival(involvedStation);
      } else {
        this.endRun(true);
      }
    }
  }

  completeArrival(toStation: StationId) {
    const s = this.state;
    if (!s.activeTrain) return;
    const { fromStation } = s.activeTrain;

    delete s.placements[toStation];
    s.snake = [...s.snake, toStation];
    s.visitedSegments.add(`${fromStation}_to_${toStation}`);
    s.visitedSegments.add(`${toStation}_to_${fromStation}`);
    s.activeTrain = undefined;
    s.blockerActionsRemaining = 0;
    s.phase = "playing";

    const neighbors = ADJACENCY[toStation] ?? [];
    const hasOnwardMove = neighbors.some((n) => !s.snake.includes(n));
    if (!hasOnwardMove) {
      this.endRun(false);
    }
  }

  endRun(crashed: boolean) {
    const s = this.state;
    const head = s.snake[s.snake.length - 1];
    s.completedRuns.push({
      snakerId: s.snakerId,
      stations: [...s.snake],
      crashedAt: crashed ? head : undefined,
      length: s.snake.length,
      endTimeMinutes: s.gameTimeMinutes,
    });
    s.activeTrain = undefined;
    s.phase = "run_end";

    const uniqueSnakerIds = new Set(s.completedRuns.map((r) => r.snakerId));
    if (uniqueSnakerIds.size >= 3) {
      const best = s.completedRuns.reduce((a, b) => (a.length >= b.length ? a : b));
      s.winner = best.snakerId;
      s.phase = "finished";
    }
  }
}

GameServer satisfies Party.Worker;
