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

export type Nationality = "ro" | "eu" | "non_eu";
export const NATIONALITY_LABEL: Record<Nationality, string> = {
  ro:     "Română",
  eu:     "UE (non-RO)",
  non_eu: "Non-UE",
};

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
