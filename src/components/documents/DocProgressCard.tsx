"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/reports/controls";
import { useDocumentFilters } from "@/lib/documents/filters-context";
import type { ColumnProgress } from "@/lib/documents/analytics";
import { cn } from "@/lib/utils/cn";

function color(pct: number): string {
  if (pct >= 90) return "#22c55e";
  if (pct >= 70) return "#f59e0b";
  return "#ef4444";
}

export function DocProgressCard({ progress }: { progress: ColumnProgress[] }) {
  const { filters, patch } = useDocumentFilters();
  return (
    <Card>
      <CardHeader><CardTitle>Progres documente (toți curierii)</CardTitle></CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {progress.map((p) => {
            const active = filters.docColumn === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => patch({ docColumn: active ? "all" : p.key })}
                className={cn("rounded-lg border px-3 py-2 text-left transition-colors", active ? "border-accent/50 bg-white/[0.03]" : "border-transparent hover:bg-white/[0.03]")}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-medium text-fg">{p.label}</span>
                  <span className="shrink-0 text-[11.5px] tabular-nums text-fg-muted">{p.present}/{p.total} · {p.pct}%</span>
                </div>
                <ProgressBar pct={p.pct} color={color(p.pct)} />
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-fg-dim">Apasă o categorie pentru a filtra tabelul după acel document.</p>
      </CardBody>
    </Card>
  );
}
