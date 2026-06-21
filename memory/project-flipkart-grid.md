---
name: project-fliproute
description: FlipRoute — event-driven traffic congestion intelligence platform
metadata:
  type: project
---

Solo project by priayr. An event-driven traffic congestion intelligence platform focused on **UNPLANNED events** (dataset has 7,706 unplanned vs 467 planned).

**Stack:** ML/backend (Python FastAPI) + frontend (Next.js + Mappls/React-Leaflet).

Dataset: `Astram event data_anonymized ...csv` (8,173 rows, Bengaluru, Nov 2023–Apr 2024). Incident log, not a speed feed → predict **risk score 0–100**, not minutes of delay.

Design = 3 endpoints / 3 layers:
- `/api/live-feed` (HERO, unplanned, "React") — replays CSV as live stream, enriches each incident.
- `/api/risk-map` (proactive, "Prevent") — Model A baseline heatmap + time slider.
- `/api/forecast` (planned, "Prepare") — known-event forecast.

Models: A=baseline risk (zone_stats), B=severity (priority acc≈0.99, closure AUC≈0.72), D=clearance time (MAE≈75min), C=rule-based response. Diversion engine = OSMnx + NetworkX (Dijkstra/A*/Yen's K) with synthetic fallback when graph not downloaded.

Deliverables built: `PROJECT_PLAN.md`, 3 sample JSONs (`sample_response.json`, `sample_risk_map.json`, `sample_forecast.json`), and working `backend/` (FastAPI, all 3 endpoints verified against real data).

Frontend integrates via Next.js gateway proxy routes + `USE_MOCK` toggle so it can build against sample JSONs before backend is live.
