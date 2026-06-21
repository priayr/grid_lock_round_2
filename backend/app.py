"""FastAPI gateway — the 3 endpoints in the JSON contract.

Run:  uvicorn app:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
import json

import pandas as pd
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import LEGEND, ZONE_STATS, color_for, radius_for
from feed_sim import first_time, incidents_between
from predictor import enrich_incident, baseline_risk, congestion_segments
from diversion import compute_diversion
from quarantine import build_quarantine
import api_keys
from dispatch import generate_dispatch_plan
from fleet_quarantine import generate_quarantine
from green_wave import compute_green_wave

app = FastAPI(title="Gridlock — Event-Driven Congestion API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"], allow_headers=["*"],
)


@app.get("/")
def root():
    return {"ok": True,
            "endpoints": ["/api/live-feed", "/api/risk-map", "/api/forecast",
                          "/api/fleet/quarantines", "/api/fleet/keys"],
            "sim_start": first_time().isoformat()}


# ---------------------------------------------------------------- ENDPOINT 1
@app.get("/api/live-feed")
def live_feed(since: str | None = None, window: int = 120):
    """UNPLANNED hero: incidents that arrived since `since`, fully enriched."""
    since_ts = pd.to_datetime(since) if since else first_time()
    raw, end = incidents_between(since_ts, window_minutes=window)
    incidents = [enrich_incident(r) for r in raw]

    highs = sum(1 for i in incidents if i["predicted_priority"] == "High")
    avg_clear = int(sum(i["predicted_clearance_min"] for i in incidents) / len(incidents)) if incidents else 0

    # Fleet quarantine aggregate stats
    fleets_notified = sum(
        1 for i in incidents
        if i.get("fleet_quarantine") is not None
    ) * len(["Flipkart", "Swiggy", "Zepto", "Amazon", "Rapido"])
    vol_reductions = [
        i["fleet_quarantine"]["estimated_impact"]["volume_reduction_pct"]
        for i in incidents
        if i.get("fleet_quarantine")
    ]
    avg_vol_reduction = round(sum(vol_reductions) / len(vol_reductions), 1) if vol_reductions else 0

    return {
        "endpoint": "/api/live-feed",
        "sim_time": since_ts.isoformat(),
        "next_since": end.isoformat(),     # frontend uses this as next ?since=
        "window_minutes": window,
        "summary": {
            "active_incidents": len(incidents),
            "high_priority": highs,
            "avg_clearance_min": avg_clear,
            "fleets_notified": fleets_notified,
            "volume_reduction_pct": avg_vol_reduction,
            "headline": f"{len(incidents)} new unplanned incident(s); {highs} high priority.",
        },
        "new_incidents": incidents,
        "legend": LEGEND,
    }


# ----------------------------------------------------- FLEET API — KEY ISSUER
@app.get("/api/fleet/keys")
def fleet_keys():
    """List the API keys issued for the Fleet Quarantine API (secrets masked)."""
    return {"keys": api_keys.list_keys()}


@app.post("/api/fleet/keys")
def create_fleet_key(body: dict | None = None):
    """Mint a new working API key. Returns the full secret exactly once."""
    body = body or {}
    issued = api_keys.issue_key(
        name=body.get("name", "Untitled"),
        fleet=body.get("fleet", "Custom"),
    )
    return {"created": True, **issued}


# ------------------------------------------------- ENDPOINT 1b (B2B BROADCAST)
@app.get("/api/fleet/quarantines")
def fleet_quarantines(since: str | None = None, window: int = 120,
                      active_only: bool = True,
                      x_api_key: str | None = Header(default=None)):
    """Commercial Fleet Quarantine API — geo-fence zones delivery fleets poll to
    keep drivers out of severe choke points. Derived from the same live feed.

    Requires a valid ``X-API-Key`` header (issue one at /api/fleet/keys)."""
    if not api_keys.is_valid(x_api_key):
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key. Send a valid 'X-API-Key' header.",
        )

    since_ts = pd.to_datetime(since) if since else first_time()
    raw, end = incidents_between(since_ts, window_minutes=window)

    zones = []
    for r in raw:
        inc = enrich_incident(r)
        qz = inc.get("quarantine") or build_quarantine(inc)
        if qz and (not active_only or qz["status"] == "active"):
            zones.append(qz)

    avg_vol = (round(sum(z["estimated_volume_removed_pct"] for z in zones) / len(zones))
               if zones else 0)
    return {
        "endpoint": "/api/fleet/quarantines",
        "generated_at": since_ts.isoformat(),
        "next_since": end.isoformat(),
        "count": len(zones),
        "estimated_total_volume_removed_pct": avg_vol,
        "zones": zones,
    }


# ---------------------------------------------------------------- ENDPOINT 2
@app.get("/api/risk-map")
def risk_map(datetime: str | None = None):
    """Model A baseline heatmap + 24h timeline for the TIME SLIDER."""
    req = pd.to_datetime(datetime) if datetime else first_time()
    try:
        zs = json.loads(ZONE_STATS.read_text())
        corridors = zs["corridors"]; cents = zs["centroids"]
    except Exception:  # noqa: BLE001
        corridors, cents = [], {}

    def zone_obj(c, dt, with_loc):
        r = baseline_risk(c, dt)
        o = {"zone_id": c, "risk_score": r, "color": color_for(r), "radius_m": radius_for(r)}
        if with_loc:
            o.update({"name": c, "lat": cents[c]["lat"], "lng": cents[c]["lng"]})
        return o

    baseline_zones = [zone_obj(c, req, True) for c in corridors]

    day = req.normalize()
    timeline = []
    for h in range(24):
        dt = day + pd.Timedelta(hours=h)
        zones = [zone_obj(c, dt, False) for c in corridors]
        overall = int(sum(z["risk_score"] for z in zones) / len(zones)) if zones else 0
        timeline.append({"datetime": dt.isoformat(), "overall_risk": overall, "zones": zones})

    overall_now = int(sum(z["risk_score"] for z in baseline_zones) / len(baseline_zones)) if baseline_zones else 0
    top = max(baseline_zones, key=lambda z: z["risk_score"], default=None)

    # Pre-positioning dispatch plan for this hour
    dispatch = generate_dispatch_plan(req)

    return {
        "endpoint": "/api/risk-map",
        "requested_datetime": req.isoformat(),
        "day_of_week": req.day_name(),
        "summary": {
            "overall_risk": overall_now,
            "highest_zone": ({"name": top["name"], "risk_score": top["risk_score"]} if top else None),
            "headline": "Baseline risk from historical incident patterns — pre-position here.",
        },
        "baseline_zones": baseline_zones,
        "risk_timeline": timeline,
        "dispatch": dispatch,
        "legend": LEGEND,
    }


# ---------------------------------------------------------------- ENDPOINT 3
@app.post("/api/forecast")
def forecast(req: dict):
    """PLANNED event (secondary): forecast risk over event day + next days."""
    cause = req.get("event_cause", "public_event")
    lat = float(req.get("lat", 12.9784)); lng = float(req.get("lng", 77.6408))
    start = pd.to_datetime(req.get("start_datetime"))
    days = int(req.get("forecast_days", 3))
    crowd = int(req.get("expected_crowd", 0))

    # synthetic impact zones around the venue
    zone_defs = [
        ("z1", "Venue core", lat, lng, 1.0),
        ("z2", "North approach", lat + 0.006, lng, 0.8),
        ("z3", "East approach", lat, lng + 0.007, 0.65),
        ("z4", "South approach", lat - 0.006, lng - 0.004, 0.55),
    ]

    def event_boost(day_idx, hour, sens):
        if day_idx == 0:
            b = max(0, 55 - abs(hour - (start.hour + 1)) * 9) if abs(hour - start.hour) <= 6 else 0
        elif day_idx == 1:
            b = max(0, 18 - abs(hour - 9) * 2) if 7 <= hour <= 12 else 0
        else:
            b = max(0, 8 - abs(hour - 9) * 1.5) if 8 <= hour <= 11 else 0
        crowd_factor = min(1.6, 1 + crowd / 50000)
        return b * sens * crowd_factor

    def daily(hour):
        return max(0, 18 - abs(hour - 9) * 3) + max(0, 22 - abs(hour - 19) * 3)

    timeline, peak, peak_w = [], 0, None
    for di in range(days):
        day = start.normalize() + pd.Timedelta(days=di)
        for h in range(24):
            dt = day + pd.Timedelta(hours=h)
            zones, tot = [], []
            for zid, _, _, _, sens in zone_defs:
                r = int(max(5, min(98, 20 + daily(h) + event_boost(di, h, sens))))
                tot.append(r)
                zones.append({"zone_id": zid, "risk_score": r, "color": color_for(r), "radius_m": radius_for(r)})
            ov = int(sum(tot) / len(tot))
            if ov > peak:
                peak, peak_w = ov, dt.isoformat()
            timeline.append({"datetime": dt.isoformat(), "overall_risk": ov, "zones": zones})

    peak_entry = next(t for t in timeline if t["datetime"] == peak_w)
    pm = {z["zone_id"]: z for z in peak_entry["zones"]}
    impact = [{"zone_id": zid, "name": nm, "lat": la, "lng": ln,
               "risk_score": pm[zid]["risk_score"], "color": pm[zid]["color"], "radius_m": pm[zid]["radius_m"]}
              for zid, nm, la, ln, _ in zone_defs]

    priority = "High" if peak >= 60 else "Low"
    closure = round(min(0.95, 0.4 + crowd / 60000), 2)

    # congested roads around the venue (Google-traffic style)
    congestion = congestion_segments(lat, lng, peak, radius_m=500)

    # per-zone deployment + a real diversion around the venue core
    recommendations = []
    for zid, nm, la, ln, sens in zone_defs:
        zr = pm[zid]["risk_score"]
        is_core = zid == "z1"
        recommendations.append({
            "zone_id": zid, "name": nm,
            "officers": max(2, int(round(zr / 12)) + (2 if is_core else 0)),
            "barricades": [{"lat": round(la, 5), "lng": round(ln, 5)}],
            "diversion": compute_diversion(
                lat, lng, peak, closure, blocked_label=f"{cause} venue @ {nm}",
            ) if is_core else None,
        })

    # Fleet quarantine for the venue core zone
    fleet_q = generate_quarantine(
        lat, lng, peak, closure,
        cause=cause, corridor=f"Venue: {cause}",
    )

    # Green wave for the primary venue diversion route
    green_w = None
    core_div = next(
        (r["diversion"] for r in recommendations if r.get("diversion")),
        None,
    )
    if core_div and core_div.get("routes"):
        green_w = compute_green_wave(
            core_div["routes"][0], peak, closure,
            corridor=f"{cause} venue corridor",
        )

    return {
        "endpoint": "/api/forecast",
        "request_echo": req,
        "summary": {
            "predicted_priority": priority,
            "road_closure_probability": closure,
            "peak_risk_score": peak, "peak_window": peak_w,
            "headline": f"{cause} forecast: peak risk {peak} at {peak_w}.",
        },
        "impact_zones": impact,
        "congestion_segments": congestion,
        "timeline": timeline,
        "recommendations": recommendations,
        "fleet_quarantine": fleet_q,
        "green_wave": green_w,
        "legend": LEGEND,
    }
