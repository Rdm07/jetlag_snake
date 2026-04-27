"""
Find the best linear transform (lat,lon) -> (x_svg, y_svg) by comparing
known city/province centroids with the polygon centroids extracted from the SVG.
"""

# Polygon centroids from the SVG (cy, cx format → converted to (x, y)):
# centroid=(149.3, 230.0) bbox=[115,185] x [197,255]  -> Seoul Metro
# centroid=(511.4, 730.0) bbox=[467,556] x [685,760]  -> Busan Metro
# centroid=(97.9,  237.3) bbox=[82,119]  x [210,265]  -> Incheon Metro (approx)
# centroid=(225.5, 483.8) bbox=[197,250] x [452,519]  -> Daejeon Metro (approx)
# centroid=(412.6, 604.3) bbox=[388,459] x [553,640]  -> Daegu Metro
# centroid=(122.0, 736.7) bbox=[92,158]  x [716,760]  -> Gwangju Metro
# centroid=(75.1,  1114.7) bbox=[4,145]  x [1076,1155] -> Jeju-do

# Known (lat, lon) -> SVG (x, y) for administrative unit centroids.
# Source: approximate centroids of Korean metropolitan city administrative boundaries.
CALIBRATION_POINTS = [
    # lat,     lon,      x_svg,  y_svg, name
    (37.566, 126.978,  149.3,  230.0, "Seoul"),
    (35.179, 129.075,  511.4,  730.0, "Busan"),
    (37.456, 126.705,   97.9,  237.3, "Incheon"),
    (36.351, 127.385,  225.5,  483.8, "Daejeon"),
    (35.871, 128.601,  412.6,  604.3, "Daegu"),
    (35.160, 126.851,  122.0,  736.7, "Gwangju"),
    (33.364, 126.542,   75.1, 1114.7, "Jeju"),
]

# Least squares for x = a*lon + b
# and y = c*lat + d
lats  = [p[0] for p in CALIBRATION_POINTS]
lons  = [p[1] for p in CALIBRATION_POINTS]
xs    = [p[2] for p in CALIBRATION_POINTS]
ys    = [p[3] for p in CALIBRATION_POINTS]

def least_squares_line(us, vs):
    """Fit v = a*u + b via OLS."""
    n = len(us)
    su  = sum(us);  sv  = sum(vs)
    suu = sum(u*u for u in us)
    suv = sum(u*v for u, v in zip(us, vs))
    denom = n*suu - su*su
    a = (n*suv - su*sv) / denom
    b = (sv - a*su) / n
    return a, b

a, b = least_squares_line(lons, xs)
print(f"x = {a:.4f} * lon + ({b:.1f})")

c, d = least_squares_line(lats, ys)
print(f"y = {c:.4f} * lat + ({d:.1f})")

print()
print("Residuals:")
for lat, lon, x_svg, y_svg, name in CALIBRATION_POINTS:
    x_pred = a * lon + b
    y_pred = c * lat + d
    print(f"  {name}: x_err={x_pred - x_svg:.1f}  y_err={y_pred - y_svg:.1f}")

print()
print("Key station positions with new transform:")
KEY_STATIONS = {
    "seoul":     (37.554, 126.972),
    "busan":     (35.116, 129.037),
    "mokpo":     (34.815, 126.393),
    "gangneung": (37.752, 128.901),
    "daejeon":   (36.360, 127.427),
    "dongdaegu": (35.878, 128.627),
}
for name, (lat, lon) in KEY_STATIONS.items():
    x = a * lon + b
    y = c * lat + d
    print(f"  {name}: ({x:.1f}, {y:.1f})")
