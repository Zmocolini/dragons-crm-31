"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { RevenueChart } from "./RevenueChart";
import { PlatformDonut } from "./PlatformDonut";
import { PaymentStatusDonut } from "./PaymentStatusDonut";
import { FinancialTable } from "./FinancialTable";
import { CourierAvatar, StatusDot } from "./bits";
import { EmptyState, ProgressBar } from "./controls";
import { formatInt, formatRon, type CityRow, type CourierPerfRow, type DistributionMetric } from "@/lib/reports/analytics";
import type { useReportData } from "@/lib/reports/use-report-data";
import type { CourierPayState } from "@/lib/reports/facts";

type Data = ReturnType<typeof useReportData>;

const CITY_BAR_COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#0ea5e9", "#22c55e"];

export function OverviewTab({
  data,
  metric,
  onMetricChange,
  onSeeCities,
  onSeeCouriers,
  onSelectPayState,
  selectedPayState,
  onOpenCourier,
  onExportExcel,
}: {
  data: Data;
  metric: DistributionMetric;
  onMetricChange: (m: DistributionMetric) => void;
  onSeeCities: () => void;
  onSeeCouriers: () => void;
  onSelectPayState: (s: CourierPayState) => void;
  selectedPayState: CourierPayState | null;
  onOpenCourier: (row: CourierPerfRow) => void;
  onExportExcel: () => void;
}) {
  const topCities = data.cities.slice(0, 5);
  const topCouriers = data.couriers.slice(0, 5);
  const maxCityGross = Math.max(1, ...topCities.map((c) => c.gross));

  return (
    <div className="flex flex-col gap-4">
      {/* Rândul 1: evoluție + donut platforme */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
        <RevenueChart data={data.series} />
        <PlatformDonut slices={data.distribution.slices} total={data.distribution.total} metric={metric} onMetricChange={onMetricChange} />
      </div>

      {/* Rândul 2: top orașe + performanță curieri + status plăți */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <TopCitiesCard rows={topCities} maxGross={maxCityGross} onSeeAll={onSeeCities} />
        <CourierPerformanceCard rows={topCouriers} onSeeAll={onSeeCouriers} onOpen={onOpenCourier} />
        <PaymentStatusDonut breakdown={data.payStatus} onSelect={onSelectPayState} selected={selectedPayState} />
      </div>

      {/* Rândul 3: situație financiară */}
      <FinancialTable rows={data.financial.rows} total={data.financial.total} onExportExcel={onExportExcel} />
    </div>
  );
}

function TopCitiesCard({ rows, maxGross, onSeeAll }: { rows: CityRow[]; maxGross: number; onSeeAll: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top orașe după venituri</CardTitle>
        <button type="button" onClick={onSeeAll} className="text-[12px] font-medium text-[color:var(--color-info)] hover:underline">
          Vezi toate
        </button>
      </CardHeader>
      <CardBody>
        {rows.length === 0 ? (
          <EmptyState title="Fără date." />
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((c, i) => (
              <div key={c.city} className="flex items-center gap-3">
                <span className="w-3 text-[12px] font-semibold text-fg-dim tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-[12.5px] font-medium text-fg">{c.city}</span>
                    <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-fg">{formatRon(c.gross)}</span>
                  </div>
                  <ProgressBar pct={(c.gross / maxGross) * 100} color={CITY_BAR_COLORS[i % CITY_BAR_COLORS.length]} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function CourierPerformanceCard({
  rows,
  onSeeAll,
  onOpen,
}: {
  rows: CourierPerfRow[];
  onSeeAll: () => void;
  onOpen: (row: CourierPerfRow) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performanță curieri</CardTitle>
        <button type="button" onClick={onSeeAll} className="text-[12px] font-medium text-[color:var(--color-info)] hover:underline">
          Vezi toți
        </button>
      </CardHeader>
      <CardBody className="px-0">
        {rows.length === 0 ? (
          <EmptyState title="Fără date." />
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-wide text-fg-dim">
                <th className="px-5 pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Nume</th>
                <th className="pb-2 text-right font-medium">Comenzi</th>
                <th className="pb-2 text-right font-medium">Venit brut</th>
                <th className="px-5 pb-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={c.id} className="border-t border-line/60 hover:bg-white/[0.02]">
                  <td className="px-5 py-2 text-fg-dim tabular-nums">{i + 1}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      className="flex items-center gap-2 text-left hover:underline"
                      title={c.isReal ? "Deschide profilul curierului" : "Curier agregat"}
                    >
                      <CourierAvatar name={c.name} size={22} />
                      <span className="max-w-[110px] truncate font-medium text-fg">{c.name}</span>
                    </button>
                  </td>
                  <td className="py-2 text-right tabular-nums text-fg-muted">{formatInt(c.orders)}</td>
                  <td className="py-2 text-right tabular-nums font-medium text-fg">{formatRon(c.gross)}</td>
                  <td className="px-5 py-2 text-right">
                    <StatusDot status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardBody>
    </Card>
  );
}
