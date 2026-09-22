import type { PlatformKey } from "@/lib/dashboard/types";

// TODO(real-users): Drizzle tabel `documents` cu FK -> subjects (curier/candidat/subcontractor).
// Fișierele binare -> S3/Cloudflare R2 cu presigned URLs. Momentan: metadata în localStorage,
// fișierul binar trăiește doar în memoria sesiunii (ObjectURL, dispare la refresh).

export type DocumentType =
  | "id_card"
  | "passport"
  | "residence_permit"
  | "driving_license"
  | "contract"
  | "banking"
  | "platform_doc"
  | "vehicle"
  | "cnp"
  | "selfie"
  | "other";

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  id_card:          "Carte de identitate",
  passport:         "Pașaport",
  residence_permit: "Permis de ședere (TRC)",
  driving_license:  "Permis de conducere",
  contract:         "Contract",
  banking:          "Document bancar",
  platform_doc:     "Document platformă",
  vehicle:          "Document vehicul",
  cnp:              "CNP / Cod fiscal",
  selfie:           "Selfie verificare",
  other:            "Alt document",
};

export type DocumentStatus =
  | "in_review"
  | "approved"
  | "rejected"
  | "expired"
  | "missing";

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  in_review: "În verificare",
  approved:  "Aprobat",
  rejected:  "Respins",
  expired:   "Expirat",
  missing:   "Document lipsă",
};

export type SubjectKind = "courier" | "candidate" | "subcontractor";
export const SUBJECT_KIND_LABEL: Record<SubjectKind, string> = {
  courier:       "Curier",
  candidate:     "Candidat",
  subcontractor: "Subcontractor",
};

/** Snapshot al subiectului la momentul încărcării documentului. */
export type DocumentSubject = {
  id: string;
  name: string;
  kind: SubjectKind;
  city: string | null;
  platform: PlatformKey | null;
};

export type DocumentFileMeta = {
  name: string;
  size: number;
  type: string;
  /** URL blob local (nu persistă între refresh-uri; server real ar folosi presigned URL). */
  objectUrl: string | null;
};

export type CrmDocument = {
  id: string;
  tenantId: string;
  fleetId: string;

  subject: DocumentSubject;
  type: DocumentType;
  status: DocumentStatus;

  /** null = "Nu expiră" */
  expiryIso: string | null;

  file: DocumentFileMeta;

  ocrEnabled: boolean;
  /** Câmpurile propuse de OCR — momentan mock. */
  ocrProposed: Record<string, string> | null;

  verifiedManually: boolean;
  notes: string | null;

  createdAtIso: string;
  createdBy: string;
};

export const ACCEPTED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"] as const;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Doc types care nu au expirare (uzual). Poate fi override manual. */
export const DOC_TYPES_WITHOUT_EXPIRY: DocumentType[] = ["banking", "other"];
