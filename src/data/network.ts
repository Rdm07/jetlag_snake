import type { StationId } from "@/shared/types";

export interface StationMeta {
  name: string;
  x: number;
  y: number;
}

export const STATIONS: Record<StationId, StationMeta> = {
  sangbong:          { name: "Sangbong",          x: 330, y: 65  },
  yongsan:           { name: "Yongsan",            x: 295, y: 130 },
  pyeongtaek:        { name: "Pyeongtaek",         x: 265, y: 215 },
  anjung:            { name: "Anjung",              x: 205, y: 225 },
  cheonan:           { name: "Cheonan",             x: 250, y: 270 },
  cheonan_asan:      { name: "Cheonan-Asan",        x: 230, y: 285 },
  osong:             { name: "Osong",               x: 245, y: 315 },
  jochiwon:          { name: "Jochiwon",            x: 225, y: 345 },
  daejeon:           { name: "Daejeon",             x: 252, y: 375 },
  seodaejeon:        { name: "Seodaejeon",          x: 225, y: 385 },
  iksan:             { name: "Iksan",               x: 185, y: 415 },
  hongseong:         { name: "Hongseong",           x: 148, y: 365 },
  jeongeup:          { name: "Jeongeup",            x: 168, y: 468 },
  gwangju_songjeong: { name: "Gwangju Songjeong",   x: 165, y: 530 },
  suncheon:          { name: "Suncheon",            x: 245, y: 580 },
  bongyang:          { name: "Bongyang",            x: 365, y: 215 },
  seowonju:          { name: "Seowonju",            x: 385, y: 260 },
  chungju:           { name: "Chungju",             x: 330, y: 300 },
  jecheon:           { name: "Jecheon",             x: 395, y: 295 },
  yeongju:           { name: "Yeongju",             x: 445, y: 308 },
  gimcheon:          { name: "Gimcheon",            x: 400, y: 395 },
  yeongcheon:        { name: "Yeongcheon",          x: 470, y: 405 },
  ahwa:              { name: "Ahwa",                x: 535, y: 395 },
  dongdaegu:         { name: "Dongdaegu",           x: 450, y: 448 },
  seogyeongju:       { name: "Seogyeongju",         x: 505, y: 458 },
  gyeongju:          { name: "Gyeongju",            x: 545, y: 468 },
  samnangjin:        { name: "Samnangjin",          x: 440, y: 508 },
  bujeon:            { name: "Bujeon",              x: 488, y: 548 },
  sasang:            { name: "Sasang",              x: 452, y: 553 },
  jinbu:             { name: "Jinbu",               x: 445, y: 158 },
  dongbaeksan:       { name: "Dongbaeksan",         x: 505, y: 148 },
  donghae:           { name: "Donghae",             x: 575, y: 222 },
  jeongdongjin:      { name: "Jeongdongjin",        x: 582, y: 172 },
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

export type RailLine =
  | "gyeongbu"    // blue  — Seoul↔Busan main HSR corridor
  | "honam"       // green — branch toward Gwangju/Jeolla
  | "gangneung"   // purple — east coast to Gangneung
  | "jungang"     // orange — central diagonal to Gyeongju
  | "gyeongjeon"  // red   — Gyeongnam coastal loop
  | "donghae";    // cyan  — east-coast segment near Gyeongju/Donghae

export const LINE_COLORS: Record<RailLine, string> = {
  gyeongbu:   "#3b82f6",
  honam:      "#22c55e",
  gangneung:  "#a855f7",
  jungang:    "#f97316",
  gyeongjeon: "#ef4444",
  donghae:    "#06b6d4",
};

// Maps canonical edge key (alphabetically sorted stations joined by "_") to rail line.
// Use getEdgeLine(a, b) for lookups.
const EDGE_LINES_RAW: Record<string, RailLine> = {
  "sangbong_yongsan":           "gangneung",
  "jinbu_sangbong":             "gangneung",
  "pyeongtaek_yongsan":         "gyeongbu",
  "bongyang_yongsan":           "jungang",
  "anjung_pyeongtaek":          "gyeongbu",
  "cheonan_pyeongtaek":         "gyeongbu",
  "cheonan_cheonan_asan":       "gyeongbu",
  "cheonan_osong":              "gyeongbu",
  "cheonan_asan_osong":         "gyeongbu",
  "chungju_osong":              "jungang",
  "jochiwon_osong":             "honam",
  "chungju_jecheon":            "jungang",
  "bongyang_seowonju":          "jungang",
  "jecheon_seowonju":           "jungang",
  "dongbaeksan_seowonju":       "gangneung",
  "jecheon_yeongju":            "jungang",
  "dongbaeksan_jinbu":          "gangneung",
  "jinbu_jeongdongjin":         "gangneung",
  "dongbaeksan_donghae":        "gangneung",
  "donghae_jeongdongjin":       "gangneung",
  "daejeon_jochiwon":           "gyeongbu",
  "iksan_jochiwon":             "honam",
  "daejeon_seodaejeon":         "honam",
  "iksan_seodaejeon":           "honam",
  "hongseong_iksan":            "honam",
  "iksan_jeongeup":             "honam",
  "gwangju_songjeong_jeongeup": "honam",
  "gwangju_songjeong_suncheon": "honam",
  "samnangjin_suncheon":        "gyeongjeon",
  "gimcheon_yeongju":           "jungang",
  "yeongcheon_yeongju":         "jungang",
  "dongdaegu_gimcheon":         "gyeongbu",
  "dongdaegu_yeongcheon":       "jungang",
  "ahwa_yeongcheon":            "donghae",
  "dongdaegu_seogyeongju":      "donghae",
  "gyeongju_seogyeongju":       "donghae",
  "dongdaegu_samnangjin":       "gyeongjeon",
  "bujeon_samnangjin":          "gyeongjeon",
  "bujeon_sasang":              "gyeongjeon",
  "bujeon_gyeongju":            "donghae",
  "donghae_gyeongju":           "donghae",
};

function canonicalKey(a: StationId, b: StationId): string {
  return [a, b].sort().join("_");
}

export function getEdgeLine(a: StationId, b: StationId): RailLine {
  return EDGE_LINES_RAW[canonicalKey(a, b)] ?? "gyeongbu";
}

// Stations with ≥2 intersecting lines — visiting these earns Blockers +1 card
export const NODE_IDS = new Set<StationId>([
  "sangbong",       // 강릉선 + 중앙선
  "yongsan",        // 호남선 + 전라선 + 경부선
  "cheonan_asan",   // 경부선 + 호남선
  "osong",          // 경부선 + 호남선
  "daejeon",        // 경부선 (major junction)
  "seodaejeon",     // 호남선 + 전라선
  "iksan",          // 호남선 + 전라선
  "dongdaegu",      // 경부선 + 경전선
  "gyeongju",       // 경부선 + 중앙선 + 동해선B
  "bujeon",         // 동해선B + 중앙선
  "seowonju",       // 강릉선 + 중앙선
  "jecheon",        // 중앙선 + 충북선 (via chungju)
  "yeongju",        // 중앙선 junction
  "donghae",        // 강릉선 + 동해선B
  "jeongdongjin",   // 강릉선 + 동해선B
]);

// Line speed class — controls rendered stroke width
export const LINE_SPEEDS: Record<RailLine, "ktx" | "regional" | "local"> = {
  gyeongbu:   "ktx",
  honam:      "ktx",
  gangneung:  "ktx",
  jungang:    "regional",
  gyeongjeon: "local",
  donghae:    "local",
};

// Optional waypoints for edges that need orthogonal/bent routing.
// Key = canonical (alphabetically sorted) station pair joined by "_".
// Values = intermediate [x, y] points the edge passes through.
const EDGE_WAYPOINTS_RAW: Record<string, [number, number][]> = {
  // Gangneung line: Sangbong→Jinbu goes east then south
  "jinbu_sangbong":          [[445, 65]],
  // Gangneung line: Seowonju→Dongbaeksan goes east then north
  "dongbaeksan_seowonju":    [[505, 260]],
  // Jungang line: Yongsan→Bongyang goes east then south
  "bongyang_yongsan":        [[365, 130]],
  // Honam: Jochiwon→Iksan goes west then south
  "iksan_jochiwon":          [[185, 345]],
  // Honam: Iksan→Hongseong goes west then north
  "hongseong_iksan":         [[148, 415]],
  // Donghae coast: Gyeongju→Donghae goes east then north
  "donghae_gyeongju":        [[575, 468]],
  // Gyeongjeon: Suncheon→Samnangjin goes east then north
  "samnangjin_suncheon":     [[440, 580]],
  // Donghae: Bujeon→Gyeongju goes east then north
  "bujeon_gyeongju":         [[545, 548]],
  // Chungbuk: Osong→Chungju goes east
  "chungju_osong":           [[330, 315]],
  // Pyeongtaek branch: west elbow
  "anjung_pyeongtaek":       [[205, 215]],
  // Honam: Daejeon→Seodaejeon west elbow
  "daejeon_seodaejeon":      [[225, 375]],
  // Honam: Seodaejeon→Iksan goes west then south
  "iksan_seodaejeon":        [[185, 385]],
  // Jungang: Yeongju→Gimcheon goes west then south
  "gimcheon_yeongju":        [[400, 308]],
  // Jungang: Yeongju→Yeongcheon goes east then south
  "yeongcheon_yeongju":      [[470, 308]],
  // Gyeongbu: Gimcheon→Dongdaegu goes east then south
  "dongdaegu_gimcheon":      [[450, 395]],
  // Gyeongjeon: Samnangjin→Bujeon goes east then south
  "bujeon_samnangjin":       [[488, 508]],
};

/**
 * Returns the full ordered point list [from, ...waypoints, to] for drawing an edge.
 * Use this for both rendering (RailEdge) and player position interpolation (TrainMap).
 */
export function getEdgePoints(a: StationId, b: StationId): [number, number][] {
  const stA = STATIONS[a];
  const stB = STATIONS[b];
  if (!stA || !stB) return [];
  const key = canonicalKey(a, b);
  const wps = EDGE_WAYPOINTS_RAW[key] ?? [];
  const start: [number, number] = [stA.x, stA.y];
  const end: [number, number] = [stB.x, stB.y];
  // Waypoints are defined relative to the canonical (alphabetical) order.
  // If a > b alphabetically, the actual drawing goes b→a, so reverse the waypoints.
  const sorted = [a, b].sort();
  const reversed = sorted[0] !== a;
  return reversed
    ? [start, ...[...wps].reverse(), end]
    : [start, ...wps, end];
}

// Build adjacency map for quick neighbor lookups
export const ADJACENCY: Record<StationId, StationId[]> = {};
for (const [a, b] of EDGES) {
  if (!ADJACENCY[a]) ADJACENCY[a] = [];
  if (!ADJACENCY[b]) ADJACENCY[b] = [];
  ADJACENCY[a].push(b);
  ADJACENCY[b].push(a);
}
