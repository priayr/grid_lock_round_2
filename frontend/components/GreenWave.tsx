"use client";

import type { GreenWave as GWType } from "@/lib/types";

export default function GreenWave({ data }: { data: GWType }) {
  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/15 text-sm">
          🟢
        </span>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-green-300">
            Green Wave Signal Plan
          </div>
          <div className="text-[10px] text-white/40">
            Adaptive traffic signal synchronization
          </div>
        </div>
      </div>

      {/* wave stats */}
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
        <div className="text-center">
          <div className="text-lg font-semibold tabular-nums text-white">
            {data.signals.length}
          </div>
          <div className="text-[10px] text-white/35">signals</div>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="text-center">
          <div className="text-lg font-semibold tabular-nums text-white">
            {data.wave_speed_kmh}
          </div>
          <div className="text-[10px] text-white/35">km/h wave</div>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="text-center">
          <div className="text-lg font-semibold tabular-nums text-white">
            {data.flush_duration_min}m
          </div>
          <div className="text-[10px] text-white/35">flush time</div>
        </div>
      </div>

      {/* wave corridor headline */}
      <div className="rounded-xl border border-green-500/15 bg-green-500/[0.06] px-4 py-3">
        <p className="text-xs text-green-200">{data.headline}</p>
        <p className="mt-1 text-[10px] text-white/35">
          Drive at {data.wave_speed_kmh} km/h to catch consecutive green lights
        </p>
      </div>

      {/* signal-by-signal breakdown */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-wide text-white/40">
          Signal adjustments
        </div>
        <div className="space-y-1.5">
          {data.signals.map((sig, i) => {
            const extension = sig.recommended_green_sec - sig.current_green_sec;
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2.5"
              >
                <span className="flex items-center gap-2.5 text-xs">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-[9px] font-bold text-green-300">
                    {sig.signal_index}
                  </span>
                  <span className="text-white/70">{sig.junction_name}</span>
                </span>
                <span className="flex items-center gap-2 text-xs tabular-nums">
                  <span className="text-white/30">{sig.current_green_sec}s</span>
                  <span className="text-white/20">→</span>
                  <span className="font-medium text-green-300">
                    {sig.recommended_green_sec}s
                  </span>
                  {extension > 0 && (
                    <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[9px] text-green-400">
                      +{extension}s
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* explanation */}
      <p className="text-[10px] leading-relaxed text-white/30">
        Without signal adjustment, dumping diverted traffic onto an alternate route
        creates a secondary jam. This Green Wave coordinates {data.signals.length} signals
        to &quot;flush&quot; the surge in ~{data.flush_duration_min} minutes.
      </p>
    </div>
  );
}
