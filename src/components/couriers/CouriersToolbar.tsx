"use client";

import { Download, Filter, Search, X } from "lucide-react";
import type { PlatformKey } from "@/lib/dashboard/types";
import type { CourierStatus, VehicleType } from "@/lib/couriers/types";
import { COURIER_STATUS_LABEL, VEHICLE_TYPE_LABEL } from "@/lib/couriers/types";
import { cn } from "@/lib/utils/cn";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: CourierStatus | "any";
  onStatusChange: (v: CourierStatus | "any") => void;
  cityFilter: string | "any";
  onCityChange: (v: string | "any") => void;
  platformFilter: PlatformKey | "any";
  onPlatformChange: (v: PlatformKey | "any") => void;
  vehicleFilter: VehicleType | "any";
  onVehicleChange: (v: VehicleType | "any") => void;
  cities: string[];
  resultsCount: number;
  activeAdvancedCount: number;
  onOpenFilters: () => void;
  onOpenExport: () => void;
};

const PLATFORM_LABEL: Record<PlatformKey, string> = {
  bolt: "Bolt Food",
  wolt: "Wolt",
  glovo: "Glovo",
};

function Dropdown<T extends string>({
  value, onChange, options, allLabel,
}: {
  value: T | "any";
  onChange: (v: T | "any") => void;
  options: { value: T; label: string }[];
  allLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T | "any")}
      className={cn(
        "rounded-lg border border-line bg-card-2 px-2.5 py-1.5 text-[12px] font-medium text-fg-muted",
        "transition-colors hover:text-fg focus:border-indigo-400/60 focus:outline-none",
      )}
    >
      <option value="any">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function CouriersToolbar({
  search, onSearchChange,
  statusFilter, onStatusChange,
  cityFilter, onCityChange,
  platformFilter, onPlatformChange,
  vehicleFilter, onVehicleChange,
  cities, resultsCount, activeAdvancedCount,
  onOpenFilters, onOpenExport,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Caută nume, telefon, e-mail..."
            className={cn(
              "w-full rounded-lg border border-line bg-card-2 pl-9 pr-8 py-2 text-[13px] text-fg",
              "placeholder:text-fg-dim focus:border-indigo-400/60 focus:outline-none",
            )}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Șterge căutarea"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-fg-dim hover:bg-white/[0.06] hover:text-fg"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenFilters}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors",
            activeAdvancedCount > 0
              ? "border-indigo-400/60 bg-indigo-500/10 text-indigo-200"
              : "border-line bg-card-2 text-fg-muted hover:text-fg",
          )}
        >
          <Filter size={13} strokeWidth={2} />
          Filtre
          {activeAdvancedCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-400/40 px-1 text-[10px] font-bold">
              {activeAdvancedCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onOpenExport}
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-card-2 px-3 py-2 text-[12.5px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <Download size={13} strokeWidth={2} />
          Export
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Dropdown
          value={statusFilter}
          onChange={onStatusChange}
          allLabel="Toate statusurile"
          options={(Object.keys(COURIER_STATUS_LABEL) as CourierStatus[]).map((s) => ({
            value: s, label: COURIER_STATUS_LABEL[s],
          }))}
        />
        <Dropdown
          value={cityFilter}
          onChange={onCityChange}
          allLabel="Toate orașele"
          options={cities.map((c) => ({ value: c, label: c }))}
        />
        <Dropdown
          value={platformFilter}
          onChange={onPlatformChange}
          allLabel="Toate platformele"
          options={(["bolt", "wolt", "glovo"] as PlatformKey[]).map((p) => ({
            value: p, label: PLATFORM_LABEL[p],
          }))}
        />
        <Dropdown
          value={vehicleFilter}
          onChange={onVehicleChange}
          allLabel="Toate vehiculele"
          options={(Object.keys(VEHICLE_TYPE_LABEL) as VehicleType[]).map((v) => ({
            value: v, label: VEHICLE_TYPE_LABEL[v],
          }))}
        />
        <div className="ml-auto text-[12px] font-medium text-fg-muted">
          {resultsCount.toLocaleString("ro-RO")} rezultate
        </div>
      </div>
    </div>
  );
}
