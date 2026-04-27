"""
fetch_osm_tracks.py — Download KTX railway geometry and write EDGE_WAYPOINTS
to src/data/network_edges.ts.

Usage: C:\\Python314\\python.exe fetch_osm_tracks.py

How it works:
  1. Downloads all mainline railway ways in South Korea from Overpass API.
  2. Builds a node graph (node_id -> neighbors with distances).
  3. For each edge in network_edges.ts, runs Dijkstra between the OSM node
     nearest to station A and the OSM node nearest to station B.
  4. Converts the resulting path to SVG coordinates, applies RDP simplification
     to keep only significant bends, and records interior waypoints.
  5. Overwrites the EDGE_WAYPOINTS block in network_edges.ts.
"""

import heapq
import json
import math
import re
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

OVERPASS_URL   = "https://overpass-api.de/api/interpreter"
NETWORK_EDGES  = Path("src/data/network_edges.ts")

# ── Coordinate transform (same as build_timetable.py) ────────────────────────

def to_svg(lat: float, lon: float) -> tuple[float, float]:
    x = 172.6 * lon - 21767.0
    y = -209.6 * lat + 8103.8
    return round(x, 1), round(y, 1)

def dist_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    dlat = (lat2 - lat1) * 111320.0
    dlon = (lon2 - lon1) * 111320.0 * math.cos(math.radians((lat1 + lat2) / 2))
    return math.hypot(dlat, dlon)

# ── Station lat/lon (from build_timetable.py) ─────────────────────────────────

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

# ── Edges to process (sync with network_edges.ts EDGES list) ─────────────────

EDGES: list[tuple[str, str]] = [
    ("andong", "uiseong"),
    ("andong", "yeongju"),
    ("angseong_oncheon", "chungju"),
    ("angseong_oncheon", "gamgok_janghowon"),
    ("bubal", "ganam"),
    ("bubal", "pangyo"),
    ("bugulsan", "gyeongju"),
    ("bugulsan", "taehwagang"),
    ("bujeon", "centum"),
    ("bujeon", "taehwagang"),
    ("busan", "gupo"),
    ("centum", "sinhaeundae"),
    ("changwon", "changwon_jungang"),
    ("changwon", "masan"),
    ("changwon_jungang", "jinyeong"),
    ("cheonan_asan", "gwangmyeong"),
    ("cheonan_asan", "osong"),
    ("cheonan_asan", "pyeongtaek_jije"),
    ("cheongnyangni", "sangbong"),
    ("cheongnyangni", "seoul"),
    ("chungju", "salmi"),
    ("daejeon", "gimcheon_gumi"),
    ("daejeon", "osong"),
    ("danyang", "jecheon"),
    ("danyang", "punggi"),
    ("deokso", "sangbong"),
    ("deokso", "yangpyeong"),
    ("dongdaegu", "gimcheon_gumi"),
    ("dongdaegu", "gyeongju"),
    ("dongdaegu", "gyeongsan"),
    ("dongdaegu", "pohang"),
    ("dongdaegu", "seodaegu"),
    ("donghae", "mukho"),
    ("donghae", "samcheok"),
    ("dongtan", "pyeongtaek_jije"),
    ("dongtan", "suseo"),
    ("dunnae", "hoengseong"),
    ("dunnae", "pyeongchang"),
    ("gamgok_janghowon", "ganam"),
    ("gangneung", "jeongdongjin"),
    ("gangneung", "jinbu_odaesan"),
    ("gijang", "namchang"),
    ("gijang", "sinhaeundae"),
    ("gimcheon_gumi", "seodaegu"),
    ("gimje", "iksan"),
    ("gimje", "jeongeup"),
    ("gokseong", "guryegu"),
    ("gokseong", "namwon"),
    ("gongju", "osong"),
    ("gongju", "seodaejeon"),
    ("gupo", "mulgeum"),
    ("guryegu", "suncheon"),
    ("gwangju_songjeong", "jangseong"),
    ("gwangju_songjeong", "naju"),
    ("gwangmyeong", "seoul"),
    ("gwangmyeong", "suseo"),
    ("gwangmyeong", "suwon"),
    ("gwangmyeong", "yongsan"),
    ("gyeongju", "pohang"),
    ("gyeongju", "taehwagang"),
    ("gyeongju", "ulsan"),
    ("gyeongju", "yeongcheon"),
    ("gyeongsan", "miryang"),
    ("gyeongsan", "ulsan"),
    ("gyeryong", "nonsan"),
    ("gyeryong", "seodaejeon"),
    ("haengsin", "seoul"),
    ("hoengseong", "manjong"),
    ("iksan", "jeonju"),
    ("iksan", "nonsan"),
    ("jangseong", "jeongeup"),
    ("jecheon", "wonju"),
    ("jeongdongjin", "mukho"),
    ("jeonju", "namwon"),
    ("jinbu_odaesan", "pyeongchang"),
    ("jinju", "masan"),
    ("jinyeong", "miryang"),
    ("manjong", "seowonju"),
    ("miryang", "mulgeum"),
    ("mokpo", "naju"),
    ("mungyeong", "yeonpung"),
    ("namchang", "taehwagang"),
    ("pohang", "yeongdeok"),
    ("punggi", "yeongju"),
    ("salmi", "suanbo_oncheon"),
    ("samcheok", "uljin"),
    ("seoul", "yeongdeungpo"),
    ("seoul", "yongsan"),
    ("seowonju", "wonju"),
    ("seowonju", "yangpyeong"),
    ("suanbo_oncheon", "yeonpung"),
    ("suncheon", "yeocheon"),
    ("suwon", "yeongdeungpo"),
    ("uiseong", "yeongcheon"),
    ("uljin", "yeongdeok"),
    ("yeocheon", "yeosu_expo"),
]

# ── Overpass fetch ────────────────────────────────────────────────────────────

def fetch_overpass(query: str) -> dict:
    data = urllib.parse.urlencode({"data": query}).encode()
    req = urllib.request.Request(OVERPASS_URL, data=data)
    req.add_header("User-Agent", "fetch_osm_tracks/1.0 (jetlag_snake project)")
    with urllib.request.urlopen(req, timeout=240) as r:
        return json.loads(r.read())

# ── RDP simplification in SVG space ──────────────────────────────────────────

def _perp_dist(p: tuple, a: tuple, b: tuple) -> float:
    ax, ay = a
    bx, by = b
    px, py = p
    if ax == bx and ay == by:
        return math.hypot(px - ax, py - ay)
    dx, dy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))

def rdp(points: list[tuple], epsilon: float = 3.0) -> list[tuple]:
    if len(points) <= 2:
        return list(points)
    max_d, max_i = 0.0, 0
    for i in range(1, len(points) - 1):
        d = _perp_dist(points[i], points[0], points[-1])
        if d > max_d:
            max_d, max_i = d, i
    if max_d > epsilon:
        left  = rdp(points[:max_i + 1], epsilon)
        right = rdp(points[max_i:], epsilon)
        return left[:-1] + right
    return [points[0], points[-1]]

# ── Graph Dijkstra ────────────────────────────────────────────────────────────

def dijkstra(
    src: int,
    dst: int,
    adj: dict[int, list[tuple[int, float]]],
    bbox: tuple[float, float, float, float],
    node_latlon: dict[int, tuple[float, float]],
) -> list[int] | None:
    """Shortest path from src to dst, restricted to nodes inside bbox."""
    lat_min, lon_min, lat_max, lon_max = bbox
    dist: dict[int, float] = {src: 0.0}
    prev: dict[int, int | None] = {src: None}
    pq: list[tuple[float, int]] = [(0.0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == dst:
            path = []
            while u is not None:
                path.append(u)
                u = prev[u]  # type: ignore[assignment]
            return list(reversed(path))
        if d > dist.get(u, math.inf):
            continue
        for v, w in adj.get(u, []):
            if v in node_latlon:
                vl, vo = node_latlon[v]
                # Prune nodes far outside the bounding box of the two stations
                pad = 0.8  # degrees
                if not (lat_min - pad <= vl <= lat_max + pad and
                        lon_min - pad <= vo <= lon_max + pad):
                    continue
            nd = d + w
            if nd < dist.get(v, math.inf):
                dist[v] = nd
                prev[v] = u
                heapq.heappush(pq, (nd, v))
    return None

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    # Download mainline and high-speed railway ways only (excludes sidings/yards/spurs).
    # usage=main covers primary mainlines; high_speed=yes covers dedicated KTX HSL.
    query = """
[out:json][timeout:240];
(
  way["railway"="rail"]["usage"="main"](34.0,124.0,38.8,130.5);
  way["railway"="rail"]["high_speed"="yes"](34.0,124.0,38.8,130.5);
);
out geom;
"""
    print("Fetching railway ways from Overpass API...")
    t0 = time.time()
    result = fetch_overpass(query)
    ways = [e for e in result["elements"] if e["type"] == "way"]
    print(f"  {len(ways)} railway ways in {time.time()-t0:.1f}s")

    # Build node graph from way geometries
    node_latlon: dict[int, tuple[float, float]] = {}
    adj: dict[int, list[tuple[int, float]]] = defaultdict(list)

    for way in ways:
        nodes: list[int] = way.get("nodes", [])
        geom: list[dict]  = way.get("geometry", [])
        if len(nodes) != len(geom) or len(nodes) < 2:
            continue
        for nid, g in zip(nodes, geom):
            node_latlon[nid] = (g["lat"], g["lon"])
        for i in range(len(nodes) - 1):
            a, b = nodes[i], nodes[i + 1]
            la, loa = node_latlon[a]
            lb, lob = node_latlon[b]
            d = dist_m(la, loa, lb, lob)
            adj[a].append((b, d))
            adj[b].append((a, d))

    total_edges = sum(len(v) for v in adj.values()) // 2
    print(f"  Graph: {len(node_latlon)} nodes, {total_edges} edges")

    # Nearest-node lookup (O(n) per station — fine for 88 stations)
    all_nodes = list(node_latlon.items())

    def nearest_node(lat: float, lon: float, max_m: float = 8000) -> tuple[int | None, float]:
        best_nid, best_d = None, math.inf
        for nid, (nlat, nlon) in all_nodes:
            d = dist_m(lat, lon, nlat, nlon)
            if d < best_d:
                best_d, best_nid = d, nid
        if best_d > max_m:
            return None, best_d
        return best_nid, best_d

    # Process each edge
    waypoints: dict[str, list[tuple[float, float]]] = {}

    for a, b in EDGES:
        key = "_".join(sorted([a, b]))
        if a not in LAT_LON or b not in LAT_LON:
            print(f"  SKIP {key}: missing lat/lon")
            continue

        lat_a, lon_a = LAT_LON[a]
        lat_b, lon_b = LAT_LON[b]

        node_a, da = nearest_node(lat_a, lon_a)
        node_b, db = nearest_node(lat_b, lon_b)

        if node_a is None or node_b is None:
            print(f"  SKIP {key}: nearest OSM node too far (a={da:.0f}m, b={db:.0f}m)")
            continue

        if node_a == node_b:
            print(f"  SKIP {key}: same nearest node")
            continue

        bbox = (
            min(lat_a, lat_b), min(lon_a, lon_b),
            max(lat_a, lat_b), max(lon_a, lon_b),
        )

        path = dijkstra(node_a, node_b, adj, bbox, node_latlon)
        if not path:
            print(f"  SKIP {key}: no path found in graph")
            continue

        # Sanity check: reject paths that are more than 1.6x the straight-line distance
        # (indicates Dijkstra routed through parallel/looping tracks)
        straight = dist_m(lat_a, lon_a, lat_b, lon_b)
        path_len = sum(
            dist_m(*node_latlon[path[i]], *node_latlon[path[i + 1]])
            for i in range(len(path) - 1)
        )
        if path_len > 1.6 * straight:
            print(f"  SKIP {key}: path too long ({path_len/1000:.1f}km vs {straight/1000:.1f}km straight, ratio={path_len/straight:.2f})")
            continue

        # Convert path nodes to SVG coordinates
        svg_pts = [to_svg(*node_latlon[n]) for n in path]

        # RDP simplification — epsilon=5 SVG units ≈ 2-3 km deviation
        simplified = rdp(svg_pts, epsilon=5.0)

        # Interior points only (exclude the station endpoints)
        interior = simplified[1:-1]

        n_raw = len(svg_pts)
        n_simplified = len(simplified)
        if interior:
            waypoints[key] = interior
            print(f"  {key}: {n_raw} -> {n_simplified} pts ({len(interior)} interior), ratio={path_len/straight:.2f}")
        else:
            print(f"  {key}: essentially straight ({n_raw} -> {n_simplified})")

    # Update EDGE_WAYPOINTS block in network_edges.ts
    content = NETWORK_EDGES.read_text(encoding="utf-8")

    lines = ["const EDGE_WAYPOINTS: Record<string, [number, number][]> = {"]
    if waypoints:
        for k in sorted(waypoints):
            pts_str = ", ".join(f"[{x}, {y}]" for x, y in waypoints[k])
            lines.append(f'  "{k}": [{pts_str}],')
    else:
        lines.append("  // No waypoints generated — check script output above")
    lines.append("};")
    new_block = "\n".join(lines)

    pattern = (
        r"const EDGE_WAYPOINTS: Record<string, \[number, number\]\[\]> = \{"
        r".*?"
        r"\};"
    )
    new_content = re.sub(pattern, new_block, content, flags=re.DOTALL)

    if new_content == content:
        print("\nWARN Could not find EDGE_WAYPOINTS block to replace — printing dict instead:")
        print(new_block)
    else:
        NETWORK_EDGES.write_text(new_content, encoding="utf-8")
        print(f"\nOK {len(waypoints)} waypoint entries written to {NETWORK_EDGES}")

if __name__ == "__main__":
    main()
