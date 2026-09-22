"use client";

import { Banknote, Package, Percent, Users, Wallet, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DeltaPill } from "./controls";
import { formatInt, formatRon, type Kpi } from "@/lib/reports/analytics";

type KpiCardDef = {
  key: string;
  icon: LucideIcon;
  iconTint: string;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
  delta?: number;
  deltaTone?: "auto" | "info";
};

export function ReportsKpiCards({ kpi }: { kpi: Kpi }) {
  const cards: KpiCardDef[] = [
    {
      key: "gross",
      icon: Wallet,
      iconTint: "bg-info/12",
      iconColor: "text-[color:var(--color-info)]",
      label: "Venit brut total",
      value: formatRon(kpi.grossTotal),
      sub: "vs. perioada anterioară",
      delta: kpi.grossDelta,
    },
    {
      key: "commission",
      icon: Percent,
      iconTint: "bg-accent/15",
      iconColor: "text-[color:var(--color-accent-3)]",
      label: "Comisioane",
      value: formatRon(kpi.commissions),
      sub: `${kpi.commissionPct}% din total`,
      delta: kpi.commissionPct,
      deltaTone: "info",
    },
    {
      key: "couriers",
      icon: Users,
      iconTint: "bg-success/12",
      iconColor: "text-[color:var(--color-success)]",
      label: "Curieri activi",
      value: formatInt(kpi.activeCouriers),
      sub: `din ${formatInt(kpi.rosterCouriers)} total`,
      delta: kpi.activeDelta,
    },
    {
      key: "orders",
      icon: Package,
      iconTint: "bg-info/12",
      iconColor: "text-[color:var(--color-info)]",
      label: "Total comenzi",
      value: formatInt(kpi.totalOrders),
      sub: `medie ${kpi.ordersPerCourier} / curier`,
      delta: kpi.ordersDelta,
    },
    {
      key: "payments",
      icon: Banknote,
      iconTint: "bg-success/12",
      iconColor: "text-[color:var(--color-success)]",
      label: "Plăți efectuate",
      value: formatRon(kpi.paymentsMade),
      sub: `${kpi.paymentsPct}% din total`,
      delta: kpi.paymentsDelta,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.key} className="min-w-0 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.iconTint}`}>
                <Icon size={17} className={c.iconColor} />
              </div>
              {c.delta !== undefined && <DeltaPill value={c.delta} tone={c.deltaTone} />}
            </div>
            <div className="mt-3 truncate text-[12px] font-medium text-fg-muted">{c.label}</div>
            <div className="mt-0.5 truncate text-[19px] font-bold tracking-tight text-fg tabular-nums">{c.value}</div>
            <div className="mt-0.5 truncate text-[11.5px] text-fg-dim">{c.sub}</div>
          </Card>
        );
      })}
    </div>
  );
}
