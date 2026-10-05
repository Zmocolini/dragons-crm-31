"use client";

import { useState } from "react";
import {
  Check, Copy, Edit, FileDown, Mail, MapPin, Phone, Plus, Trash2, User, X,
} from "lucide-react";
import { PlatformChip } from "@/components/ui/PlatformLogo";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import { VEHICLE_TYPE_LABEL } from "@/lib/couriers/types";
import type { Permission } from "@/lib/rbac/roles";
import { formatShortDateTime } from "@/lib/utils/date";
import { useDuplicatePairs } from "@/lib/subcontractors/duplicate-pairs-context";
import { areNamesEquivalent } from "@/lib/utils/name-matching";
import { isMergedPayment } from "@/lib/payments/merge-duplicates";
import {
  BREAKDOWN_META, PAYMENT_ACTIVITY_DOT, PAYMENT_ACTIVITY_LABEL,
  PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_STYLE,
  formatMoney, formatPeriodLong, isoWeekNumber,
  type Currency, type Payment, type PaymentActivity, type PaymentDocumentRef, type PaymentNote,
} from "@/lib/payments/types";
import { cn } from "@/lib/utils/cn";

type Tab = "details" | "history" | "documents" | "notes";

export function PaymentDetailsPanel({
  payment, courier, currency, activities, notes, documents, can,
  onClose, onChangeStatus, onMarkPaid, onEdit, onDownloadPayslip,
  onAddNote, onRemoveNote, onViewCourier, onAddDeduction,
}: {
  payment: Payment;
  courier: CourierRow | null;
  currency: Currency;
  activities: PaymentActivity[];
  notes: PaymentNote[];
  documents: PaymentDocumentRef[];
  can: (p: Permission) => boolean;
  onClose: () => void;
  onChangeStatus: () => void;
  onMarkPaid: () => void;
  onEdit: () => void;
  onDownloadPayslip: () => void;
  onAddNote: (text: string) => void;
  onRemoveNote: (id: string) => void;
  onViewCourier: () => void;
  onAddDeduction: () => void;
}) {
  const [tab, setTab] = useState<Tab>("details");
  const [copied, setCopied] = useState(false);
  const st = PAYMENT_STATUS_STYLE[payment.status];
  const canFinance = can("payments.create");
  const iban = payment.ibanSnapshot ?? "—";

  const { groupFor: duplicateGroupFor, pairOptionsFor } = useDuplicatePairs();
  const duplicateGroup = duplicateGroupFor(payment.recipient.name);
  const pairOpts = pairOptionsFor(payment.recipient.name);
  const isMerged = isMergedPayment(payment.id);
  const groupPlatforms = duplicateGroup
    ? Array.from(new Set(duplicateGroup.aliases.map((a) => a.platform)))
    : (payment.platforms ?? (payment.recipient.platform ? [payment.recipient.platform] : []));

  const copyIban = async () => {
    if (!payment.ibanSnapshot) return;
    try {
      await navigator.clipboard.writeText(payment.ibanSnapshot.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard indisponibil */ }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-line/60 p-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 text-[13px] font-bold text-fg">
            {payment.recipient.name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold text-fg">{payment.recipient.name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-fg-dim">
              <span className="font-mono">ID: #{payment.recipient.id.toUpperCase()}</span>
              {payment.recipient.status && (
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-300">Activ</span>
              )}
              {duplicateGroup && (
                <span className="inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/15 px-1.5 py-0.5 font-bold text-cyan-200">
                  <Copy size={10} />
                  {isMerged ? "1× Combinat" : "2× Cont dublu"} ({groupPlatforms.map((p) => p.toUpperCase()).join(" + ")})
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {(payment.platforms ?? (payment.recipient.platform ? [payment.recipient.platform] : [])).map((p) => (
                <PlatformChip key={p} platform={p} size={15} showLabel={false} />
              ))}
            </div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg" aria-label="Închide">
          <X size={16} />
        </button>
      </div>

      {/* Courier contact */}
      <div className="grid grid-cols-2 gap-2 border-b border-line/60 px-4 py-3 text-[11.5px]">
        <ContactRow icon={Phone} value={courier?.phone ?? "—"} href={courier ? `tel:${courier.phone.replace(/\s/g, "")}` : undefined} />
        <ContactRow icon={Mail} value={courier?.email ?? "—"} href={courier?.email ? `mailto:${courier.email}` : undefined} />
        <ContactRow icon={MapPin} value={payment.recipient.city ?? "—"} />
        <ContactRow icon={User} value={courier ? `${VEHICLE_TYPE_LABEL[courier.vehicleType]} · ${courier.vehicleModel}` : "—"} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-line/60 px-2">
        {([["details", "Detalii"], ["history", "Istoric"], ["documents", "Documente"], ["notes", "Note"]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={cn("-mb-px border-b-2 px-3 py-2 text-[12.5px] font-medium transition-colors", tab === k ? "border-violet-500 text-fg" : "border-transparent text-fg-dim hover:text-fg")}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "details" && (
          <div className="space-y-4">
            {/* Perioadă */}
            <div className="flex items-center justify-between rounded-lg border border-line/60 bg-card-hover px-3 py-2">
              <div>
                <div className="text-[10.5px] font-medium uppercase tracking-wider text-fg-dim">Perioadă plată</div>
                <div className="text-[12.5px] font-semibold text-fg">{formatPeriodLong(payment.periodStartIso, payment.periodEndIso)}</div>
              </div>
              <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-200">
                Săptămâna {isoWeekNumber(payment.periodStartIso)}
              </span>
            </div>

            {/* Cont dublu (Glovo + Bolt) info banner */}
            {duplicateGroup && (
              <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-cyan-200">
                    <Copy size={13} className="text-cyan-400" />
                    Cont dublu: {groupPlatforms.map((a) => a.toUpperCase()).join(" + ")}
                  </div>
                  <span className={cn(
                    "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
                    isMerged ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30" : "bg-cyan-500/20 text-cyan-200 border border-cyan-500/30"
                  )}>
                    {isMerged ? "1× Combinat" : "2× Activ"}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {duplicateGroup.aliases.map((a, idx) => {
                    const isCurrent = areNamesEquivalent(a.name, payment.recipient.name);
                    return (
                      <div key={idx} className="flex items-center justify-between rounded bg-black/40 px-2 py-1 text-[11px]">
                        <span className="font-medium text-fg">
                          {a.name}
                          {isCurrent && <span className="ml-1 text-[9.5px] text-cyan-300 font-normal">(contul curent)</span>}
                        </span>
                        <span className="rounded bg-white/10 px-1.5 py-0.2 font-mono text-[9.5px] uppercase text-fg-dim">
                          {a.platform}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-cyan-500/20 pt-2 text-[10.5px] text-fg-muted">
                  <span>Taxă săptămânală: <b className="text-fg">{pairOpts?.feeOnce != null ? `${pairOpts.feeOnce} RON` : "Standard"} (o singură dată pe pereche)</b></span>
                  {pairOpts?.commissionPct != null && (
                    <span>Comision: <b className="text-fg">{pairOpts.commissionPct}%</b></span>
                  )}
                </div>
              </div>
            )}

            {/* Breakdown */}
            <div className="rounded-lg border border-line/60">
              <Line label="Total comenzi" value={String(payment.ordersCount ?? "—")} plain />
              {BREAKDOWN_META.map((m) => {
                const raw = payment.breakdown[m.key] || 0;
                if (raw === 0 && m.key !== "grossRevenue" && m.key !== "fleetCommission") return null;
                const label = m.key === "fleetCommission" && payment.commissionPercentage
                  ? `${m.label} (${payment.commissionPercentage}%)`
                  : m.label;
                const display = m.sign === "-" ? `-${formatMoney(raw, currency)}` : formatMoney(raw, currency);
                return <Line key={m.key} label={label} value={display} negative={m.sign === "-" && raw > 0} />;
              })}
              <div className="flex items-center justify-between border-t border-line/60 px-3 py-2.5">
                <span className="text-[13px] font-bold text-fg">
                  {payment.totalCalculated < 0 ? "DATORIE CĂTRE FLOTĂ" : "SUMĂ DE PLATĂ"}
                </span>
                <span className={cn(
                  "text-[16px] font-bold tabular-nums",
                  payment.totalCalculated < 0 ? "text-rose-400" : payment.totalCalculated === 0 ? "text-fg-muted" : "text-emerald-300",
                )}>
                  {formatMoney(payment.totalCalculated, currency)}
                </span>
              </div>
            </div>

            {/* Status + meta */}
            <div className="space-y-2 rounded-lg border border-line/60 p-3">
              <MetaRow label="Status plată">
                <span className="flex items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium", st.chip)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                    {PAYMENT_STATUS_LABEL[payment.status]}
                  </span>
                  {canFinance && (
                    <button type="button" onClick={onChangeStatus} className="text-[11.5px] font-medium text-violet-300 hover:underline">schimbă</button>
                  )}
                </span>
              </MetaRow>
              <MetaRow label="Data plății"><span className="text-[12.5px] text-fg">{payment.paidAtIso ? formatShortDateTime(payment.paidAtIso) : "—"}</span></MetaRow>
              <MetaRow label="Operator"><span className="text-[12.5px] text-fg">{payment.operatorName ?? "—"}</span></MetaRow>
              <MetaRow label="Metodă plată"><span className="text-[12.5px] text-fg">{PAYMENT_METHOD_LABEL[payment.method]}</span></MetaRow>
              <MetaRow label="IBAN">
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-[11.5px] text-fg">{iban}</span>
                  {payment.ibanSnapshot && (
                    <button type="button" onClick={copyIban} className="inline-flex h-6 w-6 items-center justify-center rounded-md text-fg-dim hover:bg-white/[0.06] hover:text-fg" aria-label="Copiază IBAN">
                      {copied ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} />}
                    </button>
                  )}
                </span>
              </MetaRow>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {canFinance && payment.status !== "paid" && (
                <button type="button" onClick={onMarkPaid} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(16,185,129,0.55)]">
                  <Check size={15} strokeWidth={2.4} /> Marchează ca plătit
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={onDownloadPayslip} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">
                  <FileDown size={13} /> Descarcă fișa
                </button>
                {canFinance ? (
                  <button type="button" onClick={onEdit} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">
                    <Edit size={13} /> Editează
                  </button>
                ) : (
                  <button type="button" onClick={onViewCourier} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">
                    <User size={13} /> Vezi curier
                  </button>
                )}
              </div>
              {canFinance && (
                <button type="button" onClick={onAddDeduction} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">
                  <Plus size={13} /> Adaugă deducere
                </button>
              )}
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-3">
            {activities.length === 0 ? (
              <Empty text="Niciun eveniment înregistrat." />
            ) : (
              <ol className="relative space-y-3 border-l border-line/50 pl-4">
                {activities.map((a) => (
                  <li key={a.id} className="relative">
                    <span className={cn("absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-card", PAYMENT_ACTIVITY_DOT[a.kind])} />
                    <div className="text-[12.5px] font-medium text-fg">{PAYMENT_ACTIVITY_LABEL[a.kind]}</div>
                    <div className="text-[11.5px] text-fg-muted">{a.description}</div>
                    <div className="mt-0.5 text-[10.5px] text-fg-dim">{a.actorName} · {formatShortDateTime(a.createdAtIso)}</div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {tab === "documents" && (
          <div className="space-y-2">
            <button type="button" onClick={onDownloadPayslip} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.04]">
              <FileDown size={14} /> Generează fișa de plată
            </button>
            {documents.length === 0 ? (
              <Empty text="Niciun document asociat." />
            ) : (
              documents.map((d) => <DocRow key={d.id} doc={d} />)
            )}
          </div>
        )}

        {tab === "notes" && (
          <NotesTab notes={notes} onAdd={onAddNote} onRemove={onRemoveNote} />
        )}
      </div>
    </div>
  );
}

function ContactRow({ icon: Icon, value, href }: { icon: typeof Phone; value: string; href?: string }) {
  const inner = (
    <span className="flex items-center gap-1.5 text-fg-muted">
      <Icon size={12} className="shrink-0 text-fg-dim" />
      <span className="truncate">{value}</span>
    </span>
  );
  return href ? <a href={href} className="hover:text-fg">{inner}</a> : inner;
}

function Line({ label, value, negative, plain }: { label: string; value: string; negative?: boolean; plain?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 text-[12px]">
      <span className="text-fg-muted">{label}</span>
      <span className={cn("font-medium tabular-nums", negative ? "text-rose-300" : plain ? "text-fg" : "text-fg")}>{value}</span>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11.5px] text-fg-dim">{label}</span>
      {children}
    </div>
  );
}

function DocRow({ doc }: { doc: PaymentDocumentRef }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line/60 bg-card-hover px-3 py-2">
      <FileDown size={14} className="text-fg-dim" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium text-fg">{doc.label}</div>
        <div className="text-[10.5px] text-fg-dim">{doc.createdBy} · {formatShortDateTime(doc.createdAtIso)}</div>
      </div>
    </div>
  );
}

function NotesTab({ notes, onAdd, onRemove }: { notes: PaymentNote[]; onAdd: (t: string) => void; onRemove: (id: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Adaugă o notă..."
          className="min-h-[38px] flex-1 resize-y rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg placeholder:text-fg-dim focus:outline-none focus:ring-1 focus:ring-violet-500/40"
        />
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => { onAdd(text.trim()); setText(""); }}
          className="mt-0.5 inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-40"
        >
          <Plus size={13} /> Adaugă
        </button>
      </div>
      {notes.length === 0 ? (
        <Empty text="Nicio notă încă." />
      ) : (
        notes.map((n) => (
          <div key={n.id} className="rounded-lg border border-line/60 bg-card-hover px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12.5px] text-fg">{n.text}</p>
              <button type="button" onClick={() => onRemove(n.id)} className="shrink-0 text-fg-dim hover:text-rose-300" aria-label="Șterge notă">
                <Trash2 size={12} />
              </button>
            </div>
            <div className="mt-1 text-[10.5px] text-fg-dim">{n.authorName} · {formatShortDateTime(n.createdAtIso)}</div>
          </div>
        ))
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-line/50 px-3 py-8 text-center text-[12px] text-fg-dim">{text}</div>;
}
