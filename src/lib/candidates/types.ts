import type { PlatformKey } from "@/lib/dashboard/types";

export type CandidateSource =
  | "whatsapp"
  | "phone"
  | "email"
  | "facebook"
  | "instagram"
  | "referral"
  | "walk_in"
  | "other";

export const CANDIDATE_SOURCE_LABEL: Record<CandidateSource, string> = {
  whatsapp:   "WhatsApp",
  phone:      "Telefon",
  email:      "E-mail",
  facebook:   "Facebook",
  instagram:  "Instagram",
  referral:   "Recomandare",
  walk_in:    "Prezentare fizică",
  other:      "Alta sursă",
};

export type CandidateStatus =
  | "new"
  | "contacted"
  | "documents"
  | "interview"
  | "activation"
  | "declined";

export const CANDIDATE_STATUS_LABEL: Record<CandidateStatus, string> = {
  new:         "Candidat nou",
  contacted:   "Contactat",
  documents:   "Documente cerute",
  interview:   "Interviu programat",
  activation:  "În activare",
  declined:    "Refuzat",
};

export type Nationality = "ro" | "md" | "eu" | "in" | "bd" | "np" | "lk" | "non_eu";
export const NATIONALITY_LABEL: Record<Nationality, string> = {
  ro:     "Română",
  md:     "Moldova",
  eu:     "UE (non-RO)",
  in:     "India",
  bd:     "Bangladesh",
  np:     "Nepal",
  lk:     "Sri Lanka",
  non_eu: "Non-UE",
};
/** Ordinea din dropdown-uri. `non_eu` rămâne doar pentru datele vechi. */
export const NATIONALITY_OPTIONS: Nationality[] = ["ro", "md", "eu", "in", "bd", "np", "lk"];
/** Cetățenii din afara UE au nevoie de permis de ședere; RO și UE nu. */
export const isNonEu = (n: Nationality) => n !== "ro" && n !== "eu";

export type Candidate = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  nationality: Nationality;
  city: string;
  desiredPlatforms: PlatformKey[];
  source: CandidateSource;
  status: CandidateStatus;
  notes: string | null;
  createdAtIso: string;
  createdBy: string;
  tenantId: string;
  needsFollowUp: boolean;
};

export type DuplicateMatch = {
  matchType: "phone" | "email";
  entity: "candidate" | "courier";
  id: string;
  name: string;
  detail: string;
};
