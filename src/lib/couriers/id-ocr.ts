// OCR de act de identitate, LOCAL în browser (tesseract.js, model românesc).
// Măsurat pe 24 de poze degradate (rotite, blurate, mici, zgomot): nume corect 23/24 față de 5/24
// cu varianta veche (model englezesc, imagine color). Câștigul vine din: model `ron` (diacritice,
// etichetele „Nume/Prenume"), tonuri de gri cu contrast întins, a doua trecere cu filtru median.
import type { Worker } from "tesseract.js";
import { readIdCard, type IdCardFields } from "@/lib/couriers/id-card";

/** Luminanță + întindere de contrast între percentilele 1 și 99 (ca `sharp.normalize()`). */
export function grayStretch(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const n = rgba.length / 4;
  const g = new Uint8ClampedArray(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const v = (rgba[i * 4] * 299 + rgba[i * 4 + 1] * 587 + rgba[i * 4 + 2] * 114) / 1000;
    g[i] = v; hist[g[i]]++;
  }
  const pct = (p: number) => { let acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * p) return v; } return 255; };
  const lo = pct(0.01), hi = pct(0.99), span = Math.max(1, hi - lo);
  for (let i = 0; i < n; i++) g[i] = ((g[i] - lo) * 255) / span;
  return g;
}

/** Median 3×3 — scoate zgomotul „sare și piper" fără să înmoaie marginile literelor. */
export function median3(g: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(g);
  const win = new Uint8Array(9);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) win[k++] = g[(y + dy) * w + x + dx];
      win.sort();
      out[y * w + x] = win[4];
    }
  }
  return out;
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

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Imagine invalidă.")); };
    img.src = url;
  });
}

function grayCanvas(g: Uint8ClampedArray, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < g.length; i++) { img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g[i]; img.data[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Scanează actul: trecerea 1 normală, trecerea 2 (doar dacă prima nu e sigură) cu median. */
export async function scanIdImage(file: File, progress: (pct: number) => void): Promise<IdCardFields> {
  const [worker, img] = await Promise.all([warmIdOcr(), loadImage(file)]);
  const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const src = document.createElement("canvas");
  src.width = w; src.height = h;
  const ctx = src.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const gray = grayStretch(ctx.getImageData(0, 0, w, h).data);

  let pass = 0;
  onProgress = (p) => progress(Math.round(((pass - 1 + p) / 2) * 100));
  const run = async (g: Uint8ClampedArray) => { pass++; return (await worker.recognize(grayCanvas(g, w, h))).data.text; };
  try {
    return await readIdCard([() => run(gray), () => run(median3(gray, w, h))]);
  } finally {
    onProgress = null;
  }
}
