"use client";

import { useMemo, useState } from "react";
import { ArrowUp, Check, ChevronDown } from "lucide-react";
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

const RANGES = [
  { value: 4, label: "Ultimele 4 săptămâni" },
  { value: 8, label: "Ultimele 8 săptămâni" },
  { value: 12, label: "Ultimele 12 săptămâni" },
] as const;

type RangeValue = (typeof RANGES)[number]["value"];

function formatK(value: number) {
  return `${Math.round(value / 1000)}K`;
}

function formatRon(value: number) {
  return `${value.toLocaleString("ro-RO")} RON`;
}

function computeTrend(sliced: RevenuePoint[]): Trend | null {
  if (sliced.length < 2) return null;
  const half = Math.max(1, Math.floor(sliced.length / 2));
  const prev = sliced.slice(0, half).reduce((s, p) => s + p.amount, 0);
  const curr = sliced.slice(-half).reduce((s, p) => s + p.amount, 0);
  if (prev === 0) return null;
  const delta = ((curr - prev) / prev) * 100;
  const direction: Trend["direction"] = delta >= 0 ? "up" : "down";
  const sign = delta >= 0 ? "+" : "";
  return { direction, value: `${sign}${delta.toFixed(0)}%` };
}

export function WeeklyRevenueChart({ data, trend }: Props) {
  const [range, setRange] = useState<RangeValue>(8);
  const [open, setOpen] = useState(false);

  const sliced = useMemo(() => data.slice(-range), [data, range]);
  const max = useMemo(() => Math.max(...sliced.map((d) => d.amount)), [sliced]);
  const activeTrend = useMemo(() => computeTrend(sliced) ?? trend, [sliced, trend]);
  const activeRange = RANGES.find((r) => r.value === range) ?? RANGES[1];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <CardTitle>Venituri săptămânale</CardTitle>
          <span
            className={`inline-flex items-center gap-1 text-[11.5px] font-medium ${
              activeTrend.direction === "up" ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            <ArrowUp
              size={11}
              strokeWidth={2.5}
              className={activeTrend.direction === "down" ? "rotate-180" : ""}
            />
            {activeTrend.value}
            <span className="ml-1 text-fg-muted">față de perioada precedentă</span>
          </span>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-2 px-2.5 py-1.5 text-[11.5px] font-medium text-fg-muted transition-colors hover:text-fg"
          >
            {activeRange.label}
            <ChevronDown
              size={12}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          {open ? (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <ul
                role="listbox"
                className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-line bg-card-2 shadow-xl"
              >
                {RANGES.map((r) => {
                  const selected = r.value === range;
                  return (
                    <li key={r.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setRange(r.value);
                          setOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] transition-colors hover:bg-white/5 ${
                          selected ? "text-fg" : "text-fg-muted"
                        }`}
                      >
                        <span>{r.label}</span>
                        {selected ? <Check size={12} className="text-emerald-400" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
      </CardHeader>
      <CardBody className="pl-1 pr-3 pb-3">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sliced}
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
                {sliced.map((d) => (
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
