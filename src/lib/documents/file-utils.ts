import {
  ACCEPTED_EXTENSIONS, ACCEPTED_MIME_TYPES, MAX_FILE_SIZE_BYTES,
  type DocumentFileMeta, type DocumentType,
} from "./types";

// Validare + preview + OCR stub. TODO(real-users): OCR real pe server (AWS Textract /
// Google Vision), validare antivirus, presigned upload. Aici totul e client-side.

export function validateFile(file: File): { ok: boolean; error?: string } {
  const ext = ("." + (file.name.split(".").pop() ?? "").toLowerCase()) as (typeof ACCEPTED_EXTENSIONS)[number];
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return { ok: false, error: `Extensie neacceptată (${ext || "necunoscută"}). Permise: ${ACCEPTED_EXTENSIONS.join(", ")}.` };
  }
  if (file.type && !(ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: `Tip fișier neacceptat (${file.type}).` };
  }
  if (file.size <= 0) return { ok: false, error: "Fișier gol sau corupt." };
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: `Fișier prea mare (${(file.size / 1024 / 1024).toFixed(1)} MB). Maxim ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.` };
  }
  return { ok: true };
}

export function fileToMeta(file: File): DocumentFileMeta {
  return {
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    objectUrl: typeof URL !== "undefined" ? URL.createObjectURL(file) : null,
  };
}

/** Clasificare naivă după numele fișierului (#31). Utilizatorul poate corecta. */
export function guessDocType(fileName: string): DocumentType {
  const n = fileName.toLowerCase();
  if (/(pasaport|passport)/.test(n)) return "passport";
  if (/(buletin|\bci\b|carte.?identitate|id.?card)/.test(n)) return "id_card";
  if (/(cnp|fiscal)/.test(n)) return "cnp";
  if (/(sedere|rezident|trc|residence|permis.?ded)/.test(n)) return "residence_permit";
  if (/(permis|licen|driving)/.test(n)) return "driving_license";
  if (/(contract)/.test(n)) return "contract";
  if (/(iban|banca|bank|cont)/.test(n)) return "banking";
  if (/(selfie|poza|photo|foto)/.test(n)) return "selfie";
  return "other";
}

export type OcrResult = {
  fields: Record<string, string>;
  confidence: Record<string, number>;
  needsReview: string[];
};

const OCR_FIELDS_BY_TYPE: Partial<Record<DocumentType, string[]>> = {
  id_card: ["nume", "prenume", "cnp", "serie", "numar", "dataNasterii", "dataEmiterii", "dataExpirarii", "nationalitate"],
  passport: ["nume", "prenume", "numar", "dataNasterii", "dataEmiterii", "dataExpirarii", "nationalitate"],
  residence_permit: ["nume", "prenume", "numar", "dataEmiterii", "dataExpirarii", "nationalitate"],
};

/**
 * OCR STUB — NU e un OCR real. Simulează extragerea de câmpuri (determinist după
 * numele fișierului) ca să demonstreze fluxul upload → OCR → verificare → confirmare.
 * Nu modifică automat profilul; utilizatorul confirmă explicit.
 */
export function runMockOcr(file: File, type: DocumentType, subjectName: string): Promise<OcrResult> {
  const wanted = OCR_FIELDS_BY_TYPE[type];
  if (!wanted) return Promise.resolve({ fields: {}, confidence: {}, needsReview: [] });

  const [prenume = "", nume = ""] = subjectName.split(" ");
  const seed = Array.from(file.name).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const pick = (n: number) => (seed % n);

  const values: Record<string, string> = {
    nume: nume || "—",
    prenume: prenume || "—",
    cnp: String(1900000000000 + (seed % 899999999999)),
    serie: ["RD", "RK", "XT", "RR"][pick(4)] + String(100000 + (seed % 899999)).slice(0, 6),
    numar: String(100000 + (seed % 899999)),
    dataNasterii: `19${80 + (seed % 20)}-0${1 + (seed % 8)}-1${seed % 9}`,
    dataEmiterii: "2022-0" + (1 + (seed % 8)) + "-1" + (seed % 9),
    dataExpirarii: `20${30 + (seed % 5)}-0${1 + (seed % 8)}-1${seed % 9}`,
    nationalitate: ["Română", "Italiană", "Indiană", "Marocană"][pick(4)],
  };
  const fields: Record<string, string> = {};
  const confidence: Record<string, number> = {};
  const needsReview: string[] = [];
  for (const key of wanted) {
    fields[key] = values[key] ?? "";
    const conf = 0.6 + ((seed >> wanted.indexOf(key)) % 40) / 100; // 0.6–0.99
    confidence[key] = Math.round(conf * 100) / 100;
    if (confidence[key] < 0.75) needsReview.push(key);
  }
  // simulează latență OCR
  return new Promise((resolve) => setTimeout(() => resolve({ fields, confidence, needsReview }), 700));
}

export const OCR_FIELD_LABEL: Record<string, string> = {
  nume: "Nume", prenume: "Prenume", cnp: "CNP", serie: "Serie", numar: "Număr document",
  dataNasterii: "Data nașterii", dataEmiterii: "Data emiterii", dataExpirarii: "Data expirării",
  nationalitate: "Naționalitate",
};
