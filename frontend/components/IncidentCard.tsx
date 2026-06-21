"use client";

import type { Incident } from "@/lib/types";
import { fmtHour } from "@/lib/api";

function Countdown({ clearsAt, simTime }: { clearsAt: string; simTime: string }) {
  const mins = Math.max(0, Math.round((new Date(clearsAt).getTime() - new Date(simTime).getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return (
    <span className="tabular-nums">
      {h > 0 ? `${h}h ` : ""}
      {m}m
    </span>
  );
}

export default function IncidentCard({
  incident,
  simTime,
  active,
  onClick,
}: {
  incident: Incident;
  simTime: string;
  active: boolean;
  onClick: () => void;
}) {
  const high = incident.predicted_priority === "High";
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all duration-300 ${
        active
          ? "border-accent/40 bg-accent/[0.06]"
          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: incident.color }} />
          <span className="text-sm font-medium capitalize text-white">
            {incident.cause.replace(/_/g, " ")}
          </span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            high ? "bg-red-500/15 text-red-300" : "bg-white/10 text-white/60"
          }`}
        >
          {incident.predicted_priority}
        </span>
      </div>

      <div className="mt-1 truncate text-xs text-white/40">{incident.corridor}</div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-white/[0.03] py-1.5">
          <div className="text-sm font-semibold text-white">{incident.risk_score}</div>
          <div className="text-[10px] text-white/40">risk</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] py-1.5">
          <div className="text-sm font-semibold text-white">{Math.round(incident.closure_probability * 100)}%</div>
          <div className="text-[10px] text-white/40">closure</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] py-1.5">
          <div className="text-sm font-semibold text-accent-soft">
            <Countdown clearsAt={incident.clears_at} simTime={simTime} />
          </div>
          <div className="text-[10px] text-white/40">clears in</div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[10px] text-white/35">
        <span>{fmtHour(incident.arrived_at)}</span>
        {incident.recommendation.diversion && (
          <span className="text-accent-soft/70">
            {incident.recommendation.diversion.routes.length} diversions ›
          </span>
        )}
      </div>
    </button>
  );
}
