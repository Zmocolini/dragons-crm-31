import type { Courier } from "@/lib/couriers/types";
import { isNonEu } from "@/lib/candidates/types";
import type { CrmDocument, DocumentType } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Layer COMUN de reguli documente (expirări, cerințe, statusuri). #37 — nu duplica
// logica în componente. TODO(real-users): mutare într-un serviciu server-side.
// ─────────────────────────────────────────────────────────────────────────────

export const EXPIRING_SOON_DAYS = 30;
export const TODAY_ISO = "2026-09-10"; // „azi" în domeniul mock

const DAY_MS = 86400000;
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const a = new Date(TODAY_ISO + "T00:00:00Z").getTime();
  const b = new Date(iso + "T00:00:00Z").getTime();
  return Math.round((b - a) / DAY_MS);
}

// ── Coloane document (configurabile, mapate pe DocumentType) ──────────────────
export type DocColumnKey = "identity" | "cnp" | "residence" | "contract" | "banking" | "selfie" | "other";

export type DocColumn = {
  key: DocColumnKey;
  label: string;
  short: string;
  types: DocumentType[];
  /** tip principal folosit la upload din coloană */
  primaryType: DocumentType;
};

export const DOC_COLUMNS: DocColumn[] = [
  { key: "identity",  label: "CI / Pașaport",     short: "CI/Pașaport", types: ["id_card", "passport"], primaryType: "id_card" },
  { key: "cnp",       label: "CNP",               short: "CNP",         types: ["cnp"], primaryType: "cnp" },
  { key: "residence", label: "Permis de ședere",  short: "Ședere",      types: ["residence_permit"], primaryType: "residence_permit" },
  { key: "contract",  label: "Contract",          short: "Contract",    types: ["contract"], primaryType: "contract" },
  { key: "banking",   label: "IBAN",              short: "IBAN",        types: ["banking"], primaryType: "banking" },
  { key: "selfie",    label: "Selfie",            short: "Selfie",      types: ["selfie"], primaryType: "selfie" },
  { key: "other",     label: "Altele",            short: "Altele",      types: ["other", "platform_doc", "vehicle", "driving_license"], primaryType: "other" },
];

export function columnForType(type: DocumentType): DocColumnKey {
  return DOC_COLUMNS.find((c) => c.types.includes(type))?.key ?? "other";
}

// ── Reguli de cerință (required/optional/not_applicable) #39–#40 ─────────────
export type Requirement = "required" | "optional" | "not_applicable";

/**
 * Regula e derivată din profilul curierului (naționalitate + colaborare), NU
 * hardcodată în UI. Ex: permisul de ședere e cerut DOAR pentru non-UE.
 */
export function requirementFor(courier: Pick<Courier, "nationality" | "collaboration">, col: DocColumnKey): Requirement {
  switch (col) {
    case "identity": return "required";
    case "cnp":       return isNonEu(courier.nationality) ? "optional" : "required";
    case "residence": return isNonEu(courier.nationality) ? "required" : "not_applicable";
    case "contract":  return "required";
    case "banking":   return "required";
    case "selfie":    return "required";
    case "other":     return "optional";
  }
}

// ── Stare celulă (per curier × coloană) ──────────────────────────────────────
export type CellState = "valid" | "expiring_soon" | "expired" | "missing" | "pending_review" | "rejected" | "na";

export const CELL_STATE_LABEL: Record<CellState, string> = {
  valid:          "Valid",
  expiring_soon:  "Expiră curând",
  expired:        "Expirat",
  missing:        "Lipsă",
  pending_review: "În verificare",
  rejected:       "Respins",
  na:             "Nu se aplică",
};

export type CellResult = {
  state: CellState;
  requirement: Requirement;
  doc: CrmDocument | null;
  daysLeft: number | null;
};

/** Documentul cel mai recent pentru o coloană. */
export function latestDocForColumn(docs: CrmDocument[], col: DocColumn): CrmDocument | null {
  const matching = docs.filter((d) => col.types.includes(d.type));
  if (matching.length === 0) return null;
  return matching.slice().sort((a, b) => (a.createdAtIso < b.createdAtIso ? 1 : -1))[0];
}

export function computeCell(docs: CrmDocument[], col: DocColumn, requirement: Requirement): CellResult {
  const doc = latestDocForColumn(docs, col);
  if (requirement === "not_applicable") return { state: "na", requirement, doc, daysLeft: null };
  if (!doc) return { state: requirement === "required" ? "missing" : "na", requirement, doc: null, daysLeft: null };

  const daysLeft = daysUntil(doc.expiryIso);
  if (doc.status === "rejected") return { state: "rejected", requirement, doc, daysLeft };
  if (doc.status === "in_review") return { state: "pending_review", requirement, doc, daysLeft };
  if (doc.status === "missing") return { state: "missing", requirement, doc, daysLeft };
  // approved / expired: derivă din expirare
  if (doc.expiryIso && daysLeft !== null) {
    if (daysLeft < 0) return { state: "expired", requirement, doc, daysLeft };
    if (daysLeft <= EXPIRING_SOON_DAYS) return { state: "expiring_soon", requirement, doc, daysLeft };
  }
  if (doc.status === "expired") return { state: "expired", requirement, doc, daysLeft };
  return { state: "valid", requirement, doc, daysLeft };
}

// ── Status general curier (prioritate #17) ───────────────────────────────────
export type CourierDocStatus = "expired" | "missing" | "pending_review" | "expiring_soon" | "complete";

export const COURIER_DOC_STATUS_LABEL: Record<CourierDocStatus, string> = {
  expired:        "Expirat",
  missing:        "Lipsă",
  pending_review: "În verificare",
  expiring_soon:  "Expiră curând",
  complete:       "Complet",
};

/** Agregă stările celulelor OBLIGATORII după prioritate. */
export function courierStatusFromCells(cells: CellResult[]): CourierDocStatus {
  const required = cells.filter((c) => c.requirement === "required");
  if (required.some((c) => c.state === "expired" || c.state === "rejected")) return "expired";
  if (required.some((c) => c.state === "missing")) return "missing";
  if (required.some((c) => c.state === "pending_review")) return "pending_review";
  if (cells.some((c) => c.state === "expiring_soon")) return "expiring_soon";
  return "complete";
}

// ── Matrice per curier ───────────────────────────────────────────────────────
export type CourierDocRow = {
  courier: Courier & { avatarUrl?: string | null; subcontractorName?: string | null; vehicleModel?: string };
  cells: Record<DocColumnKey, CellResult>;
  status: CourierDocStatus;
};

export function buildCourierRow(
  courier: CourierDocRow["courier"],
  docs: CrmDocument[],
): CourierDocRow {
  const cells = {} as Record<DocColumnKey, CellResult>;
  for (const col of DOC_COLUMNS) {
    const req = requirementFor(courier, col.key);
    cells[col.key] = computeCell(docs, col, req);
  }
  const status = courierStatusFromCells(Object.values(cells));
  return { courier, cells, status };
}
