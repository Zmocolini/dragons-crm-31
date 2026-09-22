"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "./controls";
import { formatInt, type PayStatusBreakdown } from "@/lib/reports/analytics";
import type { CourierPayState } from "@/lib/reports/facts";
import { cn } from "@/lib/utils/cn";

const ROWS: Array<{ key: CourierPayState; label: string; color: string }> = [
  { key: "paid", label: "Plătit", color: "#34d399" },
  { key: "in_progress", label: "În proces", color: "#facc15" },
  { key: "unpaid", label: "Neplătit", color: "#f43f5e" },
];

export function PaymentStatusDonut({
  breakdown,
  onSelect,
  selected,
}: {
  breakdown: PayStatusBreakdown;
  onSelect: (s: CourierPayState) => void;
  selected: CourierPayState | null;
}) {
  const data = ROWS.map((r) => ({
    key: r.key,
    label: r.label,
    color: r.color,
    value: r.key === "paid" ? breakdown.paid : r.key === "in_progress" ? breakdown.inProgress : breakdown.unpaid,
  })).filter((d) => d.value > 0);

  const pct = (v: number) => (breakdown.total > 0 ? Math.round((v / breakdown.total) * 100) : 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status plăți</CardTitle>
      </CardHeader>
      <CardBody>
        {breakdown.total === 0 ? (
          <EmptyState title="Niciun curier pentru filtrele selectate." />
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative h-[160px] w-[160px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={52} outerRadius={74} paddingAngle={2} stroke="none" isAnimationActive={false}>
                    {data.map((d) => (
                      <Cell key={d.key} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[20px] font-bold tabular-nums text-fg">{formatInt(breakdown.total)}</div>
                <div className="text-[10px] uppercase tracking-wide text-fg-dim">curieri</div>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2">
              {ROWS.map((r) => {
                const val = r.key === "paid" ? breakdown.paid : r.key === "in_progress" ? breakdown.inProgress : breakdown.unpaid;
                const isSel = selected === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => onSelect(r.key)}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                      isSel ? "border-accent/50 bg-white/[0.04]" : "border-transparent hover:bg-white/[0.04]",
                    )}
                  >
                    <span className="flex items-center gap-2 text-[12.5px] font-medium text-fg">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                      {r.label}
                    </span>
                    <span className="text-[12px] tabular-nums text-fg-muted">
                      {formatInt(val)} <span className="text-fg-dim">({pct(val)}%)</span>
                    </span>
                  </button>
                );
              })}
              <p className="mt-1 text-[10.5px] text-fg-dim">Apasă o categorie pentru a filtra curierii.</p>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
