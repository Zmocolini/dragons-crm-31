"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Pencil, Play, Trash2 } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Chip, Select } from "./controls";
import { useReportFilters } from "@/lib/reports/filters-context";
import { useSavedReports, type SavedReport } from "@/lib/reports/saved";
import { REPORT_TYPE_LABEL, formatPeriodRange, type ReportFilterState, type ReportTypeKey } from "@/lib/reports/analytics";
import { PLATFORM_COLOR, PLATFORM_LABEL, type ReportPlatform } from "@/lib/reports/facts";
import { COURIER_STATUS_LABEL, type CourierStatus } from "@/lib/couriers/types";
import { cn } from "@/lib/utils/cn";

const PLATFORM_KEYS: ReportPlatform[] = ["bolt", "wolt", "glovo", "other"];
const REPORT_TYPE_OPTIONS = (
  ["revenue_payments", "courier_performance", "city_performance", "platform_performance", "commissions", "payments_status"] as ReportTypeKey[]
).map((t) => ({ value: t, label: REPORT_TYPE_LABEL[t] }));
const STATUS_OPTIONS: Array<{ value: CourierStatus | "all"; label: string }> = [
  { value: "all", label: "Toate statusurile" },
  ...(["pending", "active", "rejected", "in_activation", "paused", "stopped", "draft"] as CourierStatus[]).map((s) => ({ value: s, label: COURIER_STATUS_LABEL[s] })),
];

// ── Rapoarte salvate ─────────────────────────────────────────────────────────
export function SavedReportsDialog({
  open,
  onClose,
  onApply,
  canManage,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (filters: ReportFilterState) => void;
  canManage: boolean;
}) {
  const { filters } = useReportFilters();
  const { reports, save, rename, remove } = useSavedReports();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  return (
    <Dialog open={open} onClose={onClose} title="Rapoarte salvate" description="Salvează configurația curentă de filtre sau restaurează un raport salvat." size="lg">
      {/* Salvează configurația curentă */}
      {canManage && (
        <div className="mb-4 rounded-xl border border-line bg-card-2 p-3">
          <div className="mb-2 text-[12px] font-semibold text-fg">Salvează configurația curentă</div>
          <div className="mb-2 text-[11.5px] text-fg-muted">{formatPeriodRange(filters.fromIso, filters.toIso)} · {REPORT_TYPE_LABEL[filters.reportType]}</div>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ex: Wolt București săptămânal"
              className="flex-1 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60"
            />
            <button
              type="button"
              disabled={!newName.trim()}
              onClick={() => { save(newName, filters); setNewName(""); }}
              className={cn("rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white", !newName.trim() && "opacity-50")}
            >
              Salvează
            </button>
          </div>
        </div>
      )}

      <div className="max-h-[340px] overflow-y-auto">
        {reports.length === 0 ? (
          <div className="py-8 text-center text-[12.5px] text-fg-muted">Niciun raport salvat încă.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {reports.map((r: SavedReport) => (
              <div key={r.id} className="flex items-center gap-2 rounded-xl border border-line bg-card-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  {editingId === r.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { rename(r.id, editName); setEditingId(null); } }}
                      className="w-full rounded-lg border border-line bg-card-hover px-2 py-1 text-[12.5px] text-fg outline-none focus:border-accent/60"
                    />
                  ) : (
                    <>
                      <div className="truncate text-[12.5px] font-semibold text-fg">{r.name}</div>
                      <div className="truncate text-[11px] text-fg-dim">
                        {formatPeriodRange(r.filters.fromIso, r.filters.toIso)} ·{" "}
                        {r.filters.platforms.length ? r.filters.platforms.map((p) => PLATFORM_LABEL[p]).join(", ") : "Toate platformele"} ·{" "}
                        {r.filters.cities.length ? r.filters.cities.join(", ") : "Toate orașele"}
                      </div>
                    </>
                  )}
                </div>
                {editingId === r.id ? (
                  <button type="button" onClick={() => { rename(r.id, editName); setEditingId(null); }} className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-white">Salvează</button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button type="button" title="Deschide" onClick={() => { onApply(r.filters); onClose(); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--color-info)] hover:bg-white/[0.06]"><Play size={14} /></button>
                    {canManage && <button type="button" title="Redenumește" onClick={() => { setEditingId(r.id); setEditName(r.name); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-white/[0.06]"><Pencil size={14} /></button>}
                    {canManage && <button type="button" title="Șterge" onClick={() => remove(r.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--color-danger)] hover:bg-white/[0.06]"><Trash2 size={14} /></button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">Închide</button>
      </DialogFooter>
    </Dialog>
  );
}

// ── Raport nou ───────────────────────────────────────────────────────────────
export function NewReportDialog({
  open,
  onClose,
  onGenerate,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (name: string) => void;
}) {
  const { filters, patch, togglePlatform } = useReportFilters();
  const [name, setName] = useState("");

  return (
    <Dialog open={open} onClose={onClose} title="Raport nou" description="Configurează un raport și generează-l instant." size="lg">
      <div className="flex flex-col gap-3.5">
        <label className="block">
          <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Nume raport</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Raport flotă 01–07 Sep" className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60" />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Tip raport</span>
          <Select value={filters.reportType} options={REPORT_TYPE_OPTIONS} onChange={(t) => patch({ reportType: t })} ariaLabel="Tip raport" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Început</span>
            <input type="date" value={filters.fromIso} onChange={(e) => patch({ fromIso: e.target.value })} className="w-full rounded-lg border border-line bg-card-hover px-2 py-2 text-[12px] text-fg outline-none focus:border-accent/60 [color-scheme:dark]" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Sfârșit</span>
            <input type="date" value={filters.toIso} onChange={(e) => patch({ toIso: e.target.value })} className="w-full rounded-lg border border-line bg-card-hover px-2 py-2 text-[12px] text-fg outline-none focus:border-accent/60 [color-scheme:dark]" />
          </label>
        </div>

        <div>
          <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Platforme</span>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORM_KEYS.map((p) => (
              <Chip key={p} active={filters.platforms.includes(p)} color={PLATFORM_COLOR[p]} onClick={() => togglePlatform(p)} onRemove={() => togglePlatform(p)}>
                {PLATFORM_LABEL[p]}
              </Chip>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Status curieri</span>
          <Select value={filters.courierStatus} options={STATUS_OPTIONS} onChange={(s) => patch({ courierStatus: s })} ariaLabel="Status curieri" />
        </label>
      </div>

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">Anulează</button>
        <button
          type="button"
          disabled={filters.fromIso > filters.toIso}
          onClick={() => { onGenerate(name); onClose(); }}
          className={cn("rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white", filters.fromIso > filters.toIso && "opacity-50")}
        >
          Generează raport
        </button>
      </DialogFooter>
    </Dialog>
  );
}

// ── Exportă raport ───────────────────────────────────────────────────────────
export function ExportReportDialog({
  open,
  onClose,
  onExport,
  fileBase,
}: {
  open: boolean;
  onClose: () => void;
  onExport: (format: "excel" | "csv" | "pdf") => void;
  fileBase: string;
}) {
  const options: Array<{ key: "excel" | "csv" | "pdf"; label: string; hint: string; icon: typeof FileSpreadsheet; ext: string }> = [
    { key: "excel", label: "Excel (.xlsx)", hint: "Workbook complet: sumar, situație financiară, curieri, orașe, evoluție", icon: FileSpreadsheet, ext: "xlsx" },
    { key: "csv", label: "CSV (.csv)", hint: "Situație financiară pe platforme, separator „;”", icon: FileText, ext: "csv" },
    { key: "pdf", label: "PDF (print)", hint: "Deschide fereastra de print a browserului", icon: FileText, ext: "pdf" },
  ];
  return (
    <Dialog open={open} onClose={onClose} title="Exportă raport" description="Alege formatul. Fișierul respectă perioada și filtrele curente." size="md">
      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const Icon = o.icon;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => { onExport(o.key); onClose(); }}
              className="flex items-center gap-3 rounded-xl border border-line bg-card-2 px-3 py-3 text-left hover:border-accent/40 hover:bg-white/[0.03]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05]">
                <Icon size={17} className="text-[color:var(--color-accent-3)]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold text-fg">{o.label}</span>
                <span className="block truncate text-[11px] text-fg-dim">{o.hint}</span>
              </span>
              <span className="shrink-0 text-[10.5px] tabular-nums text-fg-dim">{fileBase}.{o.ext}</span>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
