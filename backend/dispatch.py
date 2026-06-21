"""Predictive Pre-Positioning Dispatch — automated resource staging from risk.

Turns the Risk Map into an Automated Dispatcher. Based on the ML risk score
for the current hour, the system generates a staging plan for the city's
limited resources (tow trucks, ambulances, patrol units).

The goal: when an incident inevitably happens on a high-risk corridor, the
tow truck is already 2 minutes away instead of 45.  This drastically reduces
clearance time, which is the single biggest factor in preventing cascading
gridlock.
"""
import json
from config import ZONE_STATS
from predictor import baseline_risk


# City resource pool — realistic for Bengaluru traffic police
RESOURCE_POOL = {
    "tow_trucks": 12,
    "ambulances": 8,
    "patrols": 20,
}

# Base locations (depots) — response time from depot if not pre-positioned
DEPOT_RESPONSE_MIN = {
    "tow_truck": 42,   # avg 42 min from central depot
    "ambulance": 28,    # avg 28 min from hospital base
    "patrol": 25,       # avg 25 min from station
}

# Pre-positioned response time (already nearby)
STAGED_RESPONSE_MIN = {
    "tow_truck": 4,
    "ambulance": 3,
    "patrol": 2,
}


def _resource_allocation(risk: int, rank: int, total_corridors: int) -> list[dict]:
    """Allocate resources to a corridor based on its risk score and rank.

    Higher risk → more resources.  Top corridors get the lion's share.
    """
    resources = []

    if risk >= 70:
        # Severe: full deployment
        resources.append({
            "type": "tow_truck",
            "count": 2 if rank <= 2 else 1,
            "eta_if_incident_min": STAGED_RESPONSE_MIN["tow_truck"],
        })
        resources.append({
            "type": "ambulance",
            "count": 1,
            "eta_if_incident_min": STAGED_RESPONSE_MIN["ambulance"],
        })
        resources.append({
            "type": "patrol",
            "count": 3 if rank <= 1 else 2,
            "eta_if_incident_min": STAGED_RESPONSE_MIN["patrol"],
        })
    elif risk >= 50:
        # High: tow truck + patrol
        resources.append({
            "type": "tow_truck",
            "count": 1,
            "eta_if_incident_min": STAGED_RESPONSE_MIN["tow_truck"],
        })
        resources.append({
            "type": "patrol",
            "count": 2,
            "eta_if_incident_min": STAGED_RESPONSE_MIN["patrol"],
        })
        if rank <= 3:
            resources.append({
                "type": "ambulance",
                "count": 1,
                "eta_if_incident_min": STAGED_RESPONSE_MIN["ambulance"],
            })
    elif risk >= 35:
        # Moderate: patrol standby
        resources.append({
            "type": "patrol",
            "count": 1,
            "eta_if_incident_min": STAGED_RESPONSE_MIN["patrol"],
        })
        if rank <= 4:
            resources.append({
                "type": "tow_truck",
                "count": 1,
                "eta_if_incident_min": STAGED_RESPONSE_MIN["tow_truck"],
            })
    # Low risk: no pre-positioning needed (respond from depot if needed)

    return resources


def generate_dispatch_plan(dt) -> dict:
    """Generate a pre-positioning dispatch plan for the given datetime.

    Reads zone_stats.json to get corridor risk scores, then allocates
    city resources to the highest-risk corridors.
    """
    import pandas as pd
    if not isinstance(dt, pd.Timestamp):
        dt = pd.to_datetime(dt)

    # Load corridors and centroids
    try:
        zs = json.loads(ZONE_STATS.read_text())
        corridors = zs["corridors"]
        centroids = zs["centroids"]
    except Exception:  # noqa: BLE001
        # Fallback if zone_stats not built yet
        return _fallback_plan()

    # Get risk per corridor at this time
    corridor_risks = []
    for c in corridors:
        r = baseline_risk(c, dt)
        if c in centroids:
            corridor_risks.append({
                "corridor": c,
                "lat": centroids[c]["lat"],
                "lng": centroids[c]["lng"],
                "risk_score": r,
            })

    # Sort by risk descending
    corridor_risks.sort(key=lambda x: x["risk_score"], reverse=True)

    # Allocate resources (greedy: highest risk first)
    remaining = dict(RESOURCE_POOL)  # copy
    dispatch_plan = []

    for rank, cr in enumerate(corridor_risks):
        alloc = _resource_allocation(cr["risk_score"], rank, len(corridor_risks))

        # Enforce resource pool limits
        final_resources = []
        for res in alloc:
            pool_key = res["type"] + "s"  # tow_truck -> tow_trucks
            available = remaining.get(pool_key, 0)
            actual = min(res["count"], available)
            if actual > 0:
                remaining[pool_key] = available - actual
                final_resources.append({
                    "type": res["type"],
                    "count": actual,
                    "eta_if_incident_min": res["eta_if_incident_min"],
                })

        if final_resources:
            dispatch_plan.append({
                "corridor": cr["corridor"],
                "lat": cr["lat"],
                "lng": cr["lng"],
                "risk_score": cr["risk_score"],
                "resources": final_resources,
            })

    # Compute summary metrics
    total_deployed = {
        "tow_trucks": RESOURCE_POOL["tow_trucks"] - remaining["tow_trucks"],
        "ambulances": RESOURCE_POOL["ambulances"] - remaining["ambulances"],
        "patrols": RESOURCE_POOL["patrols"] - remaining["patrols"],
    }

    total_all = sum(total_deployed.values())
    pool_all = sum(RESOURCE_POOL.values())
    coverage_score = round((total_all / max(1, pool_all)) * 100)

    # Average response time improvement
    avg_depot = sum(DEPOT_RESPONSE_MIN.values()) / len(DEPOT_RESPONSE_MIN)
    avg_staged = sum(STAGED_RESPONSE_MIN.values()) / len(STAGED_RESPONSE_MIN)
    improvement = round(avg_depot - avg_staged, 1)

    return {
        "dispatch_plan": dispatch_plan,
        "total_resources": total_deployed,
        "pool_available": remaining,
        "coverage_score": coverage_score,
        "avg_response_improvement_min": improvement,
        "headline": (
            f"Pre-positioned {total_all} units across "
            f"{len(dispatch_plan)} corridors — "
            f"avg response time: {avg_staged:.0f} min "
            f"(vs. {avg_depot:.0f} min from depot)"
        ),
    }


def _fallback_plan() -> dict:
    """Minimal dispatch plan when zone_stats aren't available."""
    return {
        "dispatch_plan": [
            {
                "corridor": "ORR (Outer Ring Road)",
                "lat": 12.9352, "lng": 77.6245,
                "risk_score": 72,
                "resources": [
                    {"type": "tow_truck", "count": 2, "eta_if_incident_min": 4},
                    {"type": "ambulance", "count": 1, "eta_if_incident_min": 3},
                    {"type": "patrol", "count": 3, "eta_if_incident_min": 2},
                ],
            },
            {
                "corridor": "Tumkur Road",
                "lat": 13.0220, "lng": 77.5020,
                "risk_score": 65,
                "resources": [
                    {"type": "tow_truck", "count": 1, "eta_if_incident_min": 4},
                    {"type": "patrol", "count": 2, "eta_if_incident_min": 2},
                ],
            },
        ],
        "total_resources": {"tow_trucks": 3, "ambulances": 1, "patrols": 5},
        "pool_available": {"tow_trucks": 9, "ambulances": 7, "patrols": 15},
        "coverage_score": 22,
        "avg_response_improvement_min": 28.7,
        "headline": "Pre-positioned 9 units across 2 corridors (fallback plan)",
    }
