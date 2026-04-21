import type * as Party from "partykit/server";
import type {
  GameState,
  SerializableGameState,
  ClientMessage,
  ServerMessage,
  PlayerId,
  Card,
  StationId,
} from "../shared/types";
import { ADJACENCY, NODE_IDS } from "../data/network";
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

function drawCards(hand: Card[], count: number, hands: Record<PlayerId, Card[]>): Card[] {
  const drawn: Card[] = [];
  for (let i = 0; i < count; i++) {
    const tmpl = CARD_DECK_TEMPLATE[Math.floor(Math.random() * CARD_DECK_TEMPLATE.length)];
    drawn.push({ ...tmpl, id: makeId(6) });
  }
  return [...hand, ...drawn].slice(0, 5); // max hand size 5
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
    snake: [],
    visitedSegments: new Set(),
    activeTrain: undefined,
    blockerPositions: {},
    blockerHands: {},
    blockerActionsRemaining: 0,
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

  // Persist + restore state across hibernation
  async onStart() {
    const stored = await this.room.storage.get<string>("state");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        parsed.visitedSegments = new Set(parsed.visitedSegments ?? []);
        this.state = parsed;
        if (this.state.phase !== "lobby" && this.state.phase !== "finished") {
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

  // ----------------------------------------------------------
  // Connection lifecycle
  // ----------------------------------------------------------

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Send current state to new connection
    const msg: ServerMessage = { type: "state_update", state: toSerializable(this.state) };
    conn.send(JSON.stringify(msg));
  }

  async onClose(conn: Party.Connection) {
    // Players are identified by their connection id; we don't remove them on
    // disconnect so they can reconnect within the same session.
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

        // First 3 players: randomly pick snaker
        const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
        s.snakerId = shuffled[0];
        s.blockers = [shuffled[1], shuffled[2]];

        // Assign roles
        s.players[s.snakerId].role = "snaker";
        for (const bid of s.blockers) {
          s.players[bid].role = "blocker";
        }

        this.startRun();
        break;
      }

      case "blocker_move": {
        if (s.phase !== "blocker_headstart" && s.phase !== "in_transit") break;
        const { playerId, toStation } = msg;
        if (!s.blockers.includes(playerId)) break;
        const currentPos = s.blockerPositions[playerId];

        // Validate adjacency (or allow any station during headstart for simplicity)
        if (currentPos && !ADJACENCY[currentPos]?.includes(toStation)) break;

        s.blockerPositions[playerId] = toStation;

        // If it's a node station, draw a card
        if (NODE_IDS.has(toStation) && s.blockerHands[playerId]?.length < 5) {
          s.blockerHands[playerId] = drawCards(s.blockerHands[playerId] ?? [], 1, s.blockerHands);
        }

        // Consume an action during in_transit
        if (s.phase === "in_transit") {
          s.blockerActionsRemaining = Math.max(0, s.blockerActionsRemaining - 1);
        }
        break;
      }

      case "blocker_draw_card": {
        if (s.phase !== "in_transit") break;
        const { playerId } = msg;
        if (!s.blockers.includes(playerId)) break;
        if (s.blockerActionsRemaining <= 0) break;
        s.blockerHands[playerId] = drawCards(s.blockerHands[playerId] ?? [], 1, s.blockerHands);
        s.blockerActionsRemaining = Math.max(0, s.blockerActionsRemaining - 1);
        break;
      }

      case "blocker_play_card": {
        if (s.phase !== "in_transit") break;
        const { playerId, card, target } = msg;
        if (!s.blockers.includes(playerId)) break;
        if (s.blockerActionsRemaining <= 0) break;

        // Remove card from hand
        const hand = s.blockerHands[playerId] ?? [];
        const idx = hand.findIndex((c) => c.id === card.id);
        if (idx === -1) break;
        s.blockerHands[playerId] = [...hand.slice(0, idx), ...hand.slice(idx + 1)];

        // Place card
        const key = target.stationId ?? target.segmentId ?? "";
        if (key) {
          s.placements[key] = { card, placedBy: playerId, ...target };
        }

        s.blockerActionsRemaining = Math.max(0, s.blockerActionsRemaining - 1);
        break;
      }

      case "blocker_pass": {
        if (s.phase !== "in_transit") break;
        // Pass ends this blocker's turn — if both blockers have passed, resolve arrival
        s.blockerActionsRemaining = 0;
        break;
      }

      case "snaker_board_train": {
        if (s.phase !== "playing") break;
        const { service, toStation } = msg;

        // Validate: toStation must be adjacent to snake head and not visited
        const head = s.snake[s.snake.length - 1];
        if (!ADJACENCY[head]?.includes(toStation)) break;
        if (s.snake.includes(toStation)) break;

        const travelMin =
          this.timeToMinutes(service.arrive) - this.timeToMinutes(service.depart);

        s.activeTrain = {
          service,
          fromStation: head,
          toStation,
          boardedAtGameMinute: s.gameTimeMinutes,
          arrivalGameMinute: s.gameTimeMinutes + travelMin,
        };

        s.blockerActionsRemaining = Math.floor(travelMin / 15) + 1;
        s.phase = "in_transit";
        break;
      }

      case "challenge_submit": {
        if (s.phase !== "challenge" || !s.activeChallenge) break;
        const { playerId, answer } = msg;
        s.activeChallenge.submissions[playerId] = answer;

        // Resolve once all relevant players have submitted
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

  timeToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  startRun() {
    const s = this.state;
    // Pick a random starting station for each blocker
    const allStations = Object.keys(ADJACENCY) as StationId[];

    s.snake = ["yongsan"]; // Snaker always starts at Yongsan
    s.visitedSegments = new Set();
    s.activeTrain = undefined;
    s.placements = {};
    s.activeChallenge = undefined;
    s.gameTimeMinutes = 0; // represents 07:00
    s.lastRealTimestamp = Date.now();
    s.headstartEndsAt = 60;
    s.blockerActionsRemaining = 0;

    // Give each blocker starting position + 3 cards
    for (const bid of s.blockers) {
      const randomIdx = Math.floor(Math.random() * allStations.length);
      s.blockerPositions[bid] = allStations[randomIdx];
      s.blockerHands[bid] = drawCards([], 3, s.blockerHands);
    }

    s.phase = "blocker_headstart";
    this.startClock();
  }

  rotateRoles() {
    const s = this.state;
    // Find the 2 players who aren't the current best-score snaker
    const allIds = [s.snakerId, ...s.blockers];
    const bestRun = s.completedRuns.reduce(
      (best, r) => (r.length > (best?.length ?? -1) ? r : best),
      null as (typeof s.completedRuns)[0] | null
    );

    // Next snaker = random from the 2 non-winners
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
    // Broadcast clock update every 5 real seconds
    this.clockInterval = setInterval(() => {
      const s = this.state;
      if (s.phase === "lobby" || s.phase === "run_end" || s.phase === "finished") {
        return;
      }

      const now = Date.now();
      const realElapsed = (now - s.lastRealTimestamp) / 1000 / 60; // real minutes elapsed
      const gameMinsElapsed = realElapsed * s.clockAcceleration;
      s.gameTimeMinutes += gameMinsElapsed;
      s.lastRealTimestamp = now;

      // Check headstart end
      if (s.phase === "blocker_headstart" && s.gameTimeMinutes >= s.headstartEndsAt) {
        s.phase = "playing";
      }

      // Check in_transit arrival
      if (s.phase === "in_transit" && s.activeTrain) {
        if (s.gameTimeMinutes >= s.activeTrain.arrivalGameMinute) {
          this.handleArrival();
        }
      }

      // Check 19:00 (720 min from 07:00) cutoff
      const terminalPhases = ["run_end", "finished", "lobby"] as string[];
      if (s.gameTimeMinutes >= 720 && !terminalPhases.includes(s.phase)) {
        this.endRun(false);
      }

      this.saveState();
      broadcast(this.room, s);
    }, 5000);
  }

  handleArrival() {
    const s = this.state;
    if (!s.activeTrain) return;

    const { toStation, fromStation } = s.activeTrain;

    // Check for curse on segment
    const segKey = `${fromStation}_to_${toStation}`;
    const cursePlacement = s.placements[segKey];
    if (cursePlacement?.card?.type === "curse") {
      s.gameTimeMinutes += 30; // +30 min penalty
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

    // Normal arrival — extend snake
    s.snake = [...s.snake, toStation];
    s.visitedSegments.add(`${fromStation}_to_${toStation}`);
    s.visitedSegments.add(`${toStation}_to_${fromStation}`);
    s.activeTrain = undefined;
    s.blockerActionsRemaining = 0;
    s.phase = "playing";

    // Check if no onward moves exist or time up
    const head = toStation;
    const neighbors = ADJACENCY[head] ?? [];
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
      const len = 4 + Math.floor(Math.random() * 3); // 4-6 colors
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

    const challenge = s.activeChallenge;
    const { triggeredBy, involvedStation, submissions } = challenge;

    // Determine who must submit
    const snakerSubmission = submissions[s.snakerId];

    if (triggeredBy === "roadblock") {
      // Snaker must answer correctly to pass
      if (snakerSubmission === undefined) return; // wait
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
        this.endRun(true); // crash
      }
    } else if (triggeredBy === "battle") {
      // Snaker must beat at least one physically-present blocker
      // Collect all submissions, resolve when snaker + at least one blocker submitted
      const presentBlockers = s.blockers.filter(
        (bid) => s.blockerPositions[bid] === involvedStation
      );
      const allSubmitted =
        snakerSubmission !== undefined &&
        presentBlockers.every((bid) => submissions[bid] !== undefined);

      if (!allSubmitted) return;

      // Compare: reaction = lowest ms wins; boolean = true wins
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

    // Remove card at station
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

    // Check if all 3 players have had a snaker run
    const uniqueSnakerIds = new Set(s.completedRuns.map((r) => r.snakerId));
    if (uniqueSnakerIds.size >= 3) {
      // All done — declare winner (longest snake)
      const best = s.completedRuns.reduce((a, b) => (a.length >= b.length ? a : b));
      s.winner = best.snakerId;
      s.phase = "finished";
    }
  }
}

GameServer satisfies Party.Worker;
