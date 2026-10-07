"use client";

import { ChevronDown, Copy, Download, FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MERGED_ID_PREFIX, getSiblingPaymentsForPerson, mergeDuplicatePayments } from "@/lib/payments/merge-duplicates";
import { PaymentsKpiCards, type PaymentsKpi } from "@/components/payments/PaymentsKpiCards";
import { PaymentsFilterBar, EMPTY_PAYMENT_FILTERS, type PaymentFilters } from "@/components/payments/PaymentsFilterBar";
import {
  PaymentsAdvancedFilters, EMPTY_ADVANCED, isAdvancedActive, type AdvancedPaymentFilters,
} from "@/components/payments/PaymentsAdvancedFilters";
import { PaymentsStatusTabs, tabMatches, type PaymentTabKey } from "@/components/payments/PaymentsStatusTabs";
import { PaymentsTable, type BulkAction, type RowAction, type SortKey } from "@/components/payments/PaymentsTable";
import { PaymentsSummaryCards, PaymentsPagination, type PaymentsSummary } from "@/components/payments/PaymentsSummaryCards";
import { PaymentDetailsPanel } from "@/components/payments/PaymentDetailsPanel";
import { WeeklyQuickInput } from "@/components/payments/WeeklyQuickInput";
import {
  AddDeductionDialog, AddPaymentDialog, BulkConfirmDialog, ChangeStatusDialog,
  ClearWeekDialog, EditPaymentDialog, ExportPaymentsDialog, MarkPaidConfirmDialog,
} from "@/components/payments/PaymentsDialogs";
import { ImportPlatformDialog } from "@/components/payments/ImportPlatformDialog";
import { DuplicatePairsMenu } from "@/components/payments/DuplicatePairsMenu";
import { WeekNavigator } from "@/components/payments/WeekNavigator";
import { extractWeeksFromPayments, type WeekOption } from "@/lib/payments/periods";
import type { ParserKey } from "@/lib/payments/imports";
import { useToast } from "@/components/ui/Toast";
import { usePayments } from "@/lib/payments/context";
import { useCouriers } from "@/lib/couriers/context";
import { useSession } from "@/lib/rbac/session";
import { downloadPayslip } from "@/lib/payments/payslip";
import type { PlatformKey } from "@/lib/dashboard/types";
import {
  DEFAULT_CURRENCY, EMPTY_BREAKDOWN, IN_PROGRESS_STATUSES, PAID_STATUSES, PAYMENT_SOURCE_DETAIL_LABEL,
  PAYMENT_STATUS_LABEL, UNPAID_STATUSES,
  calculateTotal, deductionsTotal, ibanForCourier, paymentSourceDetail, round2,
  type Currency, type Payment, type PaymentBreakdown, type PaymentSourceDetail, type PaymentStatus,
} from "@/lib/payments/types";
import { subcontractorFor } from "@/lib/subcontractors/name-map";
import { useDuplicatePairs } from "@/lib/subcontractors/duplicate-pairs-context";
import { areNamesEquivalent } from "@/lib/utils/name-matching";
import { cn } from "@/lib/utils/cn";

const PAGE_SIZE = 10;
const CURRENCIES: Currency[] = ["RON", "EUR"];


/** Cheia extinsă pentru filtrarea pe sursă — include și marker-e speciale
 *  (subcontractor HUSEIN, conturi duble) care nu sunt propriu-zis surse. */
type SourceFilterKey = PaymentSourceDetail | "all" | "sub_husein" | "double";

/** Chip-uri pentru filtrare pe sursă (TTG / Gusty Bolt / Wolt / Glovo / Manual / HUSEIN / 2×). */
function SourceFilterChips({
  active, counts, onChange, showSubs,
}: {
  showSubs: boolean;
  active: SourceFilterKey;
  counts: Record<SourceFilterKey, number>;
  onChange: (s: SourceFilterKey) => void;
}) {
  const items: Array<{ key: SourceFilterKey; label: string; tone: string }> = [
    { key: "all",         label: "Toate",       tone: "border-line bg-card-hover text-fg" },
    { key: "ttg_bolt",    label: "TTG Bolt",    tone: "border-violet-500/40 bg-violet-500/10 text-violet-200" },
    { key: "gusty_bolt",  label: "Gusty Bolt",  tone: "border-indigo-500/40 bg-indigo-500/10 text-indigo-200" },
    { key: "gusty_wolt",  label: "Gusty Wolt",  tone: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200" },
    { key: "gusty_glovo", label: "Gusty Glovo", tone: "border-amber-500/40 bg-amber-500/10 text-amber-200" },
    { key: "manual",      label: "Manual",      tone: "border-white/[0.08] bg-white/[0.04] text-fg-muted" },
    { key: "sub_husein",  label: "HUSEIN",      tone: "border-amber-500/40 bg-amber-500/15 text-amber-200" },
  ].filter((it) => showSubs || it.key !== "sub_husein") as Array<{ key: SourceFilterKey; label: string; tone: string }>;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10.5px] font-bold uppercase tracking-widest text-fg-dim">Sursă:</span>
      {items.map((it) => {
        const on = active === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors",
              on ? it.tone : "border-line bg-card text-fg-muted hover:text-fg",
            )}
          >
            {it.label}
            <span className="rounded bg-black/40 px-1 text-[9.5px] font-mono">{counts[it.key]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Item în dropdown-ul de import — buton cu label. */
function ImportMenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[12px] text-fg hover:bg-violet-500/10 hover:text-violet-100"
    >
      <FileSpreadsheet size={12} className="text-fg-dim" />
      {label}
    </button>
  );
}

/** Props pentru BulkConfirmDialog derivate din acțiunea aleasă. */
function bulkConfirmProps(action: BulkAction | undefined, count: number): {
  title: string; message: string; confirmLabel: string;
} {
  if (action === "delete") {
    return {
      title: "Șterge plăți",
      message: `Sigur dorești să ștergi ${count} plăți selectate? Acestea vor fi eliminate din tabel.`,
      confirmLabel: "Da, șterge plățile",
    };
  }
  const label =
    action === "approve"    ? "Aprobă" :
    action === "processing" ? "Marchează în proces" :
                              "Marchează ca plătite";
  return {
    title: "Confirmă operația financiară",
    message: `Aplici acțiunea „${label}" pentru ${count} plăți selectate?`,
    confirmLabel: "Confirmă",
  };
}

export default function PlatiPage() {
  const router = useRouter();
  const { user, activeFleetId, can } = useSession();
  const { allRows, deleteCourier } = useCouriers();
  const dupPairs = useDuplicatePairs();
  const duplicateGroupFor = dupPairs.groupFor;
  const payments = usePayments();
  const toast = useToast();

  const canView    = can("payments.view");
  const canCreate  = can("payments.create");
  const canExport  = canView;

  // ── Filtre / stare UI ───────────────────────────────────────────────────
  const [filters, setFilters] = useState<PaymentFilters>(EMPTY_PAYMENT_FILTERS);
  const [advanced, setAdvanced] = useState<AdvancedPaymentFilters>(EMPTY_ADVANCED);
  const [advOpen, setAdvOpen] = useState(false);
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [tab, setTab] = useState<PaymentTabKey>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilterKey>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "net", dir: "desc" });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  // Perechi manuale de plăți combinate (paymentId ↔ paymentId, mutual).
  const [mergePairs, setMergePairs] = useState<Map<string, string>>(new Map());
  const createMergePair = useCallback((a: string, b: string) => {
    setMergePairs((prev) => {
      const next = new Map(prev);
      next.set(a, b);
      next.set(b, a);
      return next;
    });
  }, []);
  const splitMerge = useCallback((id: string) => {
    setMergePairs((prev) => {
      const partner = prev.get(id);
      if (!partner) return prev;
      const next = new Map(prev);
      next.delete(id);
      next.delete(partner);
      return next;
    });
  }, []);

  // ── Dialoguri ─────────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [importPlatformOpen, setImportPlatformOpen] = useState(false);
  const [importGroup, setImportGroup] = useState<"ttg" | "gusty" | undefined>(undefined);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"filtered" | "selected">("filtered");
  const [markPaidPayment, setMarkPaidPayment] = useState<Payment | null>(null);
  const [changeStatusPayment, setChangeStatusPayment] = useState<Payment | null>(null);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [deductionPayment, setDeductionPayment] = useState<Payment | null>(null);
  const [bulk, setBulk] = useState<null | { action: Exclude<BulkAction, "export"> }>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // Curierii flotei active (pentru filtre, add, drawer lookup)
  const fleetCouriers = useMemo(() => allRows.filter((c) => c.tenantId === activeFleetId), [allRows, activeFleetId]);

  const realFleetPayments = payments.fleetPayments;

  // Perioada curentă (săptămâna ISO curentă) — pentru plăți sintetice auto-generate.
  const currentPeriod = useMemo(() => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // Luni = 0, Duminică = 6 (timp LOCAL)
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const toIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { startIso: toIso(monday), endIso: toIso(sunday) };
  }, []);

  // Plăți sintetice: câte una per curier ACTIV al flotei care nu are deja plată în săptămâna curentă.
  // Se materializează în plată reală la prima acțiune (mark paid, edit, add deduction, download).
  // Sar peste cele marcate șterse — user a spus explicit „nu vreau rândul ăsta pentru săptămâna asta".
  const syntheticPayments = useMemo<Payment[]>(() => {
    const existing = new Set(realFleetPayments.map((p) => `${p.recipient.id}|${p.periodStartIso}`));
    return fleetCouriers
      .filter((c) => c.status === "active")
      .filter((c) => !existing.has(`${c.id}|${currentPeriod.startIso}`))
      .filter((c) => !payments.isDeleted(`synthetic_${c.id}_${currentPeriod.startIso}`))
      .map((c): Payment => ({
        id: `synthetic_${c.id}_${currentPeriod.startIso}`,
        tenantId: activeFleetId,
        fleetId: activeFleetId,
        recipient: {
          id: c.id, name: c.fullName, city: c.city,
          platform: c.platforms[0] ?? null, status: c.status, kind: "courier",
        },
        type: "courier_pay",
        periodStartIso: currentPeriod.startIso,
        periodEndIso: currentPeriod.endIso,
        paymentDateIso: currentPeriod.endIso,
        method: "bank_transfer",
        breakdown: EMPTY_BREAKDOWN,
        amountPaid: 0,
        totalCalculated: 0,
        status: "unpaid",
        reference: null,
        notes: null,
        createdAtIso: new Date(0).toISOString(),
        createdBy: "Sistem",
        overrideReason: null,
        ordersCount: 0,
        platforms: c.platforms,
        commissionPercentage: c.commissionPct ?? 0,
        currency: "RON",
        ibanSnapshot: c.iban || ibanForCourier(c.id),
        operatorName: null,
        approvedBy: null, approvedAtIso: null,
        paidBy: null, paidAtIso: null,
      }));
  }, [fleetCouriers, realFleetPayments, currentPeriod, activeFleetId]);

  const fleetPayments = useMemo<Payment[]>(
    () => [...syntheticPayments, ...realFleetPayments],
    [syntheticPayments, realFleetPayments],
  );

  // Extrage toate opțiunile de săptămâni/rapoarte distincte (strict din plăți reale / importate)
  const availableWeeks = useMemo(() => extractWeeksFromPayments(realFleetPayments), [realFleetPayments]);
  const [selectedWeek, setSelectedWeek] = useState<string>("auto");

  // Opțiunea activă curentă din navigator (sau cel mai recent raport la "auto")
  const activeOption = useMemo<WeekOption | null>(() => {
    if (selectedWeek === "all") return null;
    if (selectedWeek !== "auto") {
      return (
        availableWeeks.find((w) => w.key === selectedWeek) ??
        availableWeeks.find((w) => w.startIso === selectedWeek) ??
        availableWeeks[0] ??
        null
      );
    }
    // La "auto": dacă prima intrare este o săptămână fără plăți calculate (0 RON), dar există rapoarte reale importate, selectăm cel mai recent Cumulat cu plăți reale!
    const bestRecent =
      availableWeeks.find((w) => w.sourceDetail === "all" && w.count > 0 && w.totalCalculated > 0) ??
      availableWeeks.find((w) => w.count > 0 && w.totalCalculated > 0) ??
      availableWeeks[0] ??
      null;
    return bestRecent;
  }, [selectedWeek, availableWeeks]);

  const activeWeekIso = activeOption?.startIso ?? currentPeriod.startIso;
  const activeReportSource = activeOption?.sourceDetail ?? "all";

  // Plățile reale din săptămâna activă (pentru count-uri sigure de ștergere, independente de filtre)
  const currentWeekRealPayments = useMemo(
    () => realFleetPayments.filter((p) => p.periodStartIso === activeWeekIso),
    [realFleetPayments, activeWeekIso],
  );
  const currentOptionRealPayments = useMemo(
    () => realFleetPayments.filter(
      (p) => p.periodStartIso === activeWeekIso && (activeReportSource === "all" || paymentSourceDetail(p.reference) === activeReportSource),
    ),
    [realFleetPayments, activeWeekIso, activeReportSource],
  );

  // Materializează o plată sintetică într-o plată reală (o adaugă în context).
  // Se apelează înaintea oricărei acțiuni care mutează plata (approve/paid/edit/etc).
  const materialize = useCallback((p: Payment): Payment => {
    if (!p.id.startsWith("synthetic_")) return p;
    return payments.addPayment({
      tenantId: p.tenantId, fleetId: p.fleetId,
      recipient: p.recipient, type: p.type,
      periodStartIso: p.periodStartIso, periodEndIso: p.periodEndIso, paymentDateIso: p.paymentDateIso,
      method: p.method, breakdown: p.breakdown,
      amountPaid: p.amountPaid, totalCalculated: p.totalCalculated,
      status: p.status,
      reference: p.reference, notes: p.notes,
      createdBy: user.name, overrideReason: p.overrideReason,
      ordersCount: p.ordersCount, platforms: p.platforms,
      commissionPercentage: p.commissionPercentage,
      currency: p.currency, ibanSnapshot: p.ibanSnapshot,
      operatorName: p.operatorName,
      approvedBy: p.approvedBy, approvedAtIso: p.approvedAtIso,
      paidBy: p.paidBy, paidAtIso: p.paidAtIso,
    });
  }, [payments, user.name]);

  // Reset paginare + selecție la schimbarea flotei — pattern „ajustează starea la
  // schimbare de context" (setState în render, nu în efect), recomandat de React.
  const [prevFleet, setPrevFleet] = useState(activeFleetId);
  if (prevFleet !== activeFleetId) {
    setPrevFleet(activeFleetId);
    setSelectedIds(new Set());
    setSelectedPaymentId(null);
    setPage(1);
  }

  // ── Pipeline de filtrare (fără tab) ────────────────────────────────────────
  const filteredNoTab = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const amountMin = advanced.amountMin ? Number(advanced.amountMin) : null;
    const amountMax = advanced.amountMax ? Number(advanced.amountMax) : null;

    return fleetPayments.filter((p) => {
      // Izolare pe săptămână: nu aduna sumele între săptămâni diferite decât dacă e selectat explicit "all"
      if (selectedWeek !== "all" && p.periodStartIso !== activeWeekIso) return false;

      // Izolare pe raport dacă este selectat un raport specific (ex: Raport TTG Bolt vs Raport Gusty Bolt)
      if (selectedWeek !== "all" && activeReportSource !== "all" && paymentSourceDetail(p.reference) !== activeReportSource) {
        return false;
      }

      // Basic
      if (q) {
        const hay = `${p.recipient.name} ${p.recipient.city ?? ""} ${p.ibanSnapshot ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.platform !== "all" && !(p.platforms ?? []).includes(filters.platform as PlatformKey)) return false;
      if (filters.city !== "all" && p.recipient.city !== filters.city) return false;
      if (filters.status !== "all" && p.status !== filters.status) return false;
      if (filters.courierId !== "all" && p.recipient.id !== filters.courierId) return false;

      // Advanced
      if (advanced.status !== "all" && p.status !== advanced.status) return false;
      if (advanced.method !== "all" && p.method !== advanced.method) return false;
      if (advanced.operator !== "all" && (p.operatorName ?? "") !== advanced.operator) return false;
      if (advanced.subcontractor !== "all") {
        const sub = fleetCouriers.find((c) => c.id === p.recipient.id)?.subcontractorName ?? "";
        if (sub !== advanced.subcontractor) return false;
      }
      if (amountMin !== null && p.totalCalculated < amountMin) return false;
      if (amountMax !== null && p.totalCalculated > amountMax) return false;
      if (advanced.periodFrom && p.periodStartIso < advanced.periodFrom) return false;
      if (advanced.periodTo && p.periodEndIso > advanced.periodTo) return false;
      if (advanced.payDateFrom && (!p.paidAtIso || p.paidAtIso.slice(0, 10) < advanced.payDateFrom)) return false;
      if (advanced.payDateTo && (!p.paidAtIso || p.paidAtIso.slice(0, 10) > advanced.payDateTo)) return false;
      if (advanced.hasDeductions && deductionsTotal(p.breakdown) <= 0) return false;
      if (advanced.hasPenalty && (p.breakdown.penalty || 0) <= 0) return false;
      if (advanced.noIban && !!p.ibanSnapshot) return false;
      if (advanced.hasProblem && !(p.status === "issue" || p.status === "blocked")) return false;
      if (advanced.processed === "processed" && !p.paidAtIso) return false;
      if (advanced.processed === "unprocessed" && !!p.paidAtIso) return false;
      // Filtru pe sursă (TTG / Gusty Bolt / Gusty Wolt / Gusty Glovo / Manual / HUSEIN / cont dublu)
      if (sourceFilter === "sub_husein") {
        if (subcontractorFor(p.recipient.name) !== "HUSEIN") return false;
      } else if (sourceFilter === "double") {
        if (!duplicateGroupFor(p.recipient.name)) return false;
      } else if (sourceFilter !== "all" && paymentSourceDetail(p.reference) !== sourceFilter) return false;
      return true;
    });
  }, [fleetPayments, selectedWeek, activeWeekIso, activeReportSource, filters, advanced, fleetCouriers, sourceFilter]);

  // Contoare per sursă (pentru afișare pe chip-uri, calculate peste plățile din raportul/săptămâna selectată)
  const sourceCounts = useMemo(() => {
    const counts: Record<SourceFilterKey, number> = {
      all: 0, ttg_bolt: 0, gusty_bolt: 0, gusty_wolt: 0, gusty_glovo: 0, manual: 0,
      sub_husein: 0, double: 0,
    };
    const scoped = selectedWeek === "all"
      ? fleetPayments
      : fleetPayments.filter(
          (p) => p.periodStartIso === activeWeekIso && (activeReportSource === "all" || paymentSourceDetail(p.reference) === activeReportSource),
        );
    for (const p of scoped) {
      counts.all++;
      counts[paymentSourceDetail(p.reference)]++;
      if (subcontractorFor(p.recipient.name) === "HUSEIN") counts.sub_husein++;
      if (duplicateGroupFor(p.recipient.name)) counts.double++;
    }
    return counts;
  }, [fleetPayments, selectedWeek, activeWeekIso, activeReportSource, duplicateGroupFor]);

  // ── Tab + sort ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const list = filteredNoTab.filter((p) => tabMatches(tab, p.status));
    const dir = sort.dir === "asc" ? 1 : -1;
    const val = (p: Payment): number | string => {
      switch (sort.key) {
        case "name":       return p.recipient.name;
        case "gross":      return p.breakdown.grossRevenue;
        case "commission": return p.breakdown.fleetCommission;
        case "net":        return p.totalCalculated;
        case "status":     return p.status;
      }
    };
    return [...list].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * dir;
      return ((va as number) - (vb as number)) * dir;
    });
  }, [filteredNoTab, tab, sort]);

  // Ajustez rândurile individuale ale perechilor: taxa și/sau comisionul se
  // scad o singură dată pe persoană — le pun pe primul rând (după createdAt),
  // celălalt primește 0. Astfel totalul individual + totalul din merge sunt corecte.
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const filteredWithPairAdjustments = useMemo(() => {
    const byId = new Map(filtered.map((p) => [p.id, { ...p, breakdown: { ...p.breakdown } }]));

    // Grupăm plățile per (perioadă, persoană)
    // Persoana este identificată după grup de cont dublu sau după nume echivalent
    const clusters: Array<{ items: Payment[]; feeOnce: number | null; commissionPct: number | null }> = [];
    const assignedIds = new Set<string>();

    for (const p of filtered) {
      if (p.recipient.kind !== "courier" || assignedIds.has(p.id)) continue;
      const opts = dupPairs.pairOptionsFor(p.recipient.name);

      // Găsim toate plățile din aceeași săptămână care aparțin aceleiași persoane
      const siblings = getSiblingPaymentsForPerson(p, filtered, duplicateGroupFor);

      if (siblings.length >= 2) {
        siblings.forEach((s) => assignedIds.add(s.id));
        const courier = allRows.find((c) => c.id === p.recipient.id || areNamesEquivalent(c.fullName, p.recipient.name));
        clusters.push({
          items: siblings.map((s) => byId.get(s.id)!).filter(Boolean).sort((x, y) => x.createdAtIso.localeCompare(y.createdAtIso)),
          feeOnce: opts?.feeOnce ?? courier?.weeklyContractFeeRon ?? 210,
          commissionPct: opts?.commissionPct ?? null,
        });
      }
    }

    for (const cluster of clusters) {
      const { items, feeOnce, commissionPct } = cluster;

      // 1. Comision unificat dacă e configurat
      if (commissionPct != null) {
        for (const it of items) {
          const gross = round2((it.breakdown.grossRevenue || 0) + (it.breakdown.tips || 0));
          it.breakdown.fleetCommission = round2(gross * (commissionPct / 100));
          it.commissionPercentage = commissionPct;
        }
      }

      // 2. Alocare dinamică a taxei unice pe săptămână (se deduce o singură dată per persoană)
      if (feeOnce != null) {
        let feeBudget = round2(feeOnce);
        for (const it of items) {
          const gross = round2((it.breakdown.grossRevenue || 0) + (it.breakdown.tips || 0));
          const comm = it.breakdown.fleetCommission || 0;
          const ded = Math.max(0, it.breakdown.deductions || 0);
          const otherCosts = (it.breakdown.vehicleCost || 0) + (it.breakdown.housingCost || 0) + (it.breakdown.equipmentCost || 0) + (it.breakdown.guarantee || 0) + (it.breakdown.penalty || 0) + (it.breakdown.advance || 0);
          const available = Math.max(0, round2(gross - comm - ded - otherCosts));
          const taxToTake = Math.min(feeBudget, available);
          it.breakdown.tax = round2(taxToTake);
          feeBudget = Math.max(0, round2(feeBudget - taxToTake));
        }
      }

      // 3. Recalculare totalCalculated
      for (const it of items) {
        const b0 = it.breakdown;
        const rawTotal = round2(
          b0.grossRevenue + b0.tips + b0.correction + b0.otherAdjustments
          - b0.fleetCommission - b0.tax - b0.advance - b0.deductions
          - b0.vehicleCost - b0.housingCost - b0.equipmentCost
          - b0.guarantee - b0.penalty,
        );
        it.totalCalculated = Math.abs(rawTotal) < 0.001 ? 0 : rawTotal;
      }

      // 4. Compensare automată a balanțelor negative (datorii către flotă) între platformele aceleiași persoane
      // Exemplu: Curierul are -200 RON pe Wolt și +1731 RON pe Glovo.
      // Datoria de 200 RON este compensată pe Glovo (netul Glovo devine 1531 RON),
      // iar datoria Wolt este stinsă (netul Wolt devine 0 RON și este marcat ca plătit/stins).
      const negativeItems = items.filter((it) => it.totalCalculated < 0);
      const positiveItems = items.filter((it) => it.totalCalculated > 0)
        .sort((a, b) => b.totalCalculated - a.totalCalculated);

      if (negativeItems.length > 0 && positiveItems.length > 0) {
        for (const neg of negativeItems) {
          let debtToClear = round2(Math.abs(neg.totalCalculated));
          if (debtToClear <= 0) continue;

          for (const pos of positiveItems) {
            if (debtToClear <= 0) break;
            const availableInPos = Math.max(0, pos.totalCalculated);
            if (availableInPos <= 0) continue;

            const offset = Math.min(debtToClear, availableInPos);
            if (offset > 0) {
              pos.breakdown.deductions = round2((pos.breakdown.deductions || 0) + offset);
              pos.totalCalculated = round2(pos.totalCalculated - offset);
              const negPlat = neg.recipient.platform ? neg.recipient.platform.toUpperCase() : "altă platformă";
              const posNote = `Include compensare datorie ${negPlat}: -${offset} RON`;
              if (!pos.notes?.includes(posNote)) {
                pos.notes = pos.notes ? `${pos.notes} · ${posNote}` : posNote;
              }

              neg.breakdown.correction = round2((neg.breakdown.correction || 0) + offset);
              neg.totalCalculated = round2(neg.totalCalculated + offset);
              const posPlat = pos.recipient.platform ? pos.recipient.platform.toUpperCase() : "alt raport";
              const negNote = `Datorie de ${offset} RON stinsă prin compensare pe ${posPlat}`;
              if (!neg.notes?.includes(negNote)) {
                neg.notes = neg.notes ? `${neg.notes} · ${negNote}` : negNote;
              }
              if (neg.totalCalculated >= 0 && neg.status !== "paid") {
                neg.status = "paid";
              }

              debtToClear = round2(debtToClear - offset);
            }
          }
        }
      }
    }

    return Array.from(byId.values());
  }, [filtered, dupPairs, duplicateGroupFor, allRows]);

  // Aplic merge pe perechile manuale; resolver-ul întoarce opțiuni per lanț.
  const displayRows = useMemo(
    () => mergeDuplicatePayments(filteredWithPairAdjustments, mergePairs, (ids) => {
      const first = filteredWithPairAdjustments.find((p) => p.id === ids[0]);
      if (!first) return null;
      const opts = dupPairs.pairOptionsFor(first.recipient.name);
      const group = dupPairs.groupFor(first.recipient.name);
      return {
        feeOnce: opts?.feeOnce ?? null,
        commissionPct: opts?.commissionPct ?? null,
        displayName: group?.personId ?? first.recipient.name,
      };
    }),
    [filteredWithPairAdjustments, mergePairs, dupPairs],
  );
  // Candidați pentru picker (orice plată cu cont dublu sau plăți multiple pe platforme diferite)
  const dupCandidates = useMemo(() => {
    return filtered.filter((p) => {
      if (duplicateGroupFor(p.recipient.name)) return true;
      return filtered.some((other) =>
        other.id !== p.id
        && other.recipient.kind === "courier"
        && areNamesEquivalent(other.recipient.name, p.recipient.name),
      );
    });
  }, [filtered, duplicateGroupFor]);

  // Paginare (page clamped ca să nu rămână pe o pagină goală după filtrare)
  const pageCount = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedRows = useMemo(() => displayRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [displayRows, safePage]);

  // ── KPI (din setul filtrat, fără tab) ───────────────────────────────────────
  const kpi = useMemo<PaymentsKpi>(() => {
    let totalDue = 0, paid = 0, inProgress = 0, unpaid = 0;
    const couriers = new Set<string>();
    for (const p of filteredNoTab) {
      const positive = Math.max(0, p.totalCalculated);
      totalDue += positive;
      couriers.add(p.recipient.id);
      if (PAID_STATUSES.includes(p.status)) paid += Math.max(0, p.amountPaid);
      if (IN_PROGRESS_STATUSES.includes(p.status)) inProgress += positive;
      if (UNPAID_STATUSES.includes(p.status)) unpaid += positive;
    }
    // Curieri activi în flotă = cifra reală din planul tenantului (multi-tenant).
    const activeCourierCount = user.activeTenant.planUsage.used;
    return {
      totalDue: round2(totalDue), courierCount: couriers.size,
      activeCourierCount, paid: round2(paid),
      inProgress: round2(inProgress), unpaid: round2(unpaid),
    };
  }, [filteredNoTab, user.activeTenant.planUsage.used]);

  // ── Tab counts (din setul filtrat, fără tab) ────────────────────────────────
  const tabCounts = useMemo<Record<PaymentTabKey, number>>(() => ({
    all: filteredNoTab.length,
    in_review: filteredNoTab.filter((p) => tabMatches("in_review", p.status)).length,
    partial: filteredNoTab.filter((p) => tabMatches("partial", p.status)).length,
    paid: filteredNoTab.filter((p) => tabMatches("paid", p.status)).length,
    problems: filteredNoTab.filter((p) => tabMatches("problems", p.status)).length,
  }), [filteredNoTab]);

  // ── Sumar (din setul filtrat final, tab aplicat) ────────────────────────────
  const summary = useMemo<PaymentsSummary>(() => {
    let gross = 0, commissions = 0, deductions = 0, net = 0;
    for (const p of filtered) {
      gross += p.breakdown.grossRevenue;
      commissions += p.breakdown.fleetCommission;
      deductions += deductionsTotal(p.breakdown);
      net += Math.max(0, p.totalCalculated);
    }
    return { count: filtered.length, gross: round2(gross), commissions: round2(commissions), deductions: round2(deductions), net: round2(net) };
  }, [filtered]);

  // Liste pentru dropdown-uri
  const cities = useMemo(() => Array.from(new Set(fleetCouriers.map((c) => c.city).filter(Boolean))).sort(), [fleetCouriers]);
  const courierOptions = useMemo(() => Array.from(new Map(fleetPayments.map((p) => [p.recipient.id, p.recipient.name])).entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)), [fleetPayments]);
  const operators = useMemo(() => Array.from(new Set(fleetPayments.map((p) => p.operatorName).filter((x): x is string => !!x))).sort(), [fleetPayments]);
  const subcontractors = useMemo(() => Array.from(new Set(fleetCouriers.map((c) => c.subcontractorName).filter((x): x is string => !!x))).sort(), [fleetCouriers]);

  // Când plata selectată aparține unei persoane cu cont dublu, deschid vizual
  // ambele plăți combinate — astfel un click pe Magar Thapa arată și Mesim Abbas.
  const selectedPayment = useMemo(() => {
    if (!selectedPaymentId) return null;
    const base = fleetPayments.find((p) => p.id === selectedPaymentId);
    if (!base) return null;
    const group = duplicateGroupFor(base.recipient.name);
    if (!group) return base;
    const normalize = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
    const aliasSet = new Set(group.aliases.map((a) => normalize(a.name)));
    const siblings = fleetPayments.filter((p) =>
      p.periodStartIso === base.periodStartIso
      && p.recipient.kind === "courier"
      && aliasSet.has(normalize(p.recipient.name)),
    );
    if (siblings.length <= 1) return base;
    const pairs = new Map<string, string>();
    for (let i = 0; i < siblings.length - 1; i++) {
      pairs.set(siblings[i].id, siblings[i + 1].id);
      pairs.set(siblings[i + 1].id, siblings[i].id);
    }
    const opts = dupPairs.pairOptionsFor(base.recipient.name);
    const [combined] = mergeDuplicatePayments(siblings, pairs, () => ({
      feeOnce: opts?.feeOnce ?? null,
      commissionPct: opts?.commissionPct ?? null,
      displayName: group.personId,
    }));
    return combined ?? base;
  }, [fleetPayments, selectedPaymentId, dupPairs]);
  const drawerCourier = useMemo(() => (selectedPayment ? fleetCouriers.find((c) => c.id === selectedPayment.recipient.id) ?? null : null), [selectedPayment, fleetCouriers]);

  // Sibling payments pentru dialogurile de acțiune (marcare ca plătit / schimbare status)
  const markPaidSiblings = useMemo(() => {
    if (!markPaidPayment) return [];
    return getSiblingPaymentsForPerson(markPaidPayment, fleetPayments, duplicateGroupFor);
  }, [markPaidPayment, fleetPayments, duplicateGroupFor]);

  const changeStatusSiblings = useMemo(() => {
    if (!changeStatusPayment) return [];
    return getSiblingPaymentsForPerson(changeStatusPayment, fleetPayments, duplicateGroupFor);
  }, [changeStatusPayment, fleetPayments, duplicateGroupFor]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const toggleAll = useCallback((ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (checked) ids.forEach((i) => n.add(i)); else ids.forEach((i) => n.delete(i));
      return n;
    });
  }, []);
  const onSort = useCallback((key: SortKey) => {
    setSort((prev) => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  }, []);

  const handleDownload = useCallback((p: Payment) => {
    downloadPayslip(p);
    payments.addDocument(p.id, { label: `Fișă plată ${p.periodStartIso}`, kind: "payslip", createdBy: user.name });
    toast.success("Fișă generată", `Fișa de plată pentru ${p.recipient.name} a fost descărcată.`);
  }, [payments, user.name, toast]);

  const handleRowAction = useCallback((id: string, action: RowAction) => {
    const p = displayRows.find((x) => x.id === id) ?? fleetPayments.find((x) => x.id === id);
    if (!p) return;
    const mutates = action === "approve" || action === "processing" || action === "paid" || action === "unpaid"
      || action === "edit" || action === "add_deduction" || action === "download";
    const persisted = mutates ? materialize(p) : p;
    const pid = persisted.id;
    switch (action) {
      case "view":
      case "history":       setSelectedPaymentId(pid); break;
      case "edit":          if (canCreate) setEditPayment(persisted); break;
      case "approve":
        if (canCreate) {
          const siblings = getSiblingPaymentsForPerson(persisted, fleetPayments, duplicateGroupFor);
          for (const s of siblings) {
            payments.approve(materialize(s).id, user.name);
          }
          const extra = siblings.length > 1 ? ` (${siblings.length} conturi)` : "";
          toast.success("Plată aprobată", `${persisted.recipient.name} → În proces${extra}`);
        }
        break;
      case "processing":
        if (canCreate) {
          const siblings = getSiblingPaymentsForPerson(persisted, fleetPayments, duplicateGroupFor);
          for (const s of siblings) {
            payments.markProcessing(materialize(s).id, user.name);
          }
          const extra = siblings.length > 1 ? ` (${siblings.length} conturi)` : "";
          toast.success("Marcată în proces", `${persisted.recipient.name}${extra}`);
        }
        break;
      case "paid":          if (canCreate) setMarkPaidPayment(persisted); break;
      case "unpaid":
        if (canCreate) {
          const siblings = getSiblingPaymentsForPerson(persisted, fleetPayments, duplicateGroupFor);
          const allIds = Array.from(new Set([persisted.id, ...siblings.map((s) => materialize(s).id)]));
          for (const sid of allIds) {
            payments.setStatus(sid, "unpaid", user.name);
          }
          const extra = allIds.length > 1 ? ` (${allIds.length} conturi conexe)` : "";
          toast.success("Status actualizat", `Marcat ca neplătit${extra}.`);
        }
        break;
      case "change_status":
        if (canCreate) setChangeStatusPayment(persisted);
        break;
      case "add_deduction": if (canCreate) setDeductionPayment(persisted); break;
      case "add_note":      setSelectedPaymentId(pid); break;
      case "download":      handleDownload(persisted); break;
      case "view_courier":  router.push(`/curieri/${persisted.recipient.id}`); break;
      case "delete":
        if (canCreate) {
          payments.deletePayment(pid, user.name);
          toast.success("Plată ștearsă", `Plata pentru ${persisted.recipient.name} a fost eliminată.`);
        }
        break;
    }
  }, [displayRows, fleetPayments, canCreate, payments, user.name, toast, handleDownload, router, materialize, duplicateGroupFor]);

  const handleBulk = useCallback((action: BulkAction) => {
    if (selectedIds.size === 0) return;
    if (action === "export") { setExportScope("selected"); setExportOpen(true); return; }
    setBulk({ action });
  }, [selectedIds]);

  const runBulk = useCallback(() => {
    if (!bulk) return;
    const src = fleetPayments;

    // Pentru DELETE: ștergem plățile selectate (inclusiv desfacem sinteticele/merged dacă e cazul).
    if (bulk.action === "delete") {
      const allIdsToDelete: string[] = [];
      for (const id of selectedIds) {
        if (id.startsWith(MERGED_ID_PREFIX)) {
          const subIds = id.replace(MERGED_ID_PREFIX, "").split("__");
          for (const subId of subIds) allIdsToDelete.push(subId);
        } else {
          allIdsToDelete.push(id);
        }
      }
      payments.deletePayments(allIdsToDelete, user.name);
      toast.success("Plăți șterse", `${allIdsToDelete.length} plăți eliminate din listă.`);
      setBulk(null);
      setSelectedIds(new Set());
      return;
    }

    // Restul acțiunilor: aplicate pe plăți (inclusiv pe sub-plățile din merged și conturi conexe).
    const allActionIds = new Set<string>();
    for (const id of selectedIds) {
      if (id.startsWith(MERGED_ID_PREFIX)) {
        const subIds = id.replace(MERGED_ID_PREFIX, "").split("__");
        for (const subId of subIds) allActionIds.add(subId);
      } else {
        const p = src.find((x) => x.id === id);
        if (p) {
          const siblings = getSiblingPaymentsForPerson(p, src, duplicateGroupFor);
          for (const s of siblings) {
            allActionIds.add(materialize(s).id);
          }
        } else {
          allActionIds.add(id);
        }
      }
    }
    const actionIdList = Array.from(allActionIds);
    for (const id of actionIdList) {
      if (bulk.action === "approve") payments.approve(id, user.name);
      else if (bulk.action === "processing") payments.markProcessing(id, user.name);
      else if (bulk.action === "paid") payments.markPaid(id, user.name);
    }
    const label =
      bulk.action === "approve"    ? "aprobate" :
      bulk.action === "processing" ? "marcate în proces" :
                                     "marcate ca plătite";
    toast.success("Operație completă", `${actionIdList.length} plăți ${label}.`);
    setBulk(null);
    setSelectedIds(new Set());
  }, [bulk, selectedIds, fleetPayments, materialize, payments, user.name, toast, duplicateGroupFor]);

  // Găsește plăți duplicate: același curier + aceeași săptămână. Păstrează pe cea mai recentă.
  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, Payment[]>();
    for (const p of payments.fleetPayments) {
      if (p.recipient.kind !== "courier") continue;
      const key = `${p.recipient.id}|${p.periodStartIso}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    // Doar grupurile cu 2+ plăți
    const dupes: { keeper: Payment; toDelete: Payment[] }[] = [];
    for (const [, arr] of groups) {
      if (arr.length < 2) continue;
      // Cel mai recent = ultimul creat (createdAtIso max)
      const sorted = [...arr].sort((a, b) => (a.createdAtIso < b.createdAtIso ? 1 : -1));
      dupes.push({ keeper: sorted[0], toDelete: sorted.slice(1) });
    }
    return dupes;
  }, [payments.fleetPayments]);

  const totalDupesToDelete = duplicateGroups.reduce((s, g) => s + g.toDelete.length, 0);

  const [confirmDedup, setConfirmDedup] = useState(false);

  const runDedup = useCallback(() => {
    for (const g of duplicateGroups) {
      for (const p of g.toDelete) payments.deletePayment(p.id, user.name);
    }
    toast.success("Duplicate șterse", `${totalDupesToDelete} plăți vechi eliminate, păstrate cele mai recente.`);
    setConfirmDedup(false);
  }, [duplicateGroups, payments, user.name, toast, totalDupesToDelete]);

  const handleClearConfirm = useCallback((scope: "option" | "all_week" | "all_history") => {
    let count = 0;
    if (scope === "all_history") {
      count = payments.clearAllImported(user.name);
      toast.success("Importuri resetate", `Toate cele ${count} plăți importate au fost șterse definitiv.`);
    } else if (scope === "option" && activeReportSource !== "all") {
      count = payments.clearPeriod(activeWeekIso, user.name, activeReportSource);
      toast.success("Raport șters", `Au fost eliminate ${count} plăți din ${activeOption?.reportName ?? "raport"}.`);
    } else {
      count = payments.clearPeriod(activeWeekIso, user.name, "all");
      toast.success("Săptămână resetată", `Toate cele ${count} plăți din săptămâna ${activeOption?.label ?? activeWeekIso} au fost șterse.`);
    }
    setSelectedIds(new Set());
    setSelectedPaymentId(null);
    setSelectedWeek("auto");
    setPage(1);
  }, [payments, user.name, activeWeekIso, activeReportSource, activeOption, toast]);

  const exportRows = exportScope === "selected" ? fleetPayments.filter((p) => selectedIds.has(p.id)) : filtered;

  // ── Acces restricționat ─────────────────────────────────────────────────
  if (!canView) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-md rounded-xl border border-line/60 bg-card p-6 text-center">
          <div className="text-[15px] font-bold text-fg">Acces restricționat</div>
          <p className="mt-2 text-[12.5px] text-fg-muted">Rolul tău nu are permisiunea de a vizualiza plățile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-4 overflow-x-hidden p-4 lg:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-fg">Plăți</h1>
          <p className="mt-1 text-[13px] text-fg-muted">
            Gestionează plățile curierilor. Verifică, aprobă și marchează plățile ca efectuate.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setImportMenuOpen((v) => !v)}
              disabled={!canCreate}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-[12.5px] font-semibold text-violet-100 hover:bg-violet-500/15",
                !canCreate && "opacity-50",
              )}
            >
              <FileSpreadsheet size={13} /> Importă Excel
              <ChevronDown size={12} className={cn("transition-transform", importMenuOpen && "rotate-180")} />
            </button>
            {importMenuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Închide"
                  onClick={() => setImportMenuOpen(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-lg border border-line bg-card p-1 shadow-lg shadow-black/40">
                  <ImportMenuItem
                    label="TTG"
                    onClick={() => { setImportGroup("ttg"); setImportPlatformOpen(true); setImportMenuOpen(false); }}
                  />
                  <ImportMenuItem
                    label="Gusty"
                    onClick={() => { setImportGroup("gusty"); setImportPlatformOpen(true); setImportMenuOpen(false); }}
                  />
                  {currentWeekRealPayments.length > 0 && (
                    <>
                      <div className="my-1 border-t border-line/60" />
                      <ImportMenuItem
                        label={`Golește rapoartele (${currentWeekRealPayments.length} plăți)`}
                        onClick={() => { setClearDialogOpen(true); setImportMenuOpen(false); }}
                      />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          {totalDupesToDelete > 0 && (
            <button type="button" onClick={() => setConfirmDedup(true)} disabled={!canCreate}
              className={cn("inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12.5px] font-semibold text-amber-100 hover:bg-amber-500/15", !canCreate && "opacity-50")}>
              <Copy size={13} /> Curăță {totalDupesToDelete} duplicate
            </button>
          )}
          {canCreate && selectedWeek !== "all" && currentWeekRealPayments.length > 0 && (
            <button
              type="button"
              onClick={() => setClearDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12.5px] font-semibold text-rose-200 hover:bg-rose-500/20"
              title={activeOption?.reportName ? `Golește ${activeOption.reportName}` : "Golește rapoartele acestei săptămâni"}
            >
              <Trash2 size={13} /> {activeOption?.reportName ? `Golește ${activeOption.reportName}` : "Golește săptămâna"} (
                {currentOptionRealPayments.length > 0 ? currentOptionRealPayments.length : currentWeekRealPayments.length}
              )
            </button>
          )}
          <button type="button" onClick={() => { setExportScope("filtered"); setExportOpen(true); }} disabled={!canExport}
            className={cn("inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]", !canExport && "opacity-50")}>
            <Download size={13} /> Exportă
          </button>
        </div>
      </header>

      {/* Selector Săptămână / Raport */}
      <WeekNavigator
        selectedWeek={selectedWeek}
        activeWeekIso={activeWeekIso}
        activeOption={activeOption}
        availableWeeks={availableWeeks}
        onSelectWeek={(w) => {
          setSelectedWeek(w);
          setPage(1);
        }}
      />

      <PaymentsKpiCards kpi={kpi} currency={currency} />

      {canCreate && selectedWeek !== "all" && (
        <WeeklyQuickInput
          rows={fleetPayments.filter((p) => p.periodStartIso === activeWeekIso && (activeReportSource === "all" || paymentSourceDetail(p.reference) === activeReportSource) && p.recipient.kind === "courier")}
          periodStartIso={activeWeekIso}
          periodEndIso={activeOption?.endIso ?? currentPeriod.endIso}
          materialize={materialize}
          updatePayment={payments.updatePayment}
          actorName={user.name}
        />
      )}

      <PaymentsFilterBar
        filters={filters} cities={cities} couriers={courierOptions}
        onChange={(patch) => { setFilters((p) => ({ ...p, ...patch })); setPage(1); }}
        onOpenAdvanced={() => setAdvOpen(true)} hasAdvanced={isAdvancedActive(advanced)}
        currency={currency} currencies={CURRENCIES} onCurrencyChange={setCurrency}
      />

      <PaymentsStatusTabs active={tab} counts={tabCounts} onChange={(t) => { setTab(t); setPage(1); }} />

      {/* Filtru sursă — separare vizuală TTG / Gusty Bolt / Wolt / Glovo / Manual + Cont dublu */}
      <div className="flex flex-wrap items-center gap-2">
        <SourceFilterChips showSubs={can("subcontractors.view")} active={sourceFilter} counts={sourceCounts} onChange={(s) => { setSourceFilter(s); setPage(1); }} />
        <DuplicatePairsMenu />
      </div>

      <div className={cn("min-w-0", selectedPayment && "lg:pr-[420px]")}>
        <PaymentsTable
          rows={pagedRows} currency={currency}
          selectedIds={selectedIds} onToggleRow={toggleRow} onToggleAll={toggleAll}
          selectedPaymentId={selectedPaymentId} onSelect={setSelectedPaymentId}
          onRowAction={handleRowAction} sort={sort} onSort={onSort} can={can}
          onBulk={handleBulk} onClearSelection={() => setSelectedIds(new Set())}
          mergePairs={mergePairs} dupCandidates={dupCandidates}
          onCreatePair={createMergePair} onSplit={splitMerge}
          allPayments={fleetPayments}
        />
        <div className="mt-3">
          <PaymentsPagination page={safePage} pageSize={PAGE_SIZE} total={displayRows.length} onPage={setPage} />
        </div>
        <div className="mt-4">
          <PaymentsSummaryCards summary={summary} currency={currency} netLabel={user.role === "subcontractor_owner" ? "Net trimis (după comision)" : undefined} />
        </div>
      </div>

      {/* Drawer detalii */}
      {selectedPayment && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSelectedPaymentId(null)} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] p-3 lg:p-4">
            <PaymentDetailsPanel
              payment={selectedPayment} courier={drawerCourier} currency={currency}
              activities={payments.getActivities(selectedPayment.id)}
              notes={payments.notesByPayment[selectedPayment.id] ?? []}
              documents={payments.documentsByPayment[selectedPayment.id] ?? []}
              can={can}
              onClose={() => setSelectedPaymentId(null)}
              onChangeStatus={() => setChangeStatusPayment(selectedPayment)}
              onMarkPaid={() => setMarkPaidPayment(selectedPayment)}
              onEdit={() => setEditPayment(selectedPayment)}
              onDownloadPayslip={() => handleDownload(selectedPayment)}
              onAddNote={(text) => payments.addNote(selectedPayment.id, text, user.name)}
              onRemoveNote={(nid) => payments.removeNote(selectedPayment.id, nid)}
              onViewCourier={() => router.push(`/curieri/${selectedPayment.recipient.id}`)}
              onAddDeduction={() => setDeductionPayment(selectedPayment)}
            />
          </div>
        </>
      )}

      {/* Dialoguri */}
      <AddPaymentDialog
        open={addOpen} onClose={() => setAddOpen(false)} couriers={fleetCouriers}
        fleetId={activeFleetId} tenantId={activeFleetId} actorName={user.name}
        onCreate={(p) => { payments.addPayment(p); toast.success("Plată adăugată", `Plată pentru ${p.recipient.name} salvată.`); }}
      />
      <ImportPlatformDialog
        open={importPlatformOpen}
        onClose={() => setImportPlatformOpen(false)}
        onlyGroup={importGroup}
        onImportSuccess={(newStartIso, sourceKey) => {
          setSelectedWeek(sourceKey ? `${newStartIso}__${sourceKey}` : newStartIso);
          setPage(1);
        }}
      />
      <ExportPaymentsDialog
        open={exportOpen} onClose={() => setExportOpen(false)} rows={exportRows} currency={currency}
        ibanOf={ibanForCourier}
        onExported={(count) => toast.success("Export finalizat", `${count} plăți exportate în CSV.`)}
      />
      <MarkPaidConfirmDialog
        payment={markPaidPayment}
        siblings={markPaidSiblings}
        currency={currency}
        onCancel={() => setMarkPaidPayment(null)}
        onConfirm={(id, allIds) => {
          const idsToMark = allIds && allIds.length > 0 ? allIds : [id];
          for (const pid of idsToMark) {
            const p = fleetPayments.find((x) => x.id === pid);
            const realId = p ? materialize(p).id : pid;
            payments.markPaid(realId, user.name);
          }
          const extraMsg = idsToMark.length > 1 ? ` (${idsToMark.length} conturi marcate ca plătite)` : "";
          toast.success("Plată efectuată", `Statusul a fost actualizat la Plătit${extraMsg}.`);
          setMarkPaidPayment(null);
        }}
      />
      <ChangeStatusDialog
        key={changeStatusPayment?.id}
        payment={changeStatusPayment}
        siblings={changeStatusSiblings}
        onCancel={() => setChangeStatusPayment(null)}
        onConfirm={(id, status, allIds) => {
          const idsToUpdate = allIds && allIds.length > 0 ? allIds : [id];
          for (const pid of idsToUpdate) {
            const p = fleetPayments.find((x) => x.id === pid);
            const realId = p ? materialize(p).id : pid;
            payments.setStatus(realId, status, user.name);
          }
          const extraMsg = idsToUpdate.length > 1 ? ` (${idsToUpdate.length} conturi actualizate)` : "";
          toast.success("Status actualizat", `Statusul a fost schimbat la ${PAYMENT_STATUS_LABEL[status]}${extraMsg}.`);
          setChangeStatusPayment(null);
        }}
      />
      <EditPaymentDialog
        key={editPayment?.id} payment={editPayment}
        onCancel={() => setEditPayment(null)}
        onSave={(id, patch) => {
          const p = fleetPayments.find((x) => x.id === id);
          const siblings = p ? getSiblingPaymentsForPerson(p, fleetPayments, duplicateGroupFor) : [];
          const allIds = Array.from(new Set([id, ...siblings.map((s) => materialize(s).id)]));

          if (patch.status) {
            for (const sid of allIds) {
              if (sid === id) {
                payments.updatePayment(sid, patch, user.name);
              } else {
                payments.setStatus(sid, patch.status, user.name);
              }
            }
          } else {
            payments.updatePayment(id, patch, user.name);
          }
          const extra = patch.status && allIds.length > 1 ? ` (${allIds.length} conturi conexe)` : "";
          toast.success("Plată actualizată", `Modificările au fost salvate și auditate${extra}.`);
          setEditPayment(null);
        }}
      />
      <AddDeductionDialog
        key={deductionPayment?.id} payment={deductionPayment}
        onCancel={() => setDeductionPayment(null)}
        onConfirm={(id, k, amount, description) => { payments.addDeduction(id, k, amount, description, user.name); toast.success("Deducere adăugată", "Suma de plată a fost recalculată."); setDeductionPayment(null); }}
      />
      <BulkConfirmDialog
        open={!!bulk}
        {...bulkConfirmProps(bulk?.action, selectedIds.size)}
        onCancel={() => setBulk(null)} onConfirm={runBulk}
      />
      <BulkConfirmDialog
        open={confirmDedup}
        title="Curăță plăți duplicate"
        message={`Găsit ${totalDupesToDelete} plăți duplicate (același curier, aceeași săptămână). Se șterg toate variantele mai vechi, se păstrează cea mai recent creată din fiecare grup. Acțiunea nu poate fi anulată.`}
        confirmLabel={`Da, șterge ${totalDupesToDelete}`}
        onCancel={() => setConfirmDedup(false)}
        onConfirm={runDedup}
      />
      <ClearWeekDialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        weekLabel={activeOption?.label ?? activeWeekIso}
        reportName={activeReportSource !== "all" ? (activeOption?.reportName ?? undefined) : undefined}
        optionCount={currentOptionRealPayments.length}
        totalWeekCount={currentWeekRealPayments.length}
        onConfirmClear={handleClearConfirm}
      />

      {/* Filtre avansate */}
      <PaymentsAdvancedFilters
        open={advOpen} onClose={() => setAdvOpen(false)} initial={advanced}
        operators={operators} subcontractors={subcontractors} onApply={(f) => { setAdvanced(f); setPage(1); }}
      />
    </div>
  );
}
