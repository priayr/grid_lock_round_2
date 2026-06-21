"""Adaptive "Green Wave" signal generation for a diversion route.

When the diversion engine dumps traffic onto an alternate street, the lights on
that street weren't timed for the new volume — so it just forms a fresh jam.
This module turns a route polyline into a coordinated signal plan: a series of
signals whose green windows are *offset* so a platoon leaving the start of the
corridor catches a continuous green wave at design speed.

Pure geometry — depends only on haversine_m (no road graph, no models), so it
works for real OSMnx polylines and for the 3-point synthetic fallback routes.
All numbers are cast to native Python int/float so the dict is JSON-safe.
"""
from road_network import haversine_m

_MAX_SIGNALS = 12          # cap payload size on long real polylines
_DESIGN_SPEED_KPH = 24.0   # urban arterial green-wave design speed (20-40 typical)


def _sample_polyline(polyline, spacing_m=300):
    """Walk the polyline, emitting (lat, lng, cumulative_dist_m) every ~spacing_m.

    Always emits the first and last vertex. Returns at least 2 samples for any
    line of >= 2 points. Caps the count at _MAX_SIGNALS (keeps endpoints)."""
    if not polyline or len(polyline) < 2:
        return []

    samples = [(float(polyline[0][0]), float(polyline[0][1]), 0.0)]
    cumulative = 0.0
    since_last = 0.0
    for (alat, alng), (blat, blng) in zip(polyline[:-1], polyline[1:]):
        seg = haversine_m(alat, alng, blat, blng)
        cumulative += seg
        since_last += seg
        if since_last >= spacing_m:
            samples.append((float(blat), float(blng), cumulative))
            since_last = 0.0
    # ensure the final vertex is represented
    last = (float(polyline[-1][0]), float(polyline[-1][1]), cumulative)
    if samples[-1][2] != last[2]:
        samples.append(last)

    if len(samples) > _MAX_SIGNALS:
        # keep first + last, evenly subsample the middle
        step = (len(samples) - 1) / (_MAX_SIGNALS - 1)
        idx = sorted({round(i * step) for i in range(_MAX_SIGNALS)})
        samples = [samples[i] for i in idx]
    return samples


def green_wave_plan(polyline, risk, closure_prob,
                    progression_speed_kph=_DESIGN_SPEED_KPH,
                    cycle_length_s=None, spacing_m=300):
    """Return the adaptive signal plan dict for a route, or None if too short.

    risk (0-100) and closure_prob (0-1) scale the diverted volume, which in turn
    sets the cycle length and the achievable delay reduction.
    """
    samples = _sample_polyline(polyline, spacing_m=spacing_m)
    if len(samples) < 2:
        return None

    v = progression_speed_kph * 1000 / 3600          # m/s

    # Volume pushed onto the alternate corridor — heavier when the incident is
    # severe / likely to close the road.
    vol = round((300 + risk * 6 + closure_prob * 400) / 10) * 10
    diverted_volume_vph = int(max(200, min(1200, vol)))

    if cycle_length_s is None:
        cycle_length_s = 60 if diverted_volume_vph < 500 else 90 if diverted_volume_vph < 900 else 120
    cycle_length_s = int(cycle_length_s)

    bandwidth_s = int(round(0.4 * cycle_length_s))   # ~40% through-band
    green_s = bandwidth_s
    red_s = cycle_length_s - green_s

    signals = []
    for i, (lat, lng, dist) in enumerate(samples):
        signals.append({
            "id": f"SIG-{i + 1}",
            "name": f"Signal {i + 1}",
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "distance_m": int(round(dist)),
            "offset_s": int(round(dist / v)),        # green-wave progression offset
            "green_s": green_s,
            "red_s": red_s,
        })

    delay_red = int(round(min(35, 12 + risk * 0.15 + closure_prob * 10)))

    return {
        "strategy": "adaptive-green-wave",
        "progression_speed_kph": round(progression_speed_kph, 1),
        "cycle_length_s": cycle_length_s,
        "bandwidth_s": bandwidth_s,
        "diverted_volume_vph": diverted_volume_vph,
        "expected_delay_reduction_pct": delay_red,
        "corridor_length_m": int(round(samples[-1][2])),
        "signals": signals,
    }
