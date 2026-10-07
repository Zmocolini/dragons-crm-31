"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { AICopilotBanner } from "@/components/dashboard/AICopilotBanner";
import { DragonsCommunityBanner } from "@/components/dashboard/DragonsCommunityBanner";
import { AddCourierDialog } from "@/components/dashboard/dialogs/AddCourierDialog";
import { UploadDocumentDialog } from "@/components/dashboard/dialogs/UploadDocumentDialog";
import { EditCourierDialog } from "@/components/couriers/EditCourierDialog";
import { RecordPaymentDialog } from "@/components/dashboard/dialogs/RecordPaymentDialog";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useCouriers } from "@/lib/couriers/context";
import { courierOwner, useAccountDirectory } from "@/lib/couriers/use-account-directory";
import { useOwnerScope } from "@/lib/owner-scope/context";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import type { CourierStatus, VehicleType } from "@/lib/couriers/types";
import type { PlatformKey } from "@/lib/dashboard/types";
import { useSession } from "@/lib/rbac/session";
import {
  applyFilters, computeStats, countActiveAdvancedFilters,
  DEFAULT_ADVANCED_FILTERS, uniqueCities, uniqueSubcontractors, waitingByPlatform,
  type AdvancedFilters, type QuickFilterKey,
} from "@/lib/couriers/filters";
import { CouriersHeader } from "@/components/couriers/CouriersHeader";
import { CouriersStatsRow } from "@/components/couriers/CouriersStatsRow";
import { CouriersToolbar } from "@/components/couriers/CouriersToolbar";
import { CouriersTable } from "@/components/couriers/CouriersTable";
import { CouriersSegments, type CourierSegment } from "@/components/couriers/CouriersSegments";
import { CouriersWaitingPanel, PLATFORM_NAME } from "@/components/couriers/CouriersWaitingPanel";
import { CouriersPagination } from "@/components/couriers/CouriersPagination";
import { AdvancedFiltersDialog } from "@/components/couriers/AdvancedFiltersDialog";
import { ExportDialog } from "@/components/couriers/ExportDialog";
import { ImportCouriersDialog } from "@/components/couriers/ImportCouriersDialog";
import type { CourierRowAction } from "@/components/couriers/CourierRowMenu";

const PAGE_SIZE = 10;

export function CouriersPage({ initialSegment = "all", initialSub = null }: { initialSegment?: CourierSegment; initialSub?: string | null }) {
  const { user, activeFleetId } = useSession();
  const { allRows: allCourierRows, hydrated, deleteCourier, updateCourier } = useCouriers();
  const { scope } = useOwnerScope();
  const accounts = useAccountDirectory();
  // Venit din pagina Subcontractori: doar curierii creați de contul acelui subcontractor.
  const [subEmail, setSubEmail] = useState<string | null>(initialSub?.toLowerCase() ?? null);
  const allRows = useMemo(
    () => (subEmail ? allCourierRows.filter((c) => (c.createdBy ?? "").toLowerCase() === subEmail) : allCourierRows),
    [allCourierRows, subEmail],
  );
  const toast = useToast();
  const router = useRouter();

  // Filter state
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>(initialSegment === "waiting" ? "waiting" : "all");
  const [statusFilter, setStatusFilter] = useState<CourierStatus | "any">(
    initialSegment === "active" || initialSegment === "paused" || initialSegment === "stopped" ? initialSegment : "any",
  );
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
  const waitingCounts = useMemo(() => waitingByPlatform(allRows, activeFleetId), [allRows, activeFleetId]);
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

  // Segmentul e o vedere peste aceleași filtre (statusFilter / quickFilter), nu o stare separată.
  const segment: CourierSegment =
    quickFilter === "waiting" ? "waiting"
    : quickFilter === "status_active" || statusFilter === "active" ? "active"
    : statusFilter === "paused" ? "paused"
    : statusFilter === "stopped" ? "stopped"
    : "all";

  const handleSegment = (next: CourierSegment) => {
    setPlatformFilter("any"); // „platformă" înseamnă altceva pe În așteptare (unde așteaptă, nu unde e activ)
    if (next === "waiting") {
      setQuickFilter("waiting");
      setStatusFilter("any");
      return;
    }
    setQuickFilter("all");
    setStatusFilter(next === "all" ? "any" : next);
  };

  const activateOn = (row: CourierRow, platform: PlatformKey) => {
    const nextWaitlist = (row.waitlistedPlatforms ?? []).filter((p) => p !== platform);
    const nextPlatforms = row.platforms.includes(platform) ? row.platforms : [...row.platforms, platform];
    updateCourier(row.id, { platforms: nextPlatforms, waitlistedPlatforms: nextWaitlist });
    toast.success(`Activat pe ${PLATFORM_NAME[platform]}`, `${row.fullName} este acum activ și pe ${PLATFORM_NAME[platform]}.`);
  };

  const removeFromWaitlist = (row: CourierRow, platform: PlatformKey) => {
    const nextWaitlist = (row.waitlistedPlatforms ?? []).filter((p) => p !== platform);
    updateCourier(row.id, { waitlistedPlatforms: nextWaitlist });
    toast.info("Scos din așteptare", `${row.fullName} nu mai așteaptă ${PLATFORM_NAME[platform]}.`);
  };

  // Coloana Subcontractor doar în vederea Global Owner pe toate flotele; harta de conturi vine async.
  const showOwner = user.role === "global_owner" && !scope && accounts.size > 0;
  const segmentCounts: Record<CourierSegment, number> = {
    all: stats.total, active: stats.active, waiting: stats.waiting, paused: stats.paused, stopped: stats.stopped,
  };

  return (
    <div className="mx-auto w-full max-w-[1520px] px-5 pt-5 pb-4 md:px-6 md:pt-6">
      <div className="space-y-5">
          <CouriersHeader onAddCourier={() => setShowAdd(true)} />

          <CouriersSegments value={segment} counts={segmentCounts} onChange={handleSegment} />

          {subEmail && (
            <button
              type="button"
              onClick={() => setSubEmail(null)}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-[12px] font-semibold text-violet-100 hover:bg-violet-500/20"
            >
              Subcontractor: {accounts.get(subEmail)?.name ?? subEmail}
              <X size={12} aria-hidden />
              <span className="sr-only">Scoate filtrul de subcontractor</span>
            </button>
          )}

          {segment === "waiting" && (
            <CouriersWaitingPanel counts={waitingCounts} selected={platformFilter} onSelect={setPlatformFilter} />
          )}

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
              <CardTitle>{segment === "waiting" ? "Lista de așteptare" : "Lista curierilor"}</CardTitle>
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
                waitingMode={segment === "waiting"}
                onActivateWaiting={activateOn}
                onRemoveWaiting={removeFromWaitlist}
                ownerLabel={showOwner ? (row) => courierOwner(row, accounts).label : undefined}
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
