// Scanarea unui act în orice poziție: găsește orientarea, citește textul, apoi recitește banda MRZ
// decupată și mărită (doar A-Z 0-9 <). Motorul OCR e injectat — tesseract în browser, fals în teste.
import { isConfident, parseIdCardText, readIdCard, type IdCardFields } from "./id-card";
import { crop, downscale, median3, rotate, stretchContrast, textAngles, type Gray } from "./id-scan-image";

export type OcrLine = { text: string; x0: number; y0: number; x1: number; y1: number };
export type OcrOut = { text: string; lines: OcrLine[] };
/** `text` = pagină întreagă; `mrz` = un singur bloc, doar caracterele MRZ. */
export type Ocr = (img: Gray, mode: "text" | "mrz") => Promise<OcrOut>;

export type ScanResult = {
  fields: IdCardFields;
  /** Rotația (grade, sensul acelor de ceas) care aduce actul drept — pentru poza salvată. */
  rotation: number;
  passes: number;
};

/** Latura mare a imaginii date OCR-ului (2000px păstrează lizibilă zona MRZ). */
export const OCR_MAX_SIDE = 2000;
/** Sondarea orientării: destul pentru rândurile mari și banda MRZ, la ~jumătate din timp. */
const PROBE_MAX_SIDE = 1400;

const score = (f: IdCardFields) => (f.cnp ? 4 : 0) + (f.fullName ? 3 : 0) + (f.expiryIso ? 1 : 0) + (f.docNumber ? 1 : 0);

/** Rotațiile de încercat, cele mai probabile întâi: rândurile de text (și întoarse cu 180°), apoi cele 4 drepte. */
export function rotationCandidates(angles: number[]): number[] {
  const out: number[] = [];
  const add = (r: number) => {
    const n = Math.round((((r % 360) + 360) % 360) * 10) / 10;
    if (!out.some((o) => Math.abs(((o - n + 540) % 360) - 180) < 4)) out.push(n);
  };
  for (const a of angles) { add(-a); add(180 - a); }
  for (const r of [0, 90, 180, 270]) add(r);
  return out;
}

/** Banda MRZ, cu margine — sau null. Un rând MRZ e lung și aproape numai A-Z 0-9 <
 *  (rândul 2 al buletinului are un singur „<", deci nu ajunge să cauți „<<"). */
export function mrzBox(lines: OcrLine[], img: Gray): { x: number; y: number; w: number; h: number; lineH: number } | null {
  const mrz = lines.filter((l) => {
    const t = l.text.replace(/\s+/g, "").replace(/«/g, "<");
    const ok = t.match(/[A-Z0-9<]/g)?.length ?? 0;
    return t.length >= 25 && ok >= t.length * 0.9 && /</.test(t);
  });
  if (mrz.length === 0) return null;
  const x0 = Math.min(...mrz.map((l) => l.x0)), x1 = Math.max(...mrz.map((l) => l.x1));
  const y0 = Math.min(...mrz.map((l) => l.y0)), y1 = Math.max(...mrz.map((l) => l.y1));
  const lineH = Math.max(...mrz.map((l) => l.y1 - l.y0));
  // Margini generoase: OCR-ul taie des „<<<" de la capăt, un rând MRZ prost citit (ex. numele pe
  // permisul de ședere, al 3-lea rând) lipsește din listă — dar e lipit de cele găsite — iar pe o
  // poză în perspectivă rândurile nu încep în aceeași coloană.
  const mx = (x1 - x0) * 0.15 + 2 * lineH, my = lineH * 1.5;
  const x = Math.max(0, x0 - mx), y = Math.max(0, y0 - my);
  return { x, y, w: Math.min(img.w, x1 + mx) - x, h: Math.min(img.h, y1 + my) - y, lineH };
}

/** O orientare citită: textele în ordinea încrederii (banda MRZ întâi) și câte treceri OCR au costat. */
type Reading = { mrz: string; pages: string[]; passes: number };
const textOf = (r: Reading) => [r.mrz, ...r.pages].join("\n");

/**
 * Pagina la `side` px, apoi banda MRZ decupată din imaginea mare și citită doar cu A-Z 0-9 <, la două
 * mărimi (~26 și ~40px pe rând). Tesseract „inventează" litere în șirurile lungi de „<" și uneori
 * inserează o cifră; citirile diferite + cifrele de control + fața actului aleg varianta corectă
 * (parseIdCardText). Măsurat pe poze sintetice: cu o singură citire a benzii, 2 acte din 14 ieșeau
 * cu nume sau expirare greșite; cu două, 0.
 */
async function readOrientation(up: Gray, side: number, ocr: Ocr): Promise<Reading> {
  const page = downscale(up, side);
  const k = up.w / page.w;
  const res = await ocr(page, "text");
  const box = mrzBox(res.lines, page);
  if (!box) return { mrz: "", pages: [res.text], passes: 1 };
  const band = crop(up, box.x * k, box.y * k, box.w * k, box.h * k);
  const texts: string[] = [];
  for (const px of [26, 40]) texts.push((await ocr(rotate(band, 0, Math.min(3, Math.max(0.5, px / (box.lineH * k)))), "mrz")).text);
  return { mrz: texts.join("\n"), pages: [res.text], passes: 3 };
}

/**
 * Încearcă rotațiile candidate până citește ceva din act (nume sau CNP valid). Fiecare orientare e
 * sondată la 1400px (de ~2× mai rapid); doar orientarea bună, dacă îi lipsește ceva, e recitită la 2000px.
 * Poză dreaptă: ~3 treceri; întoarsă: +1 per orientare greșită. `onAttempt(i)` = a câta orientare.
 */
export async function scanIdImage(photo: Gray, ocr: Ocr, onAttempt?: (i: number) => void): Promise<ScanResult> {
  const img = stretchContrast(downscale(photo, OCR_MAX_SIDE));
  const cands = rotationCandidates(textAngles(img));
  let best: { fields: IdCardFields; rotation: number; text: string } = { fields: {}, rotation: 0, text: "" };
  let passes = 0;
  const consider = (r: Reading, rotation: number) => {
    const fields = parseIdCardText(textOf(r));
    if (score(fields) > score(best.fields)) best = { fields, rotation, text: textOf(r) };
  };
  for (let i = 0; i < cands.length; i++) {
    onAttempt?.(i);
    const up = rotate(img, cands[i]);
    const r = await readOrientation(up, PROBE_MAX_SIDE, ocr);
    passes += r.passes;
    const s = score(parseIdCardText(textOf(r)));
    if (s >= 3 && s < 7 && Math.max(up.w, up.h) > PROBE_MAX_SIDE) {
      // Orientarea e bună, dar lipsește ceva (de obicei CNP-ul mic de pe față): pagina la rezoluție mare.
      r.pages.unshift((await ocr(up, "text")).text);
      passes++;
    }
    consider(r, cands[i]);
    // Nume sau CNP găsit = orientarea e bună; altă rotație n-ar citi mai mult din același act.
    if (score(best.fields) >= 3) break;
  }
  // Nimic la 1400px (act mic în cadru): primele două orientări, la rezoluție mare.
  for (let i = 0; i < Math.min(2, cands.length) && score(best.fields) === 0; i++) {
    onAttempt?.(cands.length + i);
    const r = await readOrientation(rotate(img, cands[i]), OCR_MAX_SIDE, ocr);
    passes += r.passes;
    consider(r, cands[i]);
  }
  // Orientarea e găsită, dar citirea nu e sigură (lipsește CNP-ul sau fața contrazice MRZ-ul): încă o
  // citire cu filtru median (zgomot de senzor), câmpurile se combină pe rând (readIdCard).
  if (score(best.fields) >= 3 && !isConfident(best.fields)) {
    const first = best.text;
    const fields = await readIdCard([
      async () => first,
      async () => {
        const r = await readOrientation(rotate(median3(img), best.rotation), PROBE_MAX_SIDE, ocr);
        passes += r.passes;
        return textOf(r);
      },
    ]);
    best = { ...best, fields };
  }
  return { fields: best.fields, rotation: best.rotation, passes };
}
