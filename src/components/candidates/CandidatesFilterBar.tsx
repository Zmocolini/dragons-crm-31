"use client";

import { Filter, Search, X } from "lucide-react";

export type CandidateFilters = {
  search: string;
  /** Valorile string liber; matcher-ul compară cu candidate.source (poate diferi). */
  source: string;
  city: string;
  nationality: string;
  platform: string;
};

export const EMPTY_FILTERS: CandidateFilters = {
  search: "",
  source: "all",
  city: "all",
  nationality: "all",
  platform: "all",
};

const SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all",           label: "Toate sursele" },
  { value: "facebook_ads",  label: "Facebook Ads" },
  { value: "whatsapp",      label: "WhatsApp" },
  { value: "olx",           label: "OLX" },
  { value: "tiktok",        label: "TikTok" },
  { value: "instagram",     label: "Instagram" },
  { value: "referral",      label: "Recomandare" },
  { value: "form",          label: "Formular" },
  { value: "field",         label: "Recrutare teren" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "phone",         label: "Telefon" },
  { value: "other",         label: "Altă sursă" },
];

const NATIONALITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all",    label: "Toate naționalitățile" },
  { value: "ro",     label: "Român" },
  { value: "eu",     label: "UE" },
  { value: "non_eu", label: "Non-UE" },
];

const PLATFORM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all",   label: "Toate platformele" },
  { value: "bolt",  label: "Bolt Food" },
  { value: "wolt",  label: "Wolt" },
  { value: "glovo", label: "Glovo" },
];

export function CandidatesFilterBar({
  filters, cities, onChange, onOpenAdvanced, hasAdvanced,
}: {
  filters: CandidateFilters;
  cities: string[];
  onChange: (patch: Partial<CandidateFilters>) => void;
  onOpenAdvanced: () => void;
  hasAdvanced: boolean;
}) {
  const cityOptions = [
    { value: "all", label: "Toate orașele" },
    ...cities.map((c) => ({ value: c, label: c })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line/60 bg-card p-2.5">
      <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-1.5">
        <Search size={14} className="text-fg-dim" />
        <input
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Caută lead..."
          className="w-full bg-transparent text-[13px] text-fg placeholder:text-fg-dim focus:outline-none"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => onChange({ search: "" })}
            className="text-fg-dim hover:text-fg"
            aria-label="Șterge căutare"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <Dropdown
        value={filters.source}
        onChange={(v) => onChange({ source: v })}
        options={SOURCE_OPTIONS}
      />
      <Dropdown
        value={filters.city}
        onChange={(v) => onChange({ city: v })}
        options={cityOptions}
      />
      <Dropdown
        value={filters.nationality}
        onChange={(v) => onChange({ nationality: v })}
        options={NATIONALITY_OPTIONS}
      />
      <Dropdown
        value={filters.platform}
        onChange={(v) => onChange({ platform: v })}
        options={PLATFORM_OPTIONS}
      />

      <button
        type="button"
        onClick={onOpenAdvanced}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.05]"
      >
        <Filter size={13} />
        Filtre avansate
        {hasAdvanced && (
          <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-500 px-1 text-[9.5px] font-bold text-white">
            •
          </span>
        )}
      </button>
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
        className="bg-transparent text-[12.5px] text-fg focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card text-fg">{o.label}</option>
        ))}
      </select>
    </div>
  );
}
