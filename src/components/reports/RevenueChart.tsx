"use client";

import { useState } from "react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "./controls";
import { formatRon, type RevenuePoint } from "@/lib/reports/analytics";

type SeriesKey = "gross" | "commission" | "paid";

const SERIES: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: "gross", label: "Venit brut", color: "#3b82f6" },
  { key: "commission", label: "Comisioane", color: "#8b5cf6" },
  { key: "paid", label: "Plăți efectuate", color: "#22c55e" },
];

const RO_MONTHS = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"];
function fullDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${RO_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function kFmt(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: RevenuePoint }> }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-card/95 px-3 py-2 shadow-xl backdrop-blur">
      <div className="mb-1.5 text-[11.5px] font-semibold text-fg">{fullDate(p.dateIso)}</div>
      <div className="flex flex-col gap-1">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-6 text-[11.5px]">
            <span className="flex items-center gap-1.5 text-fg-muted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
            <span className="font-semibold tabular-nums text-fg">{formatRon(p[s.key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set());
  const toggle = (k: SeriesKey) =>
    setHidden((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const hasData = data.some((d) => d.gross > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evoluția veniturilor</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          {SERIES.map((s) => {
            const off = hidden.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium transition-opacity"
                style={{ opacity: off ? 0.4 : 1 }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className={off ? "text-fg-dim line-through" : "text-fg-muted"}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardBody>
        {!hasData ? (
          <EmptyState title="Nu există date pentru perioada și filtrele selectate." />
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis tickFormatter={kFmt} tickLine={false} axisLine={false} width={44} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.15)", strokeDasharray: "4 4" }} />
                {SERIES.filter((s) => !hidden.has(s.key)).map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    stroke={s.color}
                    strokeWidth={2.2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
