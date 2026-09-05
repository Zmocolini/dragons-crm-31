"use client";

import { ChevronDown } from "lucide-react";
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

type Props = {
  data: CourierActivityPoint[];
};

export function CourierActivityChart({ data }: Props) {
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
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-2 px-2.5 py-1.5 text-[11.5px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          Ultimele 30 zile
          <ChevronDown size={12} />
        </button>
      </CardHeader>
      <CardBody className="pl-1 pr-3 pb-3">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 6, left: -12, bottom: 4 }}
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
                domain={[0, 200]}
                ticks={[0, 50, 100, 150, 200]}
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
                  dot={{ r: 2.5, strokeWidth: 0, fill: p.color }}
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
