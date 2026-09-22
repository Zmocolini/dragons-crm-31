"use client";

import { Download, Plus, Upload } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function DocumentsHeader({
  onImport,
  onExport,
  onUpload,
  canManage,
}: {
  onImport: () => void;
  onExport: () => void;
  onUpload: () => void;
  canManage: boolean;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold tracking-tight text-fg">Documente</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-fg-muted">
          Gestionează documentele curierilor. Verifică statusul, încarcă fișiere și primește notificări pentru documentele expirate.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onImport} disabled={!canManage}
          className={cn("inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]", !canManage && "opacity-50")}>
          <Upload size={14} className="text-fg-dim" /> Importă
        </button>
        <button type="button" onClick={onExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">
          <Download size={14} className="text-fg-dim" /> Exportă
        </button>
        <button type="button" onClick={onUpload} disabled={!canManage}
          className={cn("inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(99,102,241,0.55)]", !canManage && "cursor-not-allowed opacity-50")}>
          <Plus size={15} strokeWidth={2.4} /> Încarcă document
        </button>
      </div>
    </header>
  );
}
