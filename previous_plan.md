# Jet Lag Snake – South Korea: Implementation Plan (v3)

## Context

A web-based 1v1 multiplayer adaptation of Jet Lag: The Game – Snake (South Korea, Season 14). Played on the South Korean KTX/rail network with **real timetable data** from `ktx_timetable.xlsx`, running on an **accelerated in-game clock** (7AM–7PM each run day).

**Core loop:** One player is the **Snaker**, trying to build the longest non-intersecting path on the train network by riding real trains. The other is the **Blocker**, who uses a card system to disrupt progress. Each train ride takes real (accelerated) in-game time — the Snaker must choose their next train from a live departures board, and the Blocker acts during the journey. Players rotate the Snaker role; highest total stations wins.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Map | Custom SVG (hardcoded graph) |
| Real-time | PartyKit (Cloudflare Durable Objects) |
| Data processing | Python (env_jetlagsnake conda env) via `scripts/process_timetable.py` |
| Deploy | Vercel + PartyKit cloud (both free) |

**Python environment:** `C:/Users/droha/anaconda3/envs/env_jetlagsnake/python.exe` — use directly, not via `conda run` (Windows encoding issue with Korean chars).

---

## Timetable Data

### Source: ktx_timetable.xlsx

9 sheets covering the KTX/high-speed rail network:

| Sheet | Line | Direction | Key stations |
|---|---|---|---|
| 경부선 | Gyeongbu | Seoul ↔ Busan | Seoul, PyeongtaekJije, Cheonan-Asan, Osong, Daejeon, Gimcheon(Gumi), Seodaegu, Dongdaegu, Gyeongju, Busan |
| 경전선 | Gyeongjeon | Seoul ↔ Jinju | + Miryang, Masan, Jinju |
| 동해선(서울~포항) | Donghae A | Seoul ↔ Pohang | Seoul, Daejeon, Dongdaegu, Pohang |
| 동해선(부전-강릉) | Donghae B | Bujeon ↔ Gangneung | Bujeon, Gyeongju, Donghae, Jeongdongjin, Gangneung |
| 호남선 | Honam | Seoul/Yongsan ↔ Mokpo | Cheonan-Asan, Osong, Seodaejeon, Iksan, Jeongeup, Gwangju Songjeong |
| 전라선 | Jeolla | Yongsan ↔ Yeosu | Iksan, Suncheon, Yeosu |
| 강릉선 | Gangneung | Seoul ↔ Donghae | Sangbong, Seowonju, Jinbu, Gangneung, Jeongdongjin, Donghae |
| 중앙선 | Jungang | Seoul ↔ Bujeon | Sangbong, Seowonju, Jecheon, Yeongju, Yeongcheon, Gyeongju, Bujeon |
| 중부내륙선 | Jungbu | Pangyo ↔ Mungyeong | Chungju |

**Format per row:** `[null, trainNum, trainType, time_station1, time_station2, ...]`
- `00:00:00` = train does not stop at that station
- Valid time = arrival/departure time at that station
- Each sheet has both directions side-by-side, split by a null column

### Station Mapping (Show → Timetable)

| Show node ID | Timetable station name | Line(s) |
|---|---|---|
| sangbong | Sangbong | 강릉선, 중앙선 |
| yongsan | Yongsan / Seoul | 호남선, 전라선, 경부선 |
| pyeongtaek | PyeongtaekJije | 경부선 |
| cheonan_asan | Cheonan-Asan | 경부선, 호남선 |
| osong | Osong | 경부선, 호남선 |
| daejeon | Daejeon | 경부선 |
| seodaejeon | Seodaejeon | 호남선, 전라선 |
| iksan | Iksan | 호남선, 전라선 |
| jeongeup | Jeongeup | 호남선 |
| gwangju_songjeong | Gwangju Songjeong | 호남선 |
| suncheon | Suncheon | 전라선 |
| gimcheon | Gimcheon(Gumi) | 경부선 |
| dongdaegu | Dongdaegu | 경부선, 경전선 |
| gyeongju | Gyeongju | 경부선, 중앙선, 동해선B |
| bujeon | Bujeon | 동해선B, 중앙선 |
| seowonju | Seowonju | 강릉선, 중앙선 |
| jecheon | Jecheon | 중앙선 |
| yeongju | Yeongju | 중앙선 |
| yeongcheon | Yeongcheon | 중앙선 |
| jinbu | Jinbu(Odaesan) | 강릉선 |
| donghae | Donghae | 강릉선, 동해선B |
| jeongdongjin | Jeongdongjin | 강릉선, 동해선B |
| chungju | Chungju | 중부내륙선 |

**Stations without KTX timetable data** (use estimated local train times):
`anjung, cheonan, jochiwon, hongseong, bongyang, ahwa, seogyeongju, samnangjin, sasang, dongbaeksan`
These nodes use approximate travel times (15–45 min based on real local train frequencies).

### Processing Script: `scripts/process_timetable.py`

Runs once to generate `public/data/timetable.json`:

```python
# Logic:
# 1. For each sheet, parse the station column headers (rows with 열차번호 + time data rows)
# 2. For each train (row), extract { trainNum, trainType, stops: [{stationName, time_HH:MM}] }
#    filtering out 00:00:00 entries
# 3. Map station names → show node IDs using STATION_MAPPING dict
# 4. For each connected pair in SHOW_EDGES, scan all parsed trains for ones
#    that stop at both stations in sequence → derive (depart_from, arrive_at) pairs
# 5. Filter to 07:00–19:00 departures (show's game hours)
# 6. Add estimated local services for non-KTX edges
# 7. Output: timetable.json
```

**Output format:**
```json
{
  "sangbong_to_seowonju": [
    { "trainNum": 801, "type": "KTX-이음", "depart": "05:33", "arrive": "06:18" },
    { "trainNum": 805, "type": "KTX-이음", "depart": "06:13", "arrive": "07:08" }
  ],
  "seowonju_to_sangbong": [
    { "trainNum": 802, "type": "KTX-이음", "depart": "06:36", "arrive": "07:23" }
  ],
  "jochiwon_to_daejeon": [
    { "trainNum": "L001", "type": "Local", "depart": "07:10", "arrive": "07:28" },
    { "trainNum": "L002", "type": "Local", "depart": "07:40", "arrive": "07:58" }
  ]
}
```
Keyed as `"{fromId}_to_{toId}"` (directional). Each entry: `{ trainNum, type, depart: "HH:MM", arrive: "HH:MM" }`.

---

## In-Game Clock System

- **Game day:** 07:00 → 19:00 (720 in-game minutes per run)
- **Acceleration:** Configurable in lobby — options: 30×, 60×, 120× (default: 60×)
  - 60× = 1 real second = 1 in-game minute → game day = 12 real minutes
- **Clock lives on the server** (PartyKit). Broadcast `gameTimeMinutes` (minutes since 07:00) in every state update.
- The clock **pauses** when a challenge mini-game is active.
- If game time reaches 720 (19:00) while Snaker is en route: they arrive at destination but the run ends immediately after (no more trains until next day, run over).

---

## Train Network Graph

```typescript
// src/data/network.ts
export const STATIONS: Record<StationId, { name: string; x: number; y: number }> = {
  sangbong:          { name: "Sangbong",          x: 320, y: 80  },
  yongsan:           { name: "Yongsan",            x: 280, y: 130 },
  pyeongtaek:        { name: "Pyeongtaek",         x: 250, y: 200 },
  anjung:            { name: "Anjung",              x: 195, y: 215 },
  cheonan:           { name: "Cheonan",             x: 240, y: 255 },
  cheonan_asan:      { name: "Cheonan-Asan",        x: 220, y: 270 },
  osong:             { name: "Osong",               x: 235, y: 300 },
  jochiwon:          { name: "Jochiwon",            x: 215, y: 330 },
  daejeon:           { name: "Daejeon",             x: 240, y: 360 },
  seodaejeon:        { name: "Seodaejeon",          x: 215, y: 370 },
  iksan:             { name: "Iksan",               x: 180, y: 400 },
  hongseong:         { name: "Hongseong",           x: 145, y: 355 },
  jeongeup:          { name: "Jeongeup",            x: 165, y: 450 },
  gwangju_songjeong: { name: "Gwangju Songjeong",   x: 170, y: 510 },
  suncheon:          { name: "Suncheon",            x: 250, y: 560 },
  bongyang:          { name: "Bongyang",            x: 350, y: 210 },
  seowonju:          { name: "Seowonju",            x: 370, y: 250 },
  chungju:           { name: "Chungju",             x: 320, y: 290 },
  jecheon:           { name: "Jecheon",             x: 380, y: 285 },
  yeongju:           { name: "Yeongju",             x: 430, y: 295 },
  gimcheon:          { name: "Gimcheon",            x: 390, y: 380 },
  yeongcheon:        { name: "Yeongcheon",          x: 460, y: 390 },
  ahwa:              { name: "Ahwa",                x: 520, y: 380 },
  dongdaegu:         { name: "Dongdaegu",           x: 440, y: 430 },
  seogyeongju:       { name: "Seogyeongju",         x: 490, y: 440 },
  gyeongju:          { name: "Gyeongju",            x: 530, y: 450 },
  samnangjin:        { name: "Samnangjin",          x: 430, y: 490 },
  bujeon:            { name: "Bujeon",              x: 475, y: 530 },
  sasang:            { name: "Sasang",              x: 440, y: 535 },
  jinbu:             { name: "Jinbu",               x: 430, y: 150 },
  dongbaeksan:       { name: "Dongbaeksan",         x: 490, y: 140 },
  donghae:           { name: "Donghae",             x: 560, y: 215 },
  jeongdongjin:      { name: "Jeongdongjin",        x: 570, y: 165 },
};

export const EDGES: [StationId, StationId][] = [
  ["sangbong", "yongsan"],
  ["sangbong", "jinbu"],
  ["yongsan", "pyeongtaek"],
  ["yongsan", "bongyang"],
  ["pyeongtaek", "anjung"],
  ["pyeongtaek", "cheonan"],
  ["cheonan", "cheonan_asan"],
  ["cheonan", "osong"],
  ["cheonan_asan", "osong"],
  ["osong", "chungju"],
  ["osong", "jochiwon"],
  ["chungju", "jecheon"],
  ["bongyang", "seowonju"],
  ["seowonju", "jecheon"],
  ["seowonju", "dongbaeksan"],
  ["jecheon", "yeongju"],
  ["jinbu", "dongbaeksan"],
  ["jinbu", "jeongdongjin"],
  ["dongbaeksan", "donghae"],
  ["jeongdongjin", "donghae"],
  ["jochiwon", "daejeon"],
  ["jochiwon", "iksan"],
  ["daejeon", "seodaejeon"],
  ["seodaejeon", "iksan"],
  ["iksan", "hongseong"],
  ["iksan", "jeongeup"],
  ["jeongeup", "gwangju_songjeong"],
  ["gwangju_songjeong", "suncheon"],
  ["suncheon", "samnangjin"],
  ["yeongju", "gimcheon"],
  ["yeongju", "yeongcheon"],
  ["gimcheon", "dongdaegu"],
  ["yeongcheon", "dongdaegu"],
  ["yeongcheon", "ahwa"],
  ["dongdaegu", "seogyeongju"],
  ["seogyeongju", "gyeongju"],
  ["dongdaegu", "samnangjin"],
  ["samnangjin", "bujeon"],
  ["bujeon", "sasang"],
  ["bujeon", "gyeongju"],
  ["gyeongju", "donghae"],
];
```

---

## Game State Data Model

```typescript
// src/shared/types.ts

type StationId = string;
type SegmentId = string;           // `${fromId}_to_{toId}` (directional)
type PlayerId = string;

type CardType = "roadblock" | "curse" | "battle" | "powerup";
type PowerupEffect = "draw2" | "secret_block" | "peek_hand" | "extra_move";

interface TrainService {
  trainNum: string | number;
  type: string;                    // "KTX", "KTX-이음", "KTX-산천", "Local"
  depart: string;                  // "HH:MM"
  arrive: string;                  // "HH:MM"
}

interface Card { id: string; type: CardType; powerupEffect?: PowerupEffect; }

interface Placement {
  card: Card;
  placedBy: PlayerId;
  stationId?: StationId;
  segmentId?: SegmentId;
}

interface ActiveTrain {
  service: TrainService;
  fromStation: StationId;
  toStation: StationId;
  boardedAtGameMinute: number;
  arrivalGameMinute: number;
}

type ChallengeType = "reaction" | "memory" | "typing" | "geoguessr" | "chess" | "trivia";

interface ActiveChallenge {
  type: ChallengeType;
  triggeredBy: CardType;
  involvedStation: StationId;
  payload: Record<string, unknown>;
  submissions: Record<PlayerId, unknown>;
  deadline: number;                // epoch ms (wall clock)
}

interface RunRecord {
  snakerId: PlayerId;
  stations: StationId[];
  crashedAt?: StationId;
  length: number;
  endTimeMinutes: number;          // in-game minute when run ended
}

interface GameState {
  roomCode: string;
  phase: "lobby" | "playing" | "in_transit" | "challenge" | "run_end" | "finished";
  snakerId: PlayerId;
  blockerId: PlayerId;
  players: Record<PlayerId, { name: string; color: "red" | "blue" }>;

  // Time
  gameTimeMinutes: number;         // minutes since 07:00, 0–720
  clockAcceleration: number;       // 30 | 60 | 120
  lastRealTimestamp: number;       // epoch ms — used to interpolate clock client-side

  // Snaker
  snake: StationId[];              // [start, ..., current_head]
  visitedSegments: Set<SegmentId>;
  activeTrain?: ActiveTrain;       // set when phase = "in_transit"

  // Blocker
  blockerHand: Card[];
  blockerPosition: StationId | null;
  placements: Record<string, Placement>;
  blockerActionsRemaining: number; // actions left during current train ride

  // Turn
  currentTurn: "snaker" | "blocker";
  turnNumber: number;

  // Challenge
  activeChallenge?: ActiveChallenge;

  // Scoring
  completedRuns: RunRecord[];
  winner?: PlayerId | null;
}

// WebSocket protocol
type ClientMessage =
  | { type: "set_name"; name: string }
  | { type: "set_acceleration"; value: 30 | 60 | 120 }
  | { type: "start_game" }
  | { type: "snaker_board_train"; service: TrainService; toStation: StationId }
  | { type: "blocker_move"; toStation: StationId }
  | { type: "blocker_play_card"; card: Card; target: { stationId?: StationId; segmentId?: SegmentId } }
  | { type: "blocker_draw_card" }
  | { type: "blocker_pass" }
  | { type: "challenge_submit"; answer: unknown }
  | { type: "start_next_run" };

type ServerMessage =
  | { type: "state_update"; state: GameState }
  | { type: "error"; message: string };
```

---

## Turn Structure (Time-Based)

```
Run start:
  → Blocker receives 3 cards; clock = 07:00
  → Snaker starts at Yongsan (run 1) or last crash station (subsequent runs)

Snaker's turn (phase = "playing"):
  → DeparturesBoard shows all trains from current station, departing 07:00–19:00,
    filtered to: adjacent station, not yet visited
  → Snaker picks a train (clicks a row on the departures board)
  → phase = "in_transit"
  → activeTrain = { service, fromStation, toStation, boardedAtGameMinute, arrivalGameMinute }
  → blockerActionsRemaining = floor(travelMinutes / 15) + 1
  → currentTurn = "blocker"

Blocker's turn (during transit):
  → For each action remaining, Blocker can:
      A. Move virtual position 1 step on network
      B. Play a card (Roadblock/Curse/Battle lock-in/Powerup)
      C. Draw 1 card (if hand < 5)
      D. Pass (consume remaining actions)
  → When blockerActionsRemaining reaches 0:
      → Snaker arrives at destination
      → gameTimeMinutes = arrivalGameMinute
      → Check station for card effects:
          - Roadblock → phase = "challenge" (Snaker solo challenge)
          - Battle (Blocker locked in there) → phase = "challenge" (head-to-head)
          - Curse on segment → apply: next departure options show 30-min delay
      → Check if Snaker has any valid onward trains (adjacent, unvisited, departing after arrival)
          - None → CRASH → phase = "run_end"
      → Check 19:00 cutoff → if gameTimeMinutes ≥ 720 → CRASH → phase = "run_end"
      → Otherwise: currentTurn = "snaker", phase = "playing"

Challenge resolution:
  → Both players interact with mini-game component
  → Server evaluates winner via deadline alarm
  → Snaker wins → continue from current station
  → Snaker loses → CRASH → phase = "run_end"

Run end:
  → Show RunEndScreen: path length, time used, snaker's route on map
  → Next run: swap snaker/blocker, reset state, keep completedRuns
  → After N runs each: tally scores → phase = "finished"
```

---

## Departures Board Logic

The DeparturesBoard component shows, for the Snaker's current station:
- All `timetable.json` entries for `{currentStation}_to_{adjacentStation}` where adjacentStation is unvisited
- Filtered to trains departing ≥ `gameTimeMinutes` (already missed trains are greyed out / hidden)
- Sorted by departure time
- Each row: `[TrainType icon] [destination name] — departs HH:MM — arrives HH:MM — travel Xm`
- Row highlighted in gold if it's the earliest available train
- Blocked stations shown with a 🚧 icon (Roadblock) or ⚔️ icon (Battle); Snaker can still board the train but will face the challenge on arrival

---

## File Structure

```
jetlag_snake/
├── package.json
├── partykit.json
├── tsconfig.json
├── .env.local
│
├── ktx_timetable.xlsx               # source data (user-provided)
│
├── scripts/
│   ├── process_timetable.py         # xlsx → public/data/timetable.json
│   └── read_timetable.py            # (dev utility, already created)
│
├── src/
│   ├── shared/
│   │   └── types.ts
│   │
│   ├── data/
│   │   ├── network.ts               # STATIONS + EDGES
│   │   ├── stationMapping.ts        # show node ID → timetable station name(s)
│   │   ├── cards.ts                 # card deck definition + weights
│   │   └── challenges/
│   │       ├── trivia.json
│   │       └── geoguessr.json
│   │
│   ├── party/
│   │   ├── game.ts                  # PartyKit server
│   │   └── challenges.ts
│   │
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── globals.css
│       ├── room/[roomCode]/page.tsx
│       └── components/
│           ├── HomeScreen.tsx
│           ├── Lobby.tsx            # includes acceleration selector
│           ├── GameBoard.tsx
│           ├── TrainMap.tsx
│           ├── StationNode.tsx
│           ├── RailEdge.tsx
│           ├── DeparturesBoard.tsx  # ← NEW: train picker for Snaker
│           ├── GameClock.tsx        # ← NEW: animated in-game clock display
│           ├── BlockerPanel.tsx
│           ├── SnakerPanel.tsx
│           ├── InTransitOverlay.tsx # ← NEW: "Train is moving" animation while Blocker acts
│           ├── RunEndScreen.tsx
│           ├── WinnerScreen.tsx
│           └── challenges/
│               ├── ChallengeHost.tsx
│               ├── ReactionChallenge.tsx
│               ├── MemoryChallenge.tsx
│               ├── TypingChallenge.tsx
│               ├── GeoguessrChallenge.tsx
│               ├── TriviaChallenge.tsx
│               └── ChessChallenge.tsx
│
└── public/
    ├── data/
    │   ├── timetable.json           # generated by process_timetable.py
    │   └── adjacency.json           # derived from EDGES at build time (optional cache)
    └── challenges/
        └── geoguessr/
            └── *.jpg                # ~20 Korean landmark photos
```

---

## Implementation Phases

### Phase 0 – Project Setup (~2h)
1. `npx create-next-app@14 . --typescript --tailwind --app --src-dir`
2. Install: `partysocket` (prod) + `partykit concurrently` (dev)
3. Create `partykit.json`, add dev script
4. Write `src/shared/types.ts` and `src/data/network.ts`

### Phase 1 – Timetable Data Processing (~3h)
1. Write `scripts/process_timetable.py`:
   - Parse all 9 sheets: detect header rows, extract station columns + time data
   - Build train records: `{trainNum, type, stops: [{stationId, time}]}`
   - For each directed edge in `SHOW_EDGES`, scan all trains for A→B stops in sequence
   - Filter to 07:00–19:00 departures
   - Add estimated local train services for non-KTX edges (hardcoded ~20 routes)
   - Output `public/data/timetable.json`
2. Run: `C:/Users/droha/anaconda3/envs/env_jetlagsnake/python.exe scripts/process_timetable.py`
3. Validate output: spot-check Seoul→Daejeon (should have many KTX entries ~5:00–22:00)

### Phase 2 – Static Map (~3h)
1. Build `TrainMap.tsx`, `StationNode.tsx`, `RailEdge.tsx` — render all nodes/edges as SVG
2. Test visually; tune coordinates
3. Add ZoomableGroup for mobile

### Phase 3 – Lobby & Clock (~2h)
1. `HomeScreen.tsx` + `Lobby.tsx` (with acceleration selector: 30×/60×/120×)
2. `GameClock.tsx`: client-side interpolation using `lastRealTimestamp` + `clockAcceleration`
3. `room/[roomCode]/page.tsx`: PartyKit connection, phase routing
4. `src/party/game.ts`: onConnect, set_name, start_game, clock broadcast (every 5s)

### Phase 4 – Departures Board & Snaker Movement (~3h)
1. Load `timetable.json` on client at startup
2. `DeparturesBoard.tsx`: filter by current station, current game time, unvisited neighbors
3. `snaker_board_train` message → server validates, sets `activeTrain`, computes `blockerActionsRemaining`
4. `InTransitOverlay.tsx`: shown to both players while Snaker is on a train
5. On arrival: advance clock, check card effects, check traps, check day end

### Phase 5 – Card System (~4h)
1. Blocker hand management (draw/play/pass during transit)
2. `BlockerPanel.tsx`: card hand display, play actions
3. Card placement rendering on map (icons on stations/segments)
4. Blocker virtual position movement
5. Curse effect: marks segment, applies 30-min wait penalty on departure
6. Battle lock-in mechanic
7. Powerup effects

### Phase 6 – Challenge System (~5h)
1. `src/party/challenges.ts`: generate + evaluate challenges
2. `ChallengeHost.tsx` + all 6 mini-game components
3. Trivia JSON + GeoGuessr photos
4. Server deadline alarm for challenge timeout

### Phase 7 – Run Rotation & Scoring (~2h)
1. `RunEndScreen.tsx`: path visualization, scores, time used
2. Role swap logic + state reset
3. `WinnerScreen.tsx`

### Phase 8 – UX Polish (~3h)
1. Train type icons (KTX bullet 🚄 vs local 🚂)
2. Animated clock (watch/digital display ticking forward)
3. "Blocker placed Roadblock at X" toast notifications
4. Mobile layout
5. Invite/share URL button
6. Snake path playback on RunEndScreen

### Phase 9 – Deployment (~1h)
1. `npx partykit deploy`
2. Set `NEXT_PUBLIC_PARTYKIT_HOST` in Vercel
3. Push → Vercel auto-deploys
4. End-to-end 1v1 test

---

## Card System

| Card | Placement | Effect |
|---|---|---|
| **Roadblock** | Any station | Snaker must win solo challenge on arrival or crash |
| **Curse** | Any segment | Snaker's next train from that segment costs +30 in-game minutes wait |
| **Battle** | Any station | If Blocker locks in before Snaker arrives: head-to-head challenge |
| **Powerup** | Instant | Draw 2 / Peek Snaker's next 2 valid moves / Secret block / Extra blocker action |

---

## Challenge System

| Type | Format | Winner |
|---|---|---|
| Reaction | First to click when signal appears (2–5s random delay) | First click timestamp |
| Memory | Reproduce a color sequence (N steps) | Most correct; tie → +1 step sudden death |
| Typing | Type a 30-word Korea-themed sentence | First to complete at 100% accuracy |
| GeoGuessr | Korean landmark photo → click on mini-map of Korea | Closest to true lat/lng in 30s |
| Chess | Lichess open challenge 1-min game | Lichess result or manual report |
| Trivia | 4-option Korea geography/culture question | First correct answer (wrong = instant loss) |

---

## Key Gotchas

- **00:00:00 times**: In the xlsx, `00:00:00` means "no stop" — filter these out during parsing, never treat as midnight departures
- **Both directions side-by-side**: Each sheet has southbound on the left half and northbound on the right half, separated by a null column; parse them as two separate direction groups
- **Days-of-operation filter (비고 column)**: `매일` = daily, `토일` = Sat/Sun only, `월` = Monday only. For the game, use only `매일` trains (always available). Weekend-only trains can be optionally included as "bonus" trains.
- **Station name normalization**: Timetable uses `Seodaejeon ` (trailing space), `Gwangju songjeong` (mixed case) — strip and normalize during parsing
- **SegmentId is directional** for timetable: `"sangbong_to_seowonju"` ≠ `"seowonju_to_sangbong"` — store and look up both directions
- **Clock interpolation on client**: Client derives current `gameTimeMinutes` as `state.gameTimeMinutes + (Date.now() - state.lastRealTimestamp) / 1000 / 60 * clockAcceleration` — do this in a `useEffect` with `requestAnimationFrame` for a smooth ticking clock display
- **DO hibernation**: If all clients disconnect for ~30s, state is lost. Player reconnection via `localStorage` UUID matching within 60s.

---

## Verification

1. Run `process_timetable.py` → validate `timetable.json` has entries for all 40 directed edges
2. Spot-check: `yongsan_to_daejeon` should have ~30 KTX entries between 07:00–19:00
3. 1v1 test: Snaker boards train, DeparturesBoard updates correctly, clock advances to arrival time
4. Blocker gets correct number of actions during a 50-min journey (`floor(50/15)+1 = 4`)
5. Run ends correctly when no valid onward trains exist after 19:00
6. Full game: 2 runs each, scores tally, winner declared
7. Mobile viewport: map readable, departures board tappable
8. End-to-end on production URLs
