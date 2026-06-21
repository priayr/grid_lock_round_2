"""Commercial Fleet Quarantine — the B2B "Geo-Fence Broadcast" payload.

When a severe unplanned incident / road closure is detected we don't just show
it to police: we emit a machine-readable quarantine zone that delivery fleets
(Flipkart / Swiggy / Zepto / Amazon / Rapido) poll to keep their drivers out of
the choke point. Removing those vehicles before they arrive cuts congestion
volume automatically.

Pure function over an already-*enriched* incident dict (output of
predictor.enrich_incident). Stdlib + haversine only — no pandas / numpy, so the
payload is JSON-serializable as native types.
"""
import math
from datetime import datetime, timedelta, timezone

from road_network import haversine_m  # noqa: F401  (kept for parity / future use)

SEVERE_THRESHOLD = 75          # matches LEGEND "Severe" min in config.py
_EXPIRY_BUFFER_MIN = 20        # queue keeps dissipating after the lane clears
_FLEETS = ["Flipkart", "Swiggy", "Zepto", "Amazon", "Rapido"]
_M_PER_DEG = 111320.0          # metres per degree latitude (equirectangular)
_IST = timezone(timedelta(hours=5, minutes=30))  # Bengaluru local time


def _delivery_density(hour: int) -> float:
    """Commercial-delivery traffic intensity by local hour — peaks at lunch and
    dinner, when delivery fleets are the biggest share of the road."""
    lunch = max(0, 6 - abs(hour - 13))    # 0..6
    dinner = max(0, 7 - abs(hour - 20))   # 0..7
    return lunch + dinner                 # 0..7


def _volume_removed_pct(risk: int, closure: float, high: bool, issued_dt) -> int:
    """Estimated share of vehicle volume kept out of the choke point by quarantining
    commercial fleets. Varies per incident with severity, closure (how completely
    drivers avoid), and time-of-day delivery density. Lands in ~14-34%."""
    hour = issued_dt.astimezone(_IST).hour
    pct = 12 + risk * 0.10 + closure * 12 + _delivery_density(hour) * 1.3 + (3 if high else 0)
    return int(round(max(12, min(34, pct))))


def is_eligible(inc: dict) -> bool:
    """A quarantine is warranted for High priority, likely closure, or severe risk."""
    return (
        inc.get("predicted_priority") == "High"
        or float(inc.get("closure_probability", 0)) > 0.5
        or int(inc.get("risk_score", 0)) >= SEVERE_THRESHOLD
    )


def _octagon(lat: float, lng: float, radius_m: float):
    """8-point ring (closed) of radius_m around (lat,lng) via metric->deg offsets."""
    ring = []
    coslat = math.cos(math.radians(lat)) or 1e-9
    for k in range(8):
        theta = math.radians(k * 45)
        dlat = (radius_m * math.cos(theta)) / _M_PER_DEG
        dlng = (radius_m * math.sin(theta)) / (_M_PER_DEG * coslat)
        ring.append([round(lat + dlat, 6), round(lng + dlng, 6)])
    ring.append(ring[0])       # close the polygon ring
    return ring


def _parse_iso(s: str):
    try:
        dt = datetime.fromisoformat(s)
    except (TypeError, ValueError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def build_quarantine(inc: dict) -> dict | None:
    """Build the geo-fence quarantine payload for an enriched incident, or None."""
    if not is_eligible(inc):
        return None

    lat = float(inc["lat"])
    lng = float(inc["lng"])
    risk = int(inc.get("risk_score", 0))
    closure = float(inc.get("closure_probability", 0))
    high = inc.get("predicted_priority") == "High"
    corridor = inc.get("corridor", "Non-corridor")
    cause = inc.get("cause", "incident")

    radius_m = int(max(400, inc.get("radius_m", 0) or 0))

    issued = _parse_iso(inc.get("arrived_at")) or datetime.now(timezone.utc)
    clears = _parse_iso(inc.get("clears_at"))
    expires = (clears or issued) + timedelta(minutes=_EXPIRY_BUFFER_MIN)
    # The feed replays real (2024) incidents, so a wall-clock comparison would
    # mark every zone "expired". A just-detected severe incident is active from
    # issue until it clears; lifecycle is derivable from issued_at/expires_at.
    status = "active"

    severity = "severe" if risk >= SEVERE_THRESHOLD else "high" if risk >= 55 else "elevated"
    vol_pct = _volume_removed_pct(risk, closure, high, issued)

    # trimmed projection of the diversion routes — NO polylines / signal plans
    # (those are ops-side detail; fleets only need ranked alternatives)
    diversion = (inc.get("recommendation") or {}).get("diversion")
    alt_routes = []
    if diversion and diversion.get("routes"):
        for r in diversion["routes"]:
            alt_routes.append({
                "rank": r.get("rank"),
                "distance_m": r.get("distance_m"),
                "eta_min": r.get("eta_min"),
                "summary": r.get("summary"),
            })

    until = expires.astimezone().strftime("%H:%M")
    cause_h = str(cause).replace("_", " ")

    return {
        "quarantine_id": f"QZ-{inc.get('id', 'NA')}",
        "version": "1.0",
        "issued_at": issued.isoformat(),
        "expires_at": expires.isoformat(),
        "severity": severity,
        "status": status,
        "reason": {
            "cause": cause,
            "corridor": corridor,
            "closure_probability": round(closure, 2),
        },
        "geofence": {
            "type": "circle",
            "center": {"lat": round(lat, 6), "lng": round(lng, 6)},
            "radius_m": radius_m,
            "polygon": _octagon(lat, lng, radius_m),
        },
        "action": "avoid",
        "advisory": (
            f"{severity.capitalize()} {cause_h} on {corridor} — reroute commercial "
            f"fleet away from this zone until ~{until}."
        ),
        "estimated_volume_removed_pct": vol_pct,
        "affected_fleets": _FLEETS,
        "alternate_routes": alt_routes,
    }
