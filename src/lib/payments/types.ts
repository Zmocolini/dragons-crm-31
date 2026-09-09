import type { PlatformKey } from "@/lib/dashboard/types";
import type { CourierStatus } from "@/lib/couriers/types";

// TODO(real-users): mutare pe Drizzle tabel `payments` + `payment_breakdowns` cu
// FK către couriers/subcontractors. Momentan totul e localStorage per tenant.

export type PaymentType =
  | "courier_pay"
  | "subcontractor_pay"
  | "advance"
  | "correction"
  | "refund"
  | "other";

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  courier_pay:        "Plată curier",
  subcontractor_pay:  "Plată subcontractor",
  advance:            "Avans",
  correction:         "Corecție",
  refund:             "Restituire",
  other:              "Altă plată",
};

export type PaymentMethod =
  | "bank_transfer"
  | "revolut"
  | "cash"
  | "company"
  | "other";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: "Transfer bancar",
  revolut:       "Revolut",
  cash:          "Cash",
  company:       "Firmă",
  other:         "Altă metodă",
};

/** Status derivat pe baza sumelor + confirmării. */
export type PaymentStatus =
  | "unpaid"
  | "partial"
  | "paid"
  | "in_review"
  | "blocked"
  | "issue";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid:    "Neplătit",
  partial:   "În proces",
  paid:      "Plătit",
  in_review: "De verificat",
  blocked:   "Blocat",
  issue:     "Problemă",
};

/** Toate statusurile, în ordinea fluxului. Enum centralizat — NU folosi string-uri libere. */
export const PAYMENT_STATUS_ORDER: PaymentStatus[] = [
  "in_review", "partial", "paid", "unpaid", "blocked", "issue",
];

/** Tokeni de culoare per status (chip + dot + text), aliniat cu paleta dark premium. */
export const PAYMENT_STATUS_STYLE: Record<PaymentStatus, {
  chip: string;   // badge fundal + text
  dot: string;    // punct colorat
  ring: string;   // stroke pentru progress ring
}> = {
  in_review: { chip: "bg-sky-500/15 text-sky-300 border-sky-500/25",       dot: "bg-sky-400",     ring: "#38bdf8" },
  partial:   { chip: "bg-amber-500/15 text-amber-300 border-amber-500/25", dot: "bg-amber-400",   ring: "#fbbf24" },
  paid:      { chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", dot: "bg-emerald-400", ring: "#34d399" },
  unpaid:    { chip: "bg-rose-500/15 text-rose-300 border-rose-500/25",    dot: "bg-rose-400",    ring: "#fb7185" },
  blocked:   { chip: "bg-orange-500/15 text-orange-300 border-orange-500/25", dot: "bg-orange-400", ring: "#fb923c" },
  issue:     { chip: "bg-rose-500/15 text-rose-300 border-rose-500/25",    dot: "bg-rose-400",    ring: "#f43f5e" },
};

/** Statusuri considerate „achitate" pentru KPI Plăți efectuate. */
export const PAID_STATUSES: PaymentStatus[] = ["paid"];
/** Statusuri „în proces" (de verificat / parțial). */
export const IN_PROGRESS_STATUSES: PaymentStatus[] = ["in_review", "partial"];
/** Statusuri „neplătite / problemă". */
export const UNPAID_STATUSES: PaymentStatus[] = ["unpaid", "blocked", "issue"];

// ── Monede ──────────────────────────────────────────────────────────────────
// Arhitectură pregătită pentru multi-currency; NU facem conversii fără rate reale.
export type Currency = "RON" | "EUR";
export const CURRENCY_LABEL: Record<Currency, string> = {
  RON: "RON",
  EUR: "EUR",
};
export const DEFAULT_CURRENCY: Currency = "RON";

/** Descompunere transparentă a plății. Sumele sunt în bani (RON, minor units × 100 sau
 * numere zecimale libere — folosim `number` cu 2 zecimale, suficient pentru demo). */
export type PaymentBreakdown = {
  grossRevenue: number;   // Venit raportat
  tips: number;
  fleetCommission: number;
  tax: number;
  advance: number;
  correction: number;
  deductions: number;     // Deduceri generale (comisioane platformă, etc)
  vehicleCost: number;
  housingCost: number;
  equipmentCost: number;
  guarantee: number;
  penalty: number;
  otherAdjustments: number;
};

export const EMPTY_BREAKDOWN: PaymentBreakdown = {
  grossRevenue:     0,
  tips:             0,
  fleetCommission:  0,
  tax:              0,
  advance:          0,
  correction:       0,
  deductions:       0,
  vehicleCost:      0,
  housingCost:      0,
  equipmentCost:    0,
  guarantee:        0,
  penalty:          0,
  otherAdjustments: 0,
};

/** Etichete + semn pentru UI-ul de detaliere. */
export const BREAKDOWN_META: Array<{
  key: keyof PaymentBreakdown;
  label: string;
  /** "+" adaugă la total, "−" scade. */
  sign: "+" | "-";
}> = [
  { key: "grossRevenue",     label: "Venit brut / raportat", sign: "+" },
  { key: "tips",             label: "Tips / bonusuri",       sign: "+" },
  { key: "correction",       label: "Corecție",              sign: "+" },
  { key: "fleetCommission",  label: "Comision flotă",        sign: "-" },
  { key: "tax",              label: "Taxe / impozite",       sign: "-" },
  { key: "advance",          label: "Avans încasat",         sign: "-" },
  { key: "deductions",       label: "Deduceri",              sign: "-" },
  { key: "vehicleCost",      label: "Cost vehicul",          sign: "-" },
  { key: "housingCost",      label: "Cost cazare",           sign: "-" },
  { key: "equipmentCost",    label: "Cost echipament",       sign: "-" },
  { key: "guarantee",        label: "Garanție reținută",     sign: "-" },
  { key: "penalty",          label: "Penalizare",            sign: "-" },
  { key: "otherAdjustments", label: "Alte ajustări",         sign: "+" },
];

/** Suma componentelor negative (deduceri totale) — pentru coloana „Deduceri" din tabel. */
export const DEDUCTION_KEYS: Array<keyof PaymentBreakdown> = [
  "tax", "advance", "deductions", "vehicleCost", "housingCost",
  "equipmentCost", "guarantee", "penalty",
];

export function calculateTotal(b: PaymentBreakdown): number {
  return round2(BREAKDOWN_META.reduce((sum, meta) => {
    const val = b[meta.key] || 0;
    return meta.sign === "+" ? sum + val : sum - val;
  }, 0));
}

/** Total deduceri (tot ce scade minus comisionul, care e coloană separată). */
export function deductionsTotal(b: PaymentBreakdown): number {
  return round2(DEDUCTION_KEYS.reduce((s, k) => s + (b[k] || 0), 0));
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Beneficiarul plății — snapshot la momentul înregistrării. */
export type PaymentRecipientSnapshot = {
  id: string;
  name: string;
  city: string | null;
  platform: PlatformKey | null;
  status: CourierStatus | null;
  kind: "courier" | "subcontractor";
};

export type Payment = {
  id: string;
  tenantId: string;
  fleetId: string;

  recipient: PaymentRecipientSnapshot;
  type: PaymentType;

  periodStartIso: string;   // ISO date (YYYY-MM-DD)
  periodEndIso: string;
  paymentDateIso: string;

  method: PaymentMethod;

  breakdown: PaymentBreakdown;
  /** Suma efectivă plătită (poate fi < totalCalculated pentru parțial). */
  amountPaid: number;
  /** Total calculat din breakdown la momentul înregistrării. */
  totalCalculated: number;

  status: PaymentStatus;

  reference: string | null;
  notes: string | null;

  createdAtIso: string;
  createdBy: string;
  /** Motiv pentru sume peste totalCalculated sau modificări post-confirmare. */
  overrideReason: string | null;

  // ── Câmpuri adiționale (opționale — populate de seed / operațiuni) ──────────
  ordersCount?: number;
  platforms?: PlatformKey[];
  commissionPercentage?: number;   // procent comision stocat separat de sumă
  currency?: Currency;
  ibanSnapshot?: string | null;    // IBAN folosit la momentul plății (audit)
  operatorName?: string | null;    // user care a procesat plata
  approvedBy?: string | null;
  approvedAtIso?: string | null;
  paidBy?: string | null;
  paidAtIso?: string | null;       // timestamp la marcarea ca plătit
};

export type DuplicateMatch = {
  matchType: "phone" | "email";
  entity: "candidate" | "courier";
  id: string;
  name: string;
  detail: string;
};

// ── Audit / activitate (istoric plată) ──────────────────────────────────────
export type PaymentActivityKind =
  | "created" | "imported" | "edited" | "approved" | "processing"
  | "paid" | "status_changed" | "deduction_added" | "deduction_removed"
  | "note_added" | "document_added" | "iban_verified";

export const PAYMENT_ACTIVITY_LABEL: Record<PaymentActivityKind, string> = {
  created:          "Plată generată",
  imported:         "Plată importată",
  edited:           "Plată editată",
  approved:         "Plată aprobată",
  processing:       "Marcată în proces",
  paid:             "Plată marcată ca efectuată",
  status_changed:   "Status schimbat",
  deduction_added:  "Deducere adăugată",
  deduction_removed:"Deducere eliminată",
  note_added:       "Notiță adăugată",
  document_added:   "Document adăugat",
  iban_verified:    "IBAN verificat",
};

export const PAYMENT_ACTIVITY_DOT: Record<PaymentActivityKind, string> = {
  created:          "bg-blue-400",
  imported:         "bg-blue-400",
  edited:           "bg-slate-400",
  approved:         "bg-sky-400",
  processing:       "bg-amber-400",
  paid:             "bg-emerald-400",
  status_changed:   "bg-violet-400",
  deduction_added:  "bg-orange-400",
  deduction_removed:"bg-orange-400",
  note_added:       "bg-slate-400",
  document_added:   "bg-fuchsia-400",
  iban_verified:    "bg-emerald-400",
};

export type PaymentActivity = {
  id: string;
  kind: PaymentActivityKind;
  description: string;
  createdAtIso: string;
  actorName: string;
  oldValue?: string | null;
  newValue?: string | null;
};

export type PaymentNote = {
  id: string;
  text: string;
  authorName: string;
  createdAtIso: string;
};

export type PaymentDocumentRef = {
  id: string;
  label: string;
  kind: "payslip" | "transfer_proof" | "invoice" | "other";
  createdAtIso: string;
  createdBy: string;
};

// ── Helpers domeniu ─────────────────────────────────────────────────────────

/** IBAN determinist per curier (mock, stabil între reload-uri). Snapshot la plată. */
export function ibanForCourier(courierId: string): string {
  let h = 0;
  for (let i = 0; i < courierId.length; i++) h = (h * 31 + courierId.charCodeAt(i)) >>> 0;
  const digits = (base: number, len: number) =>
    String(base).padStart(len, "0").slice(-len);
  const check = digits(h % 100, 2);
  const a = digits(h % 10000, 4);
  const b = digits((h >> 3) % 10000, 4);
  const c = digits((h >> 7) % 10000, 4);
  const d = digits((h >> 11) % 10000, 4);
  return `RO${check} BTRL ${a} ${b} ${c} ${d}`;
}

/** Numărul săptămânii ISO 8601 pentru un ISO date. */
export function isoWeekNumber(iso: string): number {
  const d = new Date(iso);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

const RO_MONTH_SHORT = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"];

/** „01 - 07 Sep" pentru un interval de plată. */
export function formatPeriodShort(startIso: string, endIso: string): string {
  const s = new Date(startIso), e = new Date(endIso);
  const dd = (d: Date) => String(d.getDate()).padStart(2, "0");
  if (s.getMonth() === e.getMonth()) {
    return `${dd(s)} - ${dd(e)} ${RO_MONTH_SHORT[e.getMonth()]}`;
  }
  return `${dd(s)} ${RO_MONTH_SHORT[s.getMonth()]} - ${dd(e)} ${RO_MONTH_SHORT[e.getMonth()]}`;
}

/** „01 Sept - 07 Sept 2026" pentru drawer. */
export function formatPeriodLong(startIso: string, endIso: string): string {
  const s = new Date(startIso), e = new Date(endIso);
  const dd = (d: Date) => String(d.getDate()).padStart(2, "0");
  return `${dd(s)} ${RO_MONTH_SHORT[s.getMonth()]} - ${dd(e)} ${RO_MONTH_SHORT[e.getMonth()]} ${e.getFullYear()}`;
}

/** Format monetar consistent (fără conversie — doar afișare). */
export function formatMoney(amount: number, currency: Currency = "RON"): string {
  const n = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
  return `${n} ${currency}`;
}
