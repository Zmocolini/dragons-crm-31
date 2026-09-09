"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_ORDER,
  type PaymentMethod, type PaymentStatus,
} from "@/lib/payments/types";
import { cn } from "@/lib/utils/cn";

export type AdvancedPaymentFilters = {
  periodFrom: string;
  periodTo: string;
  payDateFrom: string;
  payDateTo: string;
  amountMin: string;
  amountMax: string;
  status: string;      // "all" | PaymentStatus
  operator: string;    // "all" | name
  subcontractor: string; // "all" | name
  method: string;      // "all" | PaymentMethod
  hasDeductions: boolean;
  hasPenalty: boolean;
  noIban: boolean;
  hasProblem: boolean;
  processed: "all" | "processed" | "unprocessed";
};

export const EMPTY_ADVANCED: AdvancedPaymentFilters = {
  periodFrom: "", periodTo: "", payDateFrom: "", payDateTo: "",
  amountMin: "", amountMax: "", status: "all", operator: "all",
  subcontractor: "all", method: "all",
  hasDeductions: false, hasPenalty: false, noIban: false, hasProblem: false,
  processed: "all",
};

export function isAdvancedActive(a: AdvancedPaymentFilters): boolean {
  return (
    !!a.periodFrom || !!a.periodTo || !!a.payDateFrom || !!a.payDateTo ||
    !!a.amountMin || !!a.amountMax || a.status !== "all" || a.operator !== "all" ||
    a.subcontractor !== "all" || a.method !== "all" ||
    a.hasDeductions || a.hasPenalty || a.noIban || a.hasProblem || a.processed !== "all"
  );
}

export function PaymentsAdvancedFilters({
  open, onClose, initial, operators, subcontractors, onApply,
}: {
  open: boolean;
  onClose: () => void;
  initial: AdvancedPaymentFilters;
  operators: string[];
  subcontractors: string[];
  onApply: (f: AdvancedPaymentFilters) => void;
}) {
  const [draft, setDraft] = useState<AdvancedPaymentFilters>(initial);
  // Resincronizează draft-ul cu valorile aplicate la (re)deschidere — ajustare de
  // stare la schimbare de prop (setState în render), nu efect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setDraft(initial);
  }

  if (!open) return null;
  const set = (patch: Partial<AdvancedPaymentFilters>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-line bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
          <h3 className="text-[14px] font-bold text-fg">Filtre avansate</h3>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg" aria-label="Închide">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <Group label="Interval perioadă">
            <div className="grid grid-cols-2 gap-2">
              <DateInput value={draft.periodFrom} onChange={(v) => set({ periodFrom: v })} />
              <DateInput value={draft.periodTo} onChange={(v) => set({ periodTo: v })} />
            </div>
          </Group>
          <Group label="Interval dată plată">
            <div className="grid grid-cols-2 gap-2">
              <DateInput value={draft.payDateFrom} onChange={(v) => set({ payDateFrom: v })} />
              <DateInput value={draft.payDateTo} onChange={(v) => set({ payDateTo: v })} />
            </div>
          </Group>
          <Group label="Sumă de plată (RON)">
            <div className="grid grid-cols-2 gap-2">
              <NumInput placeholder="Min" value={draft.amountMin} onChange={(v) => set({ amountMin: v })} />
              <NumInput placeholder="Max" value={draft.amountMax} onChange={(v) => set({ amountMax: v })} />
            </div>
          </Group>
          <Group label="Status">
            <Select value={draft.status} onChange={(v) => set({ status: v })}
              options={[{ value: "all", label: "Toate" }, ...PAYMENT_STATUS_ORDER.map((s) => ({ value: s, label: PAYMENT_STATUS_LABEL[s as PaymentStatus] }))]} />
          </Group>
          <Group label="Metodă plată">
            <Select value={draft.method} onChange={(v) => set({ method: v })}
              options={[{ value: "all", label: "Toate" }, ...(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))]} />
          </Group>
          <Group label="Operator plăți">
            <Select value={draft.operator} onChange={(v) => set({ operator: v })}
              options={[{ value: "all", label: "Toți" }, ...operators.map((o) => ({ value: o, label: o }))]} />
          </Group>
          <Group label="Subcontractor">
            <Select value={draft.subcontractor} onChange={(v) => set({ subcontractor: v })}
              options={[{ value: "all", label: "Toți" }, ...subcontractors.map((s) => ({ value: s, label: s }))]} />
          </Group>
          <Group label="Procesare">
            <Select value={draft.processed} onChange={(v) => set({ processed: v as AdvancedPaymentFilters["processed"] })}
              options={[{ value: "all", label: "Toate" }, { value: "processed", label: "Procesate" }, { value: "unprocessed", label: "Neprocesate" }]} />
          </Group>

          <Group label="Filtre rapide">
            <div className="space-y-1.5">
              <Toggle label="Curieri cu deduceri" checked={draft.hasDeductions} onChange={(v) => set({ hasDeductions: v })} />
              <Toggle label="Curieri cu penalizări" checked={draft.hasPenalty} onChange={(v) => set({ hasPenalty: v })} />
              <Toggle label="Curieri fără IBAN" checked={draft.noIban} onChange={(v) => set({ noIban: v })} />
              <Toggle label="Curieri cu probleme" checked={draft.hasProblem} onChange={(v) => set({ hasProblem: v })} />
            </div>
          </Group>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line/60 px-4 py-3">
          <button type="button" onClick={() => setDraft(EMPTY_ADVANCED)} className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.05]">
            Reset
          </button>
          <button type="button" onClick={() => { onApply(draft); onClose(); }} className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-[12.5px] font-semibold text-white">
            Aplică filtrele
          </button>
        </div>
      </div>
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-dim">{label}</div>
      {children}
    </div>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-line bg-card-hover px-2.5 py-1.5 text-[12px] text-fg focus:outline-none focus:ring-1 focus:ring-violet-500/40" />
  );
}
function NumInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input type="number" inputMode="numeric" min={0} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-line bg-card-hover px-2.5 py-1.5 text-[12px] text-fg placeholder:text-fg-dim focus:outline-none focus:ring-1 focus:ring-violet-500/40" />
  );
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-line bg-card-hover px-2.5 py-1.5 text-[12.5px] text-fg focus:outline-none">
      {options.map((o) => <option key={o.value} value={o.value} className="bg-card text-fg">{o.label}</option>)}
    </select>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between rounded-lg border border-line bg-card-hover px-3 py-2 text-left">
      <span className="text-[12.5px] text-fg">{label}</span>
      <span className={cn("relative h-4 w-7 rounded-full transition-colors", checked ? "bg-violet-500" : "bg-white/15")}>
        <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all", checked ? "left-3.5" : "left-0.5")} />
      </span>
    </button>
  );
}
