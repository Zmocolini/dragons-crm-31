"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import type { ActivationStats } from "@/lib/dashboard/types";

type Props = {
  stats: ActivationStats;
};

export function ActivationStatusCard({ stats }: Props) {
  const data = [
    { name: "Finalizate", value: stats.completed, color: "#22c55e" },
    { name: "În proces", value: stats.inProgress, color: "#f59e0b" },
    { name: "Blocate", value: stats.blocked, color: "#ef4444" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status activări</CardTitle>
      </CardHeader>
      <CardBody className="pt-1">
        <div className="flex items-center gap-4">
          <div className="relative h-[104px] w-[104px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={50}
                  paddingAngle={2}
                  stroke="transparent"
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[20px] font-bold leading-none text-emerald-400">
                {stats.completionRate}%
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="text-[11.5px] text-fg-muted">
              Total: <span className="font-semibold text-fg">{stats.total}</span>
            </div>
            <Legend
              color="#22c55e"
              label="Finalizate"
              value={stats.completed}
            />
            <Legend
              color="#f59e0b"
              label="În proces"
              value={stats.inProgress}
            />
            <Legend color="#ef4444" label="Blocate" value={stats.blocked} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function Legend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: color }}
      />
      <span className="flex-1 text-fg-muted">{label}</span>
      <span className="font-mono font-semibold text-fg">{value}</span>
    </div>
  );
}
