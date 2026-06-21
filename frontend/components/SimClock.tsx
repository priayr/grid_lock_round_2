"use client";

import { fmtTime } from "@/lib/api";

export default function SimClock({
  simTime,
  playing,
  speed,
  onToggle,
  onSpeed,
  onStep,
}: {
  simTime: string;
  playing: boolean;
  speed: number;
  onToggle: () => void;
  onSpeed: (s: number) => void;
  onStep: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-black/10 bg-white/85 px-3 py-2 shadow-lg backdrop-blur-2xl">
      <button
        onClick={onToggle}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white transition hover:bg-accent-soft"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <button
        onClick={onStep}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-black/60 transition hover:bg-black/[0.06] hover:text-black"
        aria-label="Step"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 5v14l9-7zM16 5h2v14h-2z" />
        </svg>
      </button>

      <div className="px-1">
        <div className="text-[10px] uppercase tracking-wide text-black/45">Sim time</div>
        <div className="text-sm font-medium tabular-nums text-black">{fmtTime(simTime)}</div>
      </div>

      <div className="ml-1 flex items-center gap-1 rounded-full bg-black/[0.05] p-1">
        {[1, 2, 4].map((s) => (
          <button
            key={s}
            onClick={() => onSpeed(s)}
            className={`rounded-full px-2.5 py-1 text-xs transition ${
              speed === s ? "bg-accent text-white" : "text-black/55 hover:text-black"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
