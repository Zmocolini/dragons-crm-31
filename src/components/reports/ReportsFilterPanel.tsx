"use client";

import {
  BarChart3, ChevronDown, ChevronRight, FileBarChart, FileSpreadsheet,
  RotateCcw, TrendingUp, Trophy, Users, Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CheckRow, Chip, Popover, Select } from "./controls";
import { DateRangePicker } from "./DateRangePicker";
import { useReportFilters } from "@/lib/reports/filters-context";
import { REPORT_TYPE_LABEL, type ReportTypeKey } from "@/lib/reports/analytics";
import { PLATFORM_COLOR, type ReportPlatform } from "@/lib/reports/facts";
import { COURIER_STATUS_LABEL, type CourierStatus } from "@/lib/couriers/types";
import { cn } from "@/lib/utils/cn";

export type QuickReportKey =
  | "weekly_full"
  | "by_city"
  | "commissions"
  | "unpaid"
  | "top_performers"
  | "accounting";

const PLATFORM_CHIPS: Array<{ key: ReportPlatform; label: string }> = [
  { key: "bolt", label: "Bolt" },
  { key: "wolt", label: "Wolt" },
  { key: "glovo", label: "Glovo" },
  { key: "other", label: "Altele" },
];

const STATUS_OPTIONS: Array<{ value: CourierStatus | "all"; label: string }> = [
  { value: "all", label: "Toate statusurile" },
  ...(["active", "in_activation", "paused", "stopped", "draft"] as CourierStatus[]).map((s) => ({
    value: s,
    label: COURIER_STATUS_LABEL[s],
  })),
];

const REPORT_TYPE_OPTIONS: Array<{ value: ReportTypeKey; label: string }> = (
  ["revenue_payments", "courier_performance", "city_performance", "platform_performance", "commissions", "payments_status"] as ReportTypeKey[]
).map((t) => ({ value: t, label: REPORT_TYPE_LABEL[t] }));

const QUICK_REPORTS: Array<{ key: QuickReportKey; label: string; icon: typeof BarChart3 }> = [
  { key: "weekly_full", label: "Raport săptămânal complet", icon: FileBarChart },
  { key: "by_city", label: "Performanță pe orașe", icon: BarChart3 },
  { key: "commissions", label: "Comisioane și deduceri", icon: Wallet },
  { key: "unpaid", label: "Curieri neplătiți", icon: Users },
  { key: "top_performers", label: "Top performeri", icon: Trophy },
  { key: "accounting", label: "Raport pentru contabilitate", icon: FileSpreadsheet },
];

export function ReportsFilterPanel({
  cityOptions,
  subcontractorOptions,
  onGenerate,
  onQuick,
  canManage,
}: {
  cityOptions: string[];
  subcontractorOptions: Array<{ id: string; name: string }>;
  onGenerate: () => void;
  onQuick: (key: QuickReportKey) => void;
  canManage: boolean;
}) {
  const { filters, reset, isDirty, togglePlatform, setPeriod, setCities, setCourierStatus, setSubcontractor, setReportType } = useReportFilters();

  const citiesLabel =
    filters.cities.length === 0 ? "Toate orașele" : filters.cities.length === 1 ? filters.cities[0] : `${filters.cities.length} orașe selectate`;

  const toggleCity = (city: string) => {
    setCities(filters.cities.includes(city) ? filters.cities.filter((c) => c !== city) : [...filters.cities, city]);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* FILTRE */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-fg">Filtre raport</h3>
          <button
            type="button"
            onClick={reset}
            disabled={!isDirty}
            className={cn(
              "inline-flex items-center gap-1 text-[12px] font-medium text-[color:var(--color-info)] hover:underline",
              !isDirty && "cursor-default opacity-40 hover:no-underline",
            )}
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Perioadă */}
          <Field label="Perioadă">
            <DateRangePicker fromIso={filters.fromIso} toIso={filters.toIso} onApply={setPeriod} compact />
          </Field>

          {/* Platforme */}
          <Field label="Platforme">
            <div className="flex flex-wrap gap-1.5">
              {PLATFORM_CHIPS.map((p) => (
                <Chip
                  key={p.key}
                  active={filters.platforms.includes(p.key)}
                  color={PLATFORM_COLOR[p.key]}
                  onClick={() => togglePlatform(p.key)}
                  onRemove={() => togglePlatform(p.key)}
                >
                  {p.label}
                </Chip>
              ))}
            </div>
          </Field>

          {/* Orașe */}
          <Field label="Orașe">
            <Popover
              className="w-[240px] max-h-[280px] overflow-y-auto p-2"
              trigger={({ toggle, open }) => (
                <button
                  type="button"
                  onClick={toggle}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]",
                    open && "border-accent/60",
                  )}
                >
                  <span className="truncate">{citiesLabel}</span>
                  <ChevronDown size={14} className="shrink-0 text-fg-dim" />
                </button>
              )}
            >
              {() => (
                <div className="flex flex-col">
                  <CheckRow checked={filters.cities.length === 0} label="Toate orașele" onToggle={() => setCities([])} />
                  <div className="my-1 border-t border-line/60" />
                  {cityOptions.map((c) => (
                    <CheckRow key={c} checked={filters.cities.includes(c)} label={c} onToggle={() => toggleCity(c)} />
                  ))}
                </div>
              )}
            </Popover>
          </Field>

          {/* Status curieri */}
          <Field label="Status curieri">
            <Select value={filters.courierStatus} options={STATUS_OPTIONS} onChange={setCourierStatus} ariaLabel="Status curieri" />
          </Field>

          {/* Subcontractor (extra util pentru scoping) */}
          {subcontractorOptions.length > 0 && (
            <Field label="Subcontractor">
              <Select
                value={filters.subcontractorId}
                options={[{ value: "all", label: "Toți subcontractorii" }, ...subcontractorOptions.map((s) => ({ value: s.id, label: s.name }))]}
                onChange={setSubcontractor}
                ariaLabel="Subcontractor"
              />
            </Field>
          )}

          {/* Tip raport */}
          <Field label="Tip raport">
            <Select value={filters.reportType} options={REPORT_TYPE_OPTIONS} onChange={setReportType} ariaLabel="Tip raport" />
          </Field>

          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(99,102,241,0.55)]"
          >
            <BarChart3 size={15} /> Generează raport
          </button>
        </div>
      </Card>

      {/* RAPOARTE RAPIDE */}
      <Card className="p-4">
        <h3 className="mb-3 text-[14px] font-semibold text-fg">Rapoarte rapide</h3>
        <div className="flex flex-col gap-1">
          {QUICK_REPORTS.map((q) => {
            const Icon = q.icon;
            const disabled = q.key === "accounting" && !canManage;
            return (
              <button
                key={q.key}
                type="button"
                disabled={disabled}
                onClick={() => onQuick(q.key)}
                className={cn(
                  "group flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium text-fg-muted hover:bg-white/[0.05] hover:text-fg",
                  disabled && "cursor-not-allowed opacity-40",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={15} className="text-fg-dim group-hover:text-[color:var(--color-accent-3)]" />
                  {q.label}
                </span>
                <ChevronRight size={14} className="text-fg-dim opacity-0 group-hover:opacity-100" />
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">{label}</label>
      {children}
    </div>
  );
}
