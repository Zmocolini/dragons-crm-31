"use client";

import { Download, Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { PaymentsKpiCards, type PaymentsKpi } from "@/components/payments/PaymentsKpiCards";
import { PaymentsFilterBar, EMPTY_PAYMENT_FILTERS, type PaymentFilters } from "@/components/payments/PaymentsFilterBar";
import {
  PaymentsAdvancedFilters, EMPTY_ADVANCED, isAdvancedActive, type AdvancedPaymentFilters,
} from "@/components/payments/PaymentsAdvancedFilters";
import { PaymentsStatusTabs, tabMatches, type PaymentTabKey } from "@/components/payments/PaymentsStatusTabs";
import { PaymentsTable, type BulkAction, type RowAction, type SortKey } from "@/components/payments/PaymentsTable";
import { PaymentsSummaryCards, PaymentsPagination, type PaymentsSummary } from "@/components/payments/PaymentsSummaryCards";
import { PaymentDetailsPanel } from "@/components/payments/PaymentDetailsPanel";
import {
  AddDeductionDialog, AddPaymentDialog, BulkConfirmDialog, ChangeStatusDialog,
  EditPaymentDialog, ExportPaymentsDialog, ImportPaymentsDialog, MarkPaidConfirmDialog,
  type ImportRow,
} from "@/components/payments/PaymentsDialogs";
import { useToast } from "@/components/ui/Toast";
import { usePayments } from "@/lib/payments/context";
import { useCouriers } from "@/lib/couriers/context";
import { useSession } from "@/lib/rbac/session";
import { downloadPayslip } from "@/lib/payments/payslip";
import type { PlatformKey } from "@/lib/dashboard/types";
import {
  DEFAULT_CURRENCY, EMPTY_BREAKDOWN, IN_PROGRESS_STATUSES, PAID_STATUSES, UNPAID_STATUSES,
  calculateTotal, deductionsTotal, ibanForCourier, round2,
  type Currency, type Payment, type PaymentBreakdown, type PaymentStatus,
} from "@/lib/payments/types";
import { cn } from "@/lib/utils/cn";

const PAGE_SIZE = 10;
const CURRENCIES: Currency[] = ["RON", "EUR"];

function parseImportStatus(s: string): PaymentStatus {
  const v = s.toLowerCase();
  if (/(plătit|platit|paid)/.test(v)) return "paid";
  if (/(neplătit|neplatit|unpaid)/.test(v)) return "unpaid";
  if (/(proces|processing|partial)/.test(v)) return "partial";
  if (/(verific|aprob|review)/.test(v)) return "in_review";
  if (/(problem|issue)/.test(v)) return "issue";
  if (/(blocat|block)/.test(v)) return "blocked";
  return "in_review";
}
function parseImportPlatforms(s: string): PlatformKey[] {
  const out: PlatformKey[] = [];
  const v = s.toLowerCase();
  if (v.includes("bolt")) out.push("bolt");
  if (v.includes("wolt")) out.push("wolt");
  if (v.includes("glovo")) out.push("glovo");
  return out;
}

export default function PlatiPage() {
  const router = useRouter();
  const { user, activeFleetId, can } = useSession();
  const { allRows } = useCouriers();
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
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "net", dir: "desc" });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  // ── Dialoguri ─────────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"filtered" | "selected">("filtered");
  const [markPaidPayment, setMarkPaidPayment] = useState<Payment | null>(null);
  const [changeStatusPayment, setChangeStatusPayment] = useState<Payment | null>(null);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [deductionPayment, setDeductionPayment] = useState<Payment | null>(null);
  const [bulk, setBulk] = useState<null | { action: Exclude<BulkAction, "export"> }>(null);

  // Curierii flotei active (pentru filtre, add, drawer lookup)
  const fleetCouriers = useMemo(() => allRows.filter((c) => c.tenantId === activeFleetId), [allRows, activeFleetId]);

  const fleetPayments = payments.fleetPayments;

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
      return true;
    });
  }, [fleetPayments, filters, advanced, fleetCouriers]);

  // ── Tab + sort ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const list = filteredNoTab.filter((p) => tabMatches(tab, p.status));
    const dir = sort.dir === "asc" ? 1 : -1;
    const val = (p: Payment): number | string => {
      switch (sort.key) {
        case "name":       return p.recipient.name;
        case "orders":     return p.ordersCount ?? 0;
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

  // Paginare (page clamped ca să nu rămână pe o pagină goală după filtrare)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedRows = useMemo(() => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [filtered, safePage]);

  // ── KPI (din setul filtrat, fără tab) ───────────────────────────────────────
  const kpi = useMemo<PaymentsKpi>(() => {
    let totalDue = 0, paid = 0, inProgress = 0, unpaid = 0;
    const couriers = new Set<string>();
    for (const p of filteredNoTab) {
      totalDue += p.totalCalculated;
      couriers.add(p.recipient.id);
      if (PAID_STATUSES.includes(p.status)) paid += p.amountPaid;
      if (IN_PROGRESS_STATUSES.includes(p.status)) inProgress += p.totalCalculated;
      if (UNPAID_STATUSES.includes(p.status)) unpaid += p.totalCalculated;
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
      net += p.totalCalculated;
    }
    return { count: filtered.length, gross: round2(gross), commissions: round2(commissions), deductions: round2(deductions), net: round2(net) };
  }, [filtered]);

  // Liste pentru dropdown-uri
  const cities = useMemo(() => Array.from(new Set(fleetCouriers.map((c) => c.city).filter(Boolean))).sort(), [fleetCouriers]);
  const courierOptions = useMemo(() => Array.from(new Map(fleetPayments.map((p) => [p.recipient.id, p.recipient.name])).entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)), [fleetPayments]);
  const operators = useMemo(() => Array.from(new Set(fleetPayments.map((p) => p.operatorName).filter((x): x is string => !!x))).sort(), [fleetPayments]);
  const subcontractors = useMemo(() => Array.from(new Set(fleetCouriers.map((c) => c.subcontractorName).filter((x): x is string => !!x))).sort(), [fleetCouriers]);

  const selectedPayment = useMemo(() => fleetPayments.find((p) => p.id === selectedPaymentId) ?? null, [fleetPayments, selectedPaymentId]);
  const drawerCourier = useMemo(() => (selectedPayment ? fleetCouriers.find((c) => c.id === selectedPayment.recipient.id) ?? null : null), [selectedPayment, fleetCouriers]);

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
    const p = fleetPayments.find((x) => x.id === id);
    if (!p) return;
    switch (action) {
      case "view":
      case "history":       setSelectedPaymentId(id); break;
      case "edit":          if (canCreate) setEditPayment(p); break;
      case "approve":       if (canCreate) { payments.approve(id, user.name); toast.success("Plată aprobată", `${p.recipient.name} → În proces`); } break;
      case "processing":    if (canCreate) { payments.markProcessing(id, user.name); toast.success("Marcată în proces", p.recipient.name); } break;
      case "paid":          if (canCreate) setMarkPaidPayment(p); break;
      case "add_deduction": if (canCreate) setDeductionPayment(p); break;
      case "add_note":      setSelectedPaymentId(id); break;
      case "download":      handleDownload(p); break;
      case "view_courier":  router.push("/curieri"); break;
    }
  }, [fleetPayments, canCreate, payments, user.name, toast, handleDownload, router]);

  const handleBulk = useCallback((action: BulkAction) => {
    if (selectedIds.size === 0) return;
    if (action === "export") { setExportScope("selected"); setExportOpen(true); return; }
    setBulk({ action });
  }, [selectedIds]);

  const runBulk = useCallback(() => {
    if (!bulk) return;
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      if (bulk.action === "approve") payments.approve(id, user.name);
      else if (bulk.action === "processing") payments.markProcessing(id, user.name);
      else if (bulk.action === "paid") payments.markPaid(id, user.name);
    }
    const label = bulk.action === "approve" ? "aprobate" : bulk.action === "processing" ? "marcate în proces" : "marcate ca plătite";
    toast.success("Operație completă", `${ids.length} plăți ${label}.`);
    setBulk(null);
    setSelectedIds(new Set());
  }, [bulk, selectedIds, payments, user.name, toast]);

  const handleImport = useCallback((rows: ImportRow[]) => {
    let created = 0;
    for (const r of rows) {
      const courier = fleetCouriers.find((c) => c.fullName.toLowerCase() === r.name.toLowerCase());
      const platforms = courier ? courier.platforms : parseImportPlatforms(r.platform);
      const breakdown: PaymentBreakdown = {
        ...EMPTY_BREAKDOWN,
        grossRevenue: r.gross, fleetCommission: r.commission, deductions: r.deductions,
      };
      const total = calculateTotal(breakdown);
      payments.addPayment({
        tenantId: activeFleetId, fleetId: activeFleetId,
        recipient: {
          id: courier?.id ?? `imported_${r.name.replace(/\s+/g, "_").toLowerCase()}`,
          name: r.name, city: courier?.city ?? null,
          platform: platforms[0] ?? null, status: courier?.status ?? null,
          kind: "courier",
        },
        type: "courier_pay",
        periodStartIso: r.periodStart || "2026-09-01", periodEndIso: r.periodEnd || "2026-09-07",
        paymentDateIso: r.periodEnd || "2026-09-07",
        method: "bank_transfer", breakdown,
        amountPaid: parseImportStatus(r.status) === "paid" ? total : 0,
        totalCalculated: total, status: parseImportStatus(r.status),
        reference: null, notes: null, createdBy: user.name, overrideReason: null,
        ordersCount: r.orders, platforms, commissionPercentage: r.gross > 0 ? round2((r.commission / r.gross) * 100) : 0,
        currency: "RON", ibanSnapshot: r.iban || (courier ? ibanForCourier(courier.id) : null),
        operatorName: null, approvedBy: null, approvedAtIso: null, paidBy: null, paidAtIso: null,
      });
      created++;
    }
    toast.success("Import finalizat", `${created} plăți importate.`);
  }, [fleetCouriers, payments, activeFleetId, user.name, toast]);

  const existingKeys = useMemo(
    () => new Set(fleetPayments.map((p) => `${p.recipient.name.toLowerCase()}|${p.periodStartIso}`)),
    [fleetPayments],
  );
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
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setImportOpen(true)} disabled={!canCreate}
            className={cn("inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]", !canCreate && "opacity-50")}>
            <Upload size={13} /> Importă
          </button>
          <button type="button" onClick={() => { setExportScope("filtered"); setExportOpen(true); }} disabled={!canExport}
            className={cn("inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]", !canExport && "opacity-50")}>
            <Download size={13} /> Exportă
          </button>
          <button type="button" onClick={() => setAddOpen(true)} disabled={!canCreate}
            className={cn("inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(99,102,241,0.55)]", !canCreate && "cursor-not-allowed opacity-50")}>
            <Plus size={14} strokeWidth={2.4} /> Adaugă plată
          </button>
        </div>
      </header>

      <PaymentsKpiCards kpi={kpi} currency={currency} />

      <PaymentsFilterBar
        filters={filters} cities={cities} couriers={courierOptions}
        onChange={(patch) => { setFilters((p) => ({ ...p, ...patch })); setPage(1); }}
        onOpenAdvanced={() => setAdvOpen(true)} hasAdvanced={isAdvancedActive(advanced)}
        currency={currency} currencies={CURRENCIES} onCurrencyChange={setCurrency}
      />

      <PaymentsStatusTabs active={tab} counts={tabCounts} onChange={(t) => { setTab(t); setPage(1); }} />

      <div className={cn("min-w-0", selectedPayment && "lg:pr-[420px]")}>
        <PaymentsTable
          rows={pagedRows} currency={currency}
          selectedIds={selectedIds} onToggleRow={toggleRow} onToggleAll={toggleAll}
          selectedPaymentId={selectedPaymentId} onSelect={setSelectedPaymentId}
          onRowAction={handleRowAction} sort={sort} onSort={onSort} can={can}
          onBulk={handleBulk} onClearSelection={() => setSelectedIds(new Set())}
        />
        <div className="mt-3">
          <PaymentsPagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
        </div>
        <div className="mt-4">
          <PaymentsSummaryCards summary={summary} currency={currency} />
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
              onViewCourier={() => router.push("/curieri")}
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
      <ImportPaymentsDialog
        open={importOpen} onClose={() => setImportOpen(false)} existingKeys={existingKeys} onImport={handleImport}
      />
      <ExportPaymentsDialog
        open={exportOpen} onClose={() => setExportOpen(false)} rows={exportRows} currency={currency}
        ibanOf={ibanForCourier}
        onExported={(count) => toast.success("Export finalizat", `${count} plăți exportate în CSV.`)}
      />
      <MarkPaidConfirmDialog
        payment={markPaidPayment} currency={currency}
        onCancel={() => setMarkPaidPayment(null)}
        onConfirm={(id) => { payments.markPaid(id, user.name); toast.success("Plată efectuată", "Statusul a fost actualizat la Plătit."); setMarkPaidPayment(null); }}
      />
      <ChangeStatusDialog
        key={changeStatusPayment?.id} payment={changeStatusPayment}
        onCancel={() => setChangeStatusPayment(null)}
        onConfirm={(id, status) => { payments.setStatus(id, status, user.name); toast.success("Status actualizat", "Modificarea a intrat în audit log."); setChangeStatusPayment(null); }}
      />
      <EditPaymentDialog
        key={editPayment?.id} payment={editPayment}
        onCancel={() => setEditPayment(null)}
        onSave={(id, patch) => { payments.updatePayment(id, patch, user.name); toast.success("Plată actualizată", "Modificările au fost salvate și auditate."); setEditPayment(null); }}
      />
      <AddDeductionDialog
        key={deductionPayment?.id} payment={deductionPayment}
        onCancel={() => setDeductionPayment(null)}
        onConfirm={(id, k, amount, description) => { payments.addDeduction(id, k, amount, description, user.name); toast.success("Deducere adăugată", "Suma de plată a fost recalculată."); setDeductionPayment(null); }}
      />
      <BulkConfirmDialog
        open={!!bulk}
        title="Confirmă operația financiară"
        message={`Aplici acțiunea „${bulk?.action === "approve" ? "Aprobă" : bulk?.action === "processing" ? "Marchează în proces" : "Marchează ca plătite"}" pentru ${selectedIds.size} plăți selectate?`}
        confirmLabel="Confirmă"
        onCancel={() => setBulk(null)} onConfirm={runBulk}
      />

      {/* Filtre avansate */}
      <PaymentsAdvancedFilters
        open={advOpen} onClose={() => setAdvOpen(false)} initial={advanced}
        operators={operators} subcontractors={subcontractors} onApply={(f) => { setAdvanced(f); setPage(1); }}
      />
    </div>
  );
}
