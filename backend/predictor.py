"""Loads trained models and enriches a raw incident/event into the JSON contract.

Falls back to sensible heuristics if a model artifact is missing, so the API
always returns a complete response even before train.py has been run.
"""
import json
import joblib
import pandas as pd

from config import MODELS_DIR, ZONE_STATS, color_for, radius_for
from diversion import compute_diversion
from quarantine import build_quarantine
from road_network import segments_near
from fleet_quarantine import generate_quarantine
from green_wave import compute_green_wave


def congestion_segments(lat, lng, risk, radius_m=350):
    """Color real road geometry near a point by congestion severity (Google-traffic style).

    Closest roads = deep red, fading to orange/amber outward. Returns list of
    {polyline, color, weight}. Empty list if the road graph isn't built (frontend
    then falls back to the risk circle)."""
    segs = segments_near(lat, lng, radius_m=radius_m)
    out = []
    for s in segs:
        frac = min(1.0, s["dist_m"] / radius_m)        # 0 = at incident, 1 = edge
        sev = risk * (1 - 0.55 * frac)                  # nearer roads look worse
        if sev >= 70:
            color = "#e0301e"        # deep red
        elif sev >= 50:
            color = "#fc6a3f"        # red-orange
        elif sev >= 32:
            color = "#fda53f"        # orange
        else:
            color = "#f4c542"        # amber
        out.append({"polyline": s["polyline"], "color": color,
                    "weight": 6 if frac < 0.4 else 4})
    return out

FEATURES = ["event_cause", "corridor", "hour", "dow", "is_weekend", "month"]

_cache = {}


def _load(name):
    if name in _cache:
        return _cache[name]
    try:
        _cache[name] = joblib.load(MODELS_DIR / name)
    except Exception:  # noqa: BLE001
        _cache[name] = None
    return _cache[name]


def _zone_stats():
    if "zones" not in _cache:
        try:
            _cache["zones"] = json.loads(ZONE_STATS.read_text())
        except Exception:  # noqa: BLE001
            _cache["zones"] = None
    return _cache["zones"]


def _feat_row(cause, corridor, dt: pd.Timestamp):
    return pd.DataFrame([{
        "event_cause": (cause or "others").lower(),
        "corridor": corridor or "Non-corridor",
        "hour": dt.hour, "dow": dt.dayofweek,
        "is_weekend": int(dt.dayofweek >= 5), "month": dt.month,
    }])[FEATURES]


def predict_priority(cause, corridor, dt):
    m = _load("model_b_priority.pkl")
    if m is None:
        return "High" if (cause or "") in {"accident", "water_logging", "vip_movement"} else "Low"
    return "High" if int(m.predict(_feat_row(cause, corridor, dt))[0]) == 1 else "Low"


def predict_closure(cause, corridor, dt):
    m = _load("model_b_closure.pkl")
    if m is None:
        return 0.6 if (cause or "") in {"accident", "tree_fall", "water_logging"} else 0.2
    try:
        return round(float(m.predict_proba(_feat_row(cause, corridor, dt))[0, 1]), 2)
    except Exception:  # noqa: BLE001
        return 0.3


def predict_clearance(cause, corridor, dt):
    m = _load("model_d_clearance.pkl")
    if m is None:
        return 90
    return int(round(float(m.predict(_feat_row(cause, corridor, dt))[0])))


def baseline_risk(corridor, dt):
    """Model A risk score for a corridor at a given time, from zone_stats."""
    zs = _zone_stats()
    if zs and corridor in zs.get("risk_by_hour", {}):
        key = "weekend" if dt.dayofweek >= 5 else "weekday"
        return int(zs["risk_by_hour"][corridor][key][dt.hour])
    # heuristic daily curve
    h = dt.hour
    base = max(0, 22 - abs(h - 9) * 3) + max(0, 26 - abs(h - 19) * 3) + 20
    return int(max(5, min(95, base)))


def enrich_incident(row: dict) -> dict:
    """Take a raw incident dict and return the fully-enriched contract object."""
    dt = pd.to_datetime(row["start"])
    cause = row.get("event_cause", "others")
    corridor = row.get("corridor", "Non-corridor")
    lat, lng = float(row["latitude"]), float(row["longitude"])

    priority = predict_priority(cause, corridor, dt)
    closure = predict_closure(cause, corridor, dt)
    clearance = predict_clearance(cause, corridor, dt)
    risk = baseline_risk(corridor, dt)
    # severity bump from this specific incident
    risk = int(min(98, risk + (25 if priority == "High" else 5) + closure * 20))

    clears_at = (dt + pd.Timedelta(minutes=clearance)).isoformat()

    # nearby affected junctions (simple radial spread)
    spread = []
    for i, (dla, dln) in enumerate([(0.004, 0.003), (-0.006, 0.008), (0.009, -0.004)]):
        jr = max(5, int(risk - (i + 1) * 14))
        spread.append({
            "name": f"{corridor} junction {i+1}",
            "lat": round(lat + dla, 5), "lng": round(lng + dln, 5),
            "risk": jr, "color": color_for(jr),
        })

    diversion = None
    officers = 4 if priority == "High" else 2
    fleet_q = None
    green_w = None
    if priority == "High" or closure > 0.5:
        officers = 6 if closure > 0.6 else 4
        diversion = compute_diversion(
            lat, lng, risk, closure,
            blocked_label=f"{corridor} @ {row.get('address','incident')[:40]}",
        )
        # Fleet Quarantine — broadcast geo-fence to commercial fleets
        fleet_q = generate_quarantine(
            lat, lng, risk, closure, cause=cause, corridor=corridor,
        )
        # Green Wave — adaptive signal plan for the primary diversion route
        if diversion and diversion.get("routes"):
            green_w = compute_green_wave(
                diversion["routes"][0], risk, closure, corridor=corridor,
            )

    # real congested road geometry around the incident (Google-traffic style)
    congestion = congestion_segments(lat, lng, risk)

    result = {
        "id": row.get("id", "NA"),
        "cause": cause,
        "lat": lat, "lng": lng, "corridor": corridor,
        "address": row.get("address", ""),
        "arrived_at": dt.isoformat(),
        "predicted_priority": priority,
        "closure_probability": closure,
        "predicted_clearance_min": clearance,
        "clears_at": clears_at,
        "risk_score": risk,
        "color": color_for(risk),
        "radius_m": radius_for(risk),
        "congestion_segments": congestion,
        "affected_junctions": spread,
        "recommendation": {
            "officers": officers,
            "barricades": [{"lat": round(lat, 5), "lng": round(lng, 5)}],
            "diversion": diversion,
        },
        "fleet_quarantine": fleet_q,
        "green_wave": green_w,
    }

    # Commercial fleet quarantine broadcast — only for severe/closure incidents.
    qz = build_quarantine(result)
    if qz is not None:
        result["quarantine"] = qz
    return result
