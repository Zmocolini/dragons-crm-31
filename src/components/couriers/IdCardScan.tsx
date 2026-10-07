"use client";

import { CheckCircle2, IdCard, Loader2, ScanLine, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { IdCardFields } from "@/lib/couriers/id-card";
import { scanIdImage, warmIdOcr } from "@/lib/couriers/id-ocr";
import { resizeImageFile } from "@/lib/utils/image";

export type ScannedIdDoc = { name: string; size: number; type: string; dataUrl: string };

type State =
  | { kind: "idle" }
  | { kind: "scanning"; pct: number }
  | { kind: "done"; found: string[]; nameAlt?: string }
  | { kind: "failed"; msg: string };

/**
 * Încărcare buletin/permis/pașaport → OCR local în browser (tesseract.js).
 * Imaginea NU pleacă din browser: se descarcă doar motorul OCR, nu se trimit date.
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
    setState({ kind: "scanning", pct: 0 });
    try {
      // Documentul salvat e varianta de 1200px; OCR-ul lucrează pe original (scalat la 2000px, gri).
      const [fields, docUrl] = await Promise.all([
        scanIdImage(file, (pct) => setState({ kind: "scanning", pct })),
        resizeImageFile(file, 1200, { format: "jpeg", quality: 0.8 }),
      ]);
      onScanned(fields, { name: `Act identitate · ${file.name}`, size: file.size, type: "image/jpeg", dataUrl: docUrl });
      const found = [fields.fullName && "nume", fields.cnp && "CNP", fields.expiryIso && "expirare act"].filter(Boolean) as string[];
      setState(found.length
        ? { kind: "done", found, nameAlt: fields.nameAlt }
        : { kind: "failed", msg: "Actul a fost atașat, dar textul nu s-a putut citi. Fă o poză dreaptă, fără reflexii, cu banda de jos (<<<) vizibilă — sau completează manual." });
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
            {busy ? `Citesc actul… ${state.pct}%` : "Încarcă buletinul / permisul"}
          </span>
          <span className="block text-[10.5px] text-fg-dim">Completăm automat numele și CNP-ul. Poza rămâne în browser.</span>
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
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-300">
          <CheckCircle2 size={12} /> Completat: {state.found.join(", ")}. Verifică datele înainte de trimitere.
        </p>
      )}
      {state.kind === "done" && state.nameAlt && (
        <p className="mt-1.5 text-[11px] text-amber-200">
          Fața actului se citește altfel:{" "}
          <button
            type="button"
            onClick={() => { onPickName(state.nameAlt!); setState({ ...state, nameAlt: undefined }); }}
            className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-semibold hover:bg-amber-500/20"
          >
            {state.nameAlt}
          </button>{" "}— apasă dacă e corect.
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
