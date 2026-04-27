/**
 * MANUALLY MAINTAINED — edit freely, the build script never touches this file.
 *
 * HOW TO ADD / REMOVE AN EDGE
 * ────────────────────────────
 * Add or remove a pair from EDGES.  Use the station IDs exactly as they appear
 * in the STATIONS object in network.ts (e.g. "dongdaegu", "gwangmyeong").
 *
 * HOW TO SET AN EDGE COLOUR
 * ──────────────────────────
 * Add an entry to EDGE_COLORS.  The key is the two station IDs sorted
 * alphabetically and joined with a single underscore:
 *
 *   key = [stationA, stationB].sort().join("_")
 *
 * Examples
 *   Seoul ↔ Gwangmyeong  →  "gwangmyeong_seoul"
 *   Dongdaegu ↔ Gyeongju  →  "dongdaegu_gyeongju"
 *
 * AVAILABLE COLOURS  (from LINE_COLORS in network.ts)
 * ─────────────────
 *   "ktx"             #0068b7  blue   — standard KTX
 *   "ktx_sancheon"    #e60012  red    — KTX-산천
 *   "ktx_eum"         #f08300  orange — KTX-이음
 *   "ktx_cheongryong" #920783  purple — KTX-청룡
 *
 * Any edge not listed in EDGE_COLORS defaults to "ktx" (blue).
 *
 * HOW TO ADD A WAYPOINT (bend a straight edge)
 * ─────────────────────────────────────────────
 * Add an entry to EDGE_WAYPOINTS.  Key is the same sorted-underscore format.
 * Value is an array of [x, y] points in the same SVG coordinate space as
 * the STATIONS coordinates.
 *
 *   "daejeon_seoul": [[250, 310], [280, 270]]
 */

import type { StationId } from "@/shared/types";
import { STATIONS } from "@/data/network";
import type { RailLine } from "@/data/network";

// ── Edge list ─────────────────────────────────────────────────────────────────
// Each pair is an undirected connection between two adjacent stations.

export const EDGES: [StationId, StationId][] = [
  ["andong", "uiseong"],
  ["andong", "yeongju"],
  ["angseong_oncheon", "chungju"],
  ["angseong_oncheon", "gamgok_janghowon"],
  ["bubal", "ganam"],
  ["bubal", "pangyo"],
  ["bugulsan", "gyeongju"],
  ["bugulsan", "taehwagang"],
  ["bujeon", "centum"],
  ["bujeon", "taehwagang"],
  ["busan", "gupo"],
  ["centum", "sinhaeundae"],
  ["changwon", "changwon_jungang"],
  ["changwon", "masan"],
  ["changwon_jungang", "jinyeong"],
  ["cheonan_asan", "gwangmyeong"],
  ["cheonan_asan", "osong"],
  ["cheonan_asan", "pyeongtaek_jije"],
  ["cheongnyangni", "sangbong"],
  ["cheongnyangni", "seoul"],
  ["chungju", "salmi"],
  ["daejeon", "gimcheon_gumi"],
  ["daejeon", "osong"],
  ["danyang", "jecheon"],
  ["danyang", "punggi"],
  ["deokso", "sangbong"],
  ["deokso", "yangpyeong"],
  ["dongdaegu", "gimcheon_gumi"],
  ["dongdaegu", "gyeongju"],
  ["dongdaegu", "gyeongsan"],
  ["dongdaegu", "pohang"],
  ["dongdaegu", "seodaegu"],
  ["donghae", "mukho"],
  ["donghae", "samcheok"],
  ["dongtan", "pyeongtaek_jije"],
  ["dongtan", "suseo"],
  ["dunnae", "hoengseong"],
  ["dunnae", "pyeongchang"],
  ["gamgok_janghowon", "ganam"],
  ["gangneung", "jeongdongjin"],
  ["gangneung", "jinbu_odaesan"],
  ["gijang", "namchang"],
  ["gijang", "sinhaeundae"],
  ["gimcheon_gumi", "seodaegu"],
  ["gimje", "iksan"],
  ["gimje", "jeongeup"],
  ["gokseong", "guryegu"],
  ["gokseong", "namwon"],
  ["gongju", "osong"],
  ["gongju", "seodaejeon"],
  ["gupo", "mulgeum"],
  ["guryegu", "suncheon"],
  ["gwangju_songjeong", "jangseong"],
  ["gwangju_songjeong", "naju"],
  ["gwangmyeong", "seoul"],
  ["gwangmyeong", "suseo"],
  ["gwangmyeong", "suwon"],
  ["gwangmyeong", "yongsan"],
  ["gyeongju", "pohang"],
  ["gyeongju", "taehwagang"],
  ["gyeongju", "ulsan"],
  ["gyeongju", "yeongcheon"],
  ["gyeongsan", "miryang"],
  ["gyeongsan", "ulsan"],
  ["gyeryong", "nonsan"],
  ["gyeryong", "seodaejeon"],
  ["haengsin", "seoul"],
  ["hoengseong", "manjong"],
  ["iksan", "jeonju"],
  ["iksan", "nonsan"],
  ["jangseong", "jeongeup"],
  ["jecheon", "wonju"],
  ["jeongdongjin", "mukho"],
  ["jeonju", "namwon"],
  ["jinbu_odaesan", "pyeongchang"],
  ["jinju", "masan"],
  ["jinyeong", "miryang"],
  ["manjong", "seowonju"],
  ["miryang", "mulgeum"],
  ["mokpo", "naju"],
  ["mungyeong", "yeonpung"],
  ["namchang", "taehwagang"],
  ["pohang", "yeongdeok"],
  ["punggi", "yeongju"],
  ["salmi", "suanbo_oncheon"],
  ["samcheok", "uljin"],
  ["seoul", "yeongdeungpo"],
  ["seoul", "yongsan"],
  ["seowonju", "wonju"],
  ["seowonju", "yangpyeong"],
  ["suanbo_oncheon", "yeonpung"],
  ["suncheon", "yeocheon"],
  ["suwon", "yeongdeungpo"],
  ["uiseong", "yeongcheon"],
  ["uljin", "yeongdeok"],
  ["yeocheon", "yeosu_expo"],
];

// ── ADJACENCY (auto-built from EDGES — do not edit) ───────────────────────────

export const ADJACENCY: Record<StationId, StationId[]> = {};
for (const [a, b] of EDGES) {
  if (!ADJACENCY[a]) ADJACENCY[a] = [];
  if (!ADJACENCY[b]) ADJACENCY[b] = [];
  ADJACENCY[a].push(b);
  ADJACENCY[b].push(a);
}

// ── Edge colours ──────────────────────────────────────────────────────────────
// Key format: sort([stationA, stationB]).join("_")
// Unlisted edges default to "ktx" (blue).

const EDGE_COLORS: Record<string, RailLine> = {
  "andong_uiseong":                    "ktx_eum",
  "andong_yeongju":                    "ktx_eum",
  "angseong_oncheon_chungju":          "ktx_eum",
  "angseong_oncheon_gamgok_janghowon": "ktx_eum",
  "bubal_ganam":                       "ktx_eum",
  "bubal_pangyo":                      "ktx_eum",
  "bugulsan_gyeongju":                 "ktx_eum",
  "bugulsan_taehwagang":               "ktx_eum",
  "bujeon_centum":                     "ktx_eum",
  "bujeon_taehwagang":                 "ktx_eum",
  "busan_gupo":                        "ktx",
  "centum_sinhaeundae":                "ktx_eum",
  "changwon_changwon_jungang":         "ktx_sancheon",
  "changwon_masan":                    "ktx_sancheon",
  "changwon_jungang_jinyeong":         "ktx_sancheon",
  "cheonan_asan_gwangmyeong":          "ktx_sancheon",
  "cheonan_asan_osong":                "ktx",
  "cheonan_asan_pyeongtaek_jije":      "ktx",
  "cheongnyangni_sangbong":            "ktx_eum",
  "cheongnyangni_seoul":               "ktx_eum",
  "chungju_salmi":                     "ktx_eum",
  "daejeon_gimcheon_gumi":             "ktx",
  "daejeon_osong":                     "ktx",
  "danyang_jecheon":                   "ktx_eum",
  "danyang_punggi":                    "ktx_eum",
  "deokso_sangbong":                   "ktx_eum",
  "deokso_yangpyeong":                 "ktx_eum",
  "dongdaegu_gimcheon_gumi":           "ktx",
  "dongdaegu_gyeongju":                "ktx",
  "dongdaegu_gyeongsan":               "ktx_sancheon",
  "dongdaegu_pohang":                  "ktx_sancheon",
  "dongdaegu_seodaegu":                "ktx",
  "donghae_mukho":                     "ktx_eum",
  "donghae_samcheok":                  "ktx_eum",
  "dongtan_pyeongtaek_jije":           "ktx",
  "dongtan_suseo":                     "ktx",
  "dunnae_hoengseong":                 "ktx_eum",
  "dunnae_pyeongchang":                "ktx_eum",
  "gamgok_janghowon_ganam":            "ktx_eum",
  "gangneung_jeongdongjin":            "ktx_eum",
  "gangneung_jinbu_odaesan":           "ktx_eum",
  "gijang_namchang":                   "ktx_eum",
  "gijang_sinhaeundae":                "ktx_eum",
  "gimcheon_gumi_seodaegu":            "ktx",
  "gimje_iksan":                       "ktx_sancheon",
  "gimje_jeongeup":                    "ktx_sancheon",
  "gokseong_guryegu":                  "ktx",
  "gokseong_namwon":                   "ktx_sancheon",
  "gongju_osong":                      "ktx",
  "gongju_seodaejeon":                 "ktx_sancheon",
  "gupo_mulgeum":                      "ktx",
  "guryegu_suncheon":                  "ktx_sancheon",
  "gwangju_songjeong_jangseong":       "ktx_sancheon",
  "gwangju_songjeong_naju":            "ktx_sancheon",
  "gwangmyeong_seoul":                 "ktx_sancheon",
  "gwangmyeong_suseo":                 "ktx",
  "gwangmyeong_suwon":                 "ktx",
  "gwangmyeong_yongsan":               "ktx",
  "gyeongju_pohang":                   "ktx_eum",
  "gyeongju_taehwagang":               "ktx_eum",
  "gyeongju_ulsan":                    "ktx",
  "gyeongju_yeongcheon":               "ktx_eum",
  "gyeongsan_miryang":                 "ktx",
  "gyeongsan_ulsan":                   "ktx",
  "gyeryong_nonsan":                   "ktx",
  "gyeryong_seodaejeon":               "ktx",
  "haengsin_seoul":                    "ktx",
  "hoengseong_manjong":                "ktx_eum",
  "iksan_jeonju":                      "ktx_sancheon",
  "iksan_nonsan":                      "ktx",
  "jangseong_jeongeup":                "ktx_sancheon",
  "jecheon_wonju":                     "ktx_eum",
  "jeongdongjin_mukho":                "ktx_eum",
  "jeonju_namwon":                     "ktx_sancheon",
  "jinbu_odaesan_pyeongchang":         "ktx_eum",
  "jinju_masan":                       "ktx_sancheon",
  "jinyeong_miryang":                  "ktx_sancheon",
  "manjong_seowonju":                  "ktx_eum",
  "miryang_mulgeum":                   "ktx",
  "mokpo_naju":                        "ktx_sancheon",
  "mungyeong_yeonpung":                "ktx_eum",
  "namchang_taehwagang":               "ktx_eum",
  "pohang_yeongdeok":                  "ktx_eum",
  "punggi_yeongju":                    "ktx_eum",
  "salmi_suanbo_oncheon":              "ktx_eum",
  "samcheok_uljin":                    "ktx_eum",
  "seoul_yeongdeungpo":                "ktx",
  "seoul_yongsan":                     "ktx",
  "seowonju_wonju":                    "ktx_eum",
  "seowonju_yangpyeong":               "ktx_eum",
  "suanbo_oncheon_yeonpung":           "ktx_eum",
  "suncheon_yeocheon":                 "ktx_sancheon",
  "suwon_yeongdeungpo":                "ktx",
  "uiseong_yeongcheon":                "ktx_eum",
  "uljin_yeongdeok":                   "ktx_eum",
  "yeocheon_yeosu_expo":               "ktx_sancheon",
};

// ── Edge waypoints ────────────────────────────────────────────────────────────
// Optional intermediate SVG [x, y] points to bend a straight edge.
// Key format: same as EDGE_COLORS.

const EDGE_WAYPOINTS: Record<string, [number, number][]> = {
  // Example:
  // "daejeon_seoul": [[260, 320]],
};

// ── Helper functions (used by TrainMap + RailEdge) ────────────────────────────

function canonicalKey(a: StationId, b: StationId): string {
  return [a, b].sort().join("_");
}

export function getEdgeLine(a: StationId, b: StationId): RailLine {
  return EDGE_COLORS[canonicalKey(a, b)] ?? "ktx";
}

export function getEdgePoints(a: StationId, b: StationId): [number, number][] {
  const stA = STATIONS[a];
  const stB = STATIONS[b];
  if (!stA || !stB) return [];
  const key = canonicalKey(a, b);
  const wps = EDGE_WAYPOINTS[key] ?? [];
  const start: [number, number] = [stA.x, stA.y];
  const end: [number, number]   = [stB.x, stB.y];
  const sorted = [a, b].sort();
  const reversed = sorted[0] !== a;
  return reversed ? [start, ...[...wps].reverse(), end] : [start, ...wps, end];
}

// ── Node stations (major interchange hubs) ────────────────────────────────────
// Add station IDs here to give them a larger dot + gold interchange ring.

export const NODE_IDS = new Set<StationId>([
  // "seoul", "busan", "dongdaegu",
]);
