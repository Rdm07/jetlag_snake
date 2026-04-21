import type { StationId } from "@/shared/types";

export interface StationMeta {
  name: string;
  x: number;
  y: number;
}

export const STATIONS: Record<StationId, StationMeta> = {
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
