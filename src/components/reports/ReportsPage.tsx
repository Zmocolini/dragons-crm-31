"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useReportFilters } from "@/lib/reports/filters-context";
import { useReportData } from "@/lib/reports/use-report-data";
import {
  REPORT_TYPE_LABEL, type DistributionMetric, type ReportFilterState, type CourierPerfRow,
} from "@/lib/reports/analytics";
import type { CourierPayState } from "@/lib/reports/facts";
import { exportReportCsv, exportReportPdf, exportReportXlsx, reportFileBase } from "@/lib/reports/report-export";
import { ReportsHeader } from "./ReportsHeader";
import { ReportsKpiCards } from "./ReportsKpiCards";
import { ReportsTabs, type ReportTab } from "./ReportsTabs";
import { ReportsFilterPanel, type QuickReportKey } from "./ReportsFilterPanel";
import { OverviewTab } from "./OverviewTab";
import { CitiesTab, CommissionsTab, CouriersTab, PaymentsStatusTab, PlatformsTab } from "./tabs";
import { SavedReportsDialog, NewReportDialog, ExportReportDialog } from "./dialogs";
import type { ReportTypeKey } from "@/lib/reports/analytics";

const TYPE_TO_TAB: Record<ReportTypeKey, ReportTab> = {
  revenue_payments: "overview",
  courier_performance: "couriers",
  city_performance: "cities",
  platform_performance: "platforms",
  commissions: "commissions",
  payments_status: "payments",
};

const GENERATED_AT_LABEL = "10 Sep 2026, 12:00"; // domeniul mock nu folosește Date.now pentru determinism

export function ReportsPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, can } = useSession();
  const { filters, patch, reset } = useReportFilters();

  const [metric, setMetric] = useState<DistributionMetric>("gross");
  const data = useReportData(metric);

  const [tab, setTab] = useState<ReportTab>("overview");
  const [payState, setPayState] = useState<CourierPayState | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);

  const canManage = user.role !== "viewer";
  const meta = { fleetName: data.fleetName, generatedBy: data.generatedBy, generatedAtLabel: GENERATED_AT_LABEL };

  // ── Export ─────────────────────────────────────────────────────────────────
  const runExport = useCallback((format: "excel" | "csv" | "pdf") => {
    try {
      if (format === "excel") { exportReportXlsx(data.bundle, filters, meta); toast.success("Excel generat", `${reportFileBase(meta.fleetName, filters)}.xlsx descărcat.`); }
      else if (format === "csv") { exportReportCsv(data.bundle, filters, meta); toast.success("CSV generat", `${reportFileBase(meta.fleetName, filters)}.csv descărcat.`); }
      else { exportReportPdf(data.bundle, filters, meta); toast.success("PDF pregătit", "S-a deschis fereastra de print."); }
    } catch (e) {
      toast.error("Export eșuat", e instanceof Error ? e.message : "Eroare necunoscută.");
    }
  }, [data.bundle, filters, meta, toast]);

  const onExportExcel = useCallback(() => runExport("excel"), [runExport]);

  // ── Generează raport ─────────────────────────────────────────────────────────
  const onGenerate = useCallback((name?: string) => {
    setTab(TYPE_TO_TAB[filters.reportType]);
    setPayState(null);
    toast.success("Raport generat", `${name?.trim() ? `„${name.trim()}" · ` : ""}${REPORT_TYPE_LABEL[filters.reportType]} · ${data.kpi.totalOrders} comenzi.`);
  }, [filters.reportType, data.kpi.totalOrders, toast]);

  // ── Rapoarte rapide ───────────────────────────────────────────────────────────
  const onQuick = useCallback((key: QuickReportKey) => {
    const apply = (p: Partial<ReportFilterState>, t: ReportTab) => { patch(p); setTab(t); };
    switch (key) {
      case "weekly_full": reset(); setTab("overview"); setPayState(null); toast.success("Raport săptămânal", "Filtre resetate la săptămâna de referință."); break;
      case "by_city": apply({ reportType: "city_performance" }, "cities"); break;
      case "commissions": apply({ reportType: "commissions" }, "commissions"); break;
      case "unpaid": apply({ reportType: "payments_status", courierStatus: "active" }, "payments"); setPayState("unpaid"); toast.success("Curieri neplătiți", "Filtrat pe status plată = neplătit."); break;
      case "top_performers": apply({ reportType: "courier_performance" }, "couriers"); toast.success("Top performeri", "Curieri sortați după venit brut."); break;
      case "accounting": apply({ reportType: "revenue_payments" }, "overview"); setExportOpen(true); break;
    }
  }, [patch, reset, toast]);

  // ── Deschide curier ───────────────────────────────────────────────────────────
  const onOpenCourier = useCallback((row: CourierPerfRow) => {
    if (row.isReal) router.push(`/curieri/${row.id}`);
    else toast.info("Curier agregat", `${row.name} este un curier din agregările de flotă. Profilul individual e disponibil doar pentru curierii înregistrați.`);
  }, [router, toast]);

  const onSelectPayState = useCallback((s: CourierPayState) => {
    setPayState((prev) => (prev === s ? null : s));
    setTab("payments");
  }, []);

  if (!can("reports.view")) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-md rounded-xl border border-line bg-card p-6 text-center">
          <div className="text-[15px] font-bold text-fg">Acces restricționat</div>
          <p className="mt-2 text-[12.5px] text-fg-muted">Rolul tău nu are permisiunea de a vizualiza rapoartele.</p>
        </div>
      </div>
    );
  }

  const panel = (
    <ReportsFilterPanel
      cityOptions={data.cityOptions}
      subcontractorOptions={data.subcontractorOptions}
      onGenerate={() => onGenerate()}
      onQuick={onQuick}
      canManage={canManage}
    />
  );

  return (
    <div className="flex min-h-full flex-col gap-4 overflow-x-hidden p-4 lg:p-6">
      <ReportsHeader
        onOpenSaved={() => setSavedOpen(true)}
        onOpenExport={() => setExportOpen(true)}
        onNewReport={() => setNewOpen(true)}
        canManage={canManage}
      />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <ReportsKpiCards kpi={data.kpi} />
          <ReportsTabs active={tab} onChange={(t) => setTab(t)} />

          {tab === "overview" && (
            <OverviewTab
              data={data}
              metric={metric}
              onMetricChange={setMetric}
              onSeeCities={() => setTab("cities")}
              onSeeCouriers={() => setTab("couriers")}
              onSelectPayState={onSelectPayState}
              selectedPayState={payState}
              onOpenCourier={onOpenCourier}
              onExportExcel={onExportExcel}
            />
          )}
          {tab === "couriers" && <CouriersTab data={data} onOpenCourier={onOpenCourier} payStateFilter={payState} />}
          {tab === "cities" && <CitiesTab data={data} />}
          {tab === "platforms" && <PlatformsTab data={data} />}
          {tab === "payments" && <PaymentsStatusTab data={data} selected={payState} onSelect={setPayState} onOpenCourier={onOpenCourier} />}
          {tab === "commissions" && <CommissionsTab data={data} />}
        </div>

        <aside className="sticky top-4 hidden xl:block">{panel}</aside>
      </div>

      {/* FAB filtre pe ecrane mici */}
      <button
        type="button"
        onClick={() => setMobileFilters(true)}
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-[13px] font-semibold text-white shadow-2xl xl:hidden"
      >
        <SlidersHorizontal size={16} /> Filtre
      </button>
      <Dialog open={mobileFilters} onClose={() => setMobileFilters(false)} title="Filtre raport" size="lg">
        {panel}
      </Dialog>

      {/* Dialoguri header */}
      <SavedReportsDialog open={savedOpen} onClose={() => setSavedOpen(false)} onApply={(f) => { patch(f); setTab(TYPE_TO_TAB[f.reportType]); }} canManage={canManage} />
      <NewReportDialog open={newOpen} onClose={() => setNewOpen(false)} onGenerate={(name) => onGenerate(name)} />
      <ExportReportDialog open={exportOpen} onClose={() => setExportOpen(false)} onExport={runExport} fileBase={reportFileBase(meta.fleetName, filters)} />
    </div>
  );
}
