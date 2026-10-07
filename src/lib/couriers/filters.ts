import type { PlatformKey } from "@/lib/dashboard/types";
import type { CourierRow, DocumentsState } from "./mock-seed";
import { documentsStateOf } from "./mock-seed";
import type { CourierStatus, VehicleType } from "./types";

export type QuickFilterKey =
  | "all"
  | "status_active"
  | "status_in_activation"
  | "waiting"
  | "docs_missing"
  | "open_issues"
  | "activation_blocked"
  | "no_activity_7d"
  | "pending_payment"
  | "platform_bolt"
  | "platform_wolt"
  | "platform_glovo";

export const QUICK_FILTER_LABEL: Record<QuickFilterKey, string> = {
  all:                  "Toți curierii",
  status_active:        "Activi",
  status_in_activation: "În activare",
  waiting:              "În așteptare",
  docs_missing:         "Documente lipsă",
  open_issues:          "Probleme deschise",
  activation_blocked:   "Activări blocate",
  no_activity_7d:       "Fără activitate 7 zile",
  pending_payment:      "Plăți în așteptare",
  platform_bolt:        "Curieri Bolt",
  platform_wolt:        "Curieri Wolt",
  platform_glovo:       "Curieri Glovo",
};

export type AdvancedFilters = {
  status: CourierStatus | "any";
  city: string | "any";
  platform: PlatformKey | "any";
  vehicle: VehicleType | "any";
  documents: DocumentsState | "any";
  activation: "any" | "blocked" | "in_progress" | "completed";
  subcontractor: string | "any";
  addedRange: "any" | "7d" | "30d" | "90d";
  hasIssue: "any" | "yes" | "no";
  hasPendingPayment: "any" | "yes" | "no";
};

export const DEFAULT_ADVANCED_FILTERS: AdvancedFilters = {
  status: "any",
  city: "any",
  platform: "any",
  vehicle: "any",
  documents: "any",
  activation: "any",
  subcontractor: "any",
  addedRange: "any",
  hasIssue: "any",
  hasPendingPayment: "any",
};

export function isAdvancedFilterActive(f: AdvancedFilters): boolean {
  return Object.values(f).some((v) => v !== "any");
}

export function countActiveAdvancedFilters(f: AdvancedFilters): number {
  return Object.values(f).filter((v) => v !== "any").length;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Curier care așteaptă loc pe cel puțin o platformă (poate fi activ pe alta). */
export function isWaiting(row: Pick<CourierRow, "waitlistedPlatforms">): boolean {
  return (row.waitlistedPlatforms?.length ?? 0) > 0;
}

function matchesQuickFilter(row: CourierRow, key: QuickFilterKey, now: number): boolean {
  switch (key) {
    case "all": return true;
    case "status_active": return row.status === "active";
    case "status_in_activation": return row.status === "in_activation";
    case "waiting": return isWaiting(row);
    case "docs_missing": return row.documentsMissingCount > 0 || row.documentsExpiredCount > 0;
    case "open_issues": return row.hasOpenIssue;
    case "activation_blocked": return row.hasBlockedActivation;
    case "no_activity_7d":
      return now - new Date(row.lastActivityIso).getTime() >= 7 * DAY_MS;
    case "pending_payment": return row.hasPendingPayment;
    case "platform_bolt":   return row.platforms.includes("bolt");
    case "platform_wolt":   return row.platforms.includes("wolt");
    case "platform_glovo":  return row.platforms.includes("glovo");
  }
}

function matchesAdvanced(row: CourierRow, f: AdvancedFilters, now: number): boolean {
  if (f.status !== "any" && row.status !== f.status) return false;
  if (f.city !== "any" && row.city !== f.city) return false;
  if (f.platform !== "any" && !row.platforms.includes(f.platform)) return false;
  if (f.vehicle !== "any" && row.vehicleType !== f.vehicle) return false;
  if (f.documents !== "any" && documentsStateOf(row) !== f.documents) return false;

  if (f.activation !== "any") {
    if (f.activation === "blocked" && !row.hasBlockedActivation) return false;
    if (f.activation === "in_progress" && row.status !== "in_activation") return false;
    if (f.activation === "completed" && row.status !== "active") return false;
  }

  if (f.subcontractor !== "any") {
    if (f.subcontractor === "__none__") {
      if (row.subcontractorName != null) return false;
    } else if (row.subcontractorName !== f.subcontractor) return false;
  }

  if (f.addedRange !== "any") {
    const days = f.addedRange === "7d" ? 7 : f.addedRange === "30d" ? 30 : 90;
    if (now - new Date(row.createdAtIso).getTime() > days * DAY_MS) return false;
  }

  if (f.hasIssue === "yes" && !row.hasOpenIssue) return false;
  if (f.hasIssue === "no" && row.hasOpenIssue) return false;

  if (f.hasPendingPayment === "yes" && !row.hasPendingPayment) return false;
  if (f.hasPendingPayment === "no" && row.hasPendingPayment) return false;

  return true;
}

function matchesSearch(row: CourierRow, needle: string): boolean {
  if (!needle) return true;
  const q = needle.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    row.fullName,
    row.phone,
    row.email ?? "",
    row.city,
    ...row.platforms,
  ].join(" ").toLowerCase();
  return hay.includes(q);
}

export type CouriersFilterInput = {
  rows: CourierRow[];
  activeFleetId: string;
  search: string;
  statusFilter: CourierStatus | "any";
  cityFilter: string | "any";
  platformFilter: PlatformKey | "any";
  vehicleFilter: VehicleType | "any";
  quickFilter: QuickFilterKey;
  advanced: AdvancedFilters;
  now: number;
};

export function applyFilters(input: CouriersFilterInput): CourierRow[] {
  return input.rows.filter((row) => {
    if (row.tenantId !== input.activeFleetId) return false;
    if (input.statusFilter !== "any" && row.status !== input.statusFilter) return false;
    if (input.cityFilter !== "any" && row.city !== input.cityFilter) return false;
    if (input.platformFilter !== "any") {
      // Pe segmentul „În așteptare", platforma înseamnă platforma pe care așteaptă.
      const onPlatform = input.quickFilter === "waiting" ? row.waitlistedPlatforms ?? [] : row.platforms;
      if (!onPlatform.includes(input.platformFilter)) return false;
    }
    if (input.vehicleFilter !== "any" && row.vehicleType !== input.vehicleFilter) return false;
    if (!matchesQuickFilter(row, input.quickFilter, input.now)) return false;
    if (!matchesAdvanced(row, input.advanced, input.now)) return false;
    if (!matchesSearch(row, input.search)) return false;
    return true;
  });
}

export type CouriersStats = {
  total: number;
  active: number;
  paused: number;
  stopped: number;
  waiting: number;
  inActivation: number;
  documentsMissing: number;
  openIssues: number;
  activationBlocked: number;
  noActivity7d: number;
  pendingPayment: number;
  bolt: number;
  wolt: number;
  glovo: number;
};

export function computeStats(rows: CourierRow[], activeFleetId: string, now: number): CouriersStats {
  let total = 0, paused = 0, stopped = 0, waiting = 0;
  let active = 0, inActivation = 0, documentsMissing = 0, openIssues = 0;
  let activationBlocked = 0, noActivity7d = 0, pendingPayment = 0;
  let bolt = 0, wolt = 0, glovo = 0;
  for (const row of rows) {
    if (row.tenantId !== activeFleetId) continue;
    total++;
    if (row.status === "paused") paused++;
    if (row.status === "stopped") stopped++;
    if (isWaiting(row)) waiting++;
    if (row.status === "active") active++;
    if (row.status === "in_activation") inActivation++;
    if (row.documentsMissingCount > 0 || row.documentsExpiredCount > 0) documentsMissing++;
    if (row.hasOpenIssue) openIssues++;
    if (row.hasBlockedActivation) activationBlocked++;
    if (now - new Date(row.lastActivityIso).getTime() >= 7 * DAY_MS) noActivity7d++;
    if (row.hasPendingPayment) pendingPayment++;
    if (row.platforms.includes("bolt"))  bolt++;
    if (row.platforms.includes("wolt"))  wolt++;
    if (row.platforms.includes("glovo")) glovo++;
  }
  return { total, active, paused, stopped, waiting, inActivation, documentsMissing, openIssues, activationBlocked, noActivity7d, pendingPayment, bolt, wolt, glovo };
}

export function uniqueCities(rows: CourierRow[], activeFleetId: string): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.tenantId === activeFleetId) set.add(r.city);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ro"));
}

export function uniqueSubcontractors(rows: CourierRow[], activeFleetId: string): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.tenantId === activeFleetId && r.subcontractorName) set.add(r.subcontractorName);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ro"));
}

/** Câți curieri așteaptă pe fiecare platformă (un curier poate conta pe mai multe). */
export function waitingByPlatform(rows: CourierRow[], activeFleetId: string): Record<PlatformKey, number> {
  const counts: Record<PlatformKey, number> = { bolt: 0, wolt: 0, glovo: 0 };
  for (const r of rows) {
    if (r.tenantId !== activeFleetId) continue;
    for (const p of r.waitlistedPlatforms ?? []) counts[p]++;
  }
  return counts;
}
