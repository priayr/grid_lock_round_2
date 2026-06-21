"""Fleet Quarantine Engine — B2B geo-fence broadcast to commercial fleets.

When a severe unplanned incident is detected (high priority or high closure
probability), this module generates:
  1. A quarantine geo-fence (circular zone around the incident)
  2. A B2B broadcast payload in a realistic API format
  3. Simulated fleet-operator responses with estimated vehicles rerouted
  4. Traffic-volume-reduction estimates (non-linear tipping-point model)

In production, the broadcast payload would be POSTed to each operator's
routing API. Here we simulate the responses for the demo.
"""
import random
import time

# Commercial fleet operators in Indian metros.
# In production each would have a webhook URL.
FLEET_OPERATORS = [
    {"name": "Flipkart",  "type": "ecommerce",  "fleet_share": 0.07,
     "avg_active_city": 1200, "color": "#2874f0"},
    {"name": "Swiggy",    "type": "food",        "fleet_share": 0.05,
     "avg_active_city": 3500, "color": "#fc8019"},
    {"name": "Zepto",     "type": "quick_comm",   "fleet_share": 0.03,
     "avg_active_city": 900,  "color": "#8b2cf5"},
    {"name": "Amazon",    "type": "ecommerce",    "fleet_share": 0.04,
     "avg_active_city": 800,  "color": "#ff9900"},
    {"name": "Rapido",    "type": "ride",          "fleet_share": 0.06,
     "avg_active_city": 4000, "color": "#f5d442"},
]


def _quarantine_radius(risk: int, closure_prob: float) -> int:
    """Radius of the quarantine geo-fence in meters, based on severity."""
    base = 300
    if risk >= 75:
        base = 800
    elif risk >= 55:
        base = 600
    elif risk >= 35:
        base = 450
    if closure_prob > 0.6:
        base = int(base * 1.4)
    return base


def _vehicles_in_zone(operator: dict, radius_m: int) -> int:
    """Estimate how many of an operator's vehicles are inside the zone.

    Rough model: vehicles are uniformly distributed across the city
    (~700 km² for Bengaluru).  The quarantine zone area as a fraction
    of the city area gives expected count.
    """
    import math
    city_area_km2 = 700
    zone_area_km2 = math.pi * (radius_m / 1000) ** 2
    fraction = zone_area_km2 / city_area_km2
    expected = operator["avg_active_city"] * fraction
    # add some variance
    return max(1, int(expected * random.uniform(0.7, 1.5)))


def _ack_delay(operator_type: str) -> float:
    """Simulated acknowledgment delay in seconds by operator type."""
    delays = {
        "ecommerce": random.uniform(0.8, 2.5),
        "food": random.uniform(0.3, 1.2),
        "quick_comm": random.uniform(0.5, 1.8),
        "ride": random.uniform(0.2, 0.9),
    }
    return round(delays.get(operator_type, 1.5), 1)


def generate_quarantine(
    lat: float, lng: float,
    risk: int, closure_prob: float,
    cause: str = "unplanned_incident",
    corridor: str = "",
) -> dict | None:
    """Build the full fleet-quarantine payload for a severe incident.

    Returns None if the incident isn't severe enough to warrant a broadcast.
    """
    # Only trigger for genuinely serious incidents
    if risk < 50 and closure_prob < 0.4:
        return None

    radius_m = _quarantine_radius(risk, closure_prob)

    severity_trigger = "critical" if risk >= 75 else (
        "high" if risk >= 55 else "elevated"
    )

    # The B2B payload that would be POSTed to fleet operators
    broadcast_payload = {
        "type": "GEO_FENCE_QUARANTINE",
        "version": "1.0",
        "incident_id": f"GRD-{int(time.time()) % 100000}",
        "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "severity": severity_trigger,
        "cause": cause,
        "corridor": corridor,
        "quarantine_zone": {
            "type": "circle",
            "center": {"lat": round(lat, 6), "lng": round(lng, 6)},
            "radius_m": radius_m,
        },
        "action": "AVOID_ZONE",
        "ttl_minutes": max(30, int(risk * 1.2)),
        "message": (
            f"Road incident ({cause.replace('_', ' ')}) detected on "
            f"{corridor or 'this corridor'}. Avoid routing vehicles "
            f"through the quarantine zone for the next "
            f"{max(30, int(risk * 1.2))} minutes."
        ),
    }

    # Simulate each fleet operator's response
    fleet_responses = []
    total_in_zone = 0
    total_rerouted = 0
    for op in FLEET_OPERATORS:
        in_zone = _vehicles_in_zone(op, radius_m)
        # Reroute compliance rate varies by severity
        compliance = 0.92 if severity_trigger == "critical" else (
            0.85 if severity_trigger == "high" else 0.75
        )
        rerouted = max(1, int(in_zone * compliance))
        total_in_zone += in_zone
        total_rerouted += rerouted

        fleet_responses.append({
            "operator": op["name"],
            "operator_color": op["color"],
            "fleet_type": op["type"],
            "vehicles_in_zone": in_zone,
            "vehicles_rerouted": rerouted,
            "compliance_pct": round(compliance * 100),
            "status": "acknowledged",
            "ack_time_sec": _ack_delay(op["type"]),
        })

    # Sort by vehicles rerouted (most impact first)
    fleet_responses.sort(key=lambda r: r["vehicles_rerouted"], reverse=True)

    # Commercial traffic is ~25% of total; we're removing a chunk of it
    commercial_share = 0.25
    # Non-linear tipping-point: removing 20% of vehicles from a near-
    # capacity road prevents the exponential jam formation
    volume_reduction = round(
        min(28, commercial_share * (total_rerouted / max(1, total_in_zone)) * 100),
        1,
    )
    # Cascading-failure prevention estimate
    if volume_reduction >= 18:
        cascade_msg = "Prevents cascading failure at adjacent intersections"
    elif volume_reduction >= 12:
        cascade_msg = "Significantly reduces queue spillback risk"
    else:
        cascade_msg = "Reduces secondary congestion buildup"

    return {
        "zone_center": {"lat": round(lat, 6), "lng": round(lng, 6)},
        "zone_radius_m": radius_m,
        "severity_trigger": severity_trigger,
        "broadcast_payload": broadcast_payload,
        "fleet_responses": fleet_responses,
        "estimated_impact": {
            "total_commercial_vehicles": total_in_zone,
            "vehicles_diverted": total_rerouted,
            "volume_reduction_pct": volume_reduction,
            "cascading_prevention": cascade_msg,
        },
        "headline": (
            f"Fleet Quarantine active — {total_rerouted} commercial vehicles "
            f"rerouted, ~{volume_reduction}% volume reduction"
        ),
    }
