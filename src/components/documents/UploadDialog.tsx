"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileUp, Loader2, ScanLine, X } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Select } from "@/components/reports/controls";
import { useDocuments } from "@/lib/documents/context";
import { useSession } from "@/lib/rbac/session";
import { useToast } from "@/components/ui/Toast";
import { DOCUMENT_TYPE_LABEL, DOC_TYPES_WITHOUT_EXPIRY, type DocumentStatus, type DocumentType } from "@/lib/documents/types";
import { fileToMeta, guessDocType, runMockOcr, validateFile, OCR_FIELD_LABEL, type OcrResult } from "@/lib/documents/file-utils";
import { cn } from "@/lib/utils/cn";

const TYPE_OPTIONS = (Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[]).map((t) => ({ value: t, label: DOCUMENT_TYPE_LABEL[t] }));
const STATUS_OPTIONS: Array<{ value: DocumentStatus; label: string }> = [
  { value: "in_review", label: "În verificare" },
  { value: "approved", label: "Aprobat" },
];
const OCR_TYPES: DocumentType[] = ["id_card", "passport", "residence_permit"];

export function UploadDialog({
  open,
  onClose,
  couriers,
  presetCourierId,
}: {
  open: boolean;
  onClose: () => void;
  couriers: Array<{ id: string; fullName: string; city: string; platforms: string[] }>;
  presetCourierId?: string | null;
}) {
  const { addDocument } = useDocuments();
  const { user, activeFleetId } = useSession();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [courierId, setCourierId] = useState(presetCourierId ?? couriers[0]?.id ?? "");
  const [type, setType] = useState<DocumentType>("id_card");
  const [file, setFile] = useState<File | null>(null);
  const [issueIso, setIssueIso] = useState("");
  const [expiryIso, setExpiryIso] = useState("");
  const [noExpiry, setNoExpiry] = useState(false);
  const [status, setStatus] = useState<DocumentStatus>("in_review");
  const [notes, setNotes] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCourierId(presetCourierId ?? couriers[0]?.id ?? "");
      setType("id_card"); setFile(null); setIssueIso(""); setExpiryIso(""); setNoExpiry(false);
      setStatus("in_review"); setNotes(""); setOcr(null); setOcrLoading(false);
    }
  }, [open, presetCourierId, couriers]);

  const courier = couriers.find((c) => c.id === courierId);

  const handleFile = useCallback((f: File) => {
    const v = validateFile(f);
    if (!v.ok) { toast.error("Fișier invalid", v.error); return; }
    setFile(f);
    const guessed = guessDocType(f.name);
    setType(guessed);
    setOcr(null);
    if (OCR_TYPES.includes(guessed) && courier) {
      setOcrLoading(true);
      runMockOcr(f, guessed, courier.fullName).then((res) => { setOcr(res); setOcrLoading(false); });
    }
  }, [toast, courier]);

  const submit = () => {
    if (!courier) { toast.error("Selectează curierul"); return; }
    if (!file) { toast.error("Selectează un fișier"); return; }
    const meta = fileToMeta(file);
    addDocument({
      tenantId: activeFleetId, fleetId: activeFleetId,
      subject: { id: courier.id, name: courier.fullName, kind: "courier", city: courier.city, platform: (courier.platforms[0] as never) ?? null },
      type, status,
      expiryIso: noExpiry ? null : (expiryIso || null),
      file: meta,
      ocrEnabled: OCR_TYPES.includes(type),
      ocrProposed: ocr ? ocr.fields : null,
      verifiedManually: status === "approved",
      notes: notes.trim() || null,
      createdBy: user.name,
    }, user.name);
    toast.success("Document încărcat", `${DOCUMENT_TYPE_LABEL[type]} pentru ${courier.fullName}.`);
    onClose();
  };

  const typeHasExpiry = !DOC_TYPES_WITHOUT_EXPIRY.includes(type);

  return (
    <Dialog open={open} onClose={onClose} title="Încarcă document" description="Trage fișierul sau selectează-l. Tip acceptat: PDF, JPG, PNG, WEBP (max 10 MB)." size="lg">
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Curier</span>
            <Select value={courierId} options={couriers.map((c) => ({ value: c.id, label: c.fullName }))} onChange={setCourierId} ariaLabel="Curier" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Tip document</span>
            <Select value={type} options={TYPE_OPTIONS} onChange={setType} ariaLabel="Tip document" />
          </label>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}
          className={cn("flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors", dragOver ? "border-accent bg-accent/10" : "border-line bg-card-2 hover:border-accent/40")}
        >
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {file ? (
            <div className="flex items-center gap-2 text-[12.5px] text-fg">
              <FileUp size={16} className="text-[color:var(--color-success)]" /> {file.name}
              <span className="text-fg-dim">({(file.size / 1024).toFixed(0)} KB)</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); setOcr(null); }} className="text-fg-dim hover:text-fg"><X size={14} /></button>
            </div>
          ) : (
            <>
              <FileUp size={22} className="text-fg-dim" />
              <span className="text-[12.5px] font-medium text-fg">Trage fișierul aici sau click pentru a selecta</span>
              <span className="text-[11px] text-fg-dim">PDF, JPG, PNG, WEBP · max 10 MB</span>
            </>
          )}
        </div>

        {/* OCR panel */}
        {(ocrLoading || ocr) && (
          <div className="rounded-xl border border-line bg-card-2 p-3">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-fg">
              <ScanLine size={14} className="text-[color:var(--color-accent-3)]" /> Date detectate (OCR)
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-normal text-fg-dim">stub demo — verifică înainte de confirmare</span>
            </div>
            {ocrLoading ? (
              <div className="flex items-center gap-2 py-3 text-[12px] text-fg-muted"><Loader2 size={14} className="animate-spin" /> Se analizează documentul...</div>
            ) : ocr && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ocr.fields).map(([k, v]) => {
                    const low = ocr.confidence[k] < 0.75;
                    return (
                      <div key={k} className="text-[11.5px]">
                        <div className="flex items-center justify-between text-fg-dim">
                          <span>{OCR_FIELD_LABEL[k] ?? k}</span>
                          <span className={cn("tabular-nums", low ? "text-[color:var(--color-warn)]" : "text-[color:var(--color-success)]")}>{Math.round(ocr.confidence[k] * 100)}%</span>
                        </div>
                        <input
                          value={v}
                          onChange={(e) => setOcr((prev) => prev ? { ...prev, fields: { ...prev.fields, [k]: e.target.value } } : prev)}
                          className={cn("mt-0.5 w-full rounded-md border bg-card-hover px-2 py-1 text-[12px] text-fg outline-none focus:border-accent/60", low ? "border-amber-500/40" : "border-line")}
                        />
                        {low && <span className="text-[10px] text-[color:var(--color-warn)]">Necesită verificare</span>}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[10.5px] text-fg-dim">OCR-ul NU modifică automat profilul. Datele sensibile (ex. CNP) rămân pentru confirmare manuală.</p>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Data emiterii</span>
            <input type="date" value={issueIso} onChange={(e) => setIssueIso(e.target.value)} className="w-full rounded-lg border border-line bg-card-hover px-2 py-2 text-[12px] text-fg outline-none focus:border-accent/60 [color-scheme:dark]" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Data expirării</span>
            <input type="date" value={expiryIso} disabled={noExpiry || !typeHasExpiry} onChange={(e) => setExpiryIso(e.target.value)} className={cn("w-full rounded-lg border border-line bg-card-hover px-2 py-2 text-[12px] text-fg outline-none focus:border-accent/60 [color-scheme:dark]", (noExpiry || !typeHasExpiry) && "opacity-50")} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-[12px] text-fg-muted">
          <input type="checkbox" checked={noExpiry} onChange={(e) => setNoExpiry(e.target.checked)} className="h-3.5 w-3.5 accent-violet-500" /> Nu expiră
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Status</span>
            <Select value={status} options={STATUS_OPTIONS} onChange={setStatus} ariaLabel="Status" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Observații</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60" />
        </label>
      </div>

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">Anulează</button>
        <button type="button" onClick={submit} disabled={!file || !courierId} className={cn("rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white", (!file || !courierId) && "opacity-50")}>Încarcă document</button>
      </DialogFooter>
    </Dialog>
  );
}
