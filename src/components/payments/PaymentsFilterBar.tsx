"use client";

import { Filter, Search, X } from "lucide-react";
import {
  CURRENCY_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_ORDER,
  type Currency, type PaymentStatus,
} from "@/lib/payments/types";

export type PaymentFilters = {
  search: string;
  platform: string;   // "all" | PlatformKey
  city: string;       // "all" | city name
  status: string;     // "all" | PaymentStatus
  courierId: string;  // "all" | courier id
};

export const EMPTY_PAYMENT_FILTERS: PaymentFilters = {
  search: "", platform: "all", city: "all", status: "all", courierId: "all",
};

const PLATFORM_OPTIONS = [
  { value: "all", label: "Toate platformele" },
  { value: "bolt", label: "Bolt" },
  { value: "wolt", label: "Wolt" },
  { value: "glovo", label: "Glovo" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Toate statusurile" },
  ...PAYMENT_STATUS_ORDER.map((s) => ({ value: s, label: PAYMENT_STATUS_LABEL[s as PaymentStatus] })),
];

export function PaymentsFilterBar({
  filters, cities, couriers, onChange, onOpenAdvanced, hasAdvanced,
  currency, currencies, onCurrencyChange,
}: {
  filters: PaymentFilters;
  cities: string[];
  couriers: Array<{ id: string; name: string }>;
  onChange: (patch: Partial<PaymentFilters>) => void;
  onOpenAdvanced: () => void;
  hasAdvanced: boolean;
  currency: Currency;
  currencies: Currency[];
  onCurrencyChange: (c: Currency) => void;
}) {
  const cityOptions = [{ value: "all", label: "Toate orașele" }, ...cities.map((c) => ({ value: c, label: c }))];
  const courierOptions = [{ value: "all", label: "Toți curierii" }, ...couriers.map((c) => ({ value: c.id, label: c.name }))];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line/60 bg-card p-2.5">
      <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-1.5">
        <Search size={14} className="text-fg-dim" />
        <input
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Caută curier..."
          className="w-full bg-transparent text-[13px] text-fg placeholder:text-fg-dim focus:outline-none"
        />
        {filters.search && (
          <button type="button" onClick={() => onChange({ search: "" })} className="text-fg-dim hover:text-fg" aria-label="Șterge căutare">
            <X size={12} />
          </button>
        )}
      </div>

      <Dropdown value={filters.platform} onChange={(v) => onChange({ platform: v })} options={PLATFORM_OPTIONS} />
      <Dropdown value={filters.city} onChange={(v) => onChange({ city: v })} options={cityOptions} />
      <Dropdown value={filters.status} onChange={(v) => onChange({ status: v })} options={STATUS_OPTIONS} />
      <Dropdown value={filters.courierId} onChange={(v) => onChange({ courierId: v })} options={courierOptions} />

      <button
        type="button"
        onClick={onOpenAdvanced}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.05]"
      >
        <Filter size={13} />
        Filtre avansate
        {hasAdvanced && (
          <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-500 px-1 text-[9.5px] font-bold text-white">•</span>
        )}
      </button>

      <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-1.5">
        <span className="text-[11.5px] font-medium text-fg-dim">Sume:</span>
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value as Currency)}
          className="bg-transparent text-[12.5px] font-semibold text-fg focus:outline-none"
        >
          {currencies.map((c) => (
            <option key={c} value={c} className="bg-card text-fg">{CURRENCY_LABEL[c]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Dropdown({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex items-center rounded-lg border border-line bg-card-hover px-3 py-1.5">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[160px] bg-transparent text-[12.5px] text-fg focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card text-fg">{o.label}</option>
        ))}
      </select>
    </div>
  );
}
