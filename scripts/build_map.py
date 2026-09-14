import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "chile-adm0.geojson"
MIEMBROS = ROOT / "src" / "data" / "miembros.json"
OUT = ROOT / "src" / "data" / "mapa.json"

LAT0 = -35.0
KX = math.cos(math.radians(LAT0))
LAT_MIN, LAT_MAX = -56.2, -17.2
LON_MIN, LON_MAX = -76.5, -66.0
TOLERANCE = 0.035
MIN_AREA = 0.35
WIDTH = 220.0


def project(lon, lat):
    return (lon * KX, -lat)


def perpendicular(point, start, end):
    (px, py), (ax, ay), (bx, by) = point, start, end
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def simplify(points, tolerance):
    if len(points) < 3:
        return points
    index, worst = 0, 0.0
    for i in range(1, len(points) - 1):
        distance = perpendicular(points[i], points[0], points[-1])
        if distance > worst:
            index, worst = i, distance
    if worst <= tolerance:
        return [points[0], points[-1]]
    left = simplify(points[: index + 1], tolerance)
    right = simplify(points[index:], tolerance)
    return left[:-1] + right


def ring_area(points):
    total = 0.0
    for i in range(len(points)):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % len(points)]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2.0


def main():
    geo = json.loads(SOURCE.read_text(encoding="utf-8"))
    geometry = geo["features"][0]["geometry"]
    polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]

    rings = []
    for polygon in polygons:
        ring = polygon[0]
        if not all(LON_MIN <= lon <= LON_MAX and LAT_MIN <= lat <= LAT_MAX for lon, lat in ring):
            continue
        projected = [project(lon, lat) for lon, lat in ring]
        if ring_area(projected) < MIN_AREA:
            continue
        rings.append(simplify(projected, TOLERANCE))

    xs = [x for ring in rings for x, _ in ring]
    ys = [y for ring in rings for _, y in ring]
    min_x, max_x, min_y, max_y = min(xs), max(xs), min(ys), max(ys)
    scale = WIDTH / (max_x - min_x)
    height = (max_y - min_y) * scale

    def to_canvas(x, y):
        return round((x - min_x) * scale, 2), round((y - min_y) * scale, 2)

    paths = []
    for ring in rings:
        points = [to_canvas(x, y) for x, y in ring]
        commands = [f"M{points[0][0]} {points[0][1]}"] + [f"L{x} {y}" for x, y in points[1:]]
        paths.append("".join(commands) + "Z")
    paths.sort(key=len, reverse=True)

    miembros = json.loads(MIEMBROS.read_text(encoding="utf-8"))
    nodos = []
    for member in miembros:
        x, y = to_canvas(*project(member["lon"], member["lat"]))
        nodos.append({"id": member["id"], "x": x, "y": y})

    payload = {
        "width": round(WIDTH, 2),
        "height": round(height, 2),
        "paths": paths,
        "nodos": nodos,
        "fuente": "geoBoundaries gbOpen CHL ADM0 (dominio publico, derivado de Natural Earth)",
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")
    total_points = sum(p.count("L") + 1 for p in paths)
    print(f"{OUT.relative_to(ROOT)}: {len(paths)} poligonos, {total_points} puntos, lienzo {WIDTH:.0f}x{height:.0f}")


if __name__ == "__main__":
    import sys

    sys.setrecursionlimit(10000)
    main()
