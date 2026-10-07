"use client";

import { useMemo, useState } from "react";
import { ArrowUp, ChevronDown } from "lucide-react";
import type { WeeklyRevenue } from "@/lib/dashboard/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  PLATFORM_COLOR,
  PLATFORM_LABEL,
  type ReportPlatform,
} from "@/lib/reports/facts";

const ORDER: readonly ReportPlatform[] = ["bolt", "wolt", "glovo", "other"];
const RADIUS = 40;
const STROKE = 11;
const GAP = 1.2; // % din cerc lăsat gol între segmente
const BAR_WEEKS = 8;
const BAR_MAX_H = 44;

const fmt = (n: number) => Math.round(n).toLocaleString("ro-RO");

function EmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Venituri săptămânale</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col items-center gap-3 pb-6">
        <svg viewBox="0 0 100 100" className="h-[160px] w-[160px]" aria-hidden>
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-line"
          />
        </svg>
        <p className="text-[12.5px] text-fg-muted">Niciun raport importat încă</p>
      </CardBody>
    </Card>
  );
}

export function WeeklyRevenueChart({ weeks }: { weeks: WeeklyRevenue[] }) {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const view = useMemo(() => {
    if (weeks.length === 0) return null;
    const found = weeks.findIndex((w) => w.label === selectedLabel);
    const idx = found >= 0 ? found : weeks.length - 1;
    const week = weeks[idx];
    const prev = idx > 0 ? weeks[idx - 1] : null;
    const total = week.total;

    const delta =
      prev && prev.total > 0 ? ((total - prev.total) / prev.total) * 100 : null;

    // segmente în ordine fixă (tranziția CSS păstrează identitatea), legenda sortată desc
    const present = ORDER.filter((p) => week.byPlatform[p] > 0).length;
    let start = 0;
    const segments = ORDER.map((p) => {
      const value = week.byPlatform[p];
      const pct = total > 0 ? (value / total) * 100 : 0;
      const len = present > 1 ? Math.max(0, pct - GAP) : pct;
      const seg = { key: p, len, offset: -start };
      start += pct;
      return seg;
    });
    const legend = ORDER.map((p) => ({
      key: p,
      value: week.byPlatform[p],
      pct: total > 0 ? Math.round((week.byPlatform[p] / total) * 100) : 0,
    }))
      .filter((l) => l.value > 0)
      .sort((a, b) => b.value - a.value);

    const bars = weeks.slice(-BAR_WEEKS);
    const barMax = bars.reduce((m, w) => (w.total > m ? w.total : m), 0);
    const barItems = bars.map((w) => ({
      label: w.label,
      total: w.total,
      h: barMax > 0 ? Math.max(3, Math.round((w.total / barMax) * BAR_MAX_H)) : 3,
    }));

    return {
      idx,
      label: week.label,
      total,
      delta,
      segments,
      legend,
      barItems,
    };
  }, [weeks, selectedLabel]);

  if (!view) return <EmptyState />;

  const { label, total, delta, segments, legend, barItems } = view;
  const up = delta !== null && delta >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Venituri săptămânale</CardTitle>
        <div className="relative">
          <select
            value={label}
            onChange={(e) => setSelectedLabel(e.target.value)}
            aria-label="Săptămâna afișată"
            className="appearance-none rounded-lg border border-line bg-card-2 py-1.5 pl-2.5 pr-7 text-[11.5px] font-medium text-fg-muted transition-colors hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-line"
          >
            {weeks.map((w) => (
              <option key={w.label} value={w.label}>
                {w.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted"
            aria-hidden
          />
        </div>
      </CardHeader>
      <CardBody className="pb-4">
        <div className="flex items-center gap-5">
          <div className="relative h-[150px] w-[150px] shrink-0">
            <svg
              viewBox="0 0 100 100"
              role="img"
              aria-label={`${label}: ${fmt(total)} RON`}
              className="h-full w-full"
            >
              <circle
                cx="50"
                cy="50"
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                className="stroke-line"
                opacity={0.6}
              />
              <g transform="rotate(-90 50 50)">
                {segments.map((s) => (
                  <circle
                    key={s.key}
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    fill="none"
                    stroke={PLATFORM_COLOR[s.key]}
                    strokeWidth={STROKE}
                    pathLength={100}
                    strokeDasharray={`${s.len} ${100 - s.len}`}
                    strokeDashoffset={s.offset}
                    className="transition-[stroke-dasharray,stroke-dashoffset] duration-[400ms] ease-out motion-reduce:transition-none"
                  />
                ))}
              </g>
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[18px] font-bold leading-tight text-fg">
                {fmt(total)}
              </span>
              <span className="text-[10.5px] text-fg-dim">RON</span>
              {delta !== null ? (
                <span
                  className={`mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium ${
                    up ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  <ArrowUp
                    size={10}
                    strokeWidth={2.5}
                    className={up ? "" : "rotate-180"}
                    aria-hidden
                  />
                  {up ? "+" : ""}
                  {delta.toFixed(0)}%
                </span>
              ) : null}
            </div>
          </div>
          <ul className="min-w-0 flex-1 space-y-1.5">
            {legend.map((l) => (
              <li key={l.key} className="flex items-center gap-2 text-[12px]">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: PLATFORM_COLOR[l.key] }}
                />
                <span className="text-fg-muted">{PLATFORM_LABEL[l.key]}</span>
                <span className="ml-auto font-mono text-fg">{fmt(l.value)}</span>
                <span className="w-9 text-right text-[10.5px] text-fg-dim">
                  {l.pct}%
                </span>
              </li>
            ))}
            {legend.length === 0 ? (
              <li className="text-[12px] text-fg-muted">Fără venit în {label}</li>
            ) : null}
          </ul>
        </div>

        <div className="mt-4 flex items-end justify-between gap-1.5 border-t border-line/70 pt-3">
          {barItems.map((b) => {
            const selected = b.label === label;
            return (
              <button
                key={b.label}
                type="button"
                aria-pressed={selected}
                aria-label={`${b.label}: ${fmt(b.total)} RON`}
                onClick={() => setSelectedLabel(b.label)}
                className="group flex min-w-0 flex-1 flex-col items-center gap-1 focus:outline-none"
              >
                <span
                  className="flex items-end"
                  style={{ height: BAR_MAX_H }}
                  aria-hidden
                >
                  <span
                    className={`block w-3.5 rounded-sm transition-colors group-focus-visible:ring-2 group-focus-visible:ring-line ${
                      selected ? "bg-fg" : "bg-fg-dim/40 group-hover:bg-fg-muted"
                    }`}
                    style={{ height: b.h }}
                  />
                </span>
                <span
                  className={`text-[10px] ${selected ? "text-fg" : "text-fg-dim"}`}
                  aria-hidden
                >
                  {b.label}
                </span>
              </button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
