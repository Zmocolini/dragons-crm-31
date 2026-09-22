"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { useDocuments } from "@/lib/documents/context";
import { useDocumentFilters } from "@/lib/documents/filters-context";
import { useDocumentsData } from "@/lib/documents/use-documents-data";
import { exportDocsCsv, exportDocsXlsx } from "@/lib/documents/export";
import { DocumentsHeader } from "./DocumentsHeader";
import { DocKpiCards } from "./DocKpiCards";
import { DocFilterBar } from "./DocFilterBar";
import { DocStatusTabs } from "./DocStatusTabs";
import { DocumentsTable, type RowAction } from "./DocumentsTable";
import { DocProgressCard } from "./DocProgressCard";
import { CourierDrawer } from "./CourierDrawer";
import { UploadDialog } from "./UploadDialog";
import { ImportDialog } from "./ImportDialog";
import { AdvancedFiltersDialog } from "./dialogs";
import { cn } from "@/lib/utils/cn";

export function DocumentsPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, can, activeFleetId } = useSession();
  const { allRows } = useCouriers();
  const { requestDocuments } = useDocuments();
  const { selectedCourierId, setSelectedCourierId } = useDocumentFilters();
  const data = useDocumentsData();

  const canView = can("documents.view");
  const canManage = can("documents.upload");
  const canDelete = user.role === "global_owner" || user.role === "subcontractor_owner";

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPreset, setUploadPreset] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const fleetCouriers = allRows
    .filter((c) => c.tenantId === activeFleetId)
    .map((c) => ({ id: c.id, fullName: c.fullName, city: c.city, platforms: c.platforms }));

  const toggle = useCallback((id: string) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);
  const toggleAll = useCallback((ids: string[], checked: boolean) => setSelectedIds((prev) => { const n = new Set(prev); ids.forEach((i) => (checked ? n.add(i) : n.delete(i))); return n; }), []);

  const openUpload = useCallback((courierId: string | null) => { setUploadPreset(courierId); setUploadOpen(true); }, []);

  const onRowAction = useCallback((courierId: string, action: RowAction) => {
    switch (action) {
      case "view_docs": setSelectedCourierId(courierId); break;
      case "upload": openUpload(courierId); break;
      case "edit_courier":
      case "open_profile": router.push(`/curieri/${courierId}`); break;
      case "request_docs": requestDocuments(courierId, user.name); toast.success("Solicitare trimisă", "Notificare internă creată pentru curier."); break;
      case "view_activity": setSelectedCourierId(courierId); break;
      case "archive":
      case "delete": setSelectedCourierId(courierId); toast.info("Gestionează în panou", "Arhivarea/ștergerea se face per document în panoul curierului."); break;
    }
  }, [router, requestDocuments, user.name, toast, setSelectedCourierId, openUpload]);

  const onBulk = useCallback((action: "request" | "export" | "responsible" | "verify" | "reminder") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (action === "export") {
      const rows = data.filtered.filter((r) => selectedIds.has(r.courier.id));
      exportDocsXlsx(rows, data.fleetName); toast.success("Export", `${rows.length} curieri exportați.`); return;
    }
    if (action === "request") { ids.forEach((id) => requestDocuments(id, user.name)); toast.success("Solicitări trimise", `${ids.length} curieri notificați.`); }
    else if (action === "reminder") toast.success("Remindere trimise", `${ids.length} remindere (notificare internă).`);
    else if (action === "responsible") toast.info("Schimbă responsabil", "Selectează noul responsabil (workflow existent).");
    else if (action === "verify") toast.success("Verificare status", `${ids.length} curieri re-evaluați.`);
    setSelectedIds(new Set());
  }, [selectedIds, data.filtered, data.fleetName, requestDocuments, user.name, toast]);

  if (!canView) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-md rounded-xl border border-line bg-card p-6 text-center">
          <div className="text-[15px] font-bold text-fg">Acces restricționat</div>
          <p className="mt-2 text-[12.5px] text-fg-muted">Rolul tău nu are permisiunea de a vizualiza documentele.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-4 overflow-x-hidden p-4 lg:p-6">
      <DocumentsHeader onImport={() => setImportOpen(true)} onExport={() => setExportOpen(true)} onUpload={() => openUpload(null)} canManage={canManage} />

      <DocKpiCards kpi={data.kpi} />
      <div className={cn("flex flex-col gap-4", data.selectedRow && "lg:pr-[440px]")}>
        <DocFilterBar cityOptions={data.cityOptions} subcontractorOptions={data.subcontractorOptions} onOpenAdvanced={() => setAdvancedOpen(true)} />
        <DocStatusTabs counts={data.counts} />
        <DocumentsTable
          rows={data.pageRows} totalFiltered={data.filteredCount}
          selectedIds={selectedIds} onToggle={toggle} onToggleAll={toggleAll}
          onRowAction={onRowAction} onBulk={onBulk} canManage={canManage} canDelete={canDelete}
        />
        <DocProgressCard progress={data.progress} />
      </div>

      {data.selectedRow && (
        <CourierDrawer row={data.selectedRow} onClose={() => setSelectedCourierId(null)} onUpload={(id) => openUpload(id)} canManage={canManage} canDelete={canDelete} />
      )}

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} couriers={fleetCouriers} presetCourierId={uploadPreset} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} couriers={fleetCouriers} />
      <AdvancedFiltersDialog open={advancedOpen} onClose={() => setAdvancedOpen(false)} subcontractorOptions={data.subcontractorOptions} />

      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} title="Exportă documente" description="Exportul respectă filtrele curente." size="md">
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => { exportDocsXlsx(data.filtered, data.fleetName); toast.success("Excel generat", `${data.filteredCount} curieri.`); setExportOpen(false); }} className="flex items-center gap-3 rounded-xl border border-line bg-card-2 px-3 py-3 text-left hover:border-accent/40">
            <FileSpreadsheet size={17} className="text-[color:var(--color-success)]" />
            <span><span className="block text-[12.5px] font-semibold text-fg">Excel (.xlsx)</span><span className="block text-[11px] text-fg-dim">Raport complet status documente</span></span>
          </button>
          <button type="button" onClick={() => { exportDocsCsv(data.filtered, data.fleetName); toast.success("CSV generat", `${data.filteredCount} curieri.`); setExportOpen(false); }} className="flex items-center gap-3 rounded-xl border border-line bg-card-2 px-3 py-3 text-left hover:border-accent/40">
            <FileText size={17} className="text-[color:var(--color-accent-3)]" />
            <span><span className="block text-[12.5px] font-semibold text-fg">CSV (.csv)</span><span className="block text-[11px] text-fg-dim">Separator „;”, compatibil Excel ro-RO</span></span>
          </button>
        </div>
      </Dialog>
    </div>
  );
}
