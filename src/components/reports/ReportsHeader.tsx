"use client";

import { Bookmark, Download, Plus } from "lucide-react";
import { DateRangePicker } from "./DateRangePicker";
import { useReportFilters } from "@/lib/reports/filters-context";
import { cn } from "@/lib/utils/cn";

export function ReportsHeader({
  onOpenSaved,
  onOpenExport,
  onNewReport,
  canManage,
}: {
  onOpenSaved: () => void;
  onOpenExport: () => void;
  onNewReport: () => void;
  canManage: boolean;
}) {
  const { filters, setPeriod } = useReportFilters();

  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold tracking-tight text-fg">Rapoarte</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-fg-muted">
          Analizează performanța flotei tale în timp real. Filtrează, compară și exportă rapoarte detaliate.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenSaved}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]"
        >
          <Bookmark size={14} className="text-fg-dim" /> Rapoarte salvate
        </button>
        <button
          type="button"
          onClick={onOpenExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]"
        >
          <Download size={14} className="text-fg-dim" /> Exportă raport
        </button>
        <button
          type="button"
          onClick={onNewReport}
          disabled={!canManage}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(99,102,241,0.55)]",
            !canManage && "cursor-not-allowed opacity-50",
          )}
        >
          <Plus size={15} strokeWidth={2.4} /> Raport nou
        </button>
        <DateRangePicker fromIso={filters.fromIso} toIso={filters.toIso} onApply={setPeriod} />
      </div>
    </header>
  );
}
