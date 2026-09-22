// Facturi emise (către clienți / subcontractori) sau primite (de la furnizori / platforme).
// TODO(real-users): tabel Drizzle `invoices` cu FK tenant + subject_id + subject_type.

export type InvoiceDirection = "issued" | "received";

export const INVOICE_DIRECTION_LABEL: Record<InvoiceDirection, string> = {
  issued:   "Emisă",
  received: "Primită",
};

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft:     "Ciornă",
  sent:      "Trimisă",
  paid:      "Achitată",
  overdue:   "Restantă",
  cancelled: "Anulată",
};

export const INVOICE_STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft:     "bg-white/[0.06] text-fg-dim border-line",
  sent:      "bg-sky-500/15 text-sky-300 border-sky-500/25",
  paid:      "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  overdue:   "bg-rose-500/15 text-rose-300 border-rose-500/25",
  cancelled: "bg-white/[0.04] text-fg-dim border-line line-through",
};

export type Invoice = {
  id: string;
  tenantId: string;

  direction: InvoiceDirection;
  number: string;                 // ex: "DD-2026-0001" sau "FUR-1234"
  issueDateIso: string;           // data emiterii
  dueDateIso: string | null;      // scadență

  counterpartyName: string;       // client (issued) sau furnizor (received)
  counterpartyCui: string | null; // CUI/CIF opțional

  baseRon: number;                // baza fără TVA
  vatPct: number;                 // 0, 5, 9, 19 (RO)
  vatRon: number;                 // calculat = base * vatPct/100
  totalRon: number;               // base + vat

  status: InvoiceStatus;
  paidAtIso: string | null;

  notes: string | null;

  createdAtIso: string;
  createdBy: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function todayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysUntilDue(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso + "T00:00:00Z").getTime();
  if (!Number.isFinite(t)) return null;
  return Math.round((t - Date.now()) / DAY_MS);
}

/** Recomputează total din base+vatPct. */
export function computeInvoiceTotals(baseRon: number, vatPct: number): { vatRon: number; totalRon: number } {
  const base = Math.max(0, Number.isFinite(baseRon) ? baseRon : 0);
  const pct = Math.max(0, Number.isFinite(vatPct) ? vatPct : 0);
  const vatRon = Math.round(base * pct) / 100;
  const totalRon = Math.round((base + vatRon) * 100) / 100;
  return { vatRon, totalRon };
}
