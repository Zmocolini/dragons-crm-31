"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { CheckRow, Chip, Popover, Select } from "@/components/reports/controls";
import { useDocumentFilters } from "@/lib/documents/filters-context";
import { NATIONALITY_LABEL, NATIONALITY_OPTIONS, type Nationality } from "@/lib/candidates/types";
import { COURIER_DOC_STATUS_LABEL, type CourierDocStatus } from "@/lib/documents/rules";
import type { PlatformKey } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/cn";

const PLATFORMS: Array<{ key: PlatformKey; label: string; color: string }> = [
  { key: "bolt", label: "Bolt", color: "#34d399" },
  { key: "wolt", label: "Wolt", color: "#38bdf8" },
  { key: "glovo", label: "Glovo", color: "#facc15" },
];
const NATS: Nationality[] = [...NATIONALITY_OPTIONS, "non_eu"];
const STATUS_OPTIONS: Array<{ value: CourierDocStatus | "all"; label: string }> = [
  { value: "all", label: "Toate statusurile" },
  ...(["complete", "pending_review", "missing", "expiring_soon", "expired"] as CourierDocStatus[]).map((s) => ({ value: s, label: COURIER_DOC_STATUS_LABEL[s] })),
];

export function DocFilterBar({
  cityOptions,
  subcontractorOptions,
  onOpenAdvanced,
}: {
  cityOptions: string[];
  subcontractorOptions: string[];
  onOpenAdvanced: () => void;
}) {
  const { filters, setSearch, togglePlatform, toggleCity, toggleNationality, patch, isDirty, reset } = useDocumentFilters();
  const [local, setLocal] = useState(filters.search);

  // search debounced (250ms)
  useEffect(() => {
    const id = setTimeout(() => { if (local !== filters.search) setSearch(local); }, 250);
    return () => clearTimeout(id);
  }, [local]); // eslint-disable-line react-hooks/exhaustive-deps

  const citiesLabel = filters.cities.length === 0 ? "Toate orașele" : filters.cities.length === 1 ? filters.cities[0] : `${filters.cities.length} orașe`;
  const natLabel = filters.nationalities.length === 0 ? "Toate naționalitățile" : filters.nationalities.map((n) => NATIONALITY_LABEL[n]).join(", ");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
        <input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder="Caută curier, telefon, email, ID..."
          aria-label="Caută curier"
          className="w-full rounded-lg border border-line bg-card-hover py-2 pl-9 pr-3 text-[12.5px] text-fg outline-none focus:border-accent/60"
        />
      </div>

      {/* Platforme */}
      <Popover
        className="w-[180px] p-2"
        trigger={({ toggle, open }) => (
          <button type="button" onClick={toggle} className={cn("inline-flex items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]", open && "border-accent/60")}>
            {filters.platforms.length ? `${filters.platforms.length} platforme` : "Toate platformele"} <ChevronDown size={13} className="text-fg-dim" />
          </button>
        )}
      >
        {() => (
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => (
              <Chip key={p.key} active={filters.platforms.includes(p.key)} color={p.color} onClick={() => togglePlatform(p.key)} onRemove={() => togglePlatform(p.key)}>{p.label}</Chip>
            ))}
          </div>
        )}
      </Popover>

      {/* Orașe */}
      <Popover
        className="w-[220px] max-h-[280px] overflow-y-auto p-2"
        trigger={({ toggle, open }) => (
          <button type="button" onClick={toggle} className={cn("inline-flex items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]", open && "border-accent/60")}>
            <span className="max-w-[130px] truncate">{citiesLabel}</span> <ChevronDown size={13} className="text-fg-dim" />
          </button>
        )}
      >
        {() => (
          <div className="flex flex-col">
            <CheckRow checked={filters.cities.length === 0} label="Toate orașele" onToggle={() => patch({ cities: [] })} />
            <div className="my-1 border-t border-line/60" />
            {cityOptions.map((c) => <CheckRow key={c} checked={filters.cities.includes(c)} label={c} onToggle={() => toggleCity(c)} />)}
          </div>
        )}
      </Popover>

      {/* Naționalitate */}
      <Popover
        className="w-[200px] p-2"
        trigger={({ toggle, open }) => (
          <button type="button" onClick={toggle} className={cn("inline-flex items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]", open && "border-accent/60")}>
            <span className="max-w-[130px] truncate">{natLabel}</span> <ChevronDown size={13} className="text-fg-dim" />
          </button>
        )}
      >
        {() => (
          <div className="flex flex-col">
            <CheckRow checked={filters.nationalities.length === 0} label="Toate naționalitățile" onToggle={() => patch({ nationalities: [] })} />
            <div className="my-1 border-t border-line/60" />
            {NATS.map((n) => <CheckRow key={n} checked={filters.nationalities.includes(n)} label={NATIONALITY_LABEL[n]} onToggle={() => toggleNationality(n)} />)}
          </div>
        )}
      </Popover>

      {/* Status */}
      <Select value={filters.status} options={STATUS_OPTIONS} onChange={(s) => patch({ status: s })} className="w-[170px]" ariaLabel="Status documente" />

      <button type="button" onClick={onOpenAdvanced} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">
        <SlidersHorizontal size={14} className="text-fg-dim" /> Filtre avansate
      </button>

      {isDirty && (
        <button type="button" onClick={reset} className="text-[12px] font-medium text-[color:var(--color-info)] hover:underline">Reset</button>
      )}
    </div>
  );
}
