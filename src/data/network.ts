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

// Build adjacency map for quick neighbor lookups
export const ADJACENCY: Record<StationId, StationId[]> = {};
for (const [a, b] of EDGES) {
  if (!ADJACENCY[a]) ADJACENCY[a] = [];
  if (!ADJACENCY[b]) ADJACENCY[b] = [];
  ADJACENCY[a].push(b);
  ADJACENCY[b].push(a);
}
