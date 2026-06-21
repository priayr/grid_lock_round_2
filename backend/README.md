---
title: FlipRoute Backend
emoji: 🚦
colorFrom: blue
colorTo: red
sdk: docker
pinned: false
app_port: 7860
---
# FlipRoute Backend — Event-Driven Congestion API

FastAPI backend for the FlipRoute intelligence engine. Serves 3 endpoints
for real-time incident tracking, risk mapping, and event forecasting against
the Astram incident dataset (Bengaluru).

**Author:** priayr  
**License:** MIT

## Files
| File | Role |
|------|------|
| `config.py` | paths, risk→color/radius mapping, legend |
| `data.py` | load + clean the CSV (cached) |
| `train.py` | trains Models B (priority/closure), D (clearance) + Model A zone stats |
| `road_network.py` | OSMnx download → NetworkX graph (cached pickle) |
| `diversion.py` | Dijkstra / A* / Yen's K routing (+ fallback if no graph) |
| `predictor.py` | loads models, enriches an incident into the JSON contract |
| `feed_sim.py` | replays the CSV as a live stream |
| `app.py` | FastAPI: `/api/live-feed`, `/api/risk-map`, `/api/forecast` |

## Setup
```bash
cd backend
python -m pip install -r requirements.txt

# 1. Train models (fast, ~10s) — required
python train.py

# 2. (optional) Build the road graph for REAL diversions (slow, downloads OSM data)
python road_network.py --build
#   Without this, diversions still work via synthetic fallback routes.

# 3. Run the API
uvicorn app:app --reload --port 8000
```

Open http://localhost:8000/docs for interactive testing.

## Endpoints
- `GET  /api/live-feed?since=<iso>&window=120` — unplanned incidents (HERO). Use
  `next_since` from the response as the next `?since=` to walk the stream forward.
- `GET  /api/risk-map?datetime=<iso>` — baseline heatmap + 24h slider timeline.
- `POST /api/forecast` — planned event forecast. Body:
  `{event_cause, lat, lng, start_datetime, expected_crowd, forecast_days}`

## Notes
- Every response uses the same `legend` and zone shape `{zone_id, risk_score, color, radius_m}`.
- Models degrade gracefully: if an artifact is missing, heuristics fill in so the API
  never breaks during a demo.
- Trained metrics on this data: priority acc ≈ 0.99, closure AUC ≈ 0.72, clearance MAE ≈ 75 min.
