import type { PlatformKey } from "@/lib/dashboard/types";

// TODO(real-users): server actions `previewReport(filters)` + `generateReport(filters, format)`
// cu authorize(role, "reports.view") + filtrare pe tenantId + fleetId server-side.
// Momentan totul e derivat client-side din contexts.

export type ReportType =
  | "couriers"
  | "activations"
  | "documents"
  | "payments"
  | "issues";

export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  couriers:    "Curieri",
  activations: "Activări",
  documents:   "Documente",
  payments:    "Plăți",
  issues:      "Probleme",
};

export type ReportFormat = "excel" | "pdf" | "csv";
export const REPORT_FORMAT_LABEL: Record<ReportFormat, string> = {
  excel: "Excel",
  pdf:   "PDF",
  csv:   "CSV",
};

export type ReportFilters = {
  type: ReportType;
  periodStartIso: string;
  periodEndIso: string;
  fleetId: string;
  cities: string[];      // empty = toate
  platforms: PlatformKey[]; // empty = toate
  status: string;        // "all" implicit
  format: ReportFormat;
};

export type ReportPreviewRow = {
  id: string;
  name: string;
  city: string | null;
  platform: PlatformKey | null;
  status: string;
  value: string; // pre-formatat pentru display
};

export type ReportPreviewStats = {
  activeCouriers: number;
  completedActivations: number;
  missingDocuments: number;
  totalRevenueRon: number;
};

export type ReportRecord = {
  id: string;
  createdAtIso: string;
  createdBy: string;
  tenantId: string;
  fleetId: string;
  filters: ReportFilters;
  rowsCount: number;
  format: ReportFormat;
};
