"use client";

import { ArrowUp, ChevronDown } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenuePoint, Trend } from "@/lib/dashboard/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";

type Props = {
  data: RevenuePoint[];
  trend: Trend;
};

function formatK(value: number) {
  return `${Math.round(value / 1000)}K`;
}

function formatRon(value: number) {
  return `${value.toLocaleString("ro-RO")} RON`;
}

export function WeeklyRevenueChart({ data, trend }: Props) {
  const max = Math.max(...data.map((d) => d.amount));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <CardTitle>Venituri săptămânale</CardTitle>
          <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-emerald-400">
            <ArrowUp size={11} strokeWidth={2.5} />
            {trend.value}
            <span className="ml-1 text-fg-muted">față de perioada precedentă</span>
          </span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-2 px-2.5 py-1.5 text-[11.5px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          Ultimele 8 săptămâni
          <ChevronDown size={12} />
        </button>
      </CardHeader>
      <CardBody className="pl-1 pr-3 pb-3">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 6, right: 6, left: -12, bottom: 4 }}
              barCategoryGap="28%"
            >
              <CartesianGrid strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                dy={6}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={formatK}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0];
                  return (
                    <div className="rounded-lg border border-line bg-card-2 px-3 py-2 shadow-xl">
                      <div className="text-[13.5px] font-bold text-fg">
                        {formatRon(Number(p.value))}
                      </div>
                      <div className="text-[10.5px] text-fg-dim">
                        Săptămâna {String(p.payload.label).replace(/[^0-9]/g, "")}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {data.map((d) => (
                  <Cell
                    key={d.label}
                    fill={d.amount === max ? "#7c3aed" : "#3b82f6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
