"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AICopilotBanner } from "@/components/dashboard/AICopilotBanner";
import { DragonsCommunityBanner } from "@/components/dashboard/DragonsCommunityBanner";
import { AddCourierDialog } from "@/components/dashboard/dialogs/AddCourierDialog";
import { UploadDocumentDialog } from "@/components/dashboard/dialogs/UploadDocumentDialog";
import { EditCourierDialog } from "@/components/couriers/EditCourierDialog";
import { RecordPaymentDialog } from "@/components/dashboard/dialogs/RecordPaymentDialog";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useCouriers } from "@/lib/couriers/context";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import type { CourierStatus, VehicleType } from "@/lib/couriers/types";
import type { PlatformKey } from "@/lib/dashboard/types";
import { useSession } from "@/lib/rbac/session";
import {
  applyFilters, computeStats, countActiveAdvancedFilters,
  DEFAULT_ADVANCED_FILTERS, uniqueCities, uniqueSubcontractors,
  type AdvancedFilters, type QuickFilterKey,
} from "@/lib/couriers/filters";
import { CouriersHeader } from "@/components/couriers/CouriersHeader";
import { CouriersStatsRow } from "@/components/couriers/CouriersStatsRow";
import { CouriersToolbar } from "@/components/couriers/CouriersToolbar";
import { CouriersTable } from "@/components/couriers/CouriersTable";
import { CouriersPagination } from "@/components/couriers/CouriersPagination";
import { AdvancedFiltersDialog } from "@/components/couriers/AdvancedFiltersDialog";
import { ExportDialog } from "@/components/couriers/ExportDialog";
import { ImportCouriersDialog } from "@/components/couriers/ImportCouriersDialog";
import type { CourierRowAction } from "@/components/couriers/CourierRowMenu";

const PAGE_SIZE = 10;

export function CouriersPage() {
  const { user, activeFleetId } = useSession();
  const { allRows, hydrated, deleteCourier, updateCourier } = useCouriers();
  const toast = useToast();
  const router = useRouter();

  // Filter state
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>("all");
  const [statusFilter, setStatusFilter] = useState<CourierStatus | "any">("any");
  const [cityFilter, setCityFilter] = useState<string | "any">("any");
  const [platformFilter, setPlatformFilter] = useState<PlatformKey | "any">("any");
  const [vehicleFilter, setVehicleFilter] = useState<VehicleType | "any">("any");
  const [advanced, setAdvanced] = useState<AdvancedFilters>(DEFAULT_ADVANCED_FILTERS);
  const [page, setPage] = useState(1);

  // Dialog state
  const [showAdd, setShowAdd] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [uploadFor, setUploadFor] = useState<CourierRow | null>(null);
  const [editFor, setEditFor] = useState<CourierRow | null>(null);
  const [paymentFor, setPaymentFor] = useState<CourierRow | null>(null);

  const [now] = useState(() => Date.now());

  const stats = useMemo(() => computeStats(allRows, activeFleetId, now), [allRows, activeFleetId, now]);
  const cities = useMemo(() => uniqueCities(allRows, activeFleetId), [allRows, activeFleetId]);
  const subcontractors = useMemo(() => uniqueSubcontractors(allRows, activeFleetId), [allRows, activeFleetId]);

  const filtered = useMemo(
    () => applyFilters({
      rows: allRows, activeFleetId, search,
      statusFilter, cityFilter, platformFilter, vehicleFilter,
      quickFilter, advanced, now,
    }),
    [allRows, activeFleetId, search, statusFilter, cityFilter, platformFilter, vehicleFilter, quickFilter, advanced, now],
  );

  // Reset page when filters change
  const filterKey = `${search}|${quickFilter}|${statusFilter}|${cityFilter}|${platformFilter}|${vehicleFilter}|${activeFleetId}|${JSON.stringify(advanced)}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleRowClick = (row: CourierRow) => {
    router.push(`/curieri/${row.id}`);
  };

  const handleRowAction = (action: CourierRowAction, row: CourierRow) => {
    switch (action) {
      case "view":
        handleRowClick(row);
        break;
      case "edit":
        toast.info("Editare curier", `Editorul pentru ${row.fullName} vine în roadmap.`);
        break;
      case "upload_doc":
        setUploadFor(row);
        break;
      case "create_activation":
        toast.info("Creează activare", `Fluxul de activare pentru ${row.fullName} vine în roadmap.`);
        break;
      case "record_payment":
        setPaymentFor(row);
        break;
      case "create_task":
        toast.success("Task creat", `Task nou pentru ${row.fullName}.`);
        break;
      case "mark_issue":
        toast.info("Problemă marcată", `Am creat o problemă deschisă pentru ${row.fullName}.`);
        break;
      case "suspend":
        toast.success("Curier suspendat", `${row.fullName} suspendat. Audit Log: TODO(real-users).`);
        break;
      case "reactivate":
        toast.success("Curier reactivat", `${row.fullName} este din nou activ. Audit Log: TODO(real-users).`);
        break;
      case "archive":
        toast.success("Curier arhivat", `${row.fullName} mutat în arhivă. Audit Log: TODO(real-users).`);
        break;
    }
  };

  const handleQuickSelect = (key: QuickFilterKey) => {
    setQuickFilter(key);
  };

  return (
    <div className="mx-auto w-full max-w-[1520px] px-5 pt-5 pb-4 md:px-6 md:pt-6">
      <div className="space-y-5">
          <CouriersHeader onAddCourier={() => setShowAdd(true)} />

          <CouriersStatsRow
            active={stats.active}
            bolt={stats.bolt}
            wolt={stats.wolt}
            glovo={stats.glovo}
            openIssues={stats.openIssues}
            activeFilter={quickFilter}
            onSelect={handleQuickSelect}
          />

          <Card>
            <CardHeader>
              <CardTitle>Lista curierilor</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <CouriersToolbar
                search={search}
                onSearchChange={setSearch}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                cityFilter={cityFilter}
                onCityChange={setCityFilter}
                platformFilter={platformFilter}
                onPlatformChange={setPlatformFilter}
                vehicleFilter={vehicleFilter}
                onVehicleChange={setVehicleFilter}
                cities={cities}
                resultsCount={filtered.length}
                activeAdvancedCount={countActiveAdvancedFilters(advanced)}
                onOpenFilters={() => setShowAdvancedFilters(true)}
                onOpenExport={() => setShowExport(true)}
              />
              <CouriersTable
                rows={pageRows}
                totalMatching={filtered.length}
                onRowClick={handleRowClick}
                onRowAction={handleRowAction}
                onRowEdit={(row) => setEditFor(row)}
                onRowToggleStatus={(row) => {
                  const next = row.status === "active" ? "paused" : "active";
                  updateCourier(row.id, { status: next });
                  toast.success(next === "active" ? "Curier reactivat" : "Curier dezactivat", row.fullName);
                }}
                onRowDelete={(row) => {
                  deleteCourier(row.id);
                  toast.success("Curier șters", row.fullName);
                }}
                loading={!hydrated}
              />
              {filtered.length > 0 && (
                <CouriersPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={PAGE_SIZE}
                  totalRows={filtered.length}
                  onPageChange={setPage}
                />
              )}
            </CardBody>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <AICopilotBanner />
            <DragonsCommunityBanner />
          </div>
      </div>

      {/* Dialogs */}
      <AddCourierDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(c) => toast.success("Curier adăugat", `${c.fullName} a fost creat.`)}
      />
      <AdvancedFiltersDialog
        open={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        current={advanced}
        cities={cities}
        subcontractors={subcontractors}
        onApply={setAdvanced}
      />
      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        rows={filtered}
        fleetName={user.activeTenant.name}
      />
      <ImportCouriersDialog
        open={showImport}
        onClose={() => setShowImport(false)}
      />
      {uploadFor && (
        <UploadDocumentDialog
          open={true}
          onClose={() => setUploadFor(null)}
          prefillSubjectId={uploadFor.id}
        />
      )}
      {editFor && (
        <EditCourierDialog
          row={editFor}
          onClose={() => setEditFor(null)}
        />
      )}
      {paymentFor && (
        <RecordPaymentDialog
          open={true}
          onClose={() => setPaymentFor(null)}
        />
      )}
    </div>
  );
}
