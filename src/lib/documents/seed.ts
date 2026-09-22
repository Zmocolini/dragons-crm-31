import type { Courier } from "@/lib/couriers/types";
import type { CrmDocument, DocumentStatus, DocumentType } from "./types";
import { DOC_COLUMNS, requirementFor, TODAY_ISO } from "./rules";

// Seed DETERMINIST de documente per curier (derivat din id — stabil între reload-uri,
// NU hardcodat din screenshot). TODO(real-users): înlocuit de SELECT din tabelul `documents`.

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const DAY_MS = 86400000;
function isoOffset(days: number): string {
  return new Date(new Date(TODAY_ISO + "T00:00:00Z").getTime() + days * DAY_MS).toISOString().slice(0, 10);
}
function slug(name: string): string {
  return name.trim().toLowerCase().split(/\s+/).pop()?.replace(/[^a-z]/g, "") || "curier";
}

const FILE_EXT: Record<DocumentType, string> = {
  id_card: "pdf", passport: "pdf", cnp: "pdf", residence_permit: "pdf",
  driving_license: "pdf", contract: "pdf", banking: "pdf", selfie: "jpg",
  platform_doc: "pdf", vehicle: "pdf", other: "pdf",
};
const FILE_PREFIX: Record<DocumentType, string> = {
  id_card: "ci", passport: "pasaport", cnp: "cnp", residence_permit: "trc",
  driving_license: "permis", contract: "contract", banking: "iban", selfie: "selfie",
  platform_doc: "platforma", vehicle: "vehicul", other: "cazier",
};

function statusFrom(r: number): DocumentStatus {
  if (r < 0.72) return "approved";
  if (r < 0.9) return "in_review";
  return "rejected";
}

// Seed dezactivat — documentele reale vin din upload-urile userului.
export function buildSeedDocuments(_couriers: Courier[]): CrmDocument[] {
  return [];
}
