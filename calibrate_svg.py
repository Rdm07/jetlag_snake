"""Probe the SVG coordinate system to calibrate the lat/lon transform."""
import re
from statistics import mean

data = open("public/maps/south_korea.svg", encoding="utf-8").read()

# Extract all polyline/polygon point strings
poly_strings = re.findall(r'points="([^"]+)"', data)

results = []
for ps in poly_strings:
    pts = re.findall(r"(-?[\d.]+),(-?[\d.]+)", ps)
    if len(pts) < 3:
        continue
    xs = [float(p[0]) for p in pts]
    ys = [float(p[1]) for p in pts]
    cx, cy = mean(xs), mean(ys)
    results.append((cy, cx, len(pts), min(xs), max(xs), min(ys), max(ys)))

results.sort()
print(f"Total polygon groups: {len(results)}")
print()
print("Northernmost (small y = north in SVG):")
for cy, cx, n, xmn, xmx, ymn, ymx in results[:8]:
    print(f"  centroid=({cx:.1f}, {cy:.1f})  bbox x=[{xmn:.0f},{xmx:.0f}] y=[{ymn:.0f},{ymx:.0f}]  n={n}")
print()
print("Southernmost (large y = south in SVG):")
for cy, cx, n, xmn, xmx, ymn, ymx in results[-8:]:
    print(f"  centroid=({cx:.1f}, {cy:.1f})  bbox x=[{xmn:.0f},{xmx:.0f}] y=[{ymn:.0f},{ymx:.0f}]  n={n}")

# Find the overall extremes
all_x = []
all_y = []
for ps in poly_strings:
    pts = re.findall(r"(-?[\d.]+),(-?[\d.]+)", ps)
    for p in pts:
        all_x.append(float(p[0]))
        all_y.append(float(p[1]))

print(f"\nOverall x: {min(all_x):.1f} to {max(all_x):.1f}")
print(f"Overall y: {min(all_y):.1f} to {max(all_y):.1f}")

# Our current station positions for comparison
STATIONS = {
    "seoul":    (37.554, 126.972),
    "busan":    (35.116, 129.037),
    "mokpo":    (34.815, 126.393),
    "gangneung":(37.752, 128.901),
    "pohang":   (36.024, 129.358),
}

print("\nCurrent formula (172.6*lon - 21767, -209.6*lat + 8103.8):")
for name, (lat, lon) in STATIONS.items():
    x = 172.6 * lon - 21767.0
    y = -209.6 * lat + 8103.8
    print(f"  {name}: ({x:.1f}, {y:.1f})")
