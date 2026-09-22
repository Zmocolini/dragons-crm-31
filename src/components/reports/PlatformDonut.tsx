"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState, Select } from "./controls";
import {
  DISTRIBUTION_METRIC_LABEL, formatInt, formatRon,
  type DistributionMetric, type DonutSlice,
} from "@/lib/reports/analytics";

const METRIC_OPTIONS: Array<{ value: DistributionMetric; label: string }> = (
  ["gross", "orders", "commission", "payments", "couriers"] as DistributionMetric[]
).map((m) => ({ value: m, label: DISTRIBUTION_METRIC_LABEL[m] }));

function fmtValue(metric: DistributionMetric, v: number): string {
  return metric === "orders" || metric === "couriers" ? formatInt(v) : formatRon(v);
}

export function PlatformDonut({
  slices,
  total,
  metric,
  onMetricChange,
}: {
  slices: DonutSlice[];
  total: number;
  metric: DistributionMetric;
  onMetricChange: (m: DistributionMetric) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuție pe platforme</CardTitle>
        <Select value={metric} options={METRIC_OPTIONS} onChange={onMetricChange} className="w-[140px]" ariaLabel="Metrică distribuție" />
      </CardHeader>
      <CardBody>
        {slices.length === 0 ? (
          <EmptyState title="Nu există date pentru filtrele selectate." />
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative h-[180px] w-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {slices.map((s) => (
                      <Cell key={s.key} fill={s.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[18px] font-bold tabular-nums text-fg">
                  {metric === "orders" || metric === "couriers" ? formatInt(total) : formatInt(total)}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-fg-dim">
                  {metric === "orders" ? "comenzi" : metric === "couriers" ? "curieri" : "RON"}
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2.5">
              {slices.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[12.5px] font-medium text-fg">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                  <span className="flex items-baseline gap-2 text-right">
                    <span className="text-[12.5px] font-bold tabular-nums text-fg">{s.pct}%</span>
                    <span className="text-[11px] tabular-nums text-fg-dim">{fmtValue(metric, s.value)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
