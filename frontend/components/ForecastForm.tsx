"use client";

import { useState } from "react";
import type { ForecastRequest } from "@/lib/types";

const CAUSES = ["public_event", "procession", "vip_movement", "protest", "construction"];

export default function ForecastForm({
  onSubmit,
  loading,
}: {
  onSubmit: (req: ForecastRequest) => void;
  loading: boolean;
}) {
  const [cause, setCause] = useState("public_event");
  const [lat, setLat] = useState("12.9784");
  const [lng, setLng] = useState("77.6408");
  const [date, setDate] = useState("2026-06-20T17:00");
  const [crowd, setCrowd] = useState("20000");
  const [days, setDays] = useState("3");

  function submit() {
    onSubmit({
      event_cause: cause,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      start_datetime: new Date(date).toISOString(),
      expected_crowd: parseInt(crowd, 10),
      forecast_days: parseInt(days, 10),
    });
  }

  const field = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none transition focus:border-accent/50 focus:bg-white/[0.05]";
  const label = "mb-1.5 block text-xs text-white/45";

  return (
    <div className="space-y-4">
      <div>
        <label className={label}>Event type</label>
        <select value={cause} onChange={(e) => setCause(e.target.value)} className={field}>
          {CAUSES.map((c) => (
            <option key={c} value={c} className="bg-ink-800">
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Latitude</label>
          <input value={lat} onChange={(e) => setLat(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label}>Longitude</label>
          <input value={lng} onChange={(e) => setLng(e.target.value)} className={field} />
        </div>
      </div>

      <div>
        <label className={label}>Date &amp; time</label>
        <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Expected crowd</label>
          <input value={crowd} onChange={(e) => setCrowd(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label}>Forecast days</label>
          <input value={days} onChange={(e) => setDays(e.target.value)} className={field} />
        </div>
      </div>

      <button onClick={submit} disabled={loading} className="btn-accent w-full disabled:opacity-50">
        {loading ? "Forecasting…" : "Run Forecast"}
      </button>
    </div>
  );
}
