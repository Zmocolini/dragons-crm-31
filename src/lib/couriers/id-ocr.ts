// OCR de act de identitate, LOCAL în browser (tesseract.js, model românesc), cu actul în orice poziție.
// Model `ron` (diacritice, etichetele „Nume/Prenume"): măsurat pe 24 de poze degradate, nume corect
// 23/24 față de 5/24 cu `eng`. Orientarea, banda MRZ și trecerea cu median sunt în id-scan.ts (pur, testat).
// tesseract.js se încarcă doar prin import dinamic: modulul ăsta poate fi importat static.
import type { PSM, Worker } from "tesseract.js";
import { encodeBmp, type Gray } from "./id-scan-image";
import { scanIdImage, type Ocr, type OcrLine, type ScanResult } from "./id-scan";

const MRZ_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<";

/** Adaptorul tesseract → `Ocr` (folosit și în Node, pentru măsurători). */
export function tesseractOcr(worker: Worker): Ocr {
  let mode: "text" | "mrz" | null = null;
  return async (img, m) => {
    if (m !== mode) {
      // „6" = un singur bloc (banda MRZ), „3" = pagină cu așezare automată.
      await worker.setParameters(m === "mrz"
        ? { tessedit_char_whitelist: MRZ_CHARS, tessedit_pageseg_mode: "6" as PSM }
        : { tessedit_char_whitelist: "", tessedit_pageseg_mode: "3" as PSM });
      mode = m;
    }
    // BMP în loc de canvas: aceeași cale în browser și în Node, fără recomprimare.
    const { data } = await worker.recognize(encodeBmp(img) as unknown as Buffer, {}, { text: true, blocks: true });
    const lines: OcrLine[] = [];
    for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) lines.push({ text: l.text, ...l.bbox });
    return { text: data.text, lines };
  };
}

let workerP: Promise<Worker> | null = null;
let onProgress: ((p: number) => void) | null = null;

/** Pornește motorul în fundal (descărcare ~1.7 MB + init) ca scanarea să înceapă instant. */
export function warmIdOcr(): Promise<Worker> {
  workerP ??= import("tesseract.js").then(({ createWorker }) =>
    createWorker("ron", 1, { logger: (m) => { if (m.status === "recognizing text") onProgress?.(m.progress); } }),
  );
  workerP.catch(() => { workerP = null; }); // rețea picată → următoarea încercare reîncearcă
  return workerP;
}

/** Scanează poza (gri, orientarea EXIF deja aplicată). `onAttempt(i)` = a câta orientare încearcă. */
export async function scanIdPhoto(photo: Gray, progress: (p: number) => void, onAttempt: (i: number) => void): Promise<ScanResult> {
  const worker = await warmIdOcr();
  onProgress = progress;
  try {
    return await scanIdImage(photo, tesseractOcr(worker), onAttempt);
  } finally {
    onProgress = null;
  }
}
