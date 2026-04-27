"""
Reads 18 KTX timetable CSVs from components/korea/ktx_timetables/,
generates:
  public/data/timetable.json
  src/data/network.ts
  public/maps/south_korea.svg  (static asset copy)
"""
import csv
import json
import re
import shutil
from collections import Counter
from pathlib import Path

CSV_DIR       = Path("components/korea/ktx_timetables")
TIMETABLE_OUT = Path("public/data/timetable.json")
NETWORK_OUT   = Path("src/data/network.ts")
SVG_SRC       = Path("components/korea/maps/south_korea.svg")
SVG_DST       = Path("public/maps/south_korea.svg")

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
# Calibrated from administrative region centroids in south_korea.svg (800×1200).
# Reference: Seoul centroid=(149.3,230) at (37.566°N,126.978°E),
#            Busan centroid=(511.4,730) at (35.18°N,129.076°E).

def to_svg(lat: float, lon: float) -> tuple[float, float]:
    x = 172.6 * lon - 21767.0
    y = -209.6 * lat + 8103.8
    return round(x, 1), round(y, 1)

# ── Organisation normalisation ────────────────────────────────────────────
# The Organisation column drives edge colouring.

ORG_NORMALIZE: dict[str, str] = {
    "KTX":           "ktx",
    "KTX-산천":      "ktx_sancheon",
    "KTX_산천":      "ktx_sancheon",
    "KTX-Sancheon":  "ktx_sancheon",
    "KTX-Sancheon2": "ktx_sancheon",
    "KTX-이음":      "ktx_eum",
    "KTX-Ieum":      "ktx_eum",
    "KTX-청룡":      "ktx_cheongryong",
    "KTX-Cheongryong": "ktx_cheongryong",
}

# Lower number = higher priority when a segment is served by multiple orgs.
ORG_PRIORITY: dict[str, int] = {
    "ktx_cheongryong": 1,
    "ktx":             2,
    "ktx_sancheon":    3,
    "ktx_eum":         4,
}

def normalize_org(raw: str) -> str:
    return ORG_NORMALIZE.get(raw.strip(), "ktx")

# ── CSV parsing ───────────────────────────────────────────────────────────

def hhmm(s: str) -> str:
    return s.strip()[:5]

def parse_csv(filepath: Path) -> tuple[list[str], list[tuple[str, str, dict]]]:
    """Returns (station_ids, rows) where each row is (train_num, org, stops)."""
    with open(filepath, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        # Col 0: Train_Number, Col 1: Organisation, Col 2…-1: stations, last: Frequency
        station_cols = header[2:-1]
        station_ids  = [normalize_id(c) for c in station_cols]
        rows: list[tuple[str, str, dict]] = []
        for row in reader:
            if not row or not row[0].strip():
                continue
            train_num = row[0].strip()
            org       = row[1].strip() if len(row) > 1 else ""
            stops: dict[str, str | None] = {}
            for i, sid in enumerate(station_ids):
                idx = i + 2
                val = row[idx].strip() if idx < len(row) else ""
                stops[sid] = val if val else None
            rows.append((train_num, org, stops))
    return station_ids, rows


# ── Main ──────────────────────────────────────────────────────────────────

def main() -> None:
    timetable: dict[str, list[dict]] = {}
    edges_pairs: set[frozenset] = set()
    edge_lines: dict[tuple, str] = {}  # canonical tuple(sorted([a,b])) → org name

    for csv_path in sorted(CSV_DIR.glob("*.csv")):
        station_ids, rows = parse_csv(csv_path)

        # File-level fallback org: most common organisation in this CSV
        file_orgs = [normalize_org(org) for _, org, _ in rows if org.strip()]
        file_org  = Counter(file_orgs).most_common(1)[0][0] if file_orgs else "ktx"

        # ── Physical track edges from HEADER column order ─────────────────
        # Colour each segment by the organisation whose trains actually stop
        # at BOTH endpoints. Falls back to the file's dominant org if no train
        # stops at both (train passes through but doesn't stop at one end).
        for i in range(len(station_ids) - 1):
            a, b = station_ids[i], station_ids[i + 1]
            if a not in LAT_LON or b not in LAT_LON:
                continue

            seg_orgs = [normalize_org(org) for _, org, stops in rows
                        if stops.get(a) and stops.get(b)]
            org = Counter(seg_orgs).most_common(1)[0][0] if seg_orgs else file_org

            fs = frozenset([a, b])
            edges_pairs.add(fs)
            canonical = tuple(sorted([a, b]))
            existing  = edge_lines.get(canonical)
            if existing is None or ORG_PRIORITY.get(org, 9) < ORG_PRIORITY.get(existing, 9):
                edge_lines[canonical] = org

        # ── Timetable entries from each train's actual stops ───────────────
        for train_num, org, stops in rows:
            train_type = ORG_NORMALIZE.get(org.strip(), org.strip()) \
                             .replace("_", "-").replace("ktx-", "KTX-") \
                             .replace("ktx", "KTX") if not org.startswith("KTX") else org
            # Keep the original CSV org string as the type (already clean Korean text)
            train_type = org if org else "KTX"
            timed = [(sid, stops[sid]) for sid in station_ids if stops.get(sid)]
            for i in range(len(timed) - 1):
                from_sid, depart_t = timed[i]
                to_sid,   arrive_t = timed[i + 1]
                key = f"{from_sid}_to_{to_sid}"
                entry = {
                    "trainNum": train_num,
                    "type":     train_type,
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

    # RailLine type + colors + speeds (referenced by network_edges.ts)
    lines.append('export type RailLine = "ktx" | "ktx_sancheon" | "ktx_eum" | "ktx_cheongryong";')
    lines.append("")
    lines.append("export const LINE_COLORS: Record<RailLine, string> = {")
    lines.append('  ktx:             "#0068b7",')  # KTX blue
    lines.append('  ktx_sancheon:    "#e60012",')  # KTX-산천 red
    lines.append('  ktx_eum:         "#f08300",')  # KTX-이음 orange
    lines.append('  ktx_cheongryong: "#920783",')  # KTX-청룡 purple
    lines.append("};")
    lines.append("")
    lines.append('export const LINE_SPEEDS: Record<RailLine, "ktx" | "regional" | "local"> = {')
    lines.append('  ktx:             "ktx",')
    lines.append('  ktx_sancheon:    "ktx",')
    lines.append('  ktx_eum:         "regional",')
    lines.append('  ktx_cheongryong: "ktx",')
    lines.append("};")
    lines.append("")
    lines.append("// EDGES, ADJACENCY, getEdgeLine, getEdgePoints, NODE_IDS")
    lines.append("// are in src/data/network_edges.ts — edit that file directly.")
    lines.append("")

    NETWORK_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(NETWORK_OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

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
