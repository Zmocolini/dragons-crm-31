"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { syncEngine } from "@/lib/sync/engine";

const DOC_TYPES: Array<{ key: string; label: string }> = [
  { key: "foto",       label: "Poză profil" },
  { key: "ci",         label: "Carte identitate" },
  { key: "permis",     label: "Permis de conducere" },
  { key: "contract",   label: "Contract" },
  { key: "medical",    label: "Certificat medical" },
  { key: "asigurare",  label: "Asigurare" },
  { key: "alt",        label: "Alt document" },
];

type DocRow = {
  id: number;
  courierId: string;
  docType: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedAtIso: string;
};

export function CourierDocumentsSection({ courierId }: { courierId: string }) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("foto");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents?courierId=${encodeURIComponent(courierId)}`);
      const j = await res.json().catch(() => ({}));
      setDocs(res.ok ? (j.documents ?? []) : []);
    } finally { setLoading(false); }
  }, [courierId]);

  useEffect(() => { refresh(); }, [refresh]);

  const upload = async (file: File) => {
    setError(null);
    if (file.size > 10 * 1024 * 1024) { setError("Fișier prea mare (max 10 MB)"); return; }
    setUploading(true);
    try {
      // Curierul trebuie să existe pe server (verificare de acces) înainte de upload.
      syncEngine.diffNow();
      await syncEngine.flush();
      const form = new FormData();
      form.append("file", file);
      form.append("courierId", courierId);
      form.append("docType", selectedType);
      const res = await fetch("/api/documents", { method: "POST", body: form });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Upload failed"); return; }
      await refresh();
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally { setUploading(false); }
  };

  const download = async (id: number) => {
    const res = await fetch(`/api/documents/${id}`);
    const j = await res.json();
    if (j.url) window.open(j.url, "_blank");
  };

  const remove = async (id: number) => {
    if (!confirm("Ștergi acest document?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    await refresh();
  };

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-fg">Documente și poze</h3>
        <span className="text-[11px] text-fg-dim">{docs.length} fișiere</span>
      </div>

      {/* Upload */}
      <div className="mb-4 rounded-lg border border-dashed border-line bg-card-hover p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-md border border-line bg-card px-2 py-1.5 text-[12.5px] text-fg focus:border-violet-500/60 focus:outline-none"
          >
            {DOC_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); if (fileRef.current) fileRef.current.value = ""; }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-[12.5px] font-semibold text-white",
              uploading && "opacity-50",
            )}
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {uploading ? "Se încarcă…" : "Încarcă fișier"}
          </button>
          <span className="text-[10.5px] text-fg-dim">Max 10 MB · JPG, PNG, PDF</span>
        </div>
        {error && (
          <div className="mt-2 rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[11.5px] text-rose-200">
            {error}
          </div>
        )}
      </div>

      {/* Lista documente */}
      {loading ? (
        <div className="py-6 text-center text-[12px] text-fg-muted">Se încarcă…</div>
      ) : docs.length === 0 ? (
        <div className="py-6 text-center text-[12px] text-fg-muted">Niciun document încă. Încarcă primul mai sus.</div>
      ) : (
        <div className="grid gap-1.5">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded-lg border border-line/60 bg-card-2 p-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-fg-dim">
                {d.contentType.startsWith("image/") ? <ImageIcon size={16} /> : <FileText size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-200">
                    {DOC_TYPES.find((t) => t.key === d.docType)?.label ?? d.docType}
                  </span>
                  <span className="truncate text-[12.5px] font-medium text-fg">{d.filename}</span>
                </div>
                <div className="text-[10.5px] text-fg-dim">
                  {Math.round(d.sizeBytes / 1024)} KB · {new Date(d.uploadedAtIso).toLocaleString("ro-RO")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => download(d.id)}
                title="Descarcă / vizualizează"
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-line bg-card-hover text-fg-muted hover:bg-white/[0.06] hover:text-fg"
              >
                <Download size={12} />
              </button>
              <button
                type="button"
                onClick={() => remove(d.id)}
                title="Șterge"
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
