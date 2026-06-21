"""Road Network Service — OSMnx download + NetworkX graph, cached to a pickle.

Build once:  python road_network.py --build
At runtime the graph is loaded lazily; if it's missing or OSMnx isn't installed,
get_graph() returns None and the diversion engine falls back to synthetic routes.
"""
import math
import pickle
import sys

import numpy as np

from config import CITY, GRAPH_PKL

_GRAPH = None
_TRIED = False


# Default speeds (km/h) by OSM highway class — used to compute travel_time
# ourselves, bypassing osmnx.add_edge_speeds (which crashes on NaN maxspeed
# under pandas>=3 / py3.14).
_HWY_SPEED = {
    "motorway": 80, "motorway_link": 50, "trunk": 60, "trunk_link": 40,
    "primary": 50, "primary_link": 35, "secondary": 40, "secondary_link": 30,
    "tertiary": 35, "tertiary_link": 25, "residential": 25, "living_street": 15,
    "unclassified": 30, "service": 20, "road": 30,
}
_DEFAULT_SPEED = 30.0  # km/h fallback


def _parse_maxspeed(ms):
    """Best-effort numeric km/h from an OSM maxspeed value (str/list/NaN)."""
    if ms is None:
        return None
    if isinstance(ms, list):
        for v in ms:
            s = _parse_maxspeed(v)
            if s:
                return s
        return None
    if isinstance(ms, float):
        return None if np.isnan(ms) else float(ms)
    digits = "".join(ch for ch in str(ms) if ch.isdigit())
    return float(digits) if digits else None


def _annotate_travel_times(G):
    """Add length(m)->travel_time(s) on every edge without using osmnx parsers."""
    for _, _, d in G.edges(data=True):
        speed = _parse_maxspeed(d.get("maxspeed"))
        if speed is None:
            hwy = d.get("highway")
            if isinstance(hwy, list):
                hwy = hwy[0] if hwy else None
            speed = _HWY_SPEED.get(hwy, _DEFAULT_SPEED)
        d["speed_kph"] = speed
        length_m = float(d.get("length", 0) or 0)
        d["travel_time"] = length_m / (speed * 1000 / 3600)  # seconds
    return G


def build_graph(place: str = CITY):
    """Download Bengaluru drive network, annotate travel times, cache to pickle."""
    import osmnx as ox
    print(f"Downloading road network for: {place} (this can take a few minutes)…")
    G = ox.graph_from_place(place, network_type="drive")
    G = _annotate_travel_times(G)
    with open(GRAPH_PKL, "wb") as f:
        pickle.dump(G, f)
    print(f"Saved graph: {len(G.nodes)} nodes, {len(G.edges)} edges -> {GRAPH_PKL}")
    return G


def build_graph_around(lat: float, lng: float, dist_m: int = 4000):
    """Faster alternative: just the area around a point."""
    import osmnx as ox
    G = ox.graph_from_point((lat, lng), dist=dist_m, network_type="drive")
    G = _annotate_travel_times(G)
    with open(GRAPH_PKL, "wb") as f:
        pickle.dump(G, f)
    return G


def get_graph():
    """Lazy-load the cached graph. Returns None if unavailable (engine falls back)."""
    global _GRAPH, _TRIED
    if _GRAPH is not None:
        return _GRAPH
    if _TRIED:
        return None
    _TRIED = True
    try:
        with open(GRAPH_PKL, "rb") as f:
            _GRAPH = pickle.load(f)
        print(f"Loaded road graph: {len(_GRAPH.nodes)} nodes.")
    except (FileNotFoundError, ModuleNotFoundError, Exception) as e:  # noqa: BLE001
        print(f"[road_network] graph unavailable ({e}). Diversions use fallback.")
        _GRAPH = None
    return _GRAPH


def nearest_node(G, lat: float, lng: float):
    """Nearest graph node to a coordinate (uses OSMnx if present, else manual)."""
    try:
        import osmnx as ox
        return ox.nearest_nodes(G, lng, lat)
    except Exception:  # noqa: BLE001
        best, bestd = None, float("inf")
        for n, d in G.nodes(data=True):
            dd = (d["y"] - lat) ** 2 + (d["x"] - lng) ** 2
            if dd < bestd:
                best, bestd = n, dd
        return best


def haversine_m(a_lat, a_lng, b_lat, b_lng):
    R = 6371000
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dphi = math.radians(b_lat - a_lat)
    dl = math.radians(b_lng - a_lng)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def _edge_coords(G, u, v, data):
    """Return [[lat,lng], ...] for an edge — real geometry if present, else straight."""
    geom = data.get("geometry")
    if geom is not None:
        try:
            return [[round(y, 6), round(x, 6)] for x, y in geom.coords]
        except Exception:  # noqa: BLE001
            pass
    ud, vd = G.nodes[u], G.nodes[v]
    return [[round(ud["y"], 6), round(ud["x"], 6)], [round(vd["y"], 6), round(vd["x"], 6)]]


def segments_near(lat: float, lng: float, radius_m: float = 350, limit: int = 80):
    """Real road segments whose midpoint falls within radius of (lat,lng).

    Returns list of {polyline, dist_m} sorted nearest-first. Empty if no graph.
    Used to paint congested roads (Google-traffic style) instead of a flat circle.
    """
    G = get_graph()
    if G is None:
        return []
    out = []
    seen = set()

    # Fast bounding box pre-filter to avoid O(E) haversine calculations
    margin = max(0.015, (radius_m / 111000.0) * 1.5)
    local_nodes = {
        n for n, d in G.nodes(data=True)
        if abs(d.get("y", 0) - lat) < margin and abs(d.get("x", 0) - lng) < margin
    }
    
    if not local_nodes:
        return []

    local_G = G.subgraph(local_nodes)

    for u, v, data in local_G.edges(data=True):
        key = (min(u, v), max(u, v))
        if key in seen:
            continue
        ud, vd = G.nodes[u], G.nodes[v]
        mlat = (ud["y"] + vd["y"]) / 2
        mlng = (ud["x"] + vd["x"]) / 2
        d = haversine_m(lat, lng, mlat, mlng)
        if d <= radius_m:
            seen.add(key)
            out.append({"polyline": _edge_coords(G, u, v, data), "dist_m": d})
    out.sort(key=lambda s: s["dist_m"])
    return out[:limit]


if __name__ == "__main__":
    if "--build" in sys.argv:
        build_graph()
    else:
        print("Usage: python road_network.py --build")
        print("(downloads the full Bengaluru graph; or import build_graph_around for a faster local build)")
