"use client";

import type { DispatchPlan as DPType } from "@/lib/types";

const RESOURCE_ICON: Record<string, string> = {
  tow_truck: "🚛",
  ambulance: "🚑",
  patrol: "🚔",
};

const RESOURCE_LABEL: Record<string, string> = {
  tow_truck: "Tow Truck",
  ambulance: "Ambulance",
  patrol: "Patrol",
};

export default function DispatchPlan({ data }: { data: DPType }) {
  const total = data.total_resources;
  const totalUnits = total.tow_trucks + total.ambulances + total.patrols;
  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-sm">
          📍
        </span>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-300">
            Pre-Positioning Dispatch
          </div>
          <div className="text-[10px] text-white/40">Automated resource staging</div>
        </div>
      </div>

      {/* resource summary */}
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
        <div className="text-center">
          <div className="text-lg font-semibold tabular-nums text-white">
            {totalUnits}
          </div>
          <div className="text-[10px] text-white/35">units staged</div>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="text-center">
          <div className="text-lg font-semibold tabular-nums text-white">
            {data.coverage_score}%
          </div>
          <div className="text-[10px] text-white/35">coverage</div>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="text-center">
          <div className="text-lg font-semibold tabular-nums text-green-300">
            {data.avg_response_improvement_min}m
          </div>
          <div className="text-[10px] text-white/35">faster</div>
        </div>
      </div>

      {/* resource breakdown icons */}
      <div className="flex items-center justify-center gap-5 rounded-xl bg-white/[0.02] px-4 py-3">
        {(
          [
            ["tow_truck", total.tow_trucks],
            ["ambulance", total.ambulances],
            ["patrol", total.patrols],
          ] as [string, number][]
        ).map(([type, count]) => (
          <div key={type} className="flex items-center gap-2 text-xs">
            <span>{RESOURCE_ICON[type]}</span>
            <span className="font-medium text-white">{count}</span>
            <span className="text-white/35">{RESOURCE_LABEL[type]}s</span>
          </div>
        ))}
      </div>

      {/* corridor staging plan */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-wide text-white/40">
          Staging positions
        </div>
        <div className="space-y-1.5">
          {data.dispatch_plan.map((entry) => (
            <div
              key={entry.corridor}
              className="rounded-lg bg-white/[0.02] px-3 py-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/80">
                  {entry.corridor}
                </span>
                <span className="text-xs tabular-nums text-white/40">
                  risk {entry.risk_score}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {entry.resources.map((res, j) => (
                  <span
                    key={j}
                    className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/55"
                  >
                    {RESOURCE_ICON[res.type]} {res.count}×{" "}
                    <span className="text-green-400">{res.eta_if_incident_min}m</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* response time comparison */}
      <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.06] px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-blue-300">
          <span>⚡</span>
          <span>
            Avg response: <strong>3 min</strong> (vs. 42 min from depot)
          </span>
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-white/35">
          Pre-positioning resources at high-risk corridors reduces clearance time —
          the single biggest factor in preventing cascading gridlock.
        </p>
      </div>
    </div>
  );
}
