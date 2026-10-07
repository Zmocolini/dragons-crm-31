"use client";

import { useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Chip, Select } from "@/components/reports/controls";
import { useDocumentFilters } from "@/lib/documents/filters-context";
import { DOC_COLUMNS, COURIER_DOC_STATUS_LABEL, type CourierDocStatus, type DocColumnKey } from "@/lib/documents/rules";
import { NATIONALITY_LABEL, NATIONALITY_OPTIONS, type Nationality } from "@/lib/candidates/types";
import type { PlatformKey } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/cn";

const PLATFORMS: Array<{ key: PlatformKey; label: string; color: string }> = [
  { key: "bolt", label: "Bolt", color: "#34d399" },
  { key: "wolt", label: "Wolt", color: "#38bdf8" },
  { key: "glovo", label: "Glovo", color: "#facc15" },
];
const NATS: Nationality[] = [...NATIONALITY_OPTIONS, "non_eu"];

export function AdvancedFiltersDialog({
  open,
  onClose,
  subcontractorOptions,
}: {
  open: boolean;
  onClose: () => void;
  subcontractorOptions: string[];
}) {
  const { filters, patch, togglePlatform, toggleNationality, reset } = useDocumentFilters();

  const colOptions: Array<{ value: DocColumnKey | "all"; label: string }> = [
    { value: "all", label: "Toate tipurile" },
    ...DOC_COLUMNS.map((c) => ({ value: c.key, label: c.label })),
  ];
  const statusOptions: Array<{ value: CourierDocStatus | "all"; label: string }> = [
    { value: "all", label: "Toate statusurile" },
    ...(["complete", "pending_review", "missing", "expiring_soon", "expired"] as CourierDocStatus[]).map((s) => ({ value: s, label: COURIER_DOC_STATUS_LABEL[s] })),
  ];

  return (
    <Dialog open={open} onClose={onClose} title="Filtre avansate" description="Combină filtrele pentru a rafina lista de curieri." size="lg">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Tip document">
          <Select value={filters.docColumn} options={colOptions} onChange={(v) => patch({ docColumn: v })} ariaLabel="Tip document" />
        </Field>
        <Field label="Status documente curier">
          <Select value={filters.status} options={statusOptions} onChange={(v) => patch({ status: v })} ariaLabel="Status" />
        </Field>
        {subcontractorOptions.length > 0 && (
          <Field label="Subcontractor">
            <Select
              value={filters.subcontractor}
              options={[{ value: "all", label: "Toți subcontractorii" }, ...subcontractorOptions.map((s) => ({ value: s, label: s }))]}
              onChange={(v) => patch({ subcontractor: v })}
              ariaLabel="Subcontractor"
            />
          </Field>
        )}
        <Field label="Curier">
          <button type="button" onClick={() => patch({ onlyActive: !filters.onlyActive })}
            className={cn("flex w-full items-center justify-between rounded-lg border px-3 py-2 text-[12.5px]", filters.onlyActive ? "border-accent/50 bg-accent/10 text-fg" : "border-line bg-card-hover text-fg-muted")}>
            Doar curieri activi
            <span className={cn("h-4 w-8 rounded-full p-0.5 transition-colors", filters.onlyActive ? "bg-accent" : "bg-white/15")}>
              <span className={cn("block h-3 w-3 rounded-full bg-white transition-transform", filters.onlyActive && "translate-x-4")} />
            </span>
          </button>
        </Field>
        <Field label="Platforme">
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => <Chip key={p.key} active={filters.platforms.includes(p.key)} color={p.color} onClick={() => togglePlatform(p.key)} onRemove={() => togglePlatform(p.key)}>{p.label}</Chip>)}
          </div>
        </Field>
        <Field label="Naționalitate">
          <div className="flex flex-wrap gap-1.5">
            {NATS.map((n) => <Chip key={n} active={filters.nationalities.includes(n)} color="#6366f1" onClick={() => toggleNationality(n)} onRemove={() => toggleNationality(n)}>{NATIONALITY_LABEL[n]}</Chip>)}
          </div>
        </Field>
      </div>
      <DialogFooter>
        <button type="button" onClick={() => { reset(); }} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">Reset</button>
        <button type="button" onClick={onClose} className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white">Aplică filtre</button>
      </DialogFooter>
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmă",
  danger,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-[13px] text-fg-muted">{message}</p>
      <DialogFooter>
        <button type="button" onClick={onCancel} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">Anulează</button>
        <button type="button" onClick={onConfirm} className={cn("rounded-lg px-4 py-2 text-[12.5px] font-semibold text-white", danger ? "bg-rose-600 hover:bg-rose-500" : "bg-gradient-to-r from-violet-600 to-blue-600")}>{confirmLabel}</button>
      </DialogFooter>
    </Dialog>
  );
}

export function RejectDialog({ open, docName, onCancel, onConfirm }: { open: boolean; docName: string; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onClose={onCancel} title="Respinge document" description={docName} size="sm">
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Motivul respingerii (ex: document ilizibil)..." className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60" />
      <DialogFooter>
        <button type="button" onClick={onCancel} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">Anulează</button>
        <button type="button" onClick={() => onConfirm(reason)} className="rounded-lg bg-rose-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-rose-500">Respinge</button>
      </DialogFooter>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">{label}</label>{children}</div>;
}
