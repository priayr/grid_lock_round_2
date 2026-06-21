"use client";

import type { LegendItem } from "@/lib/types";

export default function Legend({ items }: { items: LegendItem[] }) {
  if (!items?.length) return null;
  return (
    <div className="glass flex items-center gap-3 rounded-full px-4 py-2 text-xs text-white/60">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}
