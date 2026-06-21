"""Adaptive Green Wave Signal Generation — traffic signal timing for diversions.

When the Diversion Engine reroutes traffic around an incident, simply dumping
500 cars onto a smaller street creates a NEW jam because the traffic lights
aren't timed for that volume.

This module generates an Adaptive Signal Plan along the diversion corridor:
  1. Identifies signal junctions along the diversion polyline
  2. Computes green-time extensions using Webster's optimal-cycle formula
  3. Creates a "Green Wave" corridor — phase offsets timed so a platoon of
     cars traveling at the wave speed hits successive green lights
  4. Estimates flush duration (how long until diverted traffic clears)

In production these recommendations feed into the city's SCADA/ATCS system.
Here we compute and display them on the dashboard.
"""
import math
from road_network import get_graph, haversine_m


def _junctions_along_polyline(polyline: list[list[float]], spacing_m: float = 400) -> list[dict]:
    """Pick evenly-spaced points along a polyline to represent signal junctions.

    If the real road graph is available, snap to nearest graph nodes; otherwise
    generate synthetic junctions from the polyline geometry.
    """
    if not polyline or len(polyline) < 2:
        return []

    # Walk the polyline, accumulate distance, drop a junction every `spacing_m`
    junctions = []
    accum = 0.0
    prev = polyline[0]
    junctions.append({
        "lat": round(prev[0], 6),
        "lng": round(prev[1], 6),
        "dist_from_start_m": 0,
    })

    for pt in polyline[1:]:
        d = haversine_m(prev[0], prev[1], pt[0], pt[1])
        accum += d
        if accum >= spacing_m:
            junctions.append({
                "lat": round(pt[0], 6),
                "lng": round(pt[1], 6),
                "dist_from_start_m": round(accum),
            })
            accum = 0.0
        prev = pt

    return junctions


def _signal_name(idx: int, corridor: str = "") -> str:
    """Generate a realistic-sounding junction name."""
    suffixes = [
        "Signal", "Junction", "Cross", "Circle", "Underpass", "Flyover Exit",
    ]
    if corridor:
        base = corridor.split()[0]
        return f"{base} {suffixes[idx % len(suffixes)]} {idx + 1}"
    return f"Junction Sig-{idx + 1}"


def _webster_cycle(saturation_ratio: float, num_phases: int = 2) -> float:
    """Webster's optimal cycle time (seconds).

    C_opt = (1.5 * L + 5) / (1 - Y)
    where L = total lost time per cycle, Y = sum of critical flow ratios.
    """
    L = num_phases * 4  # ~4 sec lost time per phase (amber + start delay)
    Y = min(0.9, saturation_ratio)  # cap to avoid division issues
    return (1.5 * L + 5) / (1 - Y)


def compute_green_wave(
    diversion_route: dict,
    risk: int,
    closure_prob: float,
    corridor: str = "",
) -> dict | None:
    """Build the Green Wave signal plan for a diversion route.

    Args:
        diversion_route: A route dict with 'polyline', 'distance_m', 'eta_min'.
        risk: Incident risk score (0-100).
        closure_prob: Road closure probability (0-1).
        corridor: Name of the affected corridor.

    Returns:
        Green wave plan dict, or None if route is too short.
    """
    polyline = diversion_route.get("polyline", [])
    distance_m = diversion_route.get("distance_m", 0)

    if not polyline or distance_m < 300:
        return None

    # Spacing based on route length — roughly one signal every 350-500m
    n_signals = max(2, min(8, int(distance_m / 400)))
    spacing = distance_m / n_signals

    junctions = _junctions_along_polyline(polyline, spacing_m=spacing)
    if len(junctions) < 2:
        return None

    # Traffic volume estimation — diverted traffic is significant
    # Normal flow on a secondary road: ~800 veh/hr
    # Diverted flow adds based on severity
    normal_flow = 800
    diverted_extra = int(risk * 4 + closure_prob * 300)  # up to ~700 extra veh/hr
    total_flow = normal_flow + diverted_extra

    # Saturation flow for a typical 2-lane urban road: ~1800 veh/hr/lane
    sat_flow_per_lane = 1800
    lanes = 2
    saturation_ratio = total_flow / (sat_flow_per_lane * lanes)

    # Optimal cycle time (Webster's formula)
    optimal_cycle = _webster_cycle(saturation_ratio)
    optimal_cycle = max(60, min(180, optimal_cycle))  # clamp 60-180 sec

    # Green split for the diversion direction (prioritize it)
    green_fraction = min(0.72, 0.45 + (risk / 100) * 0.25)  # 45-70% green
    current_green = int(optimal_cycle * 0.42)  # typical existing split
    recommended_green = int(optimal_cycle * green_fraction)

    # Wave speed — speed at which successive greens are coordinated
    # Typical urban: 30-45 km/h
    wave_speed_kmh = max(25, min(45, 40 - (risk - 50) * 0.2))

    # Phase offsets — timed so a platoon at wave_speed hits successive greens
    wave_speed_ms = wave_speed_kmh * 1000 / 3600  # m/s

    signals = []
    for i, junc in enumerate(junctions):
        dist = junc["dist_from_start_m"]
        # Phase offset = distance / wave_speed (time for platoon to reach)
        offset = round(dist / wave_speed_ms) if wave_speed_ms > 0 else 0
        # Slight variation in green times (outer signals get a bit less)
        green_adj = max(current_green, recommended_green - i * 2)

        signals.append({
            "junction_name": _signal_name(i, corridor),
            "lat": junc["lat"],
            "lng": junc["lng"],
            "signal_index": i + 1,
            "current_green_sec": current_green,
            "recommended_green_sec": green_adj,
            "green_extension_sec": green_adj - current_green,
            "phase_offset_sec": offset % int(optimal_cycle),
            "cycle_time_sec": int(optimal_cycle),
        })

    # Flush duration — how long the green wave needs to stay active to
    # clear the diverted traffic
    queue_length = total_flow / 60  # vehicles per minute
    # Each green phase discharges ~sat_flow vehicles
    discharge_per_cycle = sat_flow_per_lane * lanes * green_fraction * (optimal_cycle / 3600)
    cycles_to_flush = max(3, math.ceil(diverted_extra / max(1, discharge_per_cycle * 60 / optimal_cycle)))
    flush_min = max(15, int(cycles_to_flush * optimal_cycle / 60))

    corridor_name = corridor or "Diversion corridor"

    return {
        "corridor_name": corridor_name,
        "signals": signals,
        "wave_speed_kmh": round(wave_speed_kmh, 1),
        "flush_duration_min": flush_min,
        "duration_min": flush_min,
        "optimal_cycle_sec": int(optimal_cycle),
        "total_flow_vph": total_flow,
        "green_fraction": round(green_fraction, 2),
        "headline": (
            f"Green Wave on {corridor_name} — "
            f"{len(signals)} signals synchronized at {round(wave_speed_kmh)} km/h "
            f"for {flush_min} min"
        ),
    }
