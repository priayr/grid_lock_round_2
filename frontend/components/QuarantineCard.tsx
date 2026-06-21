"use client";

import type { Quarantine } from "@/lib/types";
import { fmtTime } from "@/lib/api";

const Q = "#ff9f0a";

/** Fleet Quarantine broadcast emitted for a severe incident. */
export default function QuarantineCard({ quarantine }: { quarantine?: Quarantine }) {
  if (!quarantine) return null;
  const q = quarantine;
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: `${Q}40`, background: `${Q}0f` }}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: Q }}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full" style={{ background: Q, opacity: 0.6 }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: Q }} />
          </span>
          Fleet Quarantine broadcast
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-white/60">
          {q.status}
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-white/55">{q.advisory}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/[0.03] px-3 py-2">
          <div className="text-sm font-semibold tabular-nums text-white">
            ~{q.estimated_volume_removed_pct}%
          </div>
          <div className="text-[10px] text-white/40">fleet volume removed</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] px-3 py-2">
          <div className="text-sm font-semibold tabular-nums text-white">{q.geofence.radius_m} m</div>
          <div className="text-[10px] text-white/40">geofence radius</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {q.affected_fleets.map((f) => (
          <span key={f} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/65">
            {f}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-white/35">
        <span className="font-mono">{q.quarantine_id}</span>
        <span>expires {fmtTime(q.expires_at)}</span>
      </div>
    </div>
  );
}
