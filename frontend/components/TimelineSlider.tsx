"use client";

import type { TimelineStep } from "@/lib/types";
import { fmtHour } from "@/lib/api";

export default function TimelineSlider({
  steps,
  index,
  onChange,
}: {
  steps: TimelineStep[];
  index: number;
  onChange: (i: number) => void;
}) {
  if (!steps.length) return null;
  const step = steps[index];
  return (
    <div className="rounded-3xl border border-black/10 bg-white/85 p-5 shadow-lg backdrop-blur-2xl">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-black/45">Projected risk</div>
          <div className="text-lg font-semibold tabular-nums text-black">{fmtHour(step.datetime)}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold tabular-nums text-accent">{step.overall_risk}</div>
          <div className="text-[10px] text-black/45">overall risk</div>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={steps.length - 1}
        value={index}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-on-light w-full"
      />

      <div className="mt-2 flex justify-between text-[10px] text-black/40">
        <span>{fmtHour(steps[0].datetime)}</span>
        <span>{fmtHour(steps[Math.floor(steps.length / 2)].datetime)}</span>
        <span>{fmtHour(steps[steps.length - 1].datetime)}</span>
      </div>
    </div>
  );
}
