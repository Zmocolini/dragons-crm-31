"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Upload } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import {
  EMPTY_BREAKDOWN, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_ORDER,
  calculateTotal, deductionsTotal, formatMoney, ibanForCourier, round2,
  type Currency, type Payment, type PaymentBreakdown, type PaymentMethod, type PaymentStatus,
} from "@/lib/payments/types";
import { cn } from "@/lib/utils/cn";

// ── Câmp numeric reutilizabil ────────────────────────────────────────────────
function Num({ label, value, onChange, suffix = "RON" }: { label: string; value: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-fg-dim">{label}</span>
      <span className="flex items-center rounded-lg border border-line bg-card-hover px-2.5 py-1.5">
        <input
          type="number" inputMode="decimal" min={0} value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full bg-transparent text-[12.5px] text-fg focus:outline-none"
        />
        <span className="ml-1 text-[10.5px] text-fg-dim">{suffix}</span>
      </span>
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-fg-dim">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-line bg-card-hover px-2.5 py-1.5 text-[12.5px] text-fg focus:outline-none focus:ring-1 focus:ring-violet-500/40";

// ═══════════════════════════════════════════════════════════════════════════
// ADAUGĂ PLATĂ
// ═══════════════════════════════════════════════════════════════════════════
export function AddPaymentDialog({
  open, onClose, couriers, fleetId, tenantId, actorName, onCreate,
}: {
  open: boolean;
  onClose: () => void;
  couriers: CourierRow[];
  fleetId: string;
  tenantId: string;
  actorName: string;
  onCreate: (p: Omit<Payment, "id" | "createdAtIso">) => void;
}) {
  const [courierId, setCourierId] = useState("");
  const [periodStart, setPeriodStart] = useState("2026-09-01");
  const [periodEnd, setPeriodEnd] = useState("2026-09-07");
  const [orders, setOrders] = useState(0);
  const [gross, setGross] = useState(0);
  const [commissionPct, setCommissionPct] = useState(12);
  const [commissionAmt, setCommissionAmt] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [equipment, setEquipment] = useState(0);
  const [other, setOther] = useState(0);
  const [status, setStatus] = useState<PaymentStatus>("in_review");
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [notes, setNotes] = useState("");

  const courier = couriers.find((c) => c.id === courierId) ?? null;
  const autoCommission = round2((gross * commissionPct) / 100);
  const effectiveCommission = commissionAmt > 0 ? commissionAmt : autoCommission;
  const net = round2(gross - effectiveCommission - penalty - equipment - other);
  const periodValid = periodStart <= periodEnd;
  const valid = !!courier && gross >= 0 && net >= 0 && periodValid;

  const reset = () => {
    setCourierId(""); setOrders(0); setGross(0); setCommissionPct(12); setCommissionAmt(0);
    setPenalty(0); setEquipment(0); setOther(0); setStatus("in_review"); setMethod("bank_transfer"); setNotes("");
  };

  const submit = () => {
    if (!courier || !valid) return;
    const breakdown: PaymentBreakdown = {
      ...EMPTY_BREAKDOWN,
      grossRevenue: gross,
      fleetCommission: effectiveCommission,
      penalty,
      equipmentCost: equipment,
      deductions: other,
    };
    const total = calculateTotal(breakdown);
    onCreate({
      tenantId, fleetId,
      recipient: {
        id: courier.id, name: courier.fullName, city: courier.city,
        platform: courier.platforms[0] ?? null, status: courier.status,
        kind: "courier",
      },
      type: "courier_pay",
      periodStartIso: periodStart, periodEndIso: periodEnd, paymentDateIso: periodEnd,
      method,
      breakdown,
      amountPaid: status === "paid" ? total : 0,
      totalCalculated: total,
      status,
      reference: null, notes: notes.trim() || null,
      createdBy: actorName, overrideReason: null,
      ordersCount: orders, platforms: courier.platforms, commissionPercentage: commissionPct,
      currency: "RON", ibanSnapshot: ibanForCourier(courier.id),
      operatorName: status === "paid" ? actorName : null,
      approvedBy: null, approvedAtIso: null,
      paidBy: status === "paid" ? actorName : null,
      paidAtIso: status === "paid" ? new Date().toISOString() : null,
    });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Adaugă plată" description="Suma finală se calculează automat din venit − comision − deduceri." size="lg">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Curier">
            <select value={courierId} onChange={(e) => { setCourierId(e.target.value); const c = couriers.find((x) => x.id === e.target.value); if (c) setGross(0); }} className={inputCls}>
              <option value="" className="bg-card">Alege curier…</option>
              {couriers.map((c) => <option key={c.id} value={c.id} className="bg-card">{c.fullName} · {c.city}</option>)}
            </select>
          </Field>
          <Field label="Platformă">
            <input readOnly value={courier ? courier.platforms.join(", ").toUpperCase() : "—"} className={cn(inputCls, "opacity-70")} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Perioadă (start)"><input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputCls} /></Field>
          <Field label="Perioadă (sfârșit)"><input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputCls} /></Field>
          <Num label="Nr. comenzi" value={orders} onChange={setOrders} suffix="cmd" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Num label="Venit brut" value={gross} onChange={setGross} />
          <Num label="Procent comision" value={commissionPct} onChange={(n) => { setCommissionPct(n); setCommissionAmt(0); }} suffix="%" />
          <Num label="Valoare comision" value={commissionAmt > 0 ? commissionAmt : autoCommission} onChange={setCommissionAmt} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Num label="Penalizări" value={penalty} onChange={setPenalty} />
          <Num label="Echipamente" value={equipment} onChange={setEquipment} />
          <Num label="Alte deduceri" value={other} onChange={setOther} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)} className={inputCls}>
              {PAYMENT_STATUS_ORDER.map((s) => <option key={s} value={s} className="bg-card">{PAYMENT_STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Metodă plată">
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputCls}>
              {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => <option key={m} value={m} className="bg-card">{PAYMENT_METHOD_LABEL[m]}</option>)}
            </select>
          </Field>
        </div>

        <Field label="IBAN (snapshot din profil)">
          <input readOnly value={courier ? ibanForCourier(courier.id) : "—"} className={cn(inputCls, "font-mono opacity-70")} />
        </Field>

        <Field label="Observații">
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={cn(inputCls, "resize-y")} />
        </Field>

        <div className="flex items-center justify-between rounded-lg border border-line/60 bg-card-hover px-3 py-2.5">
          <span className="text-[12.5px] font-semibold text-fg">Sumă de plată</span>
          <span className={cn("text-[17px] font-bold tabular-nums", net < 0 ? "text-rose-300" : "text-emerald-300")}>{formatMoney(net)}</span>
        </div>
        {!periodValid && <p className="text-[11.5px] text-rose-300">Perioada de start trebuie să fie ≤ perioada de sfârșit.</p>}
        {net < 0 && <p className="text-[11.5px] text-rose-300">Suma de plată nu poate fi negativă. Verifică deducerile.</p>}
      </div>

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.05]">Anulează</button>
        <button type="button" disabled={!valid} onClick={submit} className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-40">Salvează plata</button>
      </DialogFooter>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORT
// ═══════════════════════════════════════════════════════════════════════════
type ImportRow = {
  name: string; platform: string; periodStart: string; periodEnd: string;
  orders: number; gross: number; commission: number; deductions: number;
  net: number; status: string; iban: string;
  errors: string[]; duplicate: boolean;
};

function parseCsv(text: string, existingKeys: Set<string>): ImportRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase());
  const idx = (keys: string[]) => headers.findIndex((h) => keys.some((k) => h.includes(k)));
  const iName = idx(["nume", "name", "curier"]);
  const iPlat = idx(["platform", "platformă", "platforma"]);
  const iPs = idx(["start", "perioada"]);
  const iPe = idx(["end", "sfarsit", "sfârșit"]);
  const iOrd = idx(["comenzi", "orders"]);
  const iGross = idx(["brut", "gross", "venit"]);
  const iComm = idx(["comision", "commission"]);
  const iDed = idx(["deduceri", "deductions"]);
  const iNet = idx(["plata", "plată", "net", "suma"]);
  const iStatus = idx(["status"]);
  const iIban = idx(["iban"]);

  return lines.slice(1).map((line) => {
    const cols = line.split(/[,;]/).map((c) => c.trim());
    const num = (i: number) => (i >= 0 ? Number((cols[i] ?? "").replace(/[^\d.-]/g, "")) || 0 : 0);
    const name = iName >= 0 ? cols[iName] ?? "" : "";
    const gross = num(iGross);
    const commission = num(iComm);
    const deductions = num(iDed);
    const netParsed = iNet >= 0 ? num(iNet) : round2(gross - commission - deductions);
    const periodStart = iPs >= 0 ? cols[iPs] ?? "" : "";
    const periodEnd = iPe >= 0 ? cols[iPe] ?? "" : "";
    const errors: string[] = [];
    if (!name) errors.push("Nume lipsă");
    if (gross < 0 || commission < 0 || deductions < 0 || netParsed < 0) errors.push("Sumă negativă");
    if (Number.isNaN(gross) || Number.isNaN(netParsed)) errors.push("Valoare invalidă");
    const key = `${name.toLowerCase()}|${periodStart}`;
    return {
      name, platform: iPlat >= 0 ? cols[iPlat] ?? "" : "", periodStart, periodEnd,
      orders: num(iOrd), gross, commission, deductions, net: netParsed,
      status: iStatus >= 0 ? cols[iStatus] ?? "" : "", iban: iIban >= 0 ? cols[iIban] ?? "" : "",
      errors, duplicate: existingKeys.has(key),
    };
  });
}

export function ImportPaymentsDialog({
  open, onClose, existingKeys, onImport,
}: {
  open: boolean;
  onClose: () => void;
  existingKeys: Set<string>;
  onImport: (rows: ImportRow[]) => void;
}) {
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [xlsxWarn, setXlsxWarn] = useState(false);

  const rows = useMemo(() => (raw ? parseCsv(raw, existingKeys) : []), [raw, existingKeys]);
  const importable = rows.filter((r) => r.errors.length === 0 && !r.duplicate);
  const errorCount = rows.filter((r) => r.errors.length > 0).length;
  const dupCount = rows.filter((r) => r.duplicate).length;

  const onFile = (f: File | null) => {
    if (!f) return;
    setFileName(f.name);
    if (f.name.toLowerCase().endsWith(".xlsx")) { setXlsxWarn(true); return; }
    setXlsxWarn(false);
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result ?? ""));
    reader.readAsText(f);
  };

  const confirm = () => { onImport(importable); setRaw(""); setFileName(null); onClose(); };

  return (
    <Dialog open={open} onClose={onClose} title="Importă plăți" description="CSV (separator , sau ;). Verifică preview-ul înainte de confirmare." size="lg">
      <div className="space-y-3">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line px-3 py-4 text-[12.5px] font-medium text-fg hover:bg-white/[0.04]">
          <Upload size={15} />
          {fileName ? `Fișier: ${fileName}` : "Încarcă fișier CSV / XLSX"}
          <input type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>

        {xlsxWarn && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11.5px] text-amber-200">
            <AlertTriangle size={13} /> XLSX necesită bibliotecă suplimentară neinstalată. Exportă fișierul ca CSV și reîncearcă.
          </div>
        )}

        <div>
          <span className="mb-1 block text-[11px] font-medium text-fg-dim">Sau lipește datele (prima linie = antet)</span>
          <textarea
            rows={4} value={raw} onChange={(e) => setRaw(e.target.value)}
            placeholder="nume,platforma,perioada_start,perioada_end,comenzi,venit_brut,comision,deduceri,suma,status,iban"
            className={cn(inputCls, "resize-y font-mono text-[11px]")}
          />
        </div>

        {rows.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 text-[11.5px]">
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-300">{importable.length} valide</span>
              {dupCount > 0 && <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-300">{dupCount} duplicate (ignorate)</span>}
              {errorCount > 0 && <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-rose-300">{errorCount} cu erori (ignorate)</span>}
            </div>
            <div className="max-h-52 overflow-auto rounded-lg border border-line/60">
              <table className="w-full text-left text-[11.5px]">
                <thead className="sticky top-0 bg-card text-[10px] uppercase text-fg-dim">
                  <tr><th className="px-2 py-1.5">Nume</th><th className="px-2 py-1.5 text-right">Brut</th><th className="px-2 py-1.5 text-right">De plată</th><th className="px-2 py-1.5">Stare</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-line/40">
                      <td className="px-2 py-1.5 text-fg">{r.name || <span className="text-rose-300">—</span>}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-fg-muted">{formatMoney(r.gross)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-fg">{formatMoney(r.net)}</td>
                      <td className="px-2 py-1.5">
                        {r.errors.length > 0 ? <span className="text-rose-300">{r.errors.join(", ")}</span>
                          : r.duplicate ? <span className="text-amber-300">duplicat</span>
                          : <span className="text-emerald-300">ok</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.05]">Anulează</button>
        <button type="button" disabled={importable.length === 0} onClick={confirm} className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-40">
          Importă {importable.length > 0 ? `(${importable.length})` : ""}
        </button>
      </DialogFooter>
    </Dialog>
  );
}
export type { ImportRow };

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════
export function ExportPaymentsDialog({
  open, onClose, rows, currency, ibanOf, onExported,
}: {
  open: boolean;
  onClose: () => void;
  rows: Payment[];
  currency: Currency;
  ibanOf: (courierId: string) => string;
  onExported: (count: number) => void;
}) {
  const download = () => {
    const header = [
      "ID", "Curier", "Oras", "Platforma", "Perioada start", "Perioada end",
      "Comenzi", "Venit brut", "Comision", "Deduceri", "De plata", "Status",
      "IBAN", "Operator", "Data platii",
    ];
    const escape = (v: string | number) => {
      const s = String(v);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((p) => [
      p.id, p.recipient.name, p.recipient.city ?? "", (p.platforms ?? []).join("|"),
      p.periodStartIso, p.periodEndIso, p.ordersCount ?? 0,
      p.breakdown.grossRevenue, p.breakdown.fleetCommission, deductionsTotal(p.breakdown),
      p.totalCalculated, PAYMENT_STATUS_LABEL[p.status],
      p.ibanSnapshot ?? ibanOf(p.recipient.id), p.operatorName ?? "",
      p.paidAtIso ?? "",
    ].map(escape).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plati-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onExported(rows.length);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Exportă plăți" description={`${rows.length} plăți (rezultatele filtrate curent) vor fi exportate.`} size="sm">
      <p className="text-[12.5px] text-fg-muted">Format: <span className="font-semibold text-fg">CSV</span> (UTF-8, deschide direct în Excel). Monedă afișată: {currency}.</p>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.05]">Anulează</button>
        <button type="button" disabled={rows.length === 0} onClick={download} className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-40">Descarcă CSV</button>
      </DialogFooter>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MARCHEAZĂ CA PLĂTIT (confirmare)
// ═══════════════════════════════════════════════════════════════════════════
export function MarkPaidConfirmDialog({
  payment, currency, onCancel, onConfirm,
}: {
  payment: Payment | null;
  currency: Currency;
  onCancel: () => void;
  onConfirm: (id: string) => void;
}) {
  if (!payment) return null;
  return (
    <Dialog open={!!payment} onClose={onCancel} title="Confirmă plata efectuată" size="sm">
      <p className="text-[12.5px] text-fg-muted">
        Confirmi că plata de <b className="text-fg">{formatMoney(payment.totalCalculated, currency)}</b> către <b className="text-fg">{payment.recipient.name}</b> a fost efectuată?
      </p>
      <div className="mt-3 space-y-1.5 rounded-lg border border-line/60 bg-card-hover p-3 text-[12px]">
        <Row k="Curier" v={payment.recipient.name} />
        <Row k="Sumă" v={formatMoney(payment.totalCalculated, currency)} />
        <Row k="IBAN" v={payment.ibanSnapshot ?? "—"} mono />
        <Row k="Metodă" v={PAYMENT_METHOD_LABEL[payment.method]} />
        <Row k="Perioadă" v={`${payment.periodStartIso} → ${payment.periodEndIso}`} />
      </div>
      <DialogFooter>
        <button type="button" onClick={onCancel} className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.05]">Anulează</button>
        <button type="button" onClick={() => onConfirm(payment.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-1.5 text-[12.5px] font-semibold text-white">
          <Check size={14} /> Confirmă plata
        </button>
      </DialogFooter>
    </Dialog>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-fg-dim">{k}</span>
      <span className={cn("font-medium text-fg", mono && "font-mono text-[11px]")}>{v}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHIMBĂ STATUS
// ═══════════════════════════════════════════════════════════════════════════
export function ChangeStatusDialog({
  payment, onCancel, onConfirm,
}: {
  payment: Payment | null;
  onCancel: () => void;
  onConfirm: (id: string, status: PaymentStatus) => void;
}) {
  const [status, setStatus] = useState<PaymentStatus>(payment?.status ?? "in_review");
  if (!payment) return null;
  return (
    <Dialog open={!!payment} onClose={onCancel} title="Schimbă statusul plății" size="sm">
      <div className="space-y-1.5">
        {PAYMENT_STATUS_ORDER.map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)}
            className={cn("flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-[12.5px]",
              status === s ? "border-violet-500/50 bg-violet-500/10 text-fg" : "border-line bg-card-hover text-fg-muted hover:text-fg")}>
            {PAYMENT_STATUS_LABEL[s]}
            {status === s && <Check size={14} className="text-violet-300" />}
          </button>
        ))}
      </div>
      <DialogFooter>
        <button type="button" onClick={onCancel} className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.05]">Anulează</button>
        <button type="button" onClick={() => onConfirm(payment.id, status)} className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-[12.5px] font-semibold text-white">Salvează</button>
      </DialogFooter>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EDITEAZĂ
// ═══════════════════════════════════════════════════════════════════════════
export function EditPaymentDialog({
  payment, onCancel, onSave,
}: {
  payment: Payment | null;
  onCancel: () => void;
  onSave: (id: string, patch: Partial<Payment>) => void;
}) {
  // Câmpuri principale
  const [gross, setGross] = useState(payment?.breakdown.grossRevenue ?? 0);
  const [tips, setTips] = useState(payment?.breakdown.tips ?? 0);
  // Comision cu procent editabil — recalculăm suma automat când se schimbă
  const [commissionPct, setCommissionPct] = useState<number>(payment?.commissionPercentage ?? 0);
  const [commissionRon, setCommissionRon] = useState(payment?.breakdown.fleetCommission ?? 0);
  const [contractFee, setContractFee] = useState(payment?.breakdown.tax ?? 0);
  const [negBalance, setNegBalance] = useState(payment?.breakdown.deductions ?? 0);
  const [penalty, setPenalty] = useState(payment?.breakdown.penalty ?? 0);
  const [equipment, setEquipment] = useState(payment?.breakdown.equipmentCost ?? 0);
  // Meta
  const [method, setMethod] = useState<PaymentMethod>(payment?.method ?? "bank_transfer");
  const [status, setStatus] = useState<PaymentStatus>(payment?.status ?? "unpaid");
  const [periodStart, setPeriodStart] = useState(payment?.periodStartIso ?? "");
  const [periodEnd, setPeriodEnd] = useState(payment?.periodEndIso ?? "");
  const [payDate, setPayDate] = useState(payment?.paymentDateIso ?? "");
  const [notes, setNotes] = useState(payment?.notes ?? "");
  // Sincronizare live comision% ↔ comision RON
  const updateCommissionPct = (pct: number) => {
    setCommissionPct(pct);
    setCommissionRon(round2((gross + tips) * pct / 100));
  };
  const updateCommissionRon = (ron: number) => {
    setCommissionRon(ron);
    const base = gross + tips;
    if (base > 0) setCommissionPct(round2((ron / base) * 100));
  };
  // Când brut sau tips se schimbă, recalculează comision RON pe baza procentului curent
  const updateGross = (v: number) => {
    setGross(v);
    setCommissionRon(round2((v + tips) * commissionPct / 100));
  };
  const updateTips = (v: number) => {
    setTips(v);
    setCommissionRon(round2((gross + v) * commissionPct / 100));
  };

  if (!payment) return null;
  const net = round2(gross + tips - commissionRon - contractFee - negBalance - penalty - equipment);

  const save = () => {
    const breakdown: PaymentBreakdown = {
      ...payment.breakdown,
      grossRevenue: gross,
      tips,
      fleetCommission: commissionRon,
      tax: contractFee,
      deductions: negBalance,
      penalty,
      equipmentCost: equipment,
    };
    onSave(payment.id, {
      breakdown, method, status,
      periodStartIso: periodStart,
      periodEndIso: periodEnd,
      paymentDateIso: payDate,
      commissionPercentage: commissionPct,
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog open={!!payment} onClose={onCancel} title="Editează plata" description={`Toate câmpurile financiare pot fi modificate. ${payment.recipient.name}.`} size="lg">
      <div className="space-y-3">
        {/* Sume principale */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Num label="Venit brut (fără tips)" value={gross} onChange={updateGross} />
          <Num label="Bacșiș (tips)" value={tips} onChange={updateTips} />
          <Num label="Balanță negativă" value={negBalance} onChange={setNegBalance} />
        </div>

        {/* Comision % + RON (sincronizate) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Comision (%)">
            <div className="relative">
              <input
                type="number" min={0} max={100} step={0.5}
                value={commissionPct}
                onChange={(e) => updateCommissionPct(Number(e.target.value) || 0)}
                className={cn(inputCls, "pr-8")}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-fg-dim">%</span>
            </div>
          </Field>
          <Num label="Comision (RON)" value={commissionRon} onChange={updateCommissionRon} />
          <Num label="Taxă contract" value={contractFee} onChange={setContractFee} />
        </div>

        {/* Alte deduceri */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Num label="Penalizări" value={penalty} onChange={setPenalty} />
          <Num label="Echipamente" value={equipment} onChange={setEquipment} />
          <Field label="Metodă">
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputCls}>
              {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => <option key={m} value={m} className="bg-card">{PAYMENT_METHOD_LABEL[m]}</option>)}
            </select>
          </Field>
        </div>

        {/* Status + Perioadă + Data plății */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)} className={inputCls}>
              {(Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[]).map((s) => <option key={s} value={s} className="bg-card">{PAYMENT_STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Perioada start">
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Perioada sfârșit">
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Data plății">
            <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Observații">
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={cn(inputCls, "resize-y")} />
        </Field>

        {/* NET calculat live */}
        <div className="flex items-center justify-between rounded-lg border border-line/60 bg-card-hover px-3 py-2.5">
          <span className="text-[12.5px] font-semibold text-fg">Sumă de plată</span>
          <span className={cn("text-[18px] font-bold tabular-nums", net < 0 ? "text-rose-300" : "text-emerald-300")}>{formatMoney(net)}</span>
        </div>
        <div className="text-[10.5px] text-fg-dim">
          Formulă: (brut + tips) − comision − taxă − balanță neg − penalizări − echipamente
        </div>
        {net < 0 && <p className="text-[11.5px] text-rose-300">Atenție: suma calculată e negativă — curierul rămâne dator cu {formatMoney(Math.abs(net))}.</p>}
      </div>
      <DialogFooter>
        <button type="button" onClick={onCancel} className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.05]">Anulează</button>
        <button type="button" onClick={save} className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-[12.5px] font-semibold text-white">Salvează modificările</button>
      </DialogFooter>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ADAUGĂ DEDUCERE
// ═══════════════════════════════════════════════════════════════════════════
const DEDUCTION_OPTIONS: Array<{ key: keyof PaymentBreakdown; label: string }> = [
  { key: "penalty",        label: "Penalizare" },
  { key: "equipmentCost",  label: "Echipament" },
  { key: "housingCost",    label: "Cazare" },
  { key: "vehicleCost",    label: "Vehicul" },
  { key: "advance",        label: "Avans" },
  { key: "deductions",     label: "Datorii / alte deduceri" },
];

export function AddDeductionDialog({
  payment, onCancel, onConfirm,
}: {
  payment: Payment | null;
  onCancel: () => void;
  onConfirm: (id: string, key: keyof PaymentBreakdown, amount: number, description: string) => void;
}) {
  const [key, setKey] = useState<keyof PaymentBreakdown>("penalty");
  const [amount, setAmount] = useState(0);
  const [desc, setDesc] = useState("");
  if (!payment) return null;
  return (
    <Dialog open={!!payment} onClose={onCancel} title="Adaugă deducere" description={`Se scade din suma de plată a lui ${payment.recipient.name}.`} size="sm">
      <div className="space-y-3">
        <Field label="Categorie">
          <select value={key} onChange={(e) => setKey(e.target.value as keyof PaymentBreakdown)} className={inputCls}>
            {DEDUCTION_OPTIONS.map((o) => <option key={o.key} value={o.key} className="bg-card">{o.label}</option>)}
          </select>
        </Field>
        <Num label="Sumă" value={amount} onChange={setAmount} />
        <Field label="Descriere"><input value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} /></Field>
      </div>
      <DialogFooter>
        <button type="button" onClick={onCancel} className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.05]">Anulează</button>
        <button type="button" disabled={amount <= 0} onClick={() => onConfirm(payment.id, key, amount, desc)} className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-40">Adaugă</button>
      </DialogFooter>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIRMARE BULK
// ═══════════════════════════════════════════════════════════════════════════
export function BulkConfirmDialog({
  open, title, message, confirmLabel, onCancel, onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <Dialog open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-[12.5px] text-fg-muted">{message}</p>
      <DialogFooter>
        <button type="button" onClick={onCancel} className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.05]">Anulează</button>
        <button type="button" onClick={onConfirm} className="rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-1.5 text-[12.5px] font-semibold text-white">{confirmLabel}</button>
      </DialogFooter>
    </Dialog>
  );
}
