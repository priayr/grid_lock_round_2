"use client";

export type Mode = "live" | "risk" | "forecast";

const TABS: { id: Mode; label: string; tag: string }[] = [
  { id: "live", label: "Live Feed", tag: "React" },
  { id: "risk", label: "Risk Map", tag: "Prevent" },
  { id: "forecast", label: "Forecast", tag: "Prepare" },
];

export default function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="glass-strong flex rounded-full p-1">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`relative rounded-full px-4 py-2 text-sm transition-all duration-300 ${
            mode === t.id ? "bg-accent text-white shadow-glow" : "text-white/55 hover:text-white"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
