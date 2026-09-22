"use client";

import { cn } from "@/lib/utils/cn";

export type ReportTab =
  | "overview"
  | "couriers"
  | "cities"
  | "platforms"
  | "payments"
  | "commissions";

export const REPORT_TABS: Array<{ key: ReportTab; label: string }> = [
  { key: "overview", label: "Prezentare generală" },
  { key: "couriers", label: "Performanță curieri" },
  { key: "cities", label: "Performanță orașe" },
  { key: "platforms", label: "Performanță platforme" },
  { key: "payments", label: "Situație plăți" },
  { key: "commissions", label: "Comisioane" },
];

export function ReportsTabs({ active, onChange }: { active: ReportTab; onChange: (t: ReportTab) => void }) {
  return (
    <div className="overflow-x-auto border-b border-line">
      <div className="flex min-w-max items-center gap-1">
        {REPORT_TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={cn(
                "relative whitespace-nowrap px-3 py-2.5 text-[13px] font-medium transition-colors",
                isActive ? "text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              {t.label}
              {isActive && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
