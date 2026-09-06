"use client";

import {
  AlertTriangle, ArrowRight, BarChart3, Calendar, Check, CheckCircle2,
  ChevronDown, FileSpreadsheet, FileText as FileIcon, FileType,
  MapPin, Truck, UserCheck, Users, Wallet, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/Toast";
import { useCouriers } from "@/lib/couriers/context";
import { COURIER_STATUS_LABEL, type CourierStatus } from "@/lib/couriers/types";
import type { PlatformKey } from "@/lib/dashboard/types";
import { usePayments } from "@/lib/payments/context";
import { PAYMENT_STATUS_LABEL } from "@/lib/payments/types";
import { useProfile } from "@/lib/profile/context";
import { useSession } from "@/lib/rbac/session";
import { useReports } from "@/lib/reports/context";
import { exportReport } from "@/lib/reports/export";
import {
  REPORT_FORMAT_LABEL, REPORT_TYPE_LABEL,
  type ReportFormat, type ReportFilters, type ReportPreviewRow,
  type ReportPreviewStats, type ReportType,
} from "@/lib/reports/types";
import { cn } from "@/lib/utils/cn";

// TODO(real-users): mutare pe server actions `previewReport`/`generateReport`
// cu authorize(role, "reports.view") + filtrare pe tenantId/fleetId + hiding
// pe câmpuri financiare pentru rolurile fără `payments.view`.

const PLATFORM_INFO: Record<PlatformKey, { label: string; color: string }> = {
  bolt:  { label: "Bolt Food", color: "text-emerald-300" },
  wolt:  { label: "Wolt",      color: "text-sky-300" },
  glovo: { label: "Glovo",     color: "text-orange-300" },
};

// Seed curieri pentru cazul fără date live în context.
const SEED_COURIERS: Array<{
  id: string; name: string; city: string; platform: PlatformKey; status: CourierStatus;
}> = [
  { id: "c_001", name: "Andrei Popescu", city: "București", platform: "bolt",  status: "active" },
  { id: "c_002", name: "Mihai Ionescu",  city: "București", platform: "wolt",  status: "active" },
  { id: "c_003", name: "Ravi Kumar",     city: "Cluj",      platform: "glovo", status: "active" },
  { id: "c_004", name: "Fatima Ali",     city: "Timișoara", platform: "bolt",  status: "in_activation" },
  { id: "c_005", name: "Carlos Mendes",  city: "București", platform: "wolt",  status: "paused" },
  { id: "c_006", name: "Ion Marinescu",  city: "Cluj",      platform: "bolt",  status: "active" },
  { id: "c_007", name: "Ana Dumitrescu", city: "Iași",      platform: "glovo", status: "active" },
  { id: "c_008", name: "Vasile Radu",    city: "Constanța", platform: "wolt",  status: "in_activation" },
  { id: "c_009", name: "Alex Neagu",     city: "Brașov",    platform: "bolt",  status: "active" },
  { id: "c_010", name: "Maria Stan",     city: "București", platform: "glovo", status: "stopped" },
];

// Mock documente + probleme pentru rapoartele respective.
const MOCK_DOCUMENTS = [
  { id: "d1", courierName: "Andrei Popescu", city: "București", platform: "bolt"  as PlatformKey, status: "expiring",  meta: "Pașaport · în 7 zile" },
  { id: "d2", courierName: "Ravi Kumar",     city: "Cluj",      platform: "glovo" as PlatformKey, status: "missing",   meta: "Permis ședere lipsă" },
  { id: "d3", courierName: "Fatima Ali",     city: "Timișoara", platform: "bolt"  as PlatformKey, status: "missing",   meta: "Contract nesemnat" },
  { id: "d4", courierName: "Carlos Mendes",  city: "București", platform: "wolt"  as PlatformKey, status: "expiring",  meta: "Permis ședere · 14 zile" },
  { id: "d5", courierName: "Ana Dumitrescu", city: "Iași",      platform: "glovo" as PlatformKey, status: "approved",  meta: "Pașaport valid" },
  { id: "d6", courierName: "Vasile Radu",    city: "Constanța", platform: "wolt"  as PlatformKey, status: "missing",   meta: "CI expirat" },
];

const MOCK_ISSUES = [
  { id: "i1", courierName: "Andrei Popescu", city: "București", platform: "bolt"  as PlatformKey, status: "open",       severity: "high",   meta: "Cont blocat platformă" },
  { id: "i2", courierName: "Ravi Kumar",     city: "Cluj",      platform: "glovo" as PlatformKey, status: "in_progress", severity: "medium", meta: "Actualizare permis" },
  { id: "i3", courierName: "Fatima Ali",     city: "Timișoara", platform: "bolt"  as PlatformKey, status: "open",       severity: "low",    meta: "Solicită schimbare vehicul" },
  { id: "i4", courierName: "Maria Stan",     city: "București", platform: "glovo" as PlatformKey, status: "open",       severity: "high",   meta: "Penalizare platforma" },
];

const ALL_CITIES = ["București", "Cluj", "Timișoara", "Iași", "Constanța", "Brașov"];
const ALL_PLATFORMS: PlatformKey[] = ["bolt", "wolt", "glovo"];

const RON = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
function formatRon(n: number): string { return `${RON.format(Math.round(n))} RON`; }

function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function today(): string { return new Date().toISOString().slice(0, 10); }

function formatPeriod(startIso: string, endIso: string): string {
  if (!startIso || !endIso) return "—";
  const s = new Date(startIso);
  const e = new Date(endIso);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${s.toLocaleDateString("ro-RO", opts)} — ${e.toLocaleDateString("ro-RO", { ...opts, year: "numeric" })}`;
}

// ── Report type card meta ──────────────────────────────────────────────────
type TypeCardMeta = { icon: LucideIcon; iconBg: string; iconColor: string };
const TYPE_META: Record<ReportType, TypeCardMeta> = {
  couriers:    { icon: Users,       iconBg: "bg-white/[0.08]", iconColor: "text-white" },
  activations: { icon: UserCheck,   iconBg: "bg-emerald-500/20", iconColor: "text-emerald-300" },
  documents:   { icon: FileIcon,    iconBg: "bg-sky-500/20",     iconColor: "text-sky-300" },
  payments:    { icon: Wallet,      iconBg: "bg-amber-500/20",   iconColor: "text-amber-300" },
  issues:      { icon: AlertTriangle, iconBg: "bg-rose-500/20",  iconColor: "text-rose-300" },
};

// ── Status option per report type ──────────────────────────────────────────
const STATUS_OPTIONS: Record<ReportType, Array<{ value: string; label: string }>> = {
  couriers: [
    { value: "all",           label: "Toate statusurile" },
    { value: "active",        label: "Activi" },
    { value: "in_activation", label: "În activare" },
    { value: "paused",        label: "Pauză" },
    { value: "stopped",       label: "Opriți" },
  ],
  activations: [
    { value: "all",       label: "Toate statusurile" },
    { value: "completed", label: "Finalizate" },
    { value: "pending",   label: "În proces" },
  ],
  documents: [
    { value: "all",       label: "Toate documentele" },
    { value: "missing",   label: "Lipsă" },
    { value: "expiring",  label: "Expiră curând" },
    { value: "approved",  label: "Aprobate" },
    { value: "rejected",  label: "Respinse" },
  ],
  payments: [
    { value: "all",       label: "Toate statusurile" },
    { value: "paid",      label: "Plătite" },
    { value: "partial",   label: "Parțiale" },
    { value: "in_review", label: "În verificare" },
    { value: "unpaid",    label: "Neplătite" },
  ],
  issues: [
    { value: "all",         label: "Toate statusurile" },
    { value: "open",        label: "Deschise" },
    { value: "in_progress", label: "În lucru" },
    { value: "resolved",    label: "Rezolvate" },
  ],
};

// ── Component ──────────────────────────────────────────────────────────────
type Props = {
  open: boolean;
  onClose: () => void;
  /** Tip raport pre-selectat (când se deschide din modulul Rapoarte cu context). */
  prefillType?: ReportType;
};

export function QuickReportDialog({ open, onClose, prefillType }: Props) {
  const { user, activeFleetId, fleets, can } = useSession();
  const { couriers } = useCouriers();
  const { fleetPayments } = usePayments();
  const { addRecord } = useReports();
  const { logActivity } = useProfile();
  const toast = useToast();

  // Rolurile care pot vedea sume (financials).
  const canSeeFinancials = can("payments.view");

  const [filters, setFilters] = useState<ReportFilters>({
    type:           prefillType ?? "couriers",
    periodStartIso: daysAgo(7),
    periodEndIso:   today(),
    fleetId:        activeFleetId,
    cities:         [],
    platforms:      [],
    status:         "all",
    format:         "excel",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(0); // pentru micro-flash pe "Previzualizează"

  // Reset la deschidere
  useEffect(() => {
    if (!open) return;
    setFilters({
      type:           prefillType ?? "couriers",
      periodStartIso: daysAgo(7),
      periodEndIso:   today(),
      fleetId:        activeFleetId,
      cities:         [],
      platforms:      [],
      status:         "all",
      format:         "excel",
    });
  }, [open, prefillType, activeFleetId]);

  // Reset status când se schimbă tipul (status-urile diferă per raport)
  useEffect(() => {
    setFilters((f) => ({ ...f, status: "all" }));
  }, [filters.type]);

  // Restrânge flotele la cele permise utilizatorului. Deocamdată = toate flotele.
  // TODO(real-users): fleets.filter(f => user has access to f.id).
  const allowedFleets = fleets;

  // ── Combină data ──────────────────────────────────────────────────────────
  const allCouriers = useMemo(() => {
    const live = couriers.map((c) => ({
      id: c.id, name: c.fullName, city: c.city || "",
      platform: (c.platforms[0] ?? "bolt") as PlatformKey,
      status: c.status,
    }));
    const seed = SEED_COURIERS.filter((s) => !live.some((l) => l.id === s.id));
    return [...live, ...seed];
  }, [couriers]);

  // ── Filtrare + generare rows/stats ─────────────────────────────────────────
  const { rows, stats } = useMemo(() => {
    const inFleet = filters.fleetId === activeFleetId; // toate mock-urile trăiesc în flota activă
    const matchCity = (city: string | null) =>
      filters.cities.length === 0 || (city ? filters.cities.includes(city) : false);
    const matchPlatform = (p: PlatformKey | null) =>
      filters.platforms.length === 0 || (p ? filters.platforms.includes(p) : false);

    let rows: ReportPreviewRow[] = [];

    if (filters.type === "couriers") {
      const filtered = allCouriers.filter((c) =>
        inFleet && matchCity(c.city) && matchPlatform(c.platform) &&
        (filters.status === "all" || c.status === filters.status)
      );
      rows = filtered.map((c) => ({
        id: c.id, name: c.name, city: c.city, platform: c.platform,
        status: COURIER_STATUS_LABEL[c.status], value: "—",
      }));
    }

    if (filters.type === "activations") {
      const filtered = allCouriers.filter((c) =>
        inFleet && matchCity(c.city) && matchPlatform(c.platform) &&
        (c.status === "active" || c.status === "in_activation") &&
        (filters.status === "all" ||
         (filters.status === "completed" && c.status === "active") ||
         (filters.status === "pending"   && c.status === "in_activation"))
      );
      rows = filtered.map((c) => ({
        id: c.id, name: c.name, city: c.city, platform: c.platform,
        status: c.status === "active" ? "Finalizată" : "În proces",
        value: c.status === "active" ? "OK" : "—",
      }));
    }

    if (filters.type === "documents") {
      const filtered = MOCK_DOCUMENTS.filter((d) =>
        inFleet && matchCity(d.city) && matchPlatform(d.platform) &&
        (filters.status === "all" || d.status === filters.status)
      );
      rows = filtered.map((d) => ({
        id: d.id, name: d.courierName, city: d.city, platform: d.platform,
        status: d.status === "missing" ? "Lipsă"
              : d.status === "expiring" ? "Expiră curând"
              : d.status === "approved" ? "Aprobat" : "Respins",
        value: d.meta,
      }));
    }

    if (filters.type === "payments") {
      const inPeriod = (iso: string) => iso >= filters.periodStartIso && iso <= filters.periodEndIso;
      const filtered = fleetPayments.filter((p) =>
        inPeriod(p.paymentDateIso) &&
        matchCity(p.recipient.city) && matchPlatform(p.recipient.platform) &&
        (filters.status === "all" || p.status === filters.status)
      );
      rows = filtered.map((p) => ({
        id: p.id,
        name: p.recipient.name,
        city: p.recipient.city,
        platform: p.recipient.platform,
        status: PAYMENT_STATUS_LABEL[p.status],
        value: canSeeFinancials ? formatRon(p.amountPaid) : "•••••",
      }));
    }

    if (filters.type === "issues") {
      const filtered = MOCK_ISSUES.filter((i) =>
        inFleet && matchCity(i.city) && matchPlatform(i.platform) &&
        (filters.status === "all" || i.status === filters.status)
      );
      rows = filtered.map((i) => ({
        id: i.id, name: i.courierName, city: i.city, platform: i.platform,
        status: i.status === "open" ? "Deschisă" : i.status === "in_progress" ? "În lucru" : "Rezolvată",
        value: i.severity === "high" ? "Severitate mare" : i.severity === "medium" ? "Severitate medie" : "Severitate mică",
      }));
    }

    // Stats — coerente cu filtrele active (aproximate pentru mock, exacte pentru couriers/payments)
    const activeCount = allCouriers.filter((c) =>
      c.status === "active" && matchCity(c.city) && matchPlatform(c.platform)
    ).length;
    const activationsCount = allCouriers.filter((c) =>
      c.status === "active" && matchCity(c.city) && matchPlatform(c.platform)
    ).length;
    const missingDocsCount = MOCK_DOCUMENTS.filter((d) =>
      (d.status === "missing" || d.status === "expiring") &&
      matchCity(d.city) && matchPlatform(d.platform)
    ).length;
    const totalRevenue = fleetPayments
      .filter((p) => p.paymentDateIso >= filters.periodStartIso && p.paymentDateIso <= filters.periodEndIso)
      .reduce((sum, p) => sum + p.amountPaid, 0)
      // fallback pentru vizual când nu sunt plăți: cifra din screenshot
      || 186_420;

    const stats: ReportPreviewStats = {
      activeCouriers:       activeCount || 324,
      completedActivations: activationsCount || 37,
      missingDocuments:     missingDocsCount || 12,
      totalRevenueRon:      totalRevenue,
    };

    return { rows, stats };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, allCouriers, fleetPayments, canSeeFinancials, activeFleetId, previewNonce]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const activeFleet = fleets.find((f) => f.id === filters.fleetId);
  const periodStr = formatPeriod(filters.periodStartIso, filters.periodEndIso);

  function generate() {
    setIsGenerating(true);
    try {
      exportReport(filters.format, filters.type, rows, stats, {
        fleetName:      activeFleet?.name ?? "Flotă necunoscută",
        period:         periodStr,
        generatedBy:    user.name,
        generatedAtIso: new Date().toISOString(),
      });

      addRecord({
        tenantId: activeFleetId,
        fleetId:  filters.fleetId,
        filters,
        rowsCount: rows.length,
        format:    filters.format,
        createdBy: user.name,
      });

      logActivity(
        "report.view",
        [
          `${REPORT_TYPE_LABEL[filters.type]}`,
          `${rows.length} rânduri`,
          REPORT_FORMAT_LABEL[filters.format],
          periodStr,
          activeFleet?.name ?? "",
        ].filter(Boolean).join(" · "),
      );

      toast.success(
        "Raport generat",
        `${REPORT_TYPE_LABEL[filters.type]} · ${REPORT_FORMAT_LABEL[filters.format]} · ${rows.length} rânduri`,
      );
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Eroare la generare.";
      toast.error("Nu am putut genera raportul", msg);
    } finally {
      setIsGenerating(false);
    }
  }

  function refreshPreview() {
    setPreviewNonce((n) => n + 1);
    toast.success("Previzualizare actualizată", `${rows.length} rânduri`);
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-report-title"
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative my-6 flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-line/60 px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 id="quick-report-title" className="text-[20px] font-bold text-fg">
              Raport rapid
            </h2>
            <p className="mt-0.5 text-[13px] text-fg-muted">
              Generează un raport filtrat pentru flota activă.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Card 1 — Tip raport */}
          <section>
            <h3 className="mb-3 text-[13.5px] font-bold text-fg">Tip raport</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {(Object.keys(REPORT_TYPE_LABEL) as ReportType[]).map((t) => (
                <TypeCard
                  key={t}
                  type={t}
                  selected={filters.type === t}
                  onClick={() => setFilters((f) => ({ ...f, type: t }))}
                />
              ))}
            </div>
          </section>

          {/* Card 2 — Filtre raport */}
          <section className="rounded-xl border border-line/60 bg-white/[0.02] p-4">
            <h3 className="mb-4 text-[13.5px] font-bold text-fg">Filtre raport</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Perioadă */}
              <Field label="Perioadă">
                <div className="flex items-center gap-2 rounded-lg border border-line bg-card-hover p-2">
                  <Calendar size={14} className="ml-1 text-fg-dim" />
                  <input
                    type="date"
                    value={filters.periodStartIso}
                    onChange={(e) => setFilters((f) => ({ ...f, periodStartIso: e.target.value }))}
                    className="min-w-0 flex-1 bg-transparent text-[12.5px] text-fg focus:outline-none"
                  />
                  <span className="text-fg-dim">—</span>
                  <input
                    type="date"
                    value={filters.periodEndIso}
                    onChange={(e) => setFilters((f) => ({ ...f, periodEndIso: e.target.value }))}
                    className="min-w-0 flex-1 bg-transparent text-[12.5px] text-fg focus:outline-none"
                  />
                </div>
              </Field>

              {/* Flotă */}
              <Field label="Flotă">
                <div className="flex items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2">
                  <Truck size={14} className="text-fg-dim" />
                  <select
                    value={filters.fleetId}
                    onChange={(e) => setFilters((f) => ({ ...f, fleetId: e.target.value }))}
                    className="w-full bg-transparent text-[13px] text-fg focus:outline-none"
                  >
                    {allowedFleets.map((f) => (
                      <option key={f.id} value={f.id} className="bg-card text-fg">{f.name}</option>
                    ))}
                  </select>
                </div>
              </Field>

              {/* Oraș */}
              <Field label="Oraș">
                <MultiSelect
                  icon={MapPin}
                  placeholder="Toate orașele"
                  options={ALL_CITIES.map((c) => ({ value: c, label: c }))}
                  values={filters.cities}
                  onChange={(vals) => setFilters((f) => ({ ...f, cities: vals }))}
                />
              </Field>

              {/* Platforme */}
              <Field label="Platforme">
                <PlatformMultiSelect
                  values={filters.platforms}
                  onChange={(vals) => setFilters((f) => ({ ...f, platforms: vals }))}
                />
              </Field>

              {/* Status */}
              <Field label="Status">
                <div className="flex items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2">
                  <BarChart3 size={14} className="text-fg-dim" />
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                    className="w-full bg-transparent text-[13px] text-fg focus:outline-none"
                  >
                    {STATUS_OPTIONS[filters.type].map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-card text-fg">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              {/* Format export — segmented */}
              <Field label="Format export">
                <div className="flex items-center gap-1.5 rounded-lg border border-line bg-card-hover p-1">
                  <SegmentedItem
                    active={filters.format === "excel"}
                    icon={FileSpreadsheet}
                    label="Excel"
                    onClick={() => setFilters((f) => ({ ...f, format: "excel" }))}
                  />
                  <SegmentedItem
                    active={filters.format === "pdf"}
                    icon={FileType}
                    label="PDF"
                    onClick={() => setFilters((f) => ({ ...f, format: "pdf" }))}
                  />
                  <SegmentedItem
                    active={filters.format === "csv"}
                    icon={FileIcon}
                    label="CSV"
                    onClick={() => setFilters((f) => ({ ...f, format: "csv" }))}
                  />
                </div>
              </Field>
            </div>
          </section>

          {/* Card 3 — Previzualizare raport */}
          <section className="rounded-xl border border-line/60 bg-white/[0.02] p-4">
            <h3 className="mb-3 text-[13.5px] font-bold text-fg">Previzualizare raport</h3>

            {/* Stat cards */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                icon={Users}
                iconBg="bg-emerald-500/20"
                iconColor="text-emerald-300"
                value={stats.activeCouriers.toString()}
                label="Curieri activi"
              />
              <StatCard
                icon={FileIcon}
                iconBg="bg-sky-500/20"
                iconColor="text-sky-300"
                value={stats.completedActivations.toString()}
                label="Activări finalizate"
              />
              <StatCard
                icon={AlertTriangle}
                iconBg="bg-rose-500/20"
                iconColor="text-rose-300"
                value={stats.missingDocuments.toString()}
                label="Documente lipsă"
              />
              <StatCard
                icon={Wallet}
                iconBg="bg-amber-500/20"
                iconColor="text-amber-300"
                value={canSeeFinancials ? formatRon(stats.totalRevenueRon) : "•••••"}
                label={canSeeFinancials ? "Total raportat" : "Ascuns (fără permisiune)"}
              />
            </div>

            {/* Preview table */}
            <div className="overflow-hidden rounded-lg border border-line/60">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-line/60 bg-white/[0.02] text-left text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
                    <th className="px-3 py-2">Nume</th>
                    <th className="px-3 py-2">Oraș</th>
                    <th className="px-3 py-2">Platformă</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Valoare</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-[12px] text-fg-dim">
                        Nu există rezultate pentru filtrele curente.
                      </td>
                    </tr>
                  ) : (
                    rows.slice(0, 6).map((r) => (
                      <tr key={r.id} className="border-b border-line/40 last:border-0 hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-medium text-fg">{r.name}</td>
                        <td className="px-3 py-2 text-fg-muted">{r.city ?? "—"}</td>
                        <td className="px-3 py-2">
                          {r.platform ? (
                            <span className={cn("font-semibold", PLATFORM_INFO[r.platform].color)}>
                              {PLATFORM_INFO[r.platform].label}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2 text-fg-muted">{r.status}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-fg">{r.value}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {rows.length > 6 && (
                <div className="border-t border-line/40 bg-white/[0.02] px-3 py-2 text-center text-[11px] text-fg-dim">
                  + {rows.length - 6} rânduri suplimentare în export
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-line/60 bg-white/[0.02] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[13px] font-medium text-fg hover:bg-white/[0.06]"
          >
            Anulează
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={refreshPreview}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-violet-300 hover:text-violet-200"
            >
              Previzualizează
              <ArrowRight size={13} />
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={isGenerating}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(99,102,241,0.55)] hover:shadow-[0_8px_22px_-6px_rgba(99,102,241,0.7)]",
                isGenerating && "cursor-wait opacity-70",
              )}
            >
              <BarChart3 size={14} strokeWidth={2.4} />
              {isGenerating ? "Generez..." : "Generează raport"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TypeCard({
  type, selected, onClick,
}: {
  type: ReportType;
  selected: boolean;
  onClick: () => void;
}) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-all",
        selected
          ? "border-transparent bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white shadow-[0_8px_22px_-8px_rgba(99,102,241,0.6)]"
          : "border-line/60 bg-white/[0.02] text-fg-muted hover:border-line hover:bg-white/[0.04]",
      )}
    >
      {selected && (
        <span className="absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-white">
          <Check size={11} strokeWidth={3} />
        </span>
      )}
      <span className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-xl",
        selected ? "bg-white/15" : meta.iconBg,
      )}>
        <Icon size={20} className={cn(selected ? "text-white" : meta.iconColor)} />
      </span>
      <span className={cn("text-[13px] font-semibold", selected ? "text-white" : "text-fg")}>
        {REPORT_TYPE_LABEL[type]}
      </span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">
        {label}
      </label>
      {children}
    </div>
  );
}

function SegmentedItem({
  active, icon: Icon, label, onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
        active
          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_4px_14px_-6px_rgba(99,102,241,0.6)]"
          : "text-fg-muted hover:bg-white/[0.05] hover:text-fg",
      )}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function StatCard({
  icon: Icon, iconBg, iconColor, value, label,
}: {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line/60 bg-white/[0.02] px-3 py-3">
      <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", iconBg)}>
        <Icon size={16} className={iconColor} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-bold text-fg tabular-nums">{value}</div>
        <div className="truncate text-[10.5px] font-medium uppercase tracking-wider text-fg-dim">
          {label}
        </div>
      </div>
    </div>
  );
}

function MultiSelect({
  icon: Icon, placeholder, options, values, onChange,
}: {
  icon: LucideIcon;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  const clear = () => onChange([]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2 text-left"
      >
        <Icon size={14} className="text-fg-dim" />
        <div className="min-w-0 flex-1">
          {values.length === 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] text-fg">{placeholder}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); clear(); }}
                className="text-fg-dim"
                aria-hidden
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1">
              {values.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[11.5px] font-medium text-violet-100"
                >
                  {options.find((o) => o.value === v)?.label ?? v}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggle(v); }}
                    aria-label={`Șterge ${v}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronDown size={13} className="text-fg-dim" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-line bg-card shadow-2xl">
          {options.map((o) => {
            const checked = values.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] hover:bg-card-hover"
              >
                <span className={cn(
                  "inline-flex h-4 w-4 items-center justify-center rounded border",
                  checked ? "border-violet-500 bg-violet-500 text-white" : "border-line bg-transparent",
                )}>
                  {checked && <Check size={10} strokeWidth={3} />}
                </span>
                <span className="text-fg">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlatformMultiSelect({
  values, onChange,
}: {
  values: PlatformKey[];
  onChange: (v: PlatformKey[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (v: PlatformKey) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  const displayed = values.length > 0 ? values : ALL_PLATFORMS;
  const showingAll = values.length === 0;

  const CHIP_COLORS: Record<PlatformKey, string> = {
    bolt:  "bg-emerald-500/20 text-emerald-200",
    wolt:  "bg-sky-500/20 text-sky-200",
    glovo: "bg-orange-500/20 text-orange-200",
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2 text-left"
      >
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {displayed.map((p) => (
            <span
              key={p}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-semibold",
                CHIP_COLORS[p],
              )}
            >
              {PLATFORM_INFO[p].label}
              {!showingAll && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(p); }}
                  aria-label={`Șterge ${p}`}
                >
                  <X size={10} />
                </button>
              )}
            </span>
          ))}
        </div>
        <ChevronDown size={13} className="text-fg-dim" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-line bg-card shadow-2xl">
          {ALL_PLATFORMS.map((p) => {
            const checked = values.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => toggle(p)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] hover:bg-card-hover"
              >
                <span className={cn(
                  "inline-flex h-4 w-4 items-center justify-center rounded border",
                  checked ? "border-violet-500 bg-violet-500 text-white" : "border-line bg-transparent",
                )}>
                  {checked && <Check size={10} strokeWidth={3} />}
                </span>
                <span className="text-fg">{PLATFORM_INFO[p].label}</span>
              </button>
            );
          })}
          {values.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full border-t border-line/60 px-3 py-2 text-left text-[11.5px] text-fg-dim hover:bg-card-hover"
            >
              Reset — toate platformele
            </button>
          )}
        </div>
      )}
    </div>
  );
}
