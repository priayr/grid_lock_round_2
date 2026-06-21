"use client";

export default function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="card px-5 py-4">
      <div className="text-xs uppercase tracking-wide text-white/40">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight ${accent ? "text-accent-soft" : "text-white"}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-white/40">{hint}</div>}
    </div>
  );
}
