# FlipRoute — Event-Driven Congestion Intelligence
## Theme: Event-Driven Congestion (Planned & UNPLANNED)

**Author:** priayr
**Tech stack:** Python FastAPI (ML/Backend) + Next.js (Frontend) + MapmyIndia / Mappls

> ⚠️ FOCUS: The problem statement's hard part is **UNPLANNED** events. Our data proves it:
> **7,706 unplanned vs 467 planned.** So unplanned is the HERO of the demo. Planned is a
> secondary "forecast" mode. Everything below centers on unplanned + real-time.

---

## 1. The One-Line Pitch

> The moment an unplanned incident occurs (breakdown, accident, water-logging, tree-fall),
> our system instantly predicts **how severe** it is, **how long** until it clears, **which
> nearby junctions** will choke, and computes **real road-network diversions** around it —
> while a historical risk map tells police **where to pre-position** before anything happens.

Two engines working together:
- **Historical engine** → "WHERE & WHEN is risk high" (proactive heatmap + time slider).
- **Real-time engine** → "Something happened NOW — react" (live feed + predictions + diversions).

---

## 2. The Dataset (what we actually have)

**File:** `Astram event data_anonymized ...csv` — 8,173 rows, ~5 months (Nov 2023 → Apr 2024), Bengaluru.
It is an **incident/event LOG** (1 row = 1 disruptive event), NOT a live speed feed.

Key facts that shaped the design:
- **~50 incidents/day** (median 46, max 248) → enough to REPLAY as a realistic live stream.
- **Duration proxy on 6,941 rows** (median ~121 min) → we CAN predict clearance time.
- **Top 10 corridors hold 82% of all events** → hotspots are concentrated → risk is very learnable.
- `priority` (High/Low) and `requires_road_closure` (T/F) are 100% present → clean labels.

| Field | Use | Coverage |
|-------|-----|----------|
| latitude, longitude | Plot + snap to road graph | 100% |
| start_datetime | Time features + replay clock | 100% |
| modified_datetime | Clearance-time proxy | ~85% |
| event_type | planned (467) / unplanned (7706) | 100% |
| event_cause | breakdown, accident, water_logging, tree_fall, pot_holes... | 100% |
| priority | High / Low — **Model B label** | 100% |
| requires_road_closure | True / False — **Model B label** | 100% |
| corridor | Named roads (Mysore Rd, ORR, Tumkur Rd...) | 99.8% |
| zone, junction | Location detail | 42% / 31% (sparse) |
| veh_type | bus, truck, car... | 60% |

### Honesty rule (state this to judges, confidently)
- No road-speed data → we do NOT claim "exact minutes of delay."
- We output a **RISK SCORE (0–100)** = expected count + severity of disruptive events.
- For "real-time" we **replay the 5 months of real incidents as a live feed** (in production this
  socket connects to a 112 / FixMyStreet / camera feed).

---

## 3. What We Will Deliver (point-wise)

### ML / Backend
- [ ] **D1. Clean dataset** — parse dates, valid coords, normalize causes/corridors, sort by time.
- [ ] **D2. Model A — Baseline Risk:** risk score per corridor × hour × day-of-week → proactive heatmap + time slider.
- [ ] **D3. Model B — Severity Classifier:** for any incident → predict `priority` (High/Low) + `road_closure_probability`.
- [ ] **D4. Model D — Clearance-Time Regressor:** predict minutes-to-resolve from cause/priority/corridor/time.
- [ ] **D5. Spread estimator:** which nearby junctions are affected (spatial, from coords + corridor).
- [ ] **D6. Model C — Response rules:** officers + barricade points per incident.
- [ ] **D7. Road Network Service (OSMnx + NetworkX):** cache Bengaluru drive graph (nodes=junctions, edges=roads); snap incidents to edges; inject ML risk into edge weights.
- [ ] **D8. Diversion Engine:** Dijkstra (baseline), A* (fast real-time recompute), Yen's K-Shortest (top-K alternates) → real route polylines.
- [ ] **D9. Live-feed simulator:** replay CSV by `start_datetime` with a sim-clock (speed control).
- [ ] **D10. FastAPI backend:** `/api/live-feed`, `/api/risk-map`, `/api/forecast` (planned mode).
- [ ] **D11. Sample JSONs** delivered DAY 1 so frontend isn't blocked — one per endpoint:
      `sample_response.json` (live-feed), `sample_risk_map.json` (risk-map), `sample_forecast.json` (forecast).

### Frontend (Next.js + Mappls)
- [ ] **D12. Live dashboard (HERO):** Mappls map; incidents pop in real-time as sim-clock runs.
- [ ] **D13. Sim-clock control:** play / pause / speed (1s = 1hr), shows current sim-time.
- [ ] **D14. LIVE INCIDENTS feed/ticker:** each card shows cause, predicted priority, closure %, clearance countdown.
- [ ] **D15. Incident detail:** click → affected junctions + diversion routes drawn as polylines.
- [ ] **D16. Diversion route selector:** Route 1/2/3 toggle, each with ETA + distance.
- [ ] **D17. Baseline risk heatmap + TIME SLIDER:** scrub future hours → historical risk pattern.
- [ ] **D18. Summary header cards:** active incidents, high-priority count, avg clearance.

### Shared
- [ ] **D19. The JSON contract (Section 7)** — locked Day 1. Single interface between us.

---

## 4. Architecture

```
RAW CSV (sorted by time)
   │
   ▼  Live-feed simulator (sim-clock: 1 sec = 1 hour)
incident "arrives"  {lat,lng,cause,time,corridor}
   │
   ├─ Model B → predicted_priority, road_closure_probability
   ├─ Model D → predicted_clearance_min
   ├─ Model A → risk_score (corridor × time)
   ├─ Spread  → affected_junctions[]
   │
   ▼  if closure/high-risk:
ROAD NETWORK SERVICE (OSMnx graph, cached .pkl)
   • snap incident to nearest edge (ox.nearest_edges)
   • closure → remove edge ; else → travel_time *= (1 + risk/100*3)
   │
   ▼
DIVERSION ENGINE (NetworkX)
   • Dijkstra  = baseline shortest route
   • A*        = fast recompute for real-time
   • Yen's K   = top-3 alternate routes
   │
   ▼  assemble JSON  →  FastAPI  →  Next.js + Mappls
```

---

## 5. The TIME SLIDER (historical / proactive layer)

Goal: drag slider into the future → map shows predicted RISK for that hour, from history.

- Data shows events cluster by **hour-of-day × day-of-week × corridor** (top 10 corridors = 82%).
- Model A learns this → for any future timestamp outputs risk per zone.
- Backend returns `risk_timeline[]`: one entry per hour, each carrying per-zone risk values.
- Frontend: slider index → pick that entry → recolor map zones. No re-fetch while sliding.

This is the PROACTIVE counterpart to the real-time feed: "history says Tumkur Rd is risky at 9 AM → pre-position there."

---

## 6. The REAL-TIME engine (the unplanned hero)

- The CSV is sorted by `start_datetime`. A sim-clock advances (speed-up: 1 sec = 1 hour).
- As sim-time passes an event's start, it "arrives" → frontend polls `GET /api/live-feed?since=<t>`.
- Each new incident comes back ALREADY enriched: severity, closure prob, clearance ETA,
  affected junctions, and diversion routes.
- Frontend pops it on the map + adds a card to the LIVE feed with a clearance countdown.

Pitch line: *"In production this connects to the city's incident feed; here we replay 5 months
of real Bengaluru incidents as a live stream — the models react to each one in real time."*

---

## 7. THE JSON CONTRACT (lock Day 1)

Each endpoint has its own ready-made sample file. The frontend builds against these mocks
first — no waiting for the real models.

| Endpoint | Method + URL | Sample file | Drives |
|----------|--------------|-------------|--------|
| 1 (HERO) | `GET /api/live-feed?since=<iso>` | `sample_response.json` | Live incidents + diversions |
| 2 | `GET /api/risk-map?datetime=<iso>` | `sample_risk_map.json` | Baseline heatmap + TIME SLIDER |
| 3 | `POST /api/forecast` | `sample_forecast.json` | Planned-event forecast (secondary) |

### Endpoint 1 — `GET /api/live-feed?since=<iso_time>` (THE HERO)
Returns incidents that arrived since `since`, each enriched by all models + diversion engine.
→ `sample_response.json`. Key arrays: `new_incidents[]` (map markers + live cards),
`risk_map.risk_timeline[]` (slider), `summary` (header).
Each incident carries: `predicted_priority`, `closure_probability`, `predicted_clearance_min`,
`clears_at`, `risk_score`, `affected_junctions[]`, `recommendation.diversion.routes[]`.

### Endpoint 2 — `GET /api/risk-map?datetime=<iso_time>`
Model A baseline heatmap for a time → powers the proactive heatmap + TIME SLIDER.
→ `sample_risk_map.json`. Key arrays: `baseline_zones[]` (fixed lat/lng per corridor, snapshot
at requested time) and `risk_timeline[]` (24 hourly steps the slider scrubs through).

### Endpoint 3 — `POST /api/forecast` (planned mode, secondary)
A KNOWN future planned event → forecast over event day + next days.
→ `sample_forecast.json`. Key arrays: `summary` (priority, closure %, peak), `impact_zones[]`
(snapshot at peak), `timeline[]` (72 hourly steps), `recommendations[]` (incl. diversion routes).

### Shared shape (write the components ONCE, reuse across all 3):
- Every zone object = `{ zone_id, risk_score, color, radius_m }` (+ `name,lat,lng` in the *_zones snapshot).
- Every response carries the same `legend[]`.
- Every `*timeline[]` step = `{ datetime, overall_risk, zones[] }` → one slider component fits all.

### Three rules that prevent integration pain:
1. **Every location has lat/lng** → map plots directly, no lookups on frontend.
2. **Colors computed on ML side** (`#d7191c`...) → UI never reinvents thresholds.
3. **Diversion routes are arrays of [lat,lng]** → frontend draws polyline directly.

---

## 8. Road Network + Diversion details

```python
# ONE-TIME graph build (cache it!)
import osmnx as ox, networkx as nx, pickle
G = ox.graph_from_place("Bengaluru, Karnataka, India", network_type="drive")
G = ox.add_edge_speeds(G); G = ox.add_edge_travel_times(G)
pickle.dump(G, open("models/bengaluru_graph.pkl","wb"))
# (faster alt for prototype: ox.graph_from_point((lat,lng), dist=3000))

# Per incident:
u,v,k = ox.nearest_edges(G, lng, lat)              # snap to road
if closure_probability > 0.5:
    Gr = G.copy(); Gr.remove_edge(u,v,k)           # hard block
else:
    Gr[u][v][k]['travel_time'] *= (1 + risk/100*3) # soft avoid

# Routes:
nx.shortest_path(Gr, src, dst, weight="travel_time")            # Dijkstra (baseline)
nx.astar_path(Gr, src, dst, heuristic=hav, weight="travel_time")# A* (fast realtime)
from itertools import islice
list(islice(nx.shortest_simple_paths(Gr,src,dst,weight="travel_time"),3)) # Yen's K
```

| Algorithm | Why |
|-----------|-----|
| Dijkstra | Guaranteed shortest-by-time = baseline route |
| A* | Same result, much faster via geo-heuristic → real-time recompute |
| Yen's K | Top-K DISTINCT alternates → real diversion options, ranked |

---

## 9. Integration & Gateway (Next.js ↔ Python)

```
ml/  (Python FastAPI, port 8000)
  train.py            # Models A,B,C,D → models/*.pkl + zone_stats.json
  road_network.py     # OSMnx graph build/cache, snap, risk→weight
  diversion.py        # Dijkstra / A* / Yen's K → routes[]
  feed_sim.py         # replay CSV as live stream
  app.py              # FastAPI: /api/live-feed /api/risk-map /api/forecast
  models/
  sample_response.json  sample_risk_map.json  sample_forecast.json

frontend/  (Next.js, port 3000)
  app/api/live-feed/route.ts   # GATEWAY proxy → FastAPI /api/live-feed
  app/api/risk-map/route.ts    # GATEWAY proxy → FastAPI /api/risk-map
  app/api/forecast/route.ts    # GATEWAY proxy → FastAPI /api/forecast
  app/page.tsx                 # live dashboard (hero)
  components/LiveMap.tsx LiveFeed.tsx SimClock.tsx
  components/DiversionRoutes.tsx RiskHeatmap.tsx TimelineSlider.tsx
  lib/api.ts                   # client helpers + USE_MOCK toggle
```

### The gateway pattern (why a proxy, not direct calls)
The browser calls **same-origin** `/api/*` (Next.js). Each Next.js route forwards to the Python
FastAPI on `localhost:8000`. Benefits:
- No CORS problems in the browser (server-to-server call).
- The Python URL stays server-side — swap localhost → deployed URL via one env var.
- One place to add the `USE_MOCK` switch so the UI can read the sample JSONs offline.

```
Browser ──/api/live-feed──▶ Next.js route.ts ──http://localhost:8000/api/live-feed──▶ FastAPI ──▶ models
```

### Gateway routes — one per endpoint

```ts
// app/api/live-feed/route.ts
const API = process.env.ML_API_URL ?? "http://localhost:8000";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const r = await fetch(`${API}/api/live-feed?since=${searchParams.get("since")}`);
  return Response.json(await r.json());
}
```
```ts
// app/api/risk-map/route.ts
const API = process.env.ML_API_URL ?? "http://localhost:8000";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const r = await fetch(`${API}/api/risk-map?datetime=${searchParams.get("datetime")}`);
  return Response.json(await r.json());
}
```
```ts
// app/api/forecast/route.ts
const API = process.env.ML_API_URL ?? "http://localhost:8000";
export async function POST(req: Request) {
  const body = await req.json();
  const r = await fetch(`${API}/api/forecast`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return Response.json(await r.json());
}
```

### Mock toggle (so frontend works Day 1, before the model exists)
```ts
// lib/api.ts
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "1";
import liveMock from "@/../sample_response.json";
import riskMock from "@/../sample_risk_map.json";
import fcMock  from "@/../sample_forecast.json";

export async function getLiveFeed(since: string) {
  if (USE_MOCK) return liveMock;
  return (await fetch(`/api/live-feed?since=${since}`)).json();
}
export async function getRiskMap(datetime: string) {
  if (USE_MOCK) return riskMock;
  return (await fetch(`/api/risk-map?datetime=${datetime}`)).json();
}
export async function postForecast(body: unknown) {
  if (USE_MOCK) return fcMock;
  return (await fetch(`/api/forecast`, { method: "POST", body: JSON.stringify(body) })).json();
}
```

### FastAPI side
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"],
                   allow_methods=["*"], allow_headers=["*"])

@app.get("/api/live-feed")
def live_feed(since: str): ...     # → shape of sample_response.json
@app.get("/api/risk-map")
def risk_map(datetime: str): ...   # → shape of sample_risk_map.json
@app.post("/api/forecast")
def forecast(req: dict): ...       # → shape of sample_forecast.json
# run: uvicorn app:app --reload --port 8000
```

---

## 10. Demo Flow (2 min)

1. Open dashboard → baseline risk heatmap glowing on hotspot corridors (proactive layer).
2. Hit PLAY on the sim-clock → incidents start popping on the map in real time.
3. A breakdown appears on Tumkur Rd → card slides into LIVE feed:
   "High priority • 71% closure • clears in ~95 min."
4. Click it → affected junctions light up + **3 diversion routes** draw on the map (green/amber).
5. Drag the TIME SLIDER → show tomorrow 9 AM risk pattern (history-based).
6. Close: *"Detect → predict severity & clearance → route around it — automatically, in real time."*

---

## 11. Work in Parallel (the trick)

- Ship `sample_response.json` first.
- Build the ENTIRE UI against that mock (live feed, slider, routes) — no waiting.
- At the end, swap mock → real `/api/live-feed`. Done.

---

## 12. Scope guards (do NOT build)

- ❌ Exact minute-level delay (no speed data) — use risk score + clearance ETA instead.
- ❌ Nationwide — Bengaluru only (that's the data + the graph).
- ❌ True live city feed — replay the CSV (clearly stated as simulated).
- ❌ Login/admin/accounts — only the operations dashboard.
- ❌ Don't download the OSMnx graph per request — cache the .pkl once.


 Great question — the risk map is the piece that's easy to misunderstand. Here's the clear
  distinction:

  The mental model

  ┌──────────┬────────────────────────────┬─────────────────────────────┬───────────────────────┐     
  │          │          Trigger           │           Answers           │         Time          │     
  ├──────────┼────────────────────────────┼─────────────────────────────┼───────────────────────┤     
  │ Live     │ An incident happened       │ "React NOW"                 │ Present               │     
  │ feed     │                            │                             │                       │     
  ├──────────┼────────────────────────────┼─────────────────────────────┼───────────────────────┤     
  │ Forecast │ A planned event will       │ "Prepare for THIS event"    │ Specific future event │     
  │          │ happen                     │                             │                       │     
  ├──────────┼────────────────────────────┼─────────────────────────────┼───────────────────────┤     
  │ Risk map │ Nothing happened — just    │ "Where is risk high in      │ Any time, no event    │     
  │          │ history                    │ general?"                   │ needed                │     
  └──────────┴────────────────────────────┴─────────────────────────────┴───────────────────────┘     

  Live feed and forecast both need a trigger (an incident, or a known event). The risk map needs      
  nothing. It answers a question police ask every single day:

  ▎ "It's a normal Tuesday morning. I have 50 patrol officers. Where do I put them so I'm already near
  ▎ trouble before anything is even reported?"

  What it actually is

  The risk map is the proactive / preventive layer. It's built purely from your 7,706 historical      
  events — it learned that:
  - Tumkur Rd & ORR East are chronically risky
  - Risk peaks at morning (9 AM) and evening (7 PM)
  - Weekends are calmer

  So even with zero active incidents, it can paint a heatmap saying "these corridors, at this hour,   
  statistically go wrong the most."

  ▎ Remember your data finding: top 10 corridors hold 82% of all events. The risk map is literally the
  ▎ visualization of that fact — that's what makes it credible.

  How you USE it (3 concrete ways)

  1. The default screen / background layer
  When the dashboard opens and nothing has happened yet, the map isn't blank — it shows the glowing   
  risk heatmap. This is your "always-on" view. The live incidents then pop on top of this background  
  as the sim runs.

  2. Pre-positioning decisions (the police value)
  The user reads it as: "Risk is High on ORR East at 9 AM → station a patrol + tow truck there        
  preemptively." This is the prevention story — you're not just reacting to jams, you're stopping     
  them.

  3. The TIME SLIDER lives here
  This is the answer to your earlier "slide into the future" idea. Drag the slider to "tomorrow 6 PM" 
  → the map recolors to show the historical risk pattern for that hour. No event, no incident — just  
  "based on 5 months of history, here's what a typical 6 PM looks like." That's exactly what
  risk_timeline[] (24 hourly steps) in sample_risk_map.json powers.

  How the three fit together on screen

          ┌─────────────────────────────────────────────┐
          │   RISK MAP (baseline heatmap)  ← always on    │
          │   "where is risk high right now / at hour X"  │
          │   + TIME SLIDER to scrub hours                │
          │                                               │
          │   ▲ LIVE FEED incidents pop ON TOP of this    │
          │     as the sim-clock runs (react)             │
          │                                               │
          │   ▲ FORECAST overlays a planned event's       │
          │     predicted zones when you run one (prepare)│
          └─────────────────────────────────────────────┘

  The risk map is the canvas; live feed and forecast are layers drawn on top.

  Why judges will like having all three

  It tells a complete operational story:
  - Risk map = Prevent (be there before it happens)
  - Live feed = React (handle it the second it happens)
  - Forecast = Prepare (plan for known events)

  A system that only reacts is half a solution. The risk map is what makes you look proactive — and it
  directly answers the theme's pain point "resource deployment is experience-driven, no data behind   
  it." Your risk map is the data behind deployment.

  ---
  So in short: use the risk map as your default dashboard view + the home of the time slider + the    
  "where should patrols go today" tool. Want me to add a short "3 layers: Prevent / React / Prepare"  
  framing line into the demo-flow section of the plan so it's crisp for your pitch?