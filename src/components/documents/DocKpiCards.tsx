"use client";

import { Clock, FileCheck2, FileWarning, FileX2, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatInt } from "@/lib/reports/analytics";
import type { DocKpi } from "@/lib/documents/analytics";

function CircleGauge({ pct, color }: { pct: number; color: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 20 20)" />
    </svg>
  );
}

export function DocKpiCards({ kpi }: { kpi: DocKpi }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/12"><Users size={17} className="text-[color:var(--color-info)]" /></div>
        </div>
        <div className="mt-3 text-[12px] font-medium text-fg-muted">Total curieri</div>
        <div className="mt-0.5 text-[21px] font-bold tabular-nums text-fg">{formatInt(kpi.total)}</div>
        <div className="mt-0.5 text-[11.5px] text-fg-dim">cu documente urmărite</div>
      </Card>

      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/12"><FileCheck2 size={17} className="text-[color:var(--color-success)]" /></div>
          <CircleGauge pct={kpi.completePct} color="#22c55e" />
        </div>
        <div className="mt-3 text-[12px] font-medium text-fg-muted">Complete</div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-[21px] font-bold tabular-nums text-fg">{formatInt(kpi.complete)}</span>
          <span className="text-[12px] font-semibold text-[color:var(--color-success)]">{kpi.completePct}%</span>
        </div>
        <div className="mt-0.5 text-[11.5px] text-fg-dim">toate documentele obligatorii valide</div>
      </Card>

      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warn/12"><FileWarning size={17} className="text-[color:var(--color-warn)]" /></div>
          <CircleGauge pct={kpi.inReviewPct} color="#f59e0b" />
        </div>
        <div className="mt-3 text-[12px] font-medium text-fg-muted">În verificare</div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-[21px] font-bold tabular-nums text-fg">{formatInt(kpi.inReview)}</span>
          <span className="text-[12px] font-semibold text-[color:var(--color-warn)]">{kpi.inReviewPct}%</span>
        </div>
        <div className="mt-0.5 text-[11.5px] text-fg-dim">cel puțin un document în verificare</div>
      </Card>

      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger/12"><FileX2 size={17} className="text-[color:var(--color-danger)]" /></div>
        </div>
        <div className="mt-3 text-[12px] font-medium text-fg-muted">Lipsă</div>
        <div className="mt-0.5 text-[21px] font-bold tabular-nums text-fg">{formatInt(kpi.missing)}</div>
        <div className="mt-0.5 text-[11.5px] text-fg-dim">lipsă sau expirat obligatoriu</div>
      </Card>

      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15"><Clock size={17} className="text-[color:var(--color-accent-3)]" /></div>
        </div>
        <div className="mt-3 text-[12px] font-medium text-fg-muted">Expiră curând</div>
        <div className="mt-0.5 text-[21px] font-bold tabular-nums text-fg">{formatInt(kpi.expiringSoon)}</div>
        <div className="mt-0.5 text-[11.5px] text-fg-dim">în următoarele 30 zile</div>
      </Card>
    </div>
  );
}
