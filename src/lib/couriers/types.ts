import type { PlatformKey } from "@/lib/dashboard/types";
import type { Nationality } from "@/lib/candidates/types";

export type VehicleType = "bike" | "e_bike" | "scooter" | "car";
export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  bike:     "Bicicletă",
  e_bike:   "Bicicletă electrică",
  scooter:  "Scuter",
  car:      "Mașină",
};

export type VehicleOwnership = "own" | "rented";
export const VEHICLE_OWNERSHIP_LABEL: Record<VehicleOwnership, string> = {
  own:      "Propriu",
  rented:   "Închiriat",
};

/** Text liber scris de flotă/subcontractor (ex. „PFA", „CIM 6h"). Cheile vechi rămân doar pentru afișare. */
export type CollaborationType = string;
export const COLLABORATION_LABEL: Record<string, string> = {
  collaboration:  "Contract colaborare",
  cim_8h:         "CIM 8h",
  cim_4h:         "CIM 4h",
};
export const collaborationLabel = (c: string | undefined) => (c ? COLLABORATION_LABEL[c] ?? c : "—");

export type CourierStatus = "pending" | "active" | "rejected" | "in_activation" | "paused" | "stopped" | "draft";
export const COURIER_STATUS_LABEL: Record<CourierStatus, string> = {
  pending:        "În așteptare",
  active:         "Activ",
  rejected:       "Respins",
  in_activation:  "În activare",
  paused:         "Inactiv",
  stopped:        "Oprit",
  draft:          "Draft",
};
export const COURIER_STATUS_TONE: Record<CourierStatus, "success" | "warn" | "danger" | "neutral" | "info"> = {
  pending:       "warn",
  active:        "success",
  rejected:      "danger",
  in_activation: "warn",
  paused:        "neutral",
  stopped:       "danger",
  draft:         "neutral",
};

/** Pending = încă nu lucrează și nu e oprit. Peste PENDING_ALERT_DAYS zile → alertă; peste PENDING_CRITICAL_DAYS → roșu. */
export const PENDING_STATUSES: readonly CourierStatus[] = ["pending", "draft", "in_activation"];
export const PENDING_ALERT_DAYS = 5;
export const PENDING_CRITICAL_DAYS = 10;

/** Zile întregi în statusul pending curent, sau null dacă nu e pending. Fără statusSinceIso (date vechi) numără de la înregistrare. */
export function pendingDays(c: { status: CourierStatus; statusSinceIso?: string; createdAtIso: string }, nowMs = Date.now()): number | null {
  if (!PENDING_STATUSES.includes(c.status)) return null;
  const since = Date.parse(c.statusSinceIso ?? c.createdAtIso);
  return Number.isNaN(since) ? null : Math.max(0, Math.floor((nowMs - since) / 86_400_000));
}

/** Câmpuri cheie tracked pentru checklist „completează mai târziu". */
export type IncompleteFieldKey =
  | "fullName" | "phone" | "email" | "nationality"
  | "city" | "platforms" | "vehicleType" | "vehicleOwnership"
  | "collaboration";

export const INCOMPLETE_FIELD_LABEL: Record<IncompleteFieldKey, string> = {
  fullName:          "Nume complet",
  phone:             "Telefon",
  email:             "E-mail",
  nationality:       "Naționalitate",
  city:              "Oraș activare",
  platforms:         "Platforme",
  vehicleType:       "Vehicul",
  vehicleOwnership:  "Tip vehicul",
  collaboration:     "Tip colaborare",
};

export type Courier = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  nationality: Nationality;
  city: string;
  platforms: PlatformKey[];
  /** Platforme pe care curierul vrea să activeze suplimentar; așteaptă loc în orașul lui. */
  waitlistedPlatforms?: PlatformKey[];
  vehicleType: VehicleType;
  vehicleOwnership: VehicleOwnership;
  collaboration: CollaborationType;
  /** Comision % perceput de flotă din veniturile brute. Default 10. */
  commissionPct?: number;
  /** Taxă săptămânală contract (RON). Default 210. */
  weeklyContractFeeRon?: number;
  /** UID Bolt (ex: `U235988`) — folosit pentru match la import raport Bolt. */
  boltUid?: string;
  /** IBAN pentru plăți. */
  iban?: string;
  status: CourierStatus;
  /** Când a intrat în statusul curent. Îl setează CouriersProvider la fiecare schimbare de status. */
  statusSinceIso?: string;
  incompleteFields: IncompleteFieldKey[];
  createdAtIso: string;
  createdBy: string;
  /** Intenție de transfer (doar Global Owner): proprietarul DE LA care se mută. Serverul îl consumă și nu-l stochează. */
  transferFrom?: string;
  tenantId: string;
};

export type CourierDuplicateMatch = {
  matchType: "phone" | "email";
  entity: "courier" | "candidate";
  id: string;
  name: string;
  detail: string;
};
