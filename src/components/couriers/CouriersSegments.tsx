"use client";

import { cn } from "@/lib/utils/cn";

export type CourierSegment = "all" | "active" | "waiting" | "paused" | "stopped";

const SEGMENTS: Array<{ key: CourierSegment; label: string }> = [
  { key: "all", label: "Toți" },
  { key: "active", label: "Activi" },
  { key: "waiting", label: "În așteptare" },
  { key: "paused", label: "Pauză" },
  { key: "stopped", label: "Opriți" },
];

type Props = {
  value: CourierSegment;
  counts: Record<CourierSegment, number>;
  onChange: (next: CourierSegment) => void;
};

export function CouriersSegments({ value, counts, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Statut curieri" className="flex flex-wrap items-center gap-1.5">
      {SEGMENTS.map(({ key, label }) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(key)}
            // Un curier activ pe o platformă și în așteptare pe alta e numărat și la Activi, și la În așteptare.
            title={key === "waiting" ? "Curieri care așteaptă loc pe cel puțin o platformă (pot fi activi pe alta)" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
              selected
                ? key === "waiting"
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-100"
                  : "border-violet-500/60 bg-violet-500/[0.12] text-fg"
                : "border-line bg-card text-fg-muted hover:bg-card-hover hover:text-fg",
            )}
          >
            {label}
            <span className="tabular-nums text-[11.5px] text-fg-dim">{counts[key]}</span>
          </button>
        );
      })}
    </div>
  );
}
