"use client";

import type { FleetQuarantine as FQType } from "@/lib/types";

const STATUS_ICON: Record<string, string> = {
  acknowledged: "✓",
  rerouting: "⟳",
  completed: "✓✓",
};

export default function FleetQuarantine({ data }: { data: FQType }) {
  const impact = data.estimated_impact;
  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/15 text-sm">
          📡
        </span>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-orange-300">
            Fleet Quarantine API
          </div>
          <div className="text-[10px] text-white/40">B2B geo-fence broadcast</div>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-orange-400/25 bg-orange-500/10 px-2.5 py-1 text-[10px] font-medium text-orange-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" />
          {data.severity_trigger}
        </span>
      </div>

      {/* quarantine zone pill */}
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
        <div className="text-center">
          <div className="text-lg font-semibold tabular-nums text-white">
            {data.zone_radius_m}m
          </div>
          <div className="text-[10px] text-white/35">radius</div>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="text-center">
          <div className="text-lg font-semibold tabular-nums text-white">
            −{impact.volume_reduction_pct}%
          </div>
          <div className="text-[10px] text-white/35">traffic vol.</div>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="text-center">
          <div className="text-lg font-semibold tabular-nums text-white">
            {impact.vehicles_diverted}
          </div>
          <div className="text-[10px] text-white/35">rerouted</div>
        </div>
      </div>

      {/* fleet operator responses */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-wide text-white/40">
          Fleet operators notified
        </div>
        <div className="space-y-1.5">
          {data.fleet_responses.map((fr) => (
            <div
              key={fr.operator}
              className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2.5 transition hover:bg-white/[0.04]"
            >
              <span className="flex items-center gap-2.5 text-xs">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-bold text-white"
                  style={{ background: fr.operator_color }}
                >
                  {fr.operator[0]}
                </span>
                <span className="font-medium text-white/80">{fr.operator}</span>
                <span className="text-white/30">{fr.fleet_type}</span>
              </span>
              <span className="flex items-center gap-3 text-xs tabular-nums text-white/45">
                <span>{fr.vehicles_rerouted}/{fr.vehicles_in_zone} veh</span>
                <span className="text-green-400">{STATUS_ICON[fr.status] ?? "✓"}</span>
                <span className="text-white/25">{fr.ack_time_sec}s</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* cascade prevention */}
      <div className="rounded-xl border border-green-500/15 bg-green-500/[0.06] px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-green-300">
          <span>🛡</span>
          <span>{impact.cascading_prevention}</span>
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-white/35">
          Commercial fleets account for ~25% of urban traffic. Removing {impact.vehicles_diverted} vehicles
          from the quarantine zone prevents the road from crossing its capacity tipping point.
        </p>
      </div>
    </div>
  );
}
