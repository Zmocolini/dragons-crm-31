"use client";

import { cn } from "@/lib/utils/cn";

export type CourierSegment = "all" | "pending" | "active" | "waiting" | "paused" | "stopped";

const SEGMENTS: Array<{ key: CourierSegment; label: string }> = [
  { key: "all", label: "Toți" },
  // Status `pending`: înregistrat de subcontractor, flota trebuie să-l activeze sau să-l respingă.
  { key: "pending", label: "De confirmat" },
  { key: "active", label: "Activi" },
  // Nu e un status: curierul așteaptă loc pe o platformă (poate fi activ pe alta).
  { key: "waiting", label: "Așteaptă loc" },
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
            // Un curier activ pe o platformă care așteaptă loc pe alta e numărat și la Activi, și la Așteaptă loc.
            title={key === "waiting" ? "Curieri care așteaptă loc pe cel puțin o platformă (pot fi activi pe alta)" : key === "pending" ? "Înregistrați de subcontractori: activează sau respinge" : undefined}
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
