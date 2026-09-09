"use client";

import type { PaymentStatus } from "@/lib/payments/types";
import { cn } from "@/lib/utils/cn";

export type PaymentTabKey = "all" | "in_review" | "partial" | "paid" | "problems";

export const PAYMENT_TABS: Array<{ key: PaymentTabKey; label: string }> = [
  { key: "all",       label: "Toate plățile" },
  { key: "in_review", label: "De verificat" },
  { key: "partial",   label: "În proces" },
  { key: "paid",      label: "Plătite" },
  { key: "problems",  label: "Probleme" },
];

/** Un status aparține tab-ului dat? */
export function tabMatches(tab: PaymentTabKey, status: PaymentStatus): boolean {
  switch (tab) {
    case "all":       return true;
    case "in_review": return status === "in_review";
    case "partial":   return status === "partial";
    case "paid":      return status === "paid";
    case "problems":  return status === "issue" || status === "blocked";
  }
}

export function PaymentsStatusTabs({
  active, counts, onChange,
}: {
  active: PaymentTabKey;
  counts: Record<PaymentTabKey, number>;
  onChange: (t: PaymentTabKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-line/60">
      {PAYMENT_TABS.map((t) => {
        const on = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "relative -mb-px inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-[12.5px] font-medium transition-colors",
              on ? "border-b-2 border-violet-500 text-fg" : "border-b-2 border-transparent text-fg-dim hover:text-fg",
            )}
          >
            {t.label}
            <span className={cn(
              "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
              on ? "bg-violet-500/20 text-violet-200" : "bg-white/[0.06] text-fg-dim",
            )}>
              {counts[t.key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
