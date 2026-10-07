"use client";

import { CheckCircle2, IdCard, Loader2, ScanLine, TriangleAlert } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import type { IdCardFields } from "@/lib/couriers/id-card";
import { scanIdPhoto, warmIdOcr } from "@/lib/couriers/id-ocr";
import { OCR_MAX_SIDE } from "@/lib/couriers/id-scan";
import { rgbaToGray, type Gray } from "@/lib/couriers/id-scan-image";

export type ScannedIdDoc = { name: string; size: number; type: string; dataUrl: string };

type State =
  | { kind: "idle" }
  | { kind: "scanning"; pct: number; retry: boolean }
  | { kind: "done"; found: string[]; nameAlt?: string }
  | { kind: "failed"; msg: string };

/** Poza cu orientarea EXIF aplicată (telefoanele salvează des poza „culcată" + un flag), plus varianta gri pentru OCR. */
async function readPhoto(file: File): Promise<{ bitmap: ImageBitmap; gray: Gray }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const k = Math.min(1, OCR_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * k)), h = Math.max(1, Math.round(bitmap.height * k));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  return { bitmap, gray: rgbaToGray(ctx.getImageData(0, 0, w, h).data, w, h) };
}

/** Copia salvată la dosar: actul adus drept (aceeași rotație ca la OCR), max 1200px, JPEG. */
function uprightJpeg(bitmap: ImageBitmap, deg: number, maxSide = 1200): string {
  const a = (deg * Math.PI) / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const bw = bitmap.width, bh = bitmap.height;
  const k = Math.min(1, maxSide / Math.max(bw * c + bh * s, bw * s + bh * c));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round((bw * c + bh * s) * k);
  canvas.height = Math.round((bw * s + bh * c) * k);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(a);
  ctx.scale(k, k);
  ctx.drawImage(bitmap, -bw / 2, -bh / 2);
  return canvas.toDataURL("image/jpeg", 0.8);
}

/**
 * Încărcare buletin/permis/pașaport → OCR local în browser (tesseract.js), cu actul în orice poziție:
 * poza poate fi întoarsă, culcată sau strâmbă. Imaginea NU pleacă din browser — se descarcă doar
 * motorul OCR. Logica de citire e în lib/couriers/id-scan.ts (testată în tests/id-scan.test.mts).
 */
export function IdCardScan({ onScanned, onPickName }: {
  onScanned: (fields: IdCardFields, doc: ScannedIdDoc) => void;
  /** Userul alege a doua citire a numelui (fața vs banda MRZ). */
  onPickName: (name: string) => void;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });

  // Motorul se încarcă cât timp userul completează restul formularului → scanarea pornește instant.
  useEffect(() => { warmIdOcr().catch(() => {}); }, []);

  async function scan(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setState({ kind: "failed", msg: "Încarcă o poză (JPG/PNG) a actului, nu PDF." });
      return;
    }
    setState({ kind: "scanning", pct: 0, retry: false });
    try {
      const { bitmap, gray } = await readPhoto(file);
      const { fields, rotation } = await scanIdPhoto(
        gray,
        // Progresul vine pe fiecare trecere OCR (pagină, banda MRZ): îl țin crescător în aceeași orientare.
        (p) => setState((s) => (s.kind === "scanning" ? { ...s, pct: Math.max(s.pct, Math.round(p * 100)) } : s)),
        (i) => setState({ kind: "scanning", pct: 0, retry: i > 0 }),
      );
      onScanned(fields, { name: `Act identitate · ${file.name}`, size: file.size, type: "image/jpeg", dataUrl: uprightJpeg(bitmap, rotation) });
      bitmap.close();
      const found = [fields.fullName && "nume", fields.cnp && "CNP", fields.expiryIso && "expirare act"].filter(Boolean) as string[];
      setState(found.length
        ? { kind: "done", found, nameAlt: fields.nameAlt }
        : { kind: "failed", msg: "Actul a fost atașat, dar textul nu s-a putut citi. Fă o poză clară, fără reflexii, cu tot actul în cadru și banda de jos (<<<) vizibilă — sau completează manual." });
    } catch {
      setState({ kind: "failed", msg: "Scanarea a eșuat (conexiune sau imagine). Completează manual sau încearcă din nou." });
    }
  }

  const busy = state.kind === "scanning";
  return (
    <div className="rounded-lg border border-violet-500/30 bg-violet-500/[0.06] p-3">
      <label className={`flex items-center gap-3 ${busy ? "cursor-wait" : "cursor-pointer"}`}>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-200">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <IdCard size={16} />}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[12.5px] font-semibold text-fg">
            {state.kind === "scanning"
              ? state.retry ? "Caut orientarea actului…" : `Citesc actul… ${state.pct}%`
              : "Încarcă buletinul / permisul"}
          </span>
          <span className="block text-[10.5px] text-fg-dim">Completăm automat numele și CNP-ul, în orice poziție. Poza rămâne în browser.</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-line bg-card px-2 py-1 text-[11px] font-semibold text-fg-muted">
          <ScanLine size={12} /> Scanează
        </span>
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          className="hidden"
          onChange={(e) => { scan(e.target.files?.[0]); e.target.value = ""; }}
        />
      </label>
      {state.kind === "done" && (
        // Fiecare bucată în nodul ei de text: traducătorul (lib/i18n/translator.ts) le potrivește separat.
        <p className="mt-2 text-[11px] leading-snug text-emerald-300">
          <CheckCircle2 size={12} className="mr-1 inline align-[-2px]" />
          <span>Completat:</span>{" "}
          {state.found.map((f, i) => <Fragment key={f}>{i > 0 && ", "}<span>{f}</span></Fragment>)}
          {" "}<span>— verifică datele înainte de trimitere.</span>
        </p>
      )}
      {state.kind === "done" && state.nameAlt && (
        <p className="mt-1.5 text-[11px] text-amber-200">
          <span>Fața actului se citește altfel:</span>{" "}
          <button
            type="button"
            onClick={() => { onPickName(state.nameAlt!); setState({ ...state, nameAlt: undefined }); }}
            className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-semibold hover:bg-amber-500/20"
            data-no-translate
          >
            {state.nameAlt}
          </button>{" "}<span>— apasă dacă e corect.</span>
        </p>
      )}
      {state.kind === "failed" && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-300">
          <TriangleAlert size={12} className="mt-px shrink-0" /> {state.msg}
        </p>
      )}
    </div>
  );
}
