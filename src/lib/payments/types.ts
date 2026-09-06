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
  partial:   "Parțial",
  paid:      "Plătit",
  in_review: "În verificare",
  blocked:   "Blocat",
  issue:     "Problemă",
};

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

export function calculateTotal(b: PaymentBreakdown): number {
  return BREAKDOWN_META.reduce((sum, meta) => {
    const val = b[meta.key];
    return meta.sign === "+" ? sum + val : sum - val;
  }, 0);
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
};
