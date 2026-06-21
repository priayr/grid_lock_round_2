"use client";

import type { Incident } from "@/lib/types";
import GreenWaveCard from "@/components/GreenWaveCard";
import QuarantineCard from "@/components/QuarantineCard";
import FleetQuarantine from "./FleetQuarantine";
import GreenWave from "./GreenWave";

const ROUTE_COLORS = ["#4f8bff", "#34c759", "#ff9f0a"];

export default function IncidentDetail({
  incident,
  activeRoute = 0,
  onRouteSelect,
}: {
  incident: Incident;
  activeRoute?: number;
  onRouteSelect?: (i: number) => void;
}) {
  const div = incident.recommendation.diversion;
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold capitalize text-white">
          {incident.cause.replace(/_/g, " ")}
        </h3>
        <p className="mt-0.5 text-xs text-white/45">{incident.address || incident.corridor}</p>
      </div>

      {/* recommendation */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="text-xs uppercase tracking-wide text-white/40">Recommended response</div>
        <div className="mt-2 flex items-center gap-4">
          <div>
            <div className="text-2xl font-semibold text-white">{incident.recommendation.officers}</div>
            <div className="text-[10px] text-white/40">officers</div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <div className="text-2xl font-semibold text-white">{incident.recommendation.barricades.length}</div>
            <div className="text-[10px] text-white/40">barricades</div>
          </div>
        </div>
      </div>

      {/* fleet quarantine broadcast (severe incidents only) */}
      <QuarantineCard quarantine={incident.quarantine} />

      {/* affected junctions */}
      {incident.affected_junctions.length > 0 && (
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-white/40">Affected junctions</div>
          <div className="space-y-1.5">
            {incident.affected_junctions.map((j, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2 text-xs">
                <span className="flex items-center gap-2 text-white/70">
                  <span className="h-2 w-2 rounded-full" style={{ background: j.color }} />
                  {j.name}
                </span>
                <span className="text-white/40">risk {j.risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* diversions */}
      {div && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-white/40">Diversion routes</span>
            <span className="text-[10px] text-white/30">tap to highlight</span>
          </div>
          <div className="space-y-1.5">
            {div.routes.map((r, i) => {
              const active = i === activeRoute;
              return (
                <button
                  key={i}
                  onClick={() => onRouteSelect?.(i)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition ${
                    active ? "bg-white/[0.07] ring-1 ring-white/15" : "bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="flex items-center gap-2.5 text-xs">
                    <span className="h-1.5 w-6 rounded-full" style={{ background: ROUTE_COLORS[i % 3], opacity: active ? 1 : 0.5 }} />
                    <span className={active ? "font-medium text-white" : "text-white/70"}>
                      {i === 0 ? "Fastest" : `Alternate ${i}`}
                    </span>
                  </span>
                  <span className="text-xs tabular-nums text-white/45">
                    {(r.distance_m / 1000).toFixed(1)} km · {r.eta_min} min
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-white/30">
            <span className="text-[#e0301e]">✕</span> blockage · <span className="text-[#34c759]">A</span> start · <span className="text-[#4f8bff]">B</span> rejoin · red roads = congestion
          </p>

          {/* adaptive green wave for the highlighted route */}
          <GreenWaveCard plan={div.routes[activeRoute]?.signal_plan} />
        </div>
      )}

      {/* Green Wave — adaptive signal plan for the diversion route */}
      {incident.green_wave && (
        <div className="border-t border-white/[0.06] pt-5">
          <GreenWave data={incident.green_wave} />
        </div>
      )}

      {/* Fleet Quarantine — B2B broadcast to commercial fleets */}
      {incident.fleet_quarantine && (
        <div className="border-t border-white/[0.06] pt-5">
          <FleetQuarantine data={incident.fleet_quarantine} />
        </div>
      )}
    </div>
  );
}

