"use client";

import {
  Building2, Calendar, ChevronDown, Coins, Database, FileText, Info,
  MessageSquare, Pencil, Search, Wallet, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { useToast } from "@/components/ui/Toast";
import { useCouriers } from "@/lib/couriers/context";
import { COURIER_STATUS_LABEL, type CourierStatus } from "@/lib/couriers/types";
import type { PlatformKey } from "@/lib/dashboard/types";
import { usePayments } from "@/lib/payments/context";
import {
  BREAKDOWN_META, EMPTY_BREAKDOWN, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL,
  PAYMENT_TYPE_LABEL, calculateTotal,
  type Payment, type PaymentBreakdown, type PaymentMethod, type PaymentStatus,
  type PaymentType,
} from "@/lib/payments/types";
import { useProfile } from "@/lib/profile/context";
import { useSession } from "@/lib/rbac/session";
import { cn } from "@/lib/utils/cn";

// TODO(real-users): server action `createPayment` cu authorize + audit server-side + notificări.

type PlatformInfo = { key: PlatformKey; label: string };
const PLATFORM_INFO: Record<PlatformKey, PlatformInfo> = {
  bolt:  { key: "bolt",  label: "Bolt Food" },
  wolt:  { key: "wolt",  label: "Wolt" },
  glovo: { key: "glovo", label: "Glovo" },
};

/** Curieri seed pentru dropdown (aliniat cu duplicate detection din couriers/context). */
const SEED_RECIPIENTS: Array<{
  id: string; name: string; city: string; platform: PlatformKey; status: CourierStatus;
}> = [
  { id: "c_001", name: "Andrei Popescu", city: "București", platform: "bolt",  status: "in_activation" },
  { id: "c_002", name: "Mihai Ionescu",  city: "București", platform: "wolt",  status: "active" },
  { id: "c_003", name: "Ravi Kumar",     city: "Cluj",      platform: "glovo", status: "active" },
  { id: "c_004", name: "Fatima Ali",     city: "Timișoara", platform: "bolt",  status: "in_activation" },
  { id: "c_005", name: "Carlos Mendes",  city: "București", platform: "wolt",  status: "paused" },
];

type Recipient = {
  id: string;
  name: string;
  city: string | null;
  platform: PlatformKey | null;
  status: CourierStatus | null;
  kind: "courier" | "subcontractor";
};

const RON = new Intl.NumberFormat("ro-RO", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

function formatRon(n: number): string {
  return RON.format(n);
}

function formatDateShort(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function formatPeriod(start: string, end: string): string {
  if (!start || !end) return "—";
  try {
    const s = new Date(start);
    const e = new Date(end);
    const sameYear = s.getFullYear() === e.getFullYear();
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    const startStr = s.toLocaleDateString("ro-RO", opts);
    const endStr = e.toLocaleDateString(
      "ro-RO",
      sameYear ? { ...opts, year: "numeric" } : { ...opts, year: "numeric" },
    );
    return `${startStr} — ${endStr}`;
  } catch {
    return `${start} — ${end}`;
  }
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Beneficiar pre-selectat (când modalul e deschis din profilul curierului). */
  prefillRecipientId?: string;
  onSaved?: (payment: Payment) => void;
};

export function RecordPaymentDialog({ open, onClose, prefillRecipientId, onSaved }: Props) {
  const { user, activeFleetId, fleets } = useSession();
  const { couriers } = useCouriers();
  const { addPayment } = usePayments();
  const { logActivity } = useProfile();
  const toast = useToast();

  // Combină curieri live + seed
  const allRecipients: Recipient[] = useMemo(() => {
    const fromContext: Recipient[] = couriers.map((c) => ({
      id: c.id,
      name: c.fullName,
      city: c.city || null,
      platform: c.platforms[0] ?? null,
      status: c.status,
      kind: "courier",
    }));
    const fromSeed: Recipient[] = SEED_RECIPIENTS.filter(
      (s) => !fromContext.some((f) => f.id === s.id),
    ).map((s) => ({ ...s, kind: "courier" as const }));
    return [...fromContext, ...fromSeed];
  }, [couriers]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [recipientId, setRecipientId] = useState<string>(prefillRecipientId ?? "");
  const [type, setType] = useState<PaymentType>("courier_pay");
  const [periodStart, setPeriodStart] = useState<string>(daysAgo(7));
  const [periodEnd, setPeriodEnd] = useState<string>(daysAgo(1));
  const [paymentDate, setPaymentDate] = useState<string>(today());
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [breakdown, setBreakdown] = useState<PaymentBreakdown>({
    ...EMPTY_BREAKDOWN,
    grossRevenue:    3000,
    fleetCommission: 300,
    deductions:      250,
  });
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [showBreakdownEditor, setShowBreakdownEditor] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [amountPaidManual, setAmountPaidManual] = useState<string>("");

  // Reset la deschidere
  useEffect(() => {
    if (!open) return;
    setRecipientId(prefillRecipientId ?? "");
    setType("courier_pay");
    setPeriodStart(daysAgo(7));
    setPeriodEnd(daysAgo(1));
    setPaymentDate(today());
    setMethod("bank_transfer");
    setBreakdown({ ...EMPTY_BREAKDOWN, grossRevenue: 3000, fleetCommission: 300, deductions: 250 });
    setReference("");
    setNotes("");
    setShowBreakdownEditor(false);
    setErrors({});
    setOverrideReason("");
    setAmountPaidManual("");
  }, [open, prefillRecipientId]);

  const selectedRecipient = useMemo(
    () => allRecipients.find((r) => r.id === recipientId) ?? null,
    [allRecipients, recipientId],
  );

  const totalCalculated = useMemo(() => calculateTotal(breakdown), [breakdown]);
  const amountPaidNum = useMemo(() => {
    const parsed = parseFloat(amountPaidManual.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
    return totalCalculated;
  }, [amountPaidManual, totalCalculated]);

  const derivedStatus = useMemo<PaymentStatus>(() => {
    if (amountPaidNum <= 0) return "unpaid";
    if (amountPaidNum < totalCalculated) return "partial";
    return "paid";
  }, [amountPaidNum, totalCalculated]);

  const isOverpayment = amountPaidNum > totalCalculated + 0.001;

  // Dirty tracking (foarte simplu — form are date != valorile default)
  const isDirty =
    recipientId !== (prefillRecipientId ?? "") ||
    reference.length > 0 ||
    notes.length > 0 ||
    breakdown.grossRevenue !== 3000 ||
    breakdown.fleetCommission !== 300 ||
    breakdown.deductions !== 250;

  function requestClose() {
    if (isDirty && !window.confirm("Ai modificări nesalvate. Închizi fără să salvezi?")) return;
    onClose();
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!recipientId) e.recipient = "Alege beneficiarul plății.";
    if (!periodStart || !periodEnd) e.period = "Selectează perioada.";
    if (periodStart && periodEnd && periodStart > periodEnd) e.period = "Data de început trebuie să fie înainte de data de sfârșit.";
    if (!paymentDate) e.paymentDate = "Selectează data plății.";
    if (amountPaidNum < 0) e.amount = "Suma nu poate fi negativă.";
    if (isOverpayment && !overrideReason.trim()) {
      e.override = "Suma depășește totalul calculat. Adaugă un motiv pentru override.";
    }
    return e;
  }

  function submit(asDraft: boolean) {
    const eMap = validate();
    if (Object.keys(eMap).length > 0) {
      setErrors(eMap);
      const first = Object.values(eMap)[0];
      toast.error("Corectează câmpurile", first);
      return;
    }
    setErrors({});

    if (!selectedRecipient) return; // typeguard

    const finalStatus: PaymentStatus = asDraft ? "in_review" : derivedStatus;
    const activeFleet = fleets.find((f) => f.id === activeFleetId);

    const payment = addPayment({
      tenantId: activeFleetId,
      fleetId:  activeFleetId,
      recipient: {
        id: selectedRecipient.id,
        name: selectedRecipient.name,
        city: selectedRecipient.city,
        platform: selectedRecipient.platform,
        status: selectedRecipient.status,
        kind: selectedRecipient.kind,
      },
      type,
      periodStartIso:  periodStart,
      periodEndIso:    periodEnd,
      paymentDateIso:  paymentDate,
      method,
      breakdown,
      amountPaid:      amountPaidNum,
      totalCalculated,
      status:          finalStatus,
      reference:       reference.trim() || null,
      notes:           notes.trim() || null,
      createdBy:       user.name,
      overrideReason:  isOverpayment ? overrideReason.trim() : null,
    });

    logActivity(
      asDraft ? "payment.draft" : "payment.create",
      [
        selectedRecipient.name,
        `${formatRon(amountPaidNum)} RON`,
        PAYMENT_TYPE_LABEL[type],
        PAYMENT_METHOD_LABEL[method],
        formatPeriod(periodStart, periodEnd),
        PAYMENT_STATUS_LABEL[finalStatus],
        activeFleet?.name ?? "",
      ].filter(Boolean).join(" · "),
    );

    toast.success(
      asDraft ? "Plată salvată ca neconfirmată" : "Plată înregistrată",
      `${selectedRecipient.name} · ${formatRon(amountPaidNum)} RON · ${PAYMENT_STATUS_LABEL[finalStatus]}`,
    );

    onSaved?.(payment);
    onClose();
  }

  // Recipient search dropdown
  const [recSearch, setRecSearch] = useState("");
  const [recOpen, setRecOpen] = useState(false);
  const recRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!recOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (recRef.current && !recRef.current.contains(e.target as Node)) setRecOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [recOpen]);

  const filteredRecipients = useMemo(() => {
    const q = recSearch.trim().toLowerCase();
    if (!q) return allRecipients;
    return allRecipients.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.city ?? "").toLowerCase().includes(q),
    );
  }, [allRecipients, recSearch]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-title"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={requestClose}
    >
      <div
        className="relative my-6 flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-line/60 px-6 py-5">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-[0_6px_18px_-6px_rgba(99,102,241,0.6)]">
            <Wallet size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="record-payment-title" className="text-[17px] font-bold text-fg">
              Înregistrează plată
            </h2>
            <p className="mt-0.5 text-[12.5px] text-fg-muted">
              Înregistrează o plată manuală pentru curier sau subcontractor.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Închide"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {/* Row 1: Beneficiar + Detalii plată */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Card 1 — Beneficiar */}
            <Card title="Beneficiar">
              <Field label="Curier / Subcontractor" required error={errors.recipient}>
                <div ref={recRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setRecOpen((v) => !v)}
                    className="flex w-full items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2 text-left text-[13px] text-fg hover:border-line/80 focus:border-violet-500/50 focus:outline-none"
                  >
                    <Search size={14} className="text-fg-dim" />
                    <span className="flex-1 truncate">
                      {selectedRecipient?.name ?? "Caută curier..."}
                    </span>
                    <ChevronDown size={14} className="text-fg-dim" />
                  </button>
                  {recOpen && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-hidden rounded-lg border border-line bg-card shadow-2xl">
                      <div className="border-b border-line/60 px-3 py-2">
                        <input
                          autoFocus
                          value={recSearch}
                          onChange={(e) => setRecSearch(e.target.value)}
                          placeholder="Caută după nume sau oraș..."
                          className="w-full bg-transparent text-[12.5px] text-fg placeholder:text-fg-dim focus:outline-none"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredRecipients.length === 0 ? (
                          <div className="px-3 py-3 text-[12px] text-fg-dim">Niciun rezultat.</div>
                        ) : (
                          filteredRecipients.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => { setRecipientId(r.id); setRecOpen(false); setRecSearch(""); }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-card-hover"
                            >
                              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 text-[10.5px] font-bold text-fg">
                                {r.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[12.5px] font-medium text-fg">{r.name}</div>
                                <div className="truncate text-[11px] text-fg-dim">
                                  {r.city ?? "—"}{r.platform && ` · ${PLATFORM_INFO[r.platform].label}`}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Field>

              {selectedRecipient && (
                <div className="flex items-center gap-3 rounded-lg border border-line/60 bg-white/[0.02] p-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/40 to-blue-500/40 text-[11px] font-bold text-fg">
                    {selectedRecipient.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-fg">
                      {selectedRecipient.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-fg-muted">
                      <span>{selectedRecipient.city ?? "—"}</span>
                      {selectedRecipient.platform && (
                        <>
                          <span className="text-fg-dim">·</span>
                          <span className="inline-flex items-center gap-1">
                            <PlatformLogo platform={selectedRecipient.platform} size={11} />
                            {PLATFORM_INFO[selectedRecipient.platform].label}
                          </span>
                        </>
                      )}
                      {selectedRecipient.status && (
                        <>
                          <span className="text-fg-dim">·</span>
                          <StatusBadge status={selectedRecipient.status} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Field label="Tip plată" required>
                <NativeSelect
                  value={type}
                  onChange={(v) => setType(v as PaymentType)}
                  options={Object.entries(PAYMENT_TYPE_LABEL).map(([v, l]) => ({ value: v, label: l }))}
                />
              </Field>
            </Card>

            {/* Card 2 — Detalii plată */}
            <Card title="Detalii plată">
              <Field label="Perioadă" required error={errors.period}>
                <div className="flex items-center gap-2 rounded-lg border border-line bg-card-hover p-2">
                  <Calendar size={14} className="ml-1 text-fg-dim" />
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[12.5px] text-fg focus:outline-none"
                  />
                  <span className="text-fg-dim">—</span>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[12.5px] text-fg focus:outline-none"
                  />
                </div>
                <span className="mt-1 text-[11px] text-fg-dim">
                  {formatPeriod(periodStart, periodEnd)}
                </span>
              </Field>

              <Field label="Dată plată" required error={errors.paymentDate}>
                <div className="flex items-center gap-2 rounded-lg border border-line bg-card-hover p-2">
                  <Calendar size={14} className="ml-1 text-fg-dim" />
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[12.5px] text-fg focus:outline-none"
                  />
                  <span className="mr-1 text-[11px] text-fg-dim">
                    {formatDateShort(paymentDate)}
                  </span>
                </div>
              </Field>

              <Field label="Metodă plată" required>
                <div className="flex items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2">
                  {method === "bank_transfer" && <Building2 size={14} className="text-fg-dim" />}
                  {method === "cash" && <Coins size={14} className="text-fg-dim" />}
                  {(method === "revolut" || method === "company" || method === "other") && (
                    <Wallet size={14} className="text-fg-dim" />
                  )}
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-transparent text-[13px] text-fg focus:outline-none"
                  >
                    {Object.entries(PAYMENT_METHOD_LABEL).map(([v, l]) => (
                      <option key={v} value={v} className="bg-card text-fg">{l}</option>
                    ))}
                  </select>
                </div>
              </Field>
            </Card>
          </div>

          {/* Card 3 — Sumă și detaliere */}
          <Card title="Sumă și detaliere"
            headerRight={
              <button
                type="button"
                onClick={() => setShowBreakdownEditor((v) => !v)}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-violet-300 hover:text-violet-200"
              >
                <Pencil size={12.5} />
                {showBreakdownEditor ? "Ascunde detalierea" : "Editează detalierea"}
              </button>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              {/* Left — big amount input */}
              <div>
                <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">
                  Sumă de plată
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-blue-500/[0.06] px-4 py-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-violet-300">
                    <Database size={15} />
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountPaidManual !== "" ? amountPaidManual : formatRon(totalCalculated)}
                    onChange={(e) => setAmountPaidManual(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 bg-transparent text-[22px] font-bold text-fg focus:outline-none"
                  />
                  <span className="text-[13px] font-semibold text-fg-muted">RON</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-fg-dim">
                  <Info size={11} />
                  Status derivat:{" "}
                  <PaymentStatusBadge status={derivedStatus} />
                  {isOverpayment && (
                    <span className="ml-2 text-amber-300">· depășește totalul</span>
                  )}
                </div>
                {errors.amount && (
                  <div className="mt-1 text-[11px] text-rose-400">{errors.amount}</div>
                )}
              </div>

              {/* Right — breakdown summary */}
              <div className="space-y-1.5 rounded-xl border border-line/60 bg-white/[0.02] p-4">
                <SummaryRow label="Venit raportat" value={breakdown.grossRevenue} sign="+" />
                {breakdown.tips > 0 && (
                  <SummaryRow label="Tips" value={breakdown.tips} sign="+" />
                )}
                {breakdown.fleetCommission > 0 && (
                  <SummaryRow label="Comision flotă" value={breakdown.fleetCommission} sign="-" />
                )}
                {breakdown.deductions > 0 && (
                  <SummaryRow label="Deduceri" value={breakdown.deductions} sign="-" />
                )}
                {(breakdown.tax + breakdown.advance + breakdown.vehicleCost +
                  breakdown.housingCost + breakdown.equipmentCost + breakdown.guarantee +
                  breakdown.penalty) > 0 && (
                  <SummaryRow label="Alte deduceri" value={
                    breakdown.tax + breakdown.advance + breakdown.vehicleCost +
                    breakdown.housingCost + breakdown.equipmentCost + breakdown.guarantee +
                    breakdown.penalty
                  } sign="-" />
                )}
                {(breakdown.correction + breakdown.otherAdjustments) !== 0 && (
                  <SummaryRow
                    label={breakdown.correction + breakdown.otherAdjustments >= 0 ? "Ajustări" : "Ajustări"}
                    value={Math.abs(breakdown.correction + breakdown.otherAdjustments)}
                    sign={breakdown.correction + breakdown.otherAdjustments >= 0 ? "+" : "-"}
                  />
                )}
                <div className="my-1 h-px bg-line/60" />
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-fg">Total de plată</span>
                  <span className="text-[15px] font-bold text-fg">
                    {formatRon(totalCalculated)} RON
                  </span>
                </div>
              </div>
            </div>

            {showBreakdownEditor && (
              <div className="mt-4 rounded-xl border border-line/60 bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-[12.5px] font-semibold text-fg">Editează detalierea</h4>
                  <button
                    type="button"
                    onClick={() => setBreakdown(EMPTY_BREAKDOWN)}
                    className="text-[11px] font-medium text-fg-dim hover:text-fg-muted"
                  >
                    Resetează la 0
                  </button>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  {BREAKDOWN_META.map((meta) => (
                    <div key={meta.key} className="flex flex-col gap-1">
                      <label className="flex items-center gap-1 text-[10.5px] font-medium text-fg-dim">
                        <span
                          className={cn(
                            "inline-block h-1.5 w-1.5 rounded-full",
                            meta.sign === "+" ? "bg-emerald-400" : "bg-rose-400",
                          )}
                        />
                        {meta.label}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={breakdown[meta.key]}
                        onChange={(e) => setBreakdown((prev) => ({
                          ...prev, [meta.key]: parseFloat(e.target.value) || 0,
                        }))}
                        className="rounded-md border border-line bg-card px-2 py-1.5 text-[12px] text-fg focus:border-violet-500/50 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Overpayment reason */}
          {isOverpayment && (
            <Card title="Motiv depășire" tone="warning">
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explică de ce plata depășește totalul calculat (ex: bonus, sold restant din perioada anterioară)..."
                rows={2}
                className="w-full rounded-lg border border-amber-500/40 bg-amber-500/[0.04] px-3 py-2 text-[12.5px] text-fg placeholder:text-amber-200/40 focus:border-amber-400 focus:outline-none"
              />
              {errors.override && (
                <span className="mt-1 text-[11px] text-rose-400">{errors.override}</span>
              )}
            </Card>
          )}

          {/* Row 3: Referință + Observații */}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Referință plată (opțională)">
              <div className="flex items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2">
                <FileText size={14} className="text-fg-dim" />
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="OP-2026-0905-014"
                  className="w-full bg-transparent text-[13px] text-fg placeholder:text-fg-dim focus:outline-none"
                />
              </div>
            </Field>

            <Field label="Observații (opțional)">
              <div className="flex items-start gap-2 rounded-lg border border-line bg-card-hover px-3 py-2">
                <MessageSquare size={14} className="mt-0.5 text-fg-dim" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adaugă observații despre această plată..."
                  rows={1}
                  className="w-full resize-none bg-transparent text-[13px] text-fg placeholder:text-fg-dim focus:outline-none"
                />
              </div>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-line/60 bg-white/[0.02] px-6 py-4">
          <button
            type="button"
            onClick={requestClose}
            className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[13px] font-medium text-fg hover:bg-white/[0.06]"
          >
            Anulează
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => submit(true)}
              className="text-[13px] font-medium text-violet-300 underline decoration-violet-400/40 underline-offset-4 hover:text-violet-200"
            >
              Salvează ca neconfirmată
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(99,102,241,0.55)] hover:shadow-[0_8px_22px_-6px_rgba(99,102,241,0.7)]"
            >
              <Wallet size={14} strokeWidth={2.4} />
              Înregistrează plata
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Card({
  title, children, headerRight, tone,
}: {
  title: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  tone?: "warning";
}) {
  return (
    <section
      className={cn(
        "rounded-xl border p-4",
        tone === "warning"
          ? "border-amber-500/30 bg-amber-500/[0.04]"
          : "border-line/60 bg-white/[0.02]",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13.5px] font-bold text-fg">{title}</h3>
        {headerRight}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label, required, error, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </div>
  );
}

function NativeSelect({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[13px] text-fg focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card text-fg">{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function SummaryRow({
  label, value, sign,
}: {
  label: string;
  value: number;
  sign: "+" | "-";
}) {
  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span className="text-fg-muted">{label}</span>
      <span className={cn("font-semibold tabular-nums", sign === "-" ? "text-rose-400" : "text-fg")}>
        {sign === "-" ? "−" : ""}{formatRon(value)} RON
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: CourierStatus }) {
  const cls = {
    pending:        "bg-amber-500/15 text-amber-300",
    draft:          "bg-white/[0.05] text-fg-dim",
    in_activation:  "bg-emerald-500/15 text-emerald-300",
    active:         "bg-emerald-500/15 text-emerald-300",
    rejected:       "bg-rose-500/15 text-rose-300",
    paused:         "bg-amber-500/15 text-amber-300",
    stopped:        "bg-rose-500/15 text-rose-300",
  }[status];
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold", cls)}>
      {COURIER_STATUS_LABEL[status]}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const cls = {
    unpaid:    "bg-white/[0.05] text-fg-dim",
    partial:   "bg-amber-500/15 text-amber-300",
    paid:      "bg-emerald-500/15 text-emerald-300",
    in_review: "bg-sky-500/15 text-sky-300",
    blocked:   "bg-rose-500/15 text-rose-300",
    issue:     "bg-rose-500/15 text-rose-300",
  }[status];
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider", cls)}>
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}
