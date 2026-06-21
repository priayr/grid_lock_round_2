# FlipRoute Frontend

Next.js 14 (App Router) + TypeScript + Tailwind + React-Leaflet. Connects to the
**real** FastAPI backend — no mock data. Premium dark / glassmorphism aesthetic.

**Author:** priayr  
**License:** MIT

## Run

```bash
# 1. Start the backend first (separate terminal)
cd ../backend
uvicorn app:app --reload --port 8000

# 2. Start the frontend
cd ../frontend
cp .env.local.example .env.local      # ML_API_URL=http://localhost:8000
npm install
npm run dev                           # http://localhost:3000
```

Open `/` for the landing page, `/dashboard` for the operations console.

## Structure

```
app/
  page.tsx                  landing page (hero, engines, pipeline, stack, CTA)
  dashboard/page.tsx        operations console — orchestrates all 3 modes
  api/live-feed/route.ts    gateway proxy  → FastAPI /api/live-feed
  api/risk-map/route.ts     gateway proxy  → FastAPI /api/risk-map
  api/forecast/route.ts     gateway proxy  → FastAPI /api/forecast
lib/
  types.ts                  TS types mirroring the JSON contract
  api.ts                    client fetch helpers (always real backend)
components/
  Nav, MapView (leaflet), ModeTabs, SimClock, TimelineSlider,
  IncidentCard, IncidentDetail, ForecastForm, RiskPanel, Legend, StatCard
```

## The 3 Dashboard Modes

| Mode | Endpoint | What it shows |
|------|----------|---------------|
| **Live Feed** (React) | `/api/live-feed` | Incidents stream in via the sim-clock; each card shows priority, closure %, clearance countdown. Click → affected junctions + diversion routes on the map. |
| **Risk Map** (Prevent) | `/api/risk-map` | Baseline hotspot heatmap + 24h time slider; "pre-position priority" corridor ranking. |
| **Forecast** (Prepare) | `/api/forecast` | Form → predicted priority/closure/peak + impact zones + 72h slider + deployment plan. |

## How the Live Stream Works
The dashboard polls `/api/live-feed?since=<iso>`; each response returns `next_since`,
which becomes the next request's `since`. The SimClock advances this automatically
(2.5s per tick ÷ speed). New incidents prepend to the feed and pop on the map.

## How the Time Slider Works
The full timeline is in one response. The slider index picks `risk_timeline[i]` (or
`forecast.timeline[i]`); zone coords come from `baseline_zones`/`impact_zones`, the
changing color/radius from the selected step — merged by `zone_id`. No re-fetch.

## Map
Uses React-Leaflet with CARTO dark tiles (keyless, works out of the box). To swap in
**Mappls/MapmyIndia** for the competition, replace the `<TileLayer>` in
`components/MapView.tsx` with the Mappls raster tile URL + your API key, or load the
Mappls Web SDK. All zone/route data is already lat/lng so it drops straight in.

## Notes
- If you see a red "backend unreachable" banner, the FastAPI server isn't running on `ML_API_URL`.
- Colors/risk thresholds come entirely from the backend `legend` — the UI never recomputes them.
