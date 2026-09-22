import type { Courier, VehicleType } from "./types";

/**
 * Fields derived per-row for the couriers list; NOT persisted via addCourier.
 * Real backend will compute these from joined tables (documents, issues, payments, activity_log).
 */
export type CourierRow = Courier & {
  avatarUrl: string | null;
  vehicleModel: string;
  lastActivityIso: string;
  documentsMissingCount: number;
  documentsExpiredCount: number;
  hasOpenIssue: boolean;
  hasPendingPayment: boolean;
  hasBlockedActivation: boolean;
  subcontractorName: string | null;
};

export type DocumentsState = "complete" | "missing" | "expired";

export function documentsStateOf(row: Pick<CourierRow, "documentsMissingCount" | "documentsExpiredCount">): DocumentsState {
  if (row.documentsExpiredCount > 0) return "expired";
  if (row.documentsMissingCount > 0) return "missing";
  return "complete";
}

const VEHICLE_MODELS_BY_TYPE: Record<VehicleType, string[]> = {
  bike:    ["Bicicletă"],
  e_bike:  ["E-Bike"],
  scooter: ["Scuter"],
  car:     ["Auto"],
};

export function vehicleModelFor(type: VehicleType, seed: number): string {
  const opts = VEHICLE_MODELS_BY_TYPE[type];
  return opts[seed % opts.length];
}

// TODO(real-users): înlocuiește cu SELECT * FROM couriers WHERE tenant_id = $1
// join documents/issues/payments/activity_log agregat.
export const SEED_COURIERS: CourierRow[] = [];
