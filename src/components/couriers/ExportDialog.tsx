"use client";

import { useState } from "react";
import { useSession } from "@/lib/rbac/session";
import { FileSpreadsheet, FileText, FileType2 } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { documentsStateOf, type CourierRow } from "@/lib/couriers/mock-seed";
import { COURIER_STATUS_LABEL, VEHICLE_TYPE_LABEL } from "@/lib/couriers/types";
import { cn } from "@/lib/utils/cn";

type Format = "csv" | "excel" | "pdf";

type Props = {
  open: boolean;
  onClose: () => void;
  rows: CourierRow[];
  fleetName: string;
};

const OPTIONS: { value: Format; label: string; icon: React.ComponentType<{ size?: number }>; supported: boolean; hint: string }[] = [
  { value: "csv",   label: "CSV",   icon: FileText,        supported: true,  hint: "Descarcă imediat, deschide în orice editor." },
  { value: "excel", label: "Excel", icon: FileSpreadsheet, supported: false, hint: "Necesită integrare server-side (xlsx). Marcat în roadmap." },
  { value: "pdf",   label: "PDF",   icon: FileType2,       supported: false, hint: "Necesită renderer PDF server-side. În roadmap." },
];

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function rowsToCsv(rows: CourierRow[], withSubcontractor: boolean): string {
  const header = [
    "ID", "Nume", "Telefon", "Email", "Oraș", "Platforme", "Vehicul", "Tip vehicul",
    "Documente", "Docs lipsă", "Docs expirate", "Status", "Ultima activitate",
    "Data adăugării", ...(withSubcontractor ? ["Subcontractor"] : []),
  ];
  const lines = rows.map((r) => [
    r.id,
    r.fullName,
    r.phone,
    r.email ?? "",
    r.city,
    r.platforms.join("+"),
    r.vehicleModel,
    VEHICLE_TYPE_LABEL[r.vehicleType],
    documentsStateOf(r),
    String(r.documentsMissingCount),
    String(r.documentsExpiredCount),
    COURIER_STATUS_LABEL[r.status],
    r.lastActivityIso,
    r.createdAtIso,
    ...(withSubcontractor ? [r.subcontractorName ?? ""] : []),
  ].map(csvEscape).join(","));
  return [header.join(","), ...lines].join("\n");
}

export function ExportDialog({ open, onClose, rows, fleetName }: Props) {
  const [format, setFormat] = useState<Format>("csv");
  const toast = useToast();
  const { can } = useSession();

  const handleExport = () => {
    const opt = OPTIONS.find((o) => o.value === format);
    if (!opt?.supported) {
      toast.info(`Export ${opt?.label ?? format} — în curând`, "Momentan doar CSV e disponibil client-side. Excel/PDF necesită backend.");
      return;
    }
    const csv = rowsToCsv(rows, can("subcontractors.view"));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `curieri_${fleetName.replace(/\s+/g, "-").toLowerCase()}_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // TODO(real-users): POST /api/audit-log { action: "couriers.export", format, rowCount }.
    toast.success("Export descărcat", `${rows.length} curieri exportați în CSV.`);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Export listă curieri" description={`Se exportă ${rows.length} curieri filtrați din flota ${fleetName}. Respectă permisiunile rolului tău.`}>
      <div className="space-y-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = format === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFormat(opt.value)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                isSelected ? "border-indigo-400/60 bg-indigo-500/[0.06]" : "border-line bg-card-2 hover:border-line/80",
              )}
            >
              <span className={cn(
                "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                isSelected ? "bg-indigo-500/20 text-indigo-300" : "bg-white/[0.05] text-fg-muted",
              )}>
                <Icon size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-fg">{opt.label}</span>
                  {!opt.supported && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      Curând
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[11.5px] text-fg-muted">{opt.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-line bg-transparent px-3 py-1.5 text-[12.5px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          Anulează
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow-lg shadow-indigo-900/30"
        >
          Descarcă
        </button>
      </DialogFooter>
    </Dialog>
  );
}
