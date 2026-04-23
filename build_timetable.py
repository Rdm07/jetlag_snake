"""
Reads 18 KTX timetable CSVs from components/korea/ktx_timetables/,
generates:
  public/data/timetable.json
  src/data/network.ts
  src/data/koreaPath.ts   (SVG path string for the map background)
  public/maps/south_korea.svg  (static asset copy)
"""
import csv
import json
import os
import re
import shutil
from pathlib import Path

CSV_DIR    = Path("components/korea/ktx_timetables")
TIMETABLE_OUT = Path("public/data/timetable.json")
NETWORK_OUT   = Path("src/data/network.ts")
KOREA_PATH_OUT = Path("src/data/koreaPath.ts")
SVG_SRC    = Path("components/korea/maps/south_korea.svg")
SVG_DST    = Path("public/maps/south_korea.svg")

# ── Station ID normalization ───────────────────────────────────────────────

OVERRIDES = {
    "PyeongtaekJije":   "pyeongtaek_jije",
    "GamgokJanghowon":  "gamgok_janghowon",
    "AngseongOncheon":  "angseong_oncheon",
    "Changwonjungang":  "changwon_jungang",
    "Suanbo oncheon":   "suanbo_oncheon",
    "Gwangju songjeong":"gwangju_songjeong",
    "Yeosu-Expo":       "yeosu_expo",
    "Cheonan-Asan":     "cheonan_asan",
    "Gimcheon(Gumi)":   "gimcheon_gumi",
    "Jinbu(Odaesan)":   "jinbu_odaesan",
    "Seodaejeon":       "seodaejeon",
    "Mungyeong":        "mungyeong",
    "Guryegu":          "guryegu",
}

def normalize_id(raw: str) -> str:
    name = raw.strip()
    if name in OVERRIDES:
        return OVERRIDES[name]
    result = name.lower()
    result = re.sub(r"[\(\)]", "", result)
    result = re.sub(r"[-\s]+", "_", result)
    result = re.sub(r"[^a-z0-9_]", "", result)
    result = re.sub(r"_+", "_", result)
    return result.strip("_")

# ── Station display names ─────────────────────────────────────────────────

STATION_NAMES: dict[str, str] = {
    "haengsin":          "Haengsin",
    "seoul":             "Seoul",
    "yeongdeungpo":      "Yeongdeungpo",
    "suwon":             "Suwon",
    "gwangmyeong":       "Gwangmyeong",
    "suseo":             "Suseo",
    "dongtan":           "Dongtan",
    "pyeongtaek_jije":   "Pyeongtaek Jije",
    "cheonan_asan":      "Cheonan-Asan",
    "osong":             "Osong",
    "daejeon":           "Daejeon",
    "gimcheon_gumi":     "Gimcheon(Gumi)",
    "seodaegu":          "Seodaegu",
    "dongdaegu":         "Dongdaegu",
    "gyeongju":          "Gyeongju",
    "ulsan":             "Ulsan",
    "gyeongsan":         "Gyeongsan",
    "miryang":           "Miryang",
    "mulgeum":           "Mulgeum",
    "gupo":              "Gupo",
    "busan":             "Busan",
    "cheongnyangni":     "Cheongnyangni",
    "sangbong":          "Sangbong",
    "deokso":            "Deokso",
    "yangpyeong":        "Yangpyeong",
    "seowonju":          "Seowonju",
    "manjong":           "Manjong",
    "hoengseong":        "Hoengseong",
    "dunnae":            "Dunnae",
    "pyeongchang":       "Pyeongchang",
    "jinbu_odaesan":     "Jinbu(Odaesan)",
    "gangneung":         "Gangneung",
    "jeongdongjin":      "Jeongdongjin",
    "mukho":             "Mukho",
    "donghae":           "Donghae",
    "bujeon":            "Bujeon",
    "centum":            "Centum",
    "sinhaeundae":       "Sinhaeundae",
    "gijang":            "Gijang",
    "namchang":          "Namchang",
    "taehwagang":        "Taehwagang",
    "bugulsan":          "Bugulsan",
    "yeongcheon":        "Yeongcheon",
    "uiseong":           "Uiseong",
    "andong":            "Andong",
    "yeongju":           "Yeongju",
    "punggi":            "Punggi",
    "danyang":           "Danyang",
    "jecheon":           "Jecheon",
    "wonju":             "Wonju",
    "mungyeong":         "Mungyeong",
    "yeonpung":          "Yeonpung",
    "suanbo_oncheon":    "Suanbo Oncheon",
    "salmi":             "Salmi",
    "chungju":           "Chungju",
    "angseong_oncheon":  "Angseong Oncheon",
    "gamgok_janghowon":  "Gamgok Janghowon",
    "ganam":             "Ganam",
    "bubal":             "Bubal",
    "pangyo":            "Pangyo",
    "pohang":            "Pohang",
    "yeongdeok":         "Yeongdeok",
    "uljin":             "Uljin",
    "samcheok":          "Samcheok",
    "yongsan":           "Yongsan",
    "gongju":            "Gongju",
    "seodaejeon":        "Seodaejeon",
    "gyeryong":          "Gyeryong",
    "nonsan":            "Nonsan",
    "iksan":             "Iksan",
    "gimje":             "Gimje",
    "jeongeup":          "Jeongeup",
    "jangseong":         "Jangseong",
    "gwangju_songjeong": "Gwangju Songjeong",
    "naju":              "Naju",
    "mokpo":             "Mokpo",
    "yeosu_expo":        "Yeosu-Expo",
    "yeocheon":          "Yeocheon",
    "suncheon":          "Suncheon",
    "guryegu":           "Guryegu",
    "gokseong":          "Gokseong",
    "namwon":            "Namwon",
    "jeonju":            "Jeonju",
    "jinju":             "Jinju",
    "masan":             "Masan",
    "changwon":          "Changwon",
    "changwon_jungang":  "Changwon Jungang",
    "jinyeong":          "Jinyeong",
}

# ── Lat/lon lookup ────────────────────────────────────────────────────────

LAT_LON: dict[str, tuple[float, float]] = {
    "haengsin":          (37.609, 126.843),
    "seoul":             (37.554, 126.972),
    "yeongdeungpo":      (37.516, 126.904),
    "suwon":             (37.266, 127.001),
    "gwangmyeong":       (37.427, 126.888),
    "suseo":             (37.485, 127.102),
    "dongtan":           (37.208, 127.074),
    "pyeongtaek_jije":   (36.977, 127.085),
    "cheonan_asan":      (36.801, 127.108),
    "osong":             (36.728, 127.427),
    "daejeon":           (36.360, 127.427),
    "gimcheon_gumi":     (36.129, 128.094),
    "seodaegu":          (35.869, 128.569),
    "dongdaegu":         (35.878, 128.627),
    "gyeongju":          (35.855, 129.225),
    "ulsan":             (35.560, 129.345),
    "gyeongsan":         (35.821, 128.741),
    "miryang":           (35.490, 128.748),
    "mulgeum":           (35.278, 128.889),
    "gupo":              (35.192, 128.883),
    "busan":             (35.116, 129.037),
    "cheongnyangni":     (37.580, 127.055),
    "sangbong":          (37.603, 127.093),
    "deokso":            (37.577, 127.219),
    "yangpyeong":        (37.490, 127.491),
    "seowonju":          (37.341, 127.949),
    "manjong":           (37.354, 127.856),
    "hoengseong":        (37.488, 127.979),
    "dunnae":            (37.551, 128.200),
    "pyeongchang":       (37.371, 128.389),
    "jinbu_odaesan":     (37.690, 128.521),
    "gangneung":         (37.752, 128.901),
    "jeongdongjin":      (37.682, 129.027),
    "mukho":             (37.551, 129.100),
    "donghae":           (37.519, 129.124),
    "bujeon":            (35.164, 129.057),
    "centum":            (35.172, 129.128),
    "sinhaeundae":       (35.183, 129.162),
    "gijang":            (35.244, 129.212),
    "namchang":          (35.406, 129.344),
    "taehwagang":        (35.546, 129.312),
    "bugulsan":          (35.740, 129.265),
    "yeongcheon":        (35.975, 128.946),
    "uiseong":           (36.351, 128.688),
    "andong":            (36.566, 128.725),
    "yeongju":           (36.805, 128.623),
    "punggi":            (36.836, 128.487),
    "danyang":           (36.986, 128.366),
    "jecheon":           (37.134, 128.195),
    "wonju":             (37.342, 127.922),
    "mungyeong":         (36.587, 128.199),
    "yeonpung":          (36.730, 128.006),
    "suanbo_oncheon":    (36.812, 127.982),
    "salmi":             (36.847, 127.916),
    "chungju":           (36.972, 127.874),
    "angseong_oncheon":  (37.010, 127.681),
    "gamgok_janghowon":  (37.077, 127.597),
    "ganam":             (37.118, 127.511),
    "bubal":             (37.198, 127.370),
    "pangyo":            (37.386, 127.110),
    "pohang":            (36.024, 129.358),
    "yeongdeok":         (36.424, 129.365),
    "uljin":             (36.993, 129.397),
    "samcheok":          (37.394, 129.170),
    "yongsan":           (37.529, 126.965),
    "gongju":            (36.478, 127.095),
    "seodaejeon":        (36.348, 127.394),
    "gyeryong":          (36.276, 127.248),
    "nonsan":            (36.201, 127.089),
    "iksan":             (35.944, 126.957),
    "gimje":             (35.801, 126.882),
    "jeongeup":          (35.569, 126.855),
    "jangseong":         (35.300, 126.784),
    "gwangju_songjeong": (35.133, 126.795),
    "naju":              (35.018, 126.709),
    "mokpo":             (34.815, 126.393),
    "yeosu_expo":        (34.746, 127.751),
    "yeocheon":          (34.777, 127.643),
    "suncheon":          (34.924, 127.490),
    "guryegu":           (35.196, 127.462),
    "gokseong":          (35.283, 127.290),
    "namwon":            (35.407, 127.378),
    "jeonju":            (35.820, 127.150),
    "jinju":             (35.194, 128.092),
    "masan":             (35.197, 128.561),
    "changwon":          (35.228, 128.688),
    "changwon_jungang":  (35.225, 128.650),
    "jinyeong":          (35.307, 128.791),
}

# ── Coordinate transform ──────────────────────────────────────────────────
# Derived from 3 georeferencing circles in south_korea.svg (viewBox 1000×925)

def to_svg(lat: float, lon: float) -> tuple[float, float]:
    x = 125.41 * lon - 15574.8
    y = -155.03 * lat + 6034.7
    return round(x, 1), round(y, 1)

# ── Line name extraction from CSV filename ───────────────────────────────

FILE_LINE_MAP: dict[str, str] = {
    "Gyeongbu_Line":      "gyeongbu",
    "Honam_Line":         "honam",
    "Gangneung_Line":     "gangneung",
    "Central_Line":       "jungang",
    "Central_Inland_Line":"jungang_inland",
    "Donghae_Line":       "donghae",
    "Gyeongjeon_Line":    "gyeongjeon",
    "Jeollaseon_Line":    "jeolla",
}

# Lower number = higher priority (KTX > regional > local)
LINE_PRIORITY: dict[str, int] = {
    "gyeongbu":     1,
    "honam":        1,
    "gangneung":    1,
    "jungang":      2,
    "jungang_inland": 2,
    "donghae":      2,
    "jeolla":       2,
    "gyeongjeon":   3,
}

def line_from_filename(name: str) -> str:
    for prefix, line in FILE_LINE_MAP.items():
        if name.startswith(prefix):
            return line
    return "gyeongbu"

# ── CSV parsing ───────────────────────────────────────────────────────────

def hhmm(s: str) -> str:
    return s.strip()[:5]

def parse_csv(filepath: Path) -> tuple[list[str], list[tuple[str, dict]]]:
    with open(filepath, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        station_cols = header[1:-1]  # strip Train_Number + Frequency
        station_ids  = [normalize_id(c) for c in station_cols]
        rows: list[tuple[str, dict]] = []
        for row in reader:
            if not row or not row[0].strip():
                continue
            train_num = row[0].strip()
            stops: dict[str, str | None] = {}
            for i, sid in enumerate(station_ids):
                idx = i + 1
                val = row[idx].strip() if idx < len(row) else ""
                stops[sid] = val if val else None
            rows.append((train_num, stops))
    return station_ids, rows

# ── SVG path extraction ───────────────────────────────────────────────────

def extract_korea_path(svg_path: Path) -> str:
    text = svg_path.read_text(encoding="utf-8")
    # Extract the d attribute of the <path id="KR"> element
    match = re.search(r'<path\s[^>]*id="KR"[^>]*d="([^"]+)"', text, re.DOTALL)
    if not match:
        # Try alternate attribute order: d comes before id
        match = re.search(r'<path\s[^>]*d="([^"]+)"[^>]*id="KR"', text, re.DOTALL)
    if not match:
        raise ValueError("Could not find <path id=\"KR\"> in SVG")
    return match.group(1).strip()

# ── Main ──────────────────────────────────────────────────────────────────

def main() -> None:
    timetable: dict[str, list[dict]] = {}
    edges_pairs: set[frozenset] = set()
    edge_lines: dict[tuple, str] = {}  # canonical tuple(sorted([a,b])) → line name

    for csv_path in sorted(CSV_DIR.glob("*.csv")):
        line_name = line_from_filename(csv_path.stem)
        line_pri  = LINE_PRIORITY.get(line_name, 9)
        station_ids, rows = parse_csv(csv_path)

        # ── Physical track edges from HEADER column order ─────────────────
        # Adjacent columns = adjacent stations on the real line.
        # This avoids "skip chords" from trains that stop at non-consecutive stations.
        for i in range(len(station_ids) - 1):
            a, b = station_ids[i], station_ids[i + 1]
            if a not in LAT_LON or b not in LAT_LON:
                continue
            fs = frozenset([a, b])
            edges_pairs.add(fs)
            canonical = tuple(sorted([a, b]))
            existing = edge_lines.get(canonical)
            if existing is None or line_pri < LINE_PRIORITY.get(existing, 9):
                edge_lines[canonical] = line_name

        # ── Timetable entries from each train's actual stops ───────────────
        for train_num, stops in rows:
            timed = [(sid, stops[sid]) for sid in station_ids if stops.get(sid)]
            for i in range(len(timed) - 1):
                from_sid, depart_t = timed[i]
                to_sid,   arrive_t = timed[i + 1]
                key = f"{from_sid}_to_{to_sid}"
                entry = {
                    "trainNum": train_num,
                    "type":     "KTX",
                    "depart":   hhmm(depart_t),
                    "arrive":   hhmm(arrive_t),
                }
                timetable.setdefault(key, []).append(entry)

    # Deterministic edge list
    seen_edges: set[tuple] = set()
    edges: list[list[str]] = []
    for fs in sorted(edges_pairs, key=lambda s: tuple(sorted(s))):
        pair = tuple(sorted(fs))
        if pair not in seen_edges:
            seen_edges.add(pair)
            edges.append(list(pair))

    # ── Write timetable.json ──────────────────────────────────────────────
    TIMETABLE_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(TIMETABLE_OUT, "w", encoding="utf-8") as f:
        json.dump(timetable, f, ensure_ascii=False, indent=2)

    # ── Write network.ts ─────────────────────────────────────────────────
    lines: list[str] = []
    lines.append("// AUTO-GENERATED by build_timetable.py — do not edit by hand")
    lines.append('import type { StationId } from "@/shared/types";')
    lines.append("")
    lines.append("export interface StationMeta { name: string; x: number; y: number }")
    lines.append("")

    # STATIONS
    lines.append("export const STATIONS: Record<StationId, StationMeta> = {")
    for sid in sorted(LAT_LON.keys()):
        lat, lon = LAT_LON[sid]
        x, y = to_svg(lat, lon)
        name = STATION_NAMES.get(sid, sid.replace("_", " ").title())
        lines.append(f'  {sid}: {{ name: "{name}", x: {x}, y: {y} }},')
    lines.append("};")
    lines.append("")

    # EDGES
    lines.append("export const EDGES: [StationId, StationId][] = [")
    for a, b in edges:
        lines.append(f'  ["{a}", "{b}"],')
    lines.append("];")
    lines.append("")

    # ADJACENCY
    lines.append("export const ADJACENCY: Record<StationId, StationId[]> = {};")
    lines.append("for (const [a, b] of EDGES) {")
    lines.append("  if (!ADJACENCY[a]) ADJACENCY[a] = [];")
    lines.append("  if (!ADJACENCY[b]) ADJACENCY[b] = [];")
    lines.append("  ADJACENCY[a].push(b);")
    lines.append("  ADJACENCY[b].push(a);")
    lines.append("}")
    lines.append("")

    # RailLine + colors + speeds
    lines.append('export type RailLine = "gyeongbu" | "honam" | "gangneung" | "jungang" | "jungang_inland" | "donghae" | "gyeongjeon" | "jeolla";')
    lines.append("")
    lines.append("export const LINE_COLORS: Record<RailLine, string> = {")
    lines.append('  gyeongbu:      "#3b82f6",')   # blue
    lines.append('  honam:         "#22c55e",')   # green
    lines.append('  gangneung:     "#a855f7",')   # purple
    lines.append('  jungang:       "#f97316",')   # orange
    lines.append('  jungang_inland:"#f59e0b",')   # amber
    lines.append('  donghae:       "#06b6d4",')   # cyan
    lines.append('  gyeongjeon:    "#ef4444",')   # red
    lines.append('  jeolla:        "#ec4899",')   # pink
    lines.append("};")
    lines.append("")
    lines.append('export const LINE_SPEEDS: Record<RailLine, "ktx" | "regional" | "local"> = {')
    lines.append('  gyeongbu:      "ktx",')
    lines.append('  honam:         "ktx",')
    lines.append('  gangneung:     "ktx",')
    lines.append('  jungang:       "regional",')
    lines.append('  jungang_inland:"regional",')
    lines.append('  donghae:       "regional",')
    lines.append('  gyeongjeon:    "local",')
    lines.append('  jeolla:        "regional",')
    lines.append("};")
    lines.append("")

    # Populate EDGE_LINES_RAW from parsed data
    lines.append("const EDGE_LINES_RAW: Record<string, RailLine> = {")
    for (a, b), line in sorted(edge_lines.items()):
        canonical = "_".join(sorted([a, b]))
        lines.append(f'  "{canonical}": "{line}",')
    lines.append("};")

    lines.append("const EDGE_WAYPOINTS_RAW: Record<string, [number, number][]> = {};")
    lines.append("")
    lines.append("function canonicalKey(a: StationId, b: StationId): string {")
    lines.append('  return [a, b].sort().join("_");')
    lines.append("}")
    lines.append("")
    lines.append("export function getEdgeLine(a: StationId, b: StationId): RailLine {")
    lines.append('  return EDGE_LINES_RAW[canonicalKey(a, b)] ?? "gyeongbu";')
    lines.append("}")
    lines.append("")
    lines.append("export function getEdgePoints(a: StationId, b: StationId): [number, number][] {")
    lines.append("  const stA = STATIONS[a];")
    lines.append("  const stB = STATIONS[b];")
    lines.append("  if (!stA || !stB) return [];")
    lines.append("  const key = canonicalKey(a, b);")
    lines.append("  const wps = EDGE_WAYPOINTS_RAW[key] ?? [];")
    lines.append("  const start: [number, number] = [stA.x, stA.y];")
    lines.append("  const end: [number, number]   = [stB.x, stB.y];")
    lines.append("  const sorted = [a, b].sort();")
    lines.append("  const reversed = sorted[0] !== a;")
    lines.append("  return reversed ? [start, ...[...wps].reverse(), end] : [start, ...wps, end];")
    lines.append("}")
    lines.append("")
    lines.append("export const NODE_IDS = new Set<StationId>([]);")
    lines.append("")

    NETWORK_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(NETWORK_OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    # ── Write koreaPath.ts ────────────────────────────────────────────────
    korea_d = extract_korea_path(SVG_SRC)
    korea_ts = f'// AUTO-GENERATED by build_timetable.py\nexport const KOREA_PATH = "{korea_d}";\n'
    KOREA_PATH_OUT.parent.mkdir(parents=True, exist_ok=True)
    KOREA_PATH_OUT.write_text(korea_ts, encoding="utf-8")

    # ── Copy SVG to public ────────────────────────────────────────────────
    SVG_DST.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SVG_SRC, SVG_DST)

    # ── Summary ───────────────────────────────────────────────────────────
    total_entries = sum(len(v) for v in timetable.values())
    print(f"OK {len(LAT_LON)} stations")
    print(f"OK {len(edges)} edges")
    print(f"OK {total_entries} timetable entries across {len(timetable)} segments")
    print(f"OK {TIMETABLE_OUT}")
    print(f"OK {NETWORK_OUT}")
    print(f"OK {KOREA_PATH_OUT}")
    print(f"OK {SVG_DST}")

    # Warn about any station IDs found in timetable but missing from LAT_LON
    tt_stations = set()
    for key in timetable:
        a, b = key.split("_to_", 1)
        tt_stations.add(a)
        tt_stations.add(b)
    missing = tt_stations - set(LAT_LON.keys())
    if missing:
        print(f"\nWARN Station IDs in timetable but missing from LAT_LON ({len(missing)}):")
        for s in sorted(missing):
            print(f"   {s}")

if __name__ == "__main__":
    main()
