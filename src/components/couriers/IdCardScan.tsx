"use client";

import { CheckCircle2, IdCard, Loader2, ScanLine, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { parseIdCardText, type IdCardFields } from "@/lib/couriers/id-card";
import { resizeImageFile } from "@/lib/utils/image";

export type ScannedIdDoc = { name: string; size: number; type: string; dataUrl: string };

type State =
  | { kind: "idle" }
  | { kind: "scanning"; pct: number }
  | { kind: "done"; found: string[] }
  | { kind: "failed"; msg: string };

/**
 * Încărcare buletin/permis/pașaport → OCR local în browser (tesseract.js).
 * Imaginea NU pleacă din browser: se descarcă doar motorul OCR, nu se trimit date.
 */
export function IdCardScan({ onScanned }: { onScanned: (fields: IdCardFields, doc: ScannedIdDoc) => void }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function scan(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setState({ kind: "failed", msg: "Încarcă o poză (JPG/PNG) a actului, nu PDF." });
      return;
    }
    setState({ kind: "scanning", pct: 0 });
    try {
      // 2000px păstrează lizibilă zona MRZ; varianta mică (800px) e cea salvată ca document.
      const [ocrSrc, docUrl] = await Promise.all([
        resizeImageFile(file, 2000, { format: "jpeg", quality: 0.92 }),
        resizeImageFile(file, 1200, { format: "jpeg", quality: 0.8 }),
      ]);
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m) => { if (m.status === "recognizing text") setState({ kind: "scanning", pct: Math.round(m.progress * 100) }); },
      });
      const { data } = await worker.recognize(ocrSrc);
      await worker.terminate();

      const fields = parseIdCardText(data.text);
      onScanned(fields, { name: `Act identitate · ${file.name}`, size: file.size, type: "image/jpeg", dataUrl: docUrl });
      const found = [fields.fullName && "nume", fields.cnp && "CNP", fields.expiryIso && "expirare act"].filter(Boolean) as string[];
      setState(found.length
        ? { kind: "done", found }
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
      {state.kind === "failed" && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-300">
          <TriangleAlert size={12} className="mt-px shrink-0" /> {state.msg}
        </p>
      )}
    </div>
  );
}
