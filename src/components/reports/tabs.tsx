"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { CourierAvatar, PayStateBadge, StatusDot } from "./bits";
import { EmptyState, ProgressBar, Select } from "./controls";
import {
  cityAggregation, filterFacts, previousPeriod,
  formatInt, formatPct, formatRon,
  type CityRow, type CourierPerfRow,
} from "@/lib/reports/analytics";
import { PLATFORM_COLOR, PLATFORM_LABEL, PAY_STATE_LABEL, type CourierPayState, type ReportPlatform } from "@/lib/reports/facts";
import type { useReportData } from "@/lib/reports/use-report-data";
import { cn } from "@/lib/utils/cn";

type Data = ReturnType<typeof useReportData>;

// ── Sort helper ──────────────────────────────────────────────────────────────
function useSort<K extends string>(initial: K, dir: "asc" | "desc" = "desc") {
  const [sort, setSort] = useState<{ key: K; dir: "asc" | "desc" }>({ key: initial, dir });
  const toggle = (key: K) => setSort((p) => (p.key === key ? { key, dir: p.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  return { sort, toggle };
}

function SortHead({ label, active, dir, onClick, align = "right" }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void; align?: "left" | "right" }) {
  return (
    <th className={cn("pb-2 font-medium", align === "right" ? "text-right" : "text-left")}>
      <button type="button" onClick={onClick} className={cn("inline-flex items-center gap-1 hover:text-fg", active ? "text-fg" : "text-fg-dim")}>
        {align === "right" && (active ? dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} /> : <ChevronsUpDown size={11} />)}
        {label}
        {align === "left" && (active ? dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} /> : <ChevronsUpDown size={11} />)}
      </button>
    </th>
  );
}

// ═════════════════════════════════════ CURIERI ══════════════════════════════
type CourierSortKey = "orders" | "gross" | "commission" | "deductions" | "net" | "performanceScore" | "name";

export function CouriersTab({ data, onOpenCourier, payStateFilter }: { data: Data; onOpenCourier: (r: CourierPerfRow) => void; payStateFilter: CourierPayState | null }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { sort, toggle } = useSort<CourierSortKey>("gross");
  const PAGE = 12;

  const filtered = useMemo(() => {
    let rows = data.couriers;
    if (payStateFilter) rows = rows.filter((r) => r.payState === payStateFilter);
    const term = q.trim().toLowerCase();
    if (term) rows = rows.filter((r) => r.name.toLowerCase().includes(term) || r.city.toLowerCase().includes(term));
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sort.key === "name") return a.name.localeCompare(b.name) * dir;
      return ((a[sort.key] as number) - (b[sort.key] as number)) * dir;
    });
  }, [data.couriers, q, sort, payStateFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performanță curieri {payStateFilter && <span className="ml-1 text-[12px] font-normal text-fg-dim">· {PAY_STATE_LABEL[payStateFilter]}</span>}</CardTitle>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-dim" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Caută curier / oraș..." className="w-[220px] rounded-lg border border-line bg-card-hover py-1.5 pl-8 pr-3 text-[12px] text-fg outline-none focus:border-accent/60" />
        </div>
      </CardHeader>
      <CardBody className="px-0">
        {rows.length === 0 ? (
          <EmptyState title="Nu există curieri pentru filtrele selectate." hint="Ajustează perioada sau filtrele din panoul din dreapta." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[12px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wide">
                  <th className="px-5 pb-2 text-left font-medium text-fg-dim">#</th>
                  <SortHead label="Curier" active={sort.key === "name"} dir={sort.dir} onClick={() => toggle("name")} align="left" />
                  <th className="pb-2 text-left font-medium text-fg-dim">Platformă</th>
                  <th className="pb-2 text-left font-medium text-fg-dim">Oraș</th>
                  <SortHead label="Comenzi" active={sort.key === "orders"} dir={sort.dir} onClick={() => toggle("orders")} />
                  <SortHead label="Venit" active={sort.key === "gross"} dir={sort.dir} onClick={() => toggle("gross")} />
                  <SortHead label="Comision" active={sort.key === "commission"} dir={sort.dir} onClick={() => toggle("commission")} />
                  <SortHead label="Deduceri" active={sort.key === "deductions"} dir={sort.dir} onClick={() => toggle("deductions")} />
                  <SortHead label="De încasat" active={sort.key === "net"} dir={sort.dir} onClick={() => toggle("net")} />
                  <th className="pb-2 text-left font-medium text-fg-dim">Status</th>
                  <th className="pb-2 text-left font-medium text-fg-dim">Plată</th>
                  <SortHead label="Scor" active={sort.key === "performanceScore"} dir={sort.dir} onClick={() => toggle("performanceScore")} />
                  <th className="px-5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={c.id} className="border-t border-line/60 hover:bg-white/[0.02]">
                    <td className="px-5 py-2 text-fg-dim tabular-nums">{(safePage - 1) * PAGE + i + 1}</td>
                    <td className="py-2">
                      <button type="button" onClick={() => onOpenCourier(c)} className="flex items-center gap-2 text-left hover:underline">
                        <CourierAvatar name={c.name} size={22} />
                        <span className="max-w-[130px] truncate font-medium text-fg">{c.name}</span>
                      </button>
                    </td>
                    <td className="py-2">
                      <span className="inline-flex items-center gap-1.5 text-fg-muted">
                        <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: PLATFORM_COLOR[c.platform] }} />
                        {PLATFORM_LABEL[c.platform]}
                      </span>
                    </td>
                    <td className="py-2 text-fg-muted">{c.city}</td>
                    <td className="py-2 text-right tabular-nums text-fg-muted">{formatInt(c.orders)}</td>
                    <td className="py-2 text-right tabular-nums font-medium text-fg">{formatRon(c.gross)}</td>
                    <td className="py-2 text-right tabular-nums text-fg-muted">{formatRon(c.commission)}</td>
                    <td className="py-2 text-right tabular-nums text-fg-muted">{formatRon(c.deductions)}</td>
                    <td className="py-2 text-right tabular-nums text-[color:var(--color-success)]">{formatRon(c.net)}</td>
                    <td className="py-2"><StatusDot status={c.status} /></td>
                    <td className="py-2"><PayStateBadge state={c.payState} /></td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-10"><ProgressBar pct={c.performanceScore} color="#8b5cf6" /></div>
                        <span className="w-6 text-right text-[11px] tabular-nums text-fg-dim">{c.performanceScore}</span>
                      </div>
                    </td>
                    <td className="px-5" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > PAGE && (
          <div className="flex items-center justify-between px-5 pt-3 text-[12px] text-fg-muted">
            <span>{filtered.length} curieri · pagina {safePage}/{pageCount}</span>
            <div className="flex gap-1.5">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className={cn("rounded-lg border border-line px-2.5 py-1", safePage <= 1 && "opacity-40")}>Înapoi</button>
              <button type="button" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)} className={cn("rounded-lg border border-line px-2.5 py-1", safePage >= pageCount && "opacity-40")}>Înainte</button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ═════════════════════════════════════ ORAȘE ════════════════════════════════
type CitySortKey = "gross" | "orders" | "activeCouriers" | "commission" | "avgRevenuePerCourier" | "ordersPerCourier";

export function CitiesTab({ data }: { data: Data }) {
  const { sort, toggle } = useSort<CitySortKey>("gross");

  const prevByCity = useMemo(() => {
    const prev = previousPeriod(data.filters.fromIso, data.filters.toIso);
    const rows = cityAggregation(data.bundle, { ...data.filters, fromIso: prev.fromIso, toIso: prev.toIso });
    return new Map(rows.map((r) => [r.city, r.gross]));
  }, [data.bundle, data.filters]);

  const rows = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...data.cities].sort((a, b) => ((a[sort.key] as number) - (b[sort.key] as number)) * dir);
  }, [data.cities, sort]);

  const evolution = (c: CityRow) => {
    const prev = prevByCity.get(c.city) ?? 0;
    if (prev <= 0) return c.gross > 0 ? 100 : 0;
    return Math.round(((c.gross - prev) / prev) * 1000) / 10;
  };

  return (
    <Card>
      <CardHeader><CardTitle>Performanță orașe</CardTitle></CardHeader>
      <CardBody className="px-0">
        {rows.length === 0 ? (
          <EmptyState title="Fără date pentru filtrele selectate." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[12px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wide">
                  <th className="px-5 pb-2 text-left font-medium text-fg-dim">Oraș</th>
                  <SortHead label="Curieri activi" active={sort.key === "activeCouriers"} dir={sort.dir} onClick={() => toggle("activeCouriers")} />
                  <SortHead label="Comenzi" active={sort.key === "orders"} dir={sort.dir} onClick={() => toggle("orders")} />
                  <SortHead label="Venit brut" active={sort.key === "gross"} dir={sort.dir} onClick={() => toggle("gross")} />
                  <SortHead label="Comisioane" active={sort.key === "commission"} dir={sort.dir} onClick={() => toggle("commission")} />
                  <SortHead label="Venit/curier" active={sort.key === "avgRevenuePerCourier"} dir={sort.dir} onClick={() => toggle("avgRevenuePerCourier")} />
                  <SortHead label="Comenzi/curier" active={sort.key === "ordersPerCourier"} dir={sort.dir} onClick={() => toggle("ordersPerCourier")} />
                  <th className="pb-2 pr-5 text-right font-medium text-fg-dim">Evoluție</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const ev = evolution(c);
                  return (
                    <tr key={c.city} className="border-t border-line/60 hover:bg-white/[0.02]">
                      <td className="px-5 py-2.5 font-medium text-fg">{c.city}</td>
                      <td className="py-2.5 text-right tabular-nums text-fg-muted">{formatInt(c.activeCouriers)}</td>
                      <td className="py-2.5 text-right tabular-nums text-fg-muted">{formatInt(c.orders)}</td>
                      <td className="py-2.5 text-right tabular-nums font-medium text-fg">{formatRon(c.gross)}</td>
                      <td className="py-2.5 text-right tabular-nums text-fg-muted">{formatRon(c.commission)}</td>
                      <td className="py-2.5 text-right tabular-nums text-fg-muted">{formatRon(c.avgRevenuePerCourier)}</td>
                      <td className="py-2.5 text-right tabular-nums text-fg-muted">{formatInt(c.ordersPerCourier)}</td>
                      <td className="py-2.5 pr-5 text-right">
                        <span className={cn("text-[11.5px] font-semibold tabular-nums", ev > 0 ? "text-[color:var(--color-success)]" : ev < 0 ? "text-[color:var(--color-danger)]" : "text-fg-dim")}>
                          {formatPct(ev)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ═════════════════════════════════════ PLATFORME ════════════════════════════
export function PlatformsTab({ data }: { data: Data }) {
  const { rows, total } = data.financial;
  const couriersByPlatform = useMemo(() => {
    const map: Record<ReportPlatform, Set<string>> = { bolt: new Set(), wolt: new Set(), glovo: new Set(), other: new Set() };
    for (const f of filterFacts(data.bundle, data.filters)) map[f.platform].add(f.courierId);
    return map;
  }, [data.bundle, data.filters]);

  return (
    <Card>
      <CardHeader><CardTitle>Performanță platforme</CardTitle></CardHeader>
      <CardBody className="overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState title="Fără date pentru filtrele selectate." />
        ) : (
          <table className="w-full min-w-[820px] text-[12px]">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-wide text-fg-dim">
                <th className="pb-2 font-medium">Platformă</th>
                <th className="pb-2 text-right font-medium">Curieri</th>
                <th className="pb-2 text-right font-medium">Comenzi</th>
                <th className="pb-2 text-right font-medium">Venit</th>
                <th className="pb-2 text-right font-medium">Comisioane</th>
                <th className="pb-2 text-right font-medium">Deduceri</th>
                <th className="pb-2 text-right font-medium">Plăți</th>
                <th className="pb-2 text-right font-medium">Rest de plată</th>
                <th className="pb-2 text-right font-medium">Pondere</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.platform + r.label} className="border-t border-line/60">
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-2 font-semibold text-fg">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PLATFORM_COLOR[r.platform] }} />
                      {r.label}
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-fg-muted">{formatInt(couriersByPlatform[r.platform].size)}</td>
                  <td className="py-2.5 text-right tabular-nums text-fg-muted">{formatInt(r.orders)}</td>
                  <td className="py-2.5 text-right tabular-nums font-medium text-fg">{formatRon(r.gross)}</td>
                  <td className="py-2.5 text-right tabular-nums text-fg-muted">{formatRon(r.commission)}</td>
                  <td className="py-2.5 text-right tabular-nums text-fg-muted">{formatRon(r.deductions)}</td>
                  <td className="py-2.5 text-right tabular-nums text-[color:var(--color-success)]">{formatRon(r.paid)}</td>
                  <td className="py-2.5 text-right tabular-nums text-[color:var(--color-warn)]">{formatRon(r.toPay)}</td>
                  <td className="py-2.5 text-right tabular-nums text-fg">{total.gross > 0 ? Math.round((r.gross / total.gross) * 100) : 0}%</td>
                </tr>
              ))}
              <tr className="border-t-2 border-line font-bold text-fg">
                <td className="py-2.5">Total</td>
                <td className="py-2.5 text-right tabular-nums">{formatInt((["bolt", "wolt", "glovo", "other"] as ReportPlatform[]).reduce((s, p) => s + couriersByPlatform[p].size, 0))}</td>
                <td className="py-2.5 text-right tabular-nums">{formatInt(total.orders)}</td>
                <td className="py-2.5 text-right tabular-nums">{formatRon(total.gross)}</td>
                <td className="py-2.5 text-right tabular-nums">{formatRon(total.commission)}</td>
                <td className="py-2.5 text-right tabular-nums">{formatRon(total.deductions)}</td>
                <td className="py-2.5 text-right tabular-nums">{formatRon(total.paid)}</td>
                <td className="py-2.5 text-right tabular-nums">{formatRon(total.toPay)}</td>
                <td className="py-2.5 text-right tabular-nums">100%</td>
              </tr>
            </tbody>
          </table>
        )}
      </CardBody>
    </Card>
  );
}

// ═════════════════════════════════════ SITUAȚIE PLĂȚI ═══════════════════════
export function PaymentsStatusTab({ data, selected, onSelect, onOpenCourier }: { data: Data; selected: CourierPayState | null; onSelect: (s: CourierPayState | null) => void; onOpenCourier: (r: CourierPerfRow) => void }) {
  const b = data.payStatus;
  const cards: Array<{ key: CourierPayState; label: string; value: number; color: string }> = [
    { key: "paid", label: "Plătit", value: b.paid, color: "#34d399" },
    { key: "in_progress", label: "În proces", value: b.inProgress, color: "#facc15" },
    { key: "unpaid", label: "Neplătit", value: b.unpaid, color: "#f43f5e" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelect(selected === c.key ? null : c.key)}
            className={cn("rounded-xl border bg-card p-4 text-left transition-colors", selected === c.key ? "border-accent/60" : "border-line hover:border-white/20")}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-fg"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />{c.label}</span>
              <span className="text-[11px] text-fg-dim">{b.total > 0 ? Math.round((c.value / b.total) * 100) : 0}%</span>
            </div>
            <div className="mt-2 text-[24px] font-bold tabular-nums text-fg">{formatInt(c.value)}</div>
            <div className="text-[11px] text-fg-dim">curieri</div>
          </button>
        ))}
      </div>
      <CouriersTab data={data} onOpenCourier={onOpenCourier} payStateFilter={selected} />
    </div>
  );
}

// ═════════════════════════════════════ COMISIOANE ═══════════════════════════
export function CommissionsTab({ data }: { data: Data }) {
  return (
    <Card>
      <CardHeader><CardTitle>Comisioane și deduceri</CardTitle></CardHeader>
      <CardBody>
        <p className="mb-3 text-[12px] text-fg-muted">
          Comisioanele sunt calculate din configurația de colaborare a fiecărui curier (flotă directă vs. subcontractor) — aceleași valori folosite în modulul Plăți. Nu sunt formule inventate.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[12.5px]">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-wide text-fg-dim">
                <th className="pb-2 font-medium">Sursă comision</th>
                <th className="pb-2 text-right font-medium">Bază (venit brut)</th>
                <th className="pb-2 text-right font-medium">Comision</th>
                <th className="pb-2 text-right font-medium">% efectiv</th>
              </tr>
            </thead>
            <tbody>
              {data.commissions.map((r, i) => (
                <tr key={r.key} className={cn("border-t border-line/60", i === data.commissions.length - 1 && "border-t-2 border-line font-bold text-fg")}>
                  <td className="py-2.5">{r.label}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatRon(r.base)}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatRon(r.commission)}</td>
                  <td className="py-2.5 text-right tabular-nums">{r.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

