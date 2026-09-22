"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronRight, Clock, CreditCard, FileText, ShieldAlert } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { CouriersStats } from "@/lib/couriers/filters";
import type { QuickFilterKey } from "@/lib/couriers/filters";

type Row = {
  key: QuickFilterKey;
  label: string;
  icon: LucideIcon;
  tone: "warn" | "danger" | "neutral" | "info";
  value: number;
};

type Props = {
  stats: CouriersStats;
  activeFilter: QuickFilterKey;
  onSelect: (key: QuickFilterKey) => void;
};

const TONE: Record<Row["tone"], string> = {
  warn:    "text-amber-400 bg-amber-500/10",
  danger:  "text-rose-400 bg-rose-500/10",
  neutral: "text-fg-muted bg-white/[0.05]",
  info:    "text-sky-400 bg-sky-500/10",
};

export function QuickFiltersCard({ stats, activeFilter, onSelect }: Props) {
  const rows: Row[] = [
    { key: "docs_missing",       label: "Necesită documente",     icon: FileText,    tone: "warn",   value: stats.documentsMissing },
    { key: "activation_blocked", label: "Activări blocate",       icon: ShieldAlert, tone: "danger", value: stats.activationBlocked },
    { key: "no_activity_7d",     label: "Fără activitate 7 zile", icon: Clock,       tone: "neutral", value: stats.noActivity7d },
    { key: "pending_payment",    label: "Plăți în așteptare",     icon: CreditCard,  tone: "info",   value: stats.pendingPayment },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtre rapide</CardTitle>
      </CardHeader>
      <CardBody className="px-2 pb-2 pt-0">
        <ul className="space-y-1">
          {rows.map((row) => {
            const Icon = row.icon;
            const isActive = activeFilter === row.key;
            return (
              <li key={row.key}>
                <button
                  type="button"
                  onClick={() => onSelect(isActive ? "all" : row.key)}
                  aria-pressed={isActive}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    isActive ? "bg-indigo-500/10 ring-1 ring-indigo-400/40" : "hover:bg-white/[0.03]",
                  )}
                >
                  <span className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", TONE[row.tone])}>
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <span className={cn("flex-1 truncate text-[12.5px] font-medium", isActive ? "text-fg" : "text-fg-muted")}>
                    {row.label}
                  </span>
                  <span className="tabular-nums text-[12.5px] font-semibold text-fg">{row.value}</span>
                  <ChevronRight size={12} className="text-fg-dim group-hover:text-fg-muted" />
                </button>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
