"use client";

import type { SignalPlan } from "@/lib/types";

const GW = "#34c759";

/** Adaptive Green Wave plan for the active diversion route. */
export default function GreenWaveCard({ plan }: { plan?: SignalPlan | null }) {
  if (!plan) return null;
  const stats: [string, string][] = [
    ["Cycle", `${plan.cycle_length_s}s`],
    ["Progression", `${plan.progression_speed_kph} km/h`],
    ["Diverted load", `${plan.diverted_volume_vph} veh/h`],
    ["Delay cut", `${plan.expected_delay_reduction_pct}%`],
  ];
  return (
    <div className="mt-3 rounded-2xl border p-4" style={{ borderColor: `${GW}40`, background: `${GW}0f` }}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide" style={{ color: GW }}>
          Adaptive Green Wave
        </span>
        <span className="text-[10px] text-white/35">{plan.signals.length} signals timed</span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-white/45">
        Lights along the alternate are re-timed for the diverted volume so it doesn&apos;t form a new jam.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white/[0.03] px-3 py-2">
            <div className="text-sm font-semibold tabular-nums text-white">{v}</div>
            <div className="text-[10px] text-white/40">{k}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1">
        {plan.signals.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: GW }} />
            <span className="text-white/60">{s.name}</span>
            <span className="ml-auto tabular-nums text-white/35">
              +{s.offset_s}s · {s.green_s}s green
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
