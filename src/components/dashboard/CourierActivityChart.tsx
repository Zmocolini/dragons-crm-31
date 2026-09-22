"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CourierActivityPoint } from "@/lib/dashboard/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";

const PLATFORMS = [
  { key: "bolt", label: "Bolt", color: "#34d399" },
  { key: "wolt", label: "Wolt", color: "#38bdf8" },
  { key: "glovo", label: "Glovo", color: "#facc15" },
] as const;

const RANGES = [
  { value: 7, label: "Ultimele 7 zile", tickInterval: 0 },
  { value: 30, label: "Ultimele 30 zile", tickInterval: 3 },
  { value: 90, label: "Ultimele 90 zile", tickInterval: 11 },
] as const;

type RangeValue = (typeof RANGES)[number]["value"];

type Props = {
  data: CourierActivityPoint[];
};

function niceMax(value: number): number {
  if (value <= 0) return 50;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  let nice: number;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

export function CourierActivityChart({ data }: Props) {
  const [range, setRange] = useState<RangeValue>(30);
  const [open, setOpen] = useState(false);

  const sliced = useMemo(() => data.slice(-range), [data, range]);
  const activeRange = RANGES.find((r) => r.value === range) ?? RANGES[1];

  const { domainMax, ticks } = useMemo(() => {
    const peak = sliced.reduce((m, p) => {
      const total = Math.max(p.bolt, p.wolt, p.glovo);
      return total > m ? total : m;
    }, 0);
    const top = niceMax(Math.ceil(peak * 1.15));
    const step = top / 4;
    return {
      domainMax: top,
      ticks: [0, step, step * 2, step * 3, top].map((n) => Math.round(n)),
    };
  }, [sliced]);

  const showDots = range <= 30;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <CardTitle>Activitate curieri</CardTitle>
          <div className="flex items-center gap-4">
            {PLATFORMS.map((p) => (
              <span
                key={p.key}
                className="inline-flex items-center gap-1.5 text-[11.5px] text-fg-muted"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: p.color }}
                />
                {p.label}
              </span>
            ))}
          </div>
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
                className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-line bg-card-2 shadow-xl"
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
            <LineChart
              data={sliced}
              margin={{ top: 5, right: 6, left: -12, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                dy={6}
                interval={activeRange.tickInterval}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                domain={[0, domainMax]}
                ticks={ticks}
              />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const total = payload.reduce(
                    (sum, p) => sum + Number(p.value ?? 0),
                    0,
                  );
                  return (
                    <div className="rounded-lg border border-line bg-card-2 px-3 py-2 shadow-xl">
                      <div className="text-[15px] font-bold text-fg">
                        {total} comenzi
                      </div>
                      <div className="text-[10.5px] text-fg-dim">{label}</div>
                      <div className="mt-1.5 space-y-0.5">
                        {payload.map((p) => (
                          <div
                            key={String(p.dataKey)}
                            className="flex items-center gap-2 text-[11px]"
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ background: String(p.color) }}
                            />
                            <span className="text-fg-muted capitalize">
                              {String(p.dataKey)}
                            </span>
                            <span className="ml-auto font-mono text-fg">
                              {p.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
              {PLATFORMS.map((p) => (
                <Line
                  key={p.key}
                  type="monotone"
                  dataKey={p.key}
                  stroke={p.color}
                  strokeWidth={2}
                  dot={showDots ? { r: 2.5, strokeWidth: 0, fill: p.color } : false}
                  activeDot={{
                    r: 4,
                    strokeWidth: 2,
                    stroke: "#0b1220",
                    fill: p.color,
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
