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

export type CollaborationType = "collaboration" | "contract" | "internal" | "subcontractor";
export const COLLABORATION_LABEL: Record<CollaborationType, string> = {
  collaboration:  "Colaborare",
  contract:       "Contract muncă",
  internal:       "Angajat intern",
  subcontractor:  "Subcontractor",
};

export type CourierStatus = "in_activation" | "active" | "paused" | "stopped" | "draft";
export const COURIER_STATUS_LABEL: Record<CourierStatus, string> = {
  draft:          "Draft",
  in_activation:  "În activare",
  active:         "Activ",
  paused:         "Pauză",
  stopped:        "Oprit",
};

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
  vehicleType: VehicleType;
  vehicleOwnership: VehicleOwnership;
  collaboration: CollaborationType;
  status: CourierStatus;
  incompleteFields: IncompleteFieldKey[];
  createdAtIso: string;
  createdBy: string;
  tenantId: string;
};

export type CourierDuplicateMatch = {
  matchType: "phone" | "email";
  entity: "courier" | "candidate";
  id: string;
  name: string;
  detail: string;
};
