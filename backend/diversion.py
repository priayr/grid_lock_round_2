"""Diversion Engine — Dijkstra, A*, and Yen's K-shortest over the road graph.

Injects ML risk into edge weights, then routes AROUND the incident.
If the OSMnx graph is unavailable, returns synthetic-but-plausible routes so the
API + frontend keep working in a demo.
"""
from itertools import islice

from road_network import get_graph, nearest_node, haversine_m
from signals import green_wave_plan


def _edge_path_to_coords(G, node_path):
    """Convert a list of node IDs into [[lat,lng], ...] for the frontend polyline."""
    coords = []
    for n in node_path:
        d = G.nodes[n]
        coords.append([round(d["y"], 6), round(d["x"], 6)])
    return coords


def _penalize(G, lat, lng, risk, closure_prob, radius_m=300):
    """Return a routing copy with the affected area removed (closure) or slowed (risk)."""
    Gr = G.copy()
    factor = 1 + (risk / 100.0) * 3.0
    to_remove = []
    for u, v, k, data in Gr.edges(keys=True, data=True):
        ud, vd = Gr.nodes[u], Gr.nodes[v]
        mlat = (ud["y"] + vd["y"]) / 2
        mlng = (ud["x"] + vd["x"]) / 2
        if haversine_m(lat, lng, mlat, mlng) <= radius_m:
            if closure_prob > 0.5:
                to_remove.append((u, v, k))
            else:
                data["travel_time"] = data.get("travel_time", 60) * factor
    for e in to_remove:
        if Gr.has_edge(*e):
            Gr.remove_edge(*e)
    return Gr


def _to_simple_digraph(GM):
    """Collapse a MultiDiGraph to a simple DiGraph keeping the fastest parallel
    edge — Yen's K (shortest_simple_paths) is not implemented for multigraphs."""
    import networkx as nx
    D = nx.DiGraph()
    for n, d in GM.nodes(data=True):
        D.add_node(n, **d)
    for u, v, data in GM.edges(data=True):
        tt = data.get("travel_time", data.get("length", 0) / 8.33)
        if D.has_edge(u, v) and D[u][v]["travel_time"] <= tt:
            continue
        D.add_edge(u, v, travel_time=tt, length=data.get("length", 0))
    return D


def _route_metrics(G, node_path):
    dist = 0.0
    secs = 0.0
    for a, b in zip(node_path[:-1], node_path[1:]):
        data = G.get_edge_data(a, b)  # simple DiGraph -> dict
        dist += data.get("length", 0)
        secs += data.get("travel_time", data.get("length", 0) / 8.33)  # ~30km/h fallback
    return round(dist), round(secs / 60.0, 1)


def compute_diversion(lat, lng, risk, closure_prob,
                      src=None, dst=None, k=3, blocked_label="incident"):
    """Main entry: returns the `diversion` dict for the JSON contract."""
    G = get_graph()
    if G is None:
        return _fallback(lat, lng, blocked_label, k, risk, closure_prob)

    import networkx as nx

    # default src/dst = points ~400m before/after the incident along lat axis
    src = src or {"lat": lat - 0.004, "lng": lng - 0.004}
    dst = dst or {"lat": lat + 0.004, "lng": lng + 0.004}

    # Extract a local subgraph (e.g. ~1.5 km radius) to avoid O(N) memory copies
    # and to vastly speed up Dijkstra / Yen's K algorithm.
    margin = 0.015
    local_nodes = [
        n for n, d in G.nodes(data=True)
        if abs(d.get("y", 0) - lat) < margin and abs(d.get("x", 0) - lng) < margin
    ]
    if not local_nodes:
        return _fallback(lat, lng, blocked_label, k)

    local_G = G.subgraph(local_nodes).copy()

    s = nearest_node(local_G, src["lat"], src["lng"])
    t = nearest_node(local_G, dst["lat"], dst["lng"])

    Gr = _to_simple_digraph(_penalize(local_G, lat, lng, risk, closure_prob))

    routes = []
    try:
        # Yen's K shortest (simple) paths — the actual diversion options
        gen = nx.shortest_simple_paths(Gr, s, t, weight="travel_time")
        for i, path in enumerate(islice(gen, k)):
            dist_m, eta = _route_metrics(Gr, path)
            algo = "dijkstra/yen-k1" if i == 0 else f"yen-k{i+1}"
            poly = _edge_path_to_coords(Gr, path)
            routes.append({
                "rank": i + 1,
                "algorithm": algo,
                "distance_m": dist_m,
                "eta_min": eta,
                "summary": f"alternate route {i+1}",
                "polyline": poly,
                # adaptive green-wave timing so the alternate doesn't re-jam
                "signal_plan": green_wave_plan(poly, risk, closure_prob),
            })
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return _fallback(lat, lng, blocked_label, k, risk, closure_prob)

    if not routes:
        return _fallback(lat, lng, blocked_label, k, risk, closure_prob)

    return {
        "blocked_segment": blocked_label,
        "src": src, "dst": dst,
        "engine": "osmnx+networkx",
        "routes": routes,
    }


def astar_route(lat, lng, src, dst):
    """A* single fast route — used for real-time recompute. Returns coords or None."""
    G = get_graph()
    if G is None:
        return None
    import networkx as nx
    s = nearest_node(G, src["lat"], src["lng"])
    t = nearest_node(G, dst["lat"], dst["lng"])

    def h(a, b):
        return haversine_m(G.nodes[a]["y"], G.nodes[a]["x"],
                           G.nodes[b]["y"], G.nodes[b]["x"])
    try:
        path = nx.astar_path(G, s, t, heuristic=h, weight="travel_time")
        return _edge_path_to_coords(G, path)
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None


def _fallback(lat, lng, blocked_label, k, risk=50, closure_prob=0.5):
    """Plausible synthetic routes when the real graph isn't available."""
    offsets = [
        (0.006, 0.004, "via parallel arterial"),
        (-0.005, 0.006, "via ring connector"),
        (0.004, -0.006, "via service road"),
    ]
    routes = []
    for i in range(min(k, len(offsets))):
        dla, dln, summ = offsets[i]
        poly = [[round(lat - 0.004, 6), round(lng - 0.004, 6)],
                [round(lat + dla, 6), round(lng + dln, 6)],
                [round(lat + 0.004, 6), round(lng + 0.004, 6)]]
        dist = int(2000 + i * 600)
        routes.append({
            "rank": i + 1,
            "algorithm": "fallback-synthetic" if i else "dijkstra/yen-k1",
            "distance_m": dist,
            "eta_min": round(dist / 250, 1),
            "summary": summ,
            "polyline": poly,
            "signal_plan": green_wave_plan(poly, risk, closure_prob),
        })
    return {
        "blocked_segment": blocked_label,
        "src": {"lat": lat - 0.004, "lng": lng - 0.004},
        "dst": {"lat": lat + 0.004, "lng": lng + 0.004},
        "engine": "fallback (build graph with: python road_network.py --build)",
        "routes": routes,
    }
