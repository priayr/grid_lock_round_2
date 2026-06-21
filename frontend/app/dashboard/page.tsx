"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MapCircle } from "@/components/MapView";
import ModeTabs, { Mode } from "@/components/ModeTabs";
import SimClock from "@/components/SimClock";
import TimelineSlider from "@/components/TimelineSlider";
import IncidentCard from "@/components/IncidentCard";
import IncidentDetail from "@/components/IncidentDetail";
import ForecastForm from "@/components/ForecastForm";
import Legend from "@/components/Legend";
import StatCard from "@/components/StatCard";
import GreenWaveCard from "@/components/GreenWaveCard";
import DispatchPlanComp from "@/components/DispatchPlan";
import FleetQuarantineComp from "@/components/FleetQuarantine";
import GreenWaveComp from "@/components/GreenWave";
import { getLiveFeed, getRiskMap, postForecast } from "@/lib/api";
import type {
  CongestionSegment,
  DispatchEntry,
  Diversion,
  ForecastRequest,
  ForecastResponse,
  GreenWaveSignal,
  Incident,
  LegendItem,
  LiveFeedResponse,
  RiskMapResponse,
  TimelineStep,
  ZoneFull,
} from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-ink-900" />,
});

const BLR: [number, number] = [12.9716, 77.5946];

/** Merge fixed zone coords with a timeline step's changing risk/color. */
function circlesFromStep(zones: ZoneFull[], step?: TimelineStep): MapCircle[] {
  if (!step) {
    return zones.map((z) => ({ id: z.zone_id, lat: z.lat, lng: z.lng, color: z.color, radius_m: z.radius_m, label: z.name, risk: z.risk_score }));
  }
  const byId = new Map(step.zones.map((s) => [s.zone_id, s]));
  return zones.map((z) => {
    const s = byId.get(z.zone_id);
    return {
      id: z.zone_id,
      lat: z.lat,
      lng: z.lng,
      color: s?.color ?? z.color,
      radius_m: s?.radius_m ?? z.radius_m,
      label: z.name,
      risk: s?.risk_score ?? z.risk_score,
    };
  });
}

export default function Dashboard() {
  const [mode, setMode] = useState<Mode>("live");
  const [legend, setLegend] = useState<LegendItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ---------- LIVE ----------
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [simTime, setSimTime] = useState<string>("");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [activeRoute, setActiveRoute] = useState(0);
  const [liveSummary, setLiveSummary] = useState<LiveFeedResponse["summary"] | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const sinceRef = useRef<string | undefined>(undefined);

  const tick = useCallback(async () => {
    try {
      const data = await getLiveFeed(sinceRef.current, 30);
      setError(null);
      setLiveLoading(false);
      sinceRef.current = data.next_since;
      setSimTime(data.sim_time);
      setLegend(data.legend);
      setLiveSummary(data.summary);
      if (data.new_incidents.length) {
        setIncidents((prev) => [...data.new_incidents, ...prev].slice(0, 50));
      }
    } catch (e) {
      setError(String(e));
      setPlaying(false);
      setLiveLoading(false);
    }
  }, []);

  // initial live load
  useEffect(() => {
    if (mode === "live" && !simTime) tick();
  }, [mode, simTime, tick]);

  // play loop
  useEffect(() => {
    if (!playing || mode !== "live") return;
    const ms = 2500 / speed;
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [playing, speed, mode, tick]);

  // ---------- RISK ----------
  const [risk, setRisk] = useState<RiskMapResponse | null>(null);
  const [riskIdx, setRiskIdx] = useState(9);

  useEffect(() => {
    if (mode !== "risk" || risk) return;
    getRiskMap()
      .then((r) => {
        setRisk(r);
        setLegend(r.legend);
        setError(null);
      })
      .catch((e) => setError(String(e)));
  }, [mode, risk]);

  // ---------- FORECAST ----------
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [fcIdx, setFcIdx] = useState(0);
  const [fcLoading, setFcLoading] = useState(false);

  const runForecast = useCallback(async (req: ForecastRequest) => {
    setFcLoading(true);
    try {
      const r = await postForecast(req);
      setForecast(r);
      setLegend(r.legend);
      const peakIdx = r.timeline.findIndex((t) => t.datetime === r.summary.peak_window);
      setFcIdx(peakIdx >= 0 ? peakIdx : 0);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setFcLoading(false);
    }
  }, []);

  // ---------- map layers per mode ----------
  const map = useMemo(() => {
    const empty = {
      quarantineZone: null as { lat: number; lng: number; radius_m: number } | null,
      greenWaveSignals: [] as GreenWaveSignal[],
      dispatchMarkers: [] as DispatchEntry[],
    };

    if (mode === "risk" && risk) {
      return {
        circles: circlesFromStep(risk.baseline_zones, risk.risk_timeline[riskIdx]),
        center: BLR, zoom: 12, mapIncidents: [] as Incident[],
        congestion: [] as CongestionSegment[], diversion: null as Diversion | null, epicenter: null as { lat: number; lng: number } | null,
        ...empty,
        dispatchMarkers: risk.dispatch?.dispatch_plan ?? [],
      };
    }
    if (mode === "forecast" && forecast) {
      const c = forecast.impact_zones[0];
      const venue = forecast.recommendations.find((r) => r.diversion)?.diversion ?? null;
      const echo = forecast.request_echo as { lat?: number; lng?: number };
      return {
        circles: circlesFromStep(forecast.impact_zones, forecast.timeline[fcIdx]),
        center: c ? ([c.lat, c.lng] as [number, number]) : BLR,
        zoom: 14, mapIncidents: [] as Incident[],
        congestion: forecast.congestion_segments ?? [],
        diversion: venue,
        epicenter: echo.lat && echo.lng ? { lat: echo.lat, lng: echo.lng } : null,
        quarantineZone: forecast.fleet_quarantine
          ? { lat: forecast.fleet_quarantine.zone_center.lat, lng: forecast.fleet_quarantine.zone_center.lng, radius_m: forecast.fleet_quarantine.zone_radius_m }
          : null,
        greenWaveSignals: forecast.green_wave?.signals ?? [],
        dispatchMarkers: [] as DispatchEntry[],
      };
    }
    // live
    const c = selected ? ([selected.lat, selected.lng] as [number, number]) : BLR;
    return {
      circles: [] as MapCircle[], center: c, zoom: selected ? 14 : 12, mapIncidents: incidents,
      congestion: selected?.congestion_segments ?? [], diversion: null as Diversion | null, epicenter: null as { lat: number; lng: number } | null,
      quarantineZone: selected?.fleet_quarantine
        ? { lat: selected.fleet_quarantine.zone_center.lat, lng: selected.fleet_quarantine.zone_center.lng, radius_m: selected.fleet_quarantine.zone_radius_m }
        : null,
      greenWaveSignals: selected?.green_wave?.signals ?? [],
      dispatchMarkers: [] as DispatchEntry[],
    };
  }, [mode, risk, riskIdx, forecast, fcIdx, incidents, selected]);

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      {/* top bar */}
      <div className="flex items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="text-sm font-semibold tracking-tight text-white">Gridlock</span>
          <span className="ml-1 hidden text-xs text-white/35 sm:inline">Operations Console</span>
        </Link>
        <ModeTabs mode={mode} onChange={setMode} />
        <div className="hidden md:block">
          <Legend items={legend} />
        </div>
      </div>

      {error && (
        <div className="mx-5 mb-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-200">
          Backend unreachable — start FastAPI: <code className="text-red-100">uvicorn app:app --port 8000</code>
        </div>
      )}

      {/* body */}
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden px-5 pb-5 lg:grid-cols-[1fr_380px]">
        {/* MAP */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.07]">
          <MapView
            center={map.center}
            zoom={map.zoom}
            circles={map.circles}
            congestion={map.congestion}
            incidents={map.mapIncidents}
            selected={selected}
            diversion={map.diversion}
            epicenter={map.epicenter}
            activeRoute={activeRoute}
            quarantineZone={map.quarantineZone}
            greenWaveSignals={map.greenWaveSignals}
            dispatchMarkers={map.dispatchMarkers}
            onSelect={(i) => { setSelected(i); setActiveRoute(0); }}
            onRouteSelect={setActiveRoute}
          />

          {/* live feed loading overlay */}
          {mode === "live" && liveLoading && !error && (
            <div className="absolute inset-0 z-[1100] flex flex-col items-center justify-center gap-4 bg-ink-900/70 backdrop-blur-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
              <div className="text-sm font-medium text-white/80">Loading live feed…</div>
              <div className="text-xs text-white/40">Connecting to the traffic stream</div>
            </div>
          )}

          {/* floating controls over the map */}
          {mode === "live" && simTime && (
            <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2">
              <SimClock
                simTime={simTime}
                playing={playing}
                speed={speed}
                onToggle={() => setPlaying((p) => !p)}
                onSpeed={setSpeed}
                onStep={tick}
              />
            </div>
          )}
          {mode === "risk" && risk && (
            <div className="absolute bottom-4 left-4 right-4 z-[1000] mx-auto max-w-md">
              <TimelineSlider steps={risk.risk_timeline} index={riskIdx} onChange={setRiskIdx} />
            </div>
          )}
          {mode === "forecast" && forecast && (
            <div className="absolute bottom-4 left-4 right-4 z-[1000] mx-auto max-w-md">
              <TimelineSlider steps={forecast.timeline} index={fcIdx} onChange={setFcIdx} />
            </div>
          )}
        </div>

        {/* SIDE PANEL */}
        <aside className="flex flex-col gap-4 overflow-hidden">
          {mode === "live" && (
            <LivePanel
              summary={liveSummary}
              incidents={incidents}
              simTime={simTime}
              selected={selected}
              activeRoute={activeRoute}
              onRouteSelect={setActiveRoute}
              onSelect={(i) => { setSelected(i); setActiveRoute(0); }}
            />
          )}
          {mode === "risk" && <RiskPanel risk={risk} idx={riskIdx} />}
          {mode === "forecast" && (
            <ForecastPanel forecast={forecast} loading={fcLoading} onSubmit={runForecast} activeRoute={activeRoute} onRouteSelect={setActiveRoute} />
          )}
        </aside>
      </div>
    </main>
  );
}

/* ---------------- LIVE PANEL ---------------- */
function LivePanel({
  summary,
  incidents,
  simTime,
  selected,
  activeRoute,
  onRouteSelect,
  onSelect,
}: {
  summary: LiveFeedResponse["summary"] | null;
  incidents: Incident[];
  simTime: string;
  selected: Incident | null;
  activeRoute: number;
  onRouteSelect: (i: number) => void;
  onSelect: (i: Incident | null) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Active" value={incidents.length} />
        <StatCard label="High" value={summary?.high_priority ?? 0} accent />
        <StatCard label="Avg clear" value={`${summary?.avg_clearance_min ?? 0}m`} />
      </div>

      {/* Fleet quarantine summary stats */}
      {(summary?.fleets_notified ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-orange-500/15 bg-orange-500/[0.06] px-4 py-2.5">
          <span className="text-sm">📡</span>
          <div className="flex-1">
            <div className="text-xs font-medium text-orange-200">
              {summary!.fleets_notified} fleet operators notified
            </div>
            <div className="text-[10px] text-orange-300/50">
              ~{summary!.volume_reduction_pct}% traffic volume reduced via quarantine
            </div>
          </div>
        </div>
      )}

      {selected ? (
        <div className="card flex-1 overflow-y-auto p-5">
          <button onClick={() => onSelect(null)} className="mb-4 text-xs text-white/45 hover:text-white">
            ‹ Back to feed
          </button>
          <IncidentDetail incident={selected} activeRoute={activeRoute} onRouteSelect={onRouteSelect} />
        </div>
      ) : (
        <div className="card flex-1 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
            <span className="text-sm font-medium text-white">Live incidents</span>
            <span className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> streaming
            </span>
          </div>
          <div className="h-full space-y-2 overflow-y-auto p-3 pb-16">
            {incidents.length === 0 && <div className="px-3 py-10 text-center text-sm text-white/35">Press play to start the stream.</div>}
            {incidents.map((inc) => (
              <IncidentCard key={inc.id} incident={inc} simTime={simTime} active={false} onClick={() => onSelect(inc)} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- RISK PANEL ---------------- */
function RiskPanel({ risk, idx }: { risk: RiskMapResponse | null; idx: number }) {
  if (!risk) return <div className="card flex-1 animate-pulse" />;
  const step = risk.risk_timeline[idx];
  const ranked = [...step.zones].sort((a, b) => b.risk_score - a.risk_score);
  const nameById = new Map(risk.baseline_zones.map((z) => [z.zone_id, z.name]));
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Overall risk" value={step.overall_risk} accent />
        <StatCard label="Top corridor" value={risk.summary.highest_zone?.name.split(" ")[0] ?? "—"} hint={`risk ${risk.summary.highest_zone?.risk_score ?? ""}`} />
      </div>
      <div className="card flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="border-b border-white/[0.06] px-5 py-3 text-sm font-medium text-white">
            Pre-position priority
            <p className="mt-0.5 text-xs font-normal text-white/40">Corridors ranked by risk at this hour</p>
          </div>
          <div className="space-y-1.5 p-3">
            {ranked.map((z, i) => (
              <div key={z.zone_id} className="flex items-center gap-3 rounded-xl bg-white/[0.02] px-4 py-3">
                <span className="text-xs text-white/30">{i + 1}</span>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: z.color }} />
                <span className="flex-1 text-sm text-white/80">{nameById.get(z.zone_id) ?? z.zone_id}</span>
                <span className="text-sm font-semibold tabular-nums text-white">{z.risk_score}</span>
              </div>
            ))}
          </div>

          {/* Pre-Positioning Dispatch Plan */}
          {risk.dispatch && (
            <div className="border-t border-white/[0.06] p-4">
              <DispatchPlanComp data={risk.dispatch} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------- FORECAST PANEL ---------------- */
function ForecastPanel({
  forecast,
  loading,
  onSubmit,
  activeRoute,
  onRouteSelect,
}: {
  forecast: ForecastResponse | null;
  loading: boolean;
  onSubmit: (r: ForecastRequest) => void;
  activeRoute: number;
  onRouteSelect: (i: number) => void;
}) {
  const ROUTE_COLORS = ["#4f8bff", "#34c759", "#ff9f0a"];
  const venue = forecast?.recommendations.find((r) => r.diversion)?.diversion ?? null;
  const totalOfficers = forecast?.recommendations.reduce((s, r) => s + r.officers, 0) ?? 0;
  return (
    <div className="card flex-1 overflow-y-auto p-5">
      <h2 className="text-sm font-medium text-white">Plan a known event</h2>
      <p className="mb-4 mt-0.5 text-xs text-white/40">Forecast congestion before it happens</p>
      <ForecastForm onSubmit={onSubmit} loading={loading} />

      {forecast && (
        <div className="mt-6 space-y-4 border-t border-white/[0.06] pt-5">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Priority" value={forecast.summary.predicted_priority} accent={forecast.summary.predicted_priority === "High"} />
            <StatCard label="Closure" value={`${Math.round(forecast.summary.road_closure_probability * 100)}%`} />
          </div>
          <StatCard label="Peak risk" value={forecast.summary.peak_risk_score} hint={forecast.summary.headline} />

          {/* deployment per zone */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-white/40">Deployment</span>
              <span className="text-[10px] text-white/35">{totalOfficers} officers total</span>
            </div>
            <div className="space-y-1.5">
              {forecast.recommendations.map((r) => (
                <div key={r.zone_id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2.5 text-xs">
                  <span className="text-white/70">{r.name}</span>
                  <span className="flex items-center gap-3 text-white/45">
                    <span>{r.officers} officers</span>
                    <span className="text-white/25">·</span>
                    <span>{r.barricades.length} barr.</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* diversion routes around the venue */}
          {venue && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-white/40">Venue diversions</span>
                <span className="text-[10px] text-white/30">tap to highlight</span>
              </div>
              <div className="space-y-1.5">
                {venue.routes.map((r, i) => {
                  const active = i === activeRoute;
                  return (
                    <button
                      key={i}
                      onClick={() => onRouteSelect(i)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition ${
                        active ? "bg-white/[0.07] ring-1 ring-white/15" : "bg-white/[0.02] hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 text-xs">
                        <span className="h-1.5 w-6 rounded-full" style={{ background: ROUTE_COLORS[i % 3], opacity: active ? 1 : 0.5 }} />
                        <span className={active ? "font-medium text-white" : "text-white/70"}>{i === 0 ? "Fastest" : `Alternate ${i}`}</span>
                      </span>
                      <span className="text-xs tabular-nums text-white/45">{(r.distance_m / 1000).toFixed(1)} km · {r.eta_min} min</span>
                    </button>
                  );
                })}
              </div>

              {/* adaptive green wave for the highlighted venue route */}
              <GreenWaveCard plan={venue.routes[activeRoute]?.signal_plan} />
            </div>
          )}

          {/* Green Wave for the forecast diversion */}
          {forecast.green_wave && (
            <div className="border-t border-white/[0.06] pt-5">
              <GreenWaveComp data={forecast.green_wave} />
            </div>
          )}

          {/* Fleet Quarantine for the forecast event */}
          {forecast.fleet_quarantine && (
            <div className="border-t border-white/[0.06] pt-5">
              <FleetQuarantineComp data={forecast.fleet_quarantine} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
