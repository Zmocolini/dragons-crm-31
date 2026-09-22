"use client";

import {
  Calendar, Check, CheckCircle2, ChevronDown, FileText, Image as ImageIcon,
  Info, MessageSquare, Search, Sparkles, Upload, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { useCandidates } from "@/lib/candidates/context";
import { useCouriers } from "@/lib/couriers/context";
import type { CourierStatus } from "@/lib/couriers/types";
import type { PlatformKey } from "@/lib/dashboard/types";
import { useDocuments } from "@/lib/documents/context";
import {
  ACCEPTED_EXTENSIONS, ACCEPTED_MIME_TYPES, DOC_TYPES_WITHOUT_EXPIRY,
  DOCUMENT_STATUS_LABEL, DOCUMENT_TYPE_LABEL, MAX_FILE_SIZE_BYTES,
  SUBJECT_KIND_LABEL,
  type DocumentStatus, type DocumentType, type SubjectKind,
} from "@/lib/documents/types";
import { useProfile } from "@/lib/profile/context";
import { useSession } from "@/lib/rbac/session";
import { cn } from "@/lib/utils/cn";
import { resizeImageFile } from "@/lib/utils/image";

// TODO(real-users): server action `uploadDocument(subjectId, file, meta)` cu
// authorize(role, "documents.upload") + upload multipart -> object storage +
// insert Drizzle + notificări responsabil expirare + task automat.

const PLATFORM_LABEL: Record<PlatformKey, string> = {
  bolt: "Bolt Food", wolt: "Wolt", glovo: "Glovo",
};

// Seed subiecți (aliniat cu SEED_COURIERS din alte dialoguri)
const SEED_COURIERS: Array<{
  id: string; name: string; kind: SubjectKind; city: string;
  platform: PlatformKey; status: CourierStatus;
}> = [
  { id: "c_001", name: "Andrei Popescu", kind: "courier", city: "București", platform: "bolt",  status: "active" },
  { id: "c_002", name: "Mihai Ionescu",  kind: "courier", city: "București", platform: "wolt",  status: "active" },
  { id: "c_003", name: "Ravi Kumar",     kind: "courier", city: "Cluj",      platform: "glovo", status: "active" },
  { id: "c_004", name: "Fatima Ali",     kind: "courier", city: "Timișoara", platform: "bolt",  status: "in_activation" },
  { id: "c_005", name: "Carlos Mendes",  kind: "courier", city: "București", platform: "wolt",  status: "paused" },
];

// Mock subcontractori (până apare CRUD real)
const SEED_SUBCONTRACTORS: Array<{
  id: string; name: string; kind: SubjectKind; city: string; platform: PlatformKey | null;
}> = [
  { id: "sub_001", name: "Dragonfly Cluj SRL",    kind: "subcontractor", city: "Cluj",      platform: null },
  { id: "sub_002", name: "Fast Wheels Timișoara", kind: "subcontractor", city: "Timișoara", platform: null },
];

type Subject = {
  id: string;
  name: string;
  kind: SubjectKind;
  city: string | null;
  platform: PlatformKey | null;
};

function formatDateShort(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });
  } catch { return iso; }
}
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
function inTwoYears(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  return d.toISOString().slice(0, 10);
}

type UploadState = "idle" | "uploading" | "success" | "error";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Subiect pre-selectat (când modalul se deschide din profilul unei persoane). */
  prefillSubjectId?: string;
};

export function UploadDocumentDialog({ open, onClose, prefillSubjectId }: Props) {
  const { user, activeFleetId, fleets } = useSession();
  const { couriers } = useCouriers();
  const { candidates } = useCandidates();
  const { addDocument } = useDocuments();
  const { logActivity } = useProfile();
  const toast = useToast();

  // ── Subjects (curier + candidat + subcontractor) ────────────────────────────
  const allSubjects: Subject[] = useMemo(() => {
    const liveCouriers: Subject[] = couriers.map((c) => ({
      id: c.id, name: c.fullName, kind: "courier",
      city: c.city || null, platform: c.platforms[0] ?? null,
    }));
    const liveCandidates: Subject[] = candidates.map((c) => ({
      id: c.id, name: c.fullName, kind: "candidate",
      city: c.city || null, platform: c.desiredPlatforms[0] ?? null,
    }));
    const seedC: Subject[] = SEED_COURIERS
      .filter((s) => !liveCouriers.some((l) => l.id === s.id))
      .map((s) => ({ id: s.id, name: s.name, kind: s.kind, city: s.city, platform: s.platform }));
    const subs: Subject[] = SEED_SUBCONTRACTORS.map((s) => ({
      id: s.id, name: s.name, kind: s.kind, city: s.city, platform: s.platform,
    }));
    return [...liveCouriers, ...liveCandidates, ...seedC, ...subs];
  }, [couriers, candidates]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [subjectId, setSubjectId] = useState<string>(prefillSubjectId ?? "");
  const [docType, setDocType] = useState<DocumentType>("id_card");
  const [expiryIso, setExpiryIso] = useState<string>(inTwoYears());
  const [noExpiry, setNoExpiry] = useState(false);
  const [status, setStatus] = useState<DocumentStatus>("in_review");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ocrEnabled, setOcrEnabled] = useState(true);
  const [notes, setNotes] = useState("");
  const [verifiedManually, setVerifiedManually] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  // Reset la deschidere
  useEffect(() => {
    if (!open) return;
    setSubjectId(prefillSubjectId ?? "");
    setDocType("id_card");
    setExpiryIso(inTwoYears());
    setNoExpiry(false);
    setStatus("in_review");
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(null);
    setFileUrl(null);
    setUploadState("idle");
    setUploadProgress(0);
    setUploadError(null);
    setOcrEnabled(true);
    setNotes("");
    setVerifiedManually(false);
    setErrors({});
    setIsDragging(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillSubjectId]);

  // Cleanup ObjectURL la unmount
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  // Auto-toggle noExpiry pe baza tipului de document
  useEffect(() => {
    if (DOC_TYPES_WITHOUT_EXPIRY.includes(docType) && !noExpiry) {
      setNoExpiry(true);
    }
  }, [docType, noExpiry]);

  // ── Subject dropdown ───────────────────────────────────────────────────────
  const [subjOpen, setSubjOpen] = useState(false);
  const [subjSearch, setSubjSearch] = useState("");
  const subjRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!subjOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (subjRef.current && !subjRef.current.contains(e.target as Node)) setSubjOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [subjOpen]);

  const filteredSubjects = useMemo(() => {
    const q = subjSearch.trim().toLowerCase();
    if (!q) return allSubjects;
    return allSubjects.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.city ?? "").toLowerCase().includes(q),
    );
  }, [allSubjects, subjSearch]);

  const selectedSubject = useMemo(
    () => allSubjects.find((s) => s.id === subjectId) ?? null,
    [allSubjects, subjectId],
  );

  // ── File pick + validate ──────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null | undefined) {
    if (!f) return;
    setUploadError(null);
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    const mimeOk = (ACCEPTED_MIME_TYPES as readonly string[]).includes(f.type);
    const extOk = (ACCEPTED_EXTENSIONS as readonly string[]).includes(ext);
    if (!mimeOk && !extOk) {
      setUploadState("error");
      setUploadError("Format nesuportat. Acceptate: PDF, JPG, PNG.");
      toast.error("Format invalid", "Doar PDF, JPG sau PNG sunt acceptate.");
      return;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      setUploadState("error");
      setUploadError(`Fișier prea mare (${formatFileSize(f.size)}). Maxim 10 MB.`);
      toast.error("Fișier prea mare", "Dimensiunea maximă acceptată este 10 MB.");
      return;
    }
    if (fileUrl && fileUrl.startsWith("blob:")) URL.revokeObjectURL(fileUrl);
    setFile(f);
    setFileUrl(null);
    setUploadState("uploading");
    // Convertesc la dataURL comprimat (imagini) sau raw (PDF) → persistă în localStorage.
    const isImage = f.type.startsWith("image/");
    if (isImage) {
      resizeImageFile(f, 800, { format: "jpeg", quality: 0.75 })
        .then((url) => setFileUrl(url))
        .catch(() => toast.error("Eroare", "Nu s-a putut procesa imaginea."));
    } else {
      const reader = new FileReader();
      reader.onload = () => setFileUrl(reader.result as string);
      reader.onerror = () => toast.error("Eroare", "Nu s-a putut citi fișierul.");
      reader.readAsDataURL(f);
    }
    setUploadProgress(0);
    // Simulare upload (server real ar streama către S3 cu XHR onprogress)
    const start = Date.now();
    const total = 900 + Math.random() * 600;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / total) * 100));
      setUploadProgress(pct);
      if (pct < 100) requestAnimationFrame(tick);
      else setUploadState("success");
    };
    requestAnimationFrame(tick);
  }

  function clearFile() {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(null);
    setFileUrl(null);
    setUploadState("idle");
    setUploadProgress(0);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  }

  // ── Dirty tracking + close ────────────────────────────────────────────────
  const isDirty = !!file || !!subjectId || notes.length > 0 || verifiedManually;
  function requestClose() {
    if (isDirty && !window.confirm("Ai modificări nesalvate. Închizi fără să salvezi?")) return;
    onClose();
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!subjectId) e.subject = "Alege persoana pentru care încarci documentul.";
    if (!file) e.file = "Încarcă un fișier.";
    if (uploadState === "uploading") e.file = "Așteaptă finalizarea upload-ului.";
    if (uploadState === "error") e.file = uploadError ?? "Corectează fișierul.";
    if (!noExpiry && !expiryIso) e.expiry = 'Selectează data expirării sau bifează „Nu expiră".';
    return e;
  }

  function submit(asDraft: boolean) {
    const eMap = validate();
    if (Object.keys(eMap).length > 0) {
      setErrors(eMap);
      toast.error("Corectează câmpurile", Object.values(eMap)[0]);
      return;
    }
    if (!selectedSubject || !file) return;
    setErrors({});

    const finalStatus: DocumentStatus = asDraft
      ? "in_review"
      : verifiedManually ? "approved" : status;

    const activeFleet = fleets.find((f) => f.id === activeFleetId);

    // Mock OCR proposed data
    const ocrProposed = ocrEnabled ? {
      "Nume":           selectedSubject.name,
      "Serie":          "AX 123456",
      "Data expirării": noExpiry ? "—" : formatDateShort(expiryIso),
    } : null;

    // Ascult failure event, notific dacă storage e plin.
    const onSaveFailed = () => toast.error("Storage plin", "Documentul e vizibil acum, dar nu încape în browser storage. Refresh-ul l-a pierde. Șterge alte documente vechi sau folosește imagini mai mici.");
    if (typeof window !== "undefined") window.addEventListener("crm31-docs-save-failed", onSaveFailed, { once: true });
    setTimeout(() => { if (typeof window !== "undefined") window.removeEventListener("crm31-docs-save-failed", onSaveFailed); }, 800);

    const created = addDocument({
      tenantId: activeFleetId,
      fleetId:  activeFleetId,
      subject: {
        id: selectedSubject.id, name: selectedSubject.name, kind: selectedSubject.kind,
        city: selectedSubject.city, platform: selectedSubject.platform,
      },
      type: docType,
      status: finalStatus,
      expiryIso: noExpiry ? null : expiryIso,
      file: {
        name: file.name, size: file.size, type: file.type, objectUrl: fileUrl,
      },
      ocrEnabled,
      ocrProposed,
      verifiedManually,
      notes: notes.trim() || null,
      createdBy: user.name,
    });

    logActivity(
      "document.activate",
      [
        selectedSubject.name,
        DOCUMENT_TYPE_LABEL[docType],
        DOCUMENT_STATUS_LABEL[finalStatus],
        file.name,
        activeFleet?.name ?? "",
      ].filter(Boolean).join(" · "),
    );

    toast.success(
      asDraft ? "Document salvat ca neconfirmat" : "Document încărcat",
      `${selectedSubject.name} · ${DOCUMENT_TYPE_LABEL[docType]} · ${DOCUMENT_STATUS_LABEL[finalStatus]}`,
    );

    // Nu revoc ObjectURL — trăiește prin doc.file.objectUrl pentru preview în sesiune
    setFileUrl(null);
    onClose();
    void created;
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-document-title"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={requestClose}
    >
      <div
        className="relative my-6 flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-line/60 px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 id="upload-document-title" className="text-[20px] font-bold text-fg">
              Încarcă document
            </h2>
            <p className="mt-0.5 text-[13px] text-fg-muted">
              Adaugă și asociază un document unui curier, candidat sau subcontractor.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Închide"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Row 1 — Asociază documentul + Detalii document */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Asociază documentul */}
            <section className="rounded-xl border border-line/60 bg-white/[0.02] p-4">
              <h3 className="mb-3 text-[13.5px] font-bold text-fg">Asociază documentul</h3>
              <Field label="Persoană / Subcontractor" required error={errors.subject}>
                <div ref={subjRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setSubjOpen((v) => !v)}
                    className="flex w-full items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2 text-left text-[13px] text-fg hover:border-line/80"
                  >
                    <Search size={14} className="text-fg-dim" />
                    <span className="flex-1 truncate">
                      {selectedSubject?.name ?? "Caută curier, candidat sau subcontractor..."}
                    </span>
                    <ChevronDown size={14} className="text-fg-dim" />
                  </button>
                  {subjOpen && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-hidden rounded-lg border border-line bg-card shadow-2xl">
                      <div className="border-b border-line/60 px-3 py-2">
                        <input
                          autoFocus
                          value={subjSearch}
                          onChange={(e) => setSubjSearch(e.target.value)}
                          placeholder="Caută după nume sau oraș..."
                          className="w-full bg-transparent text-[12.5px] text-fg placeholder:text-fg-dim focus:outline-none"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredSubjects.length === 0 ? (
                          <div className="px-3 py-3 text-[12px] text-fg-dim">Niciun rezultat.</div>
                        ) : (
                          filteredSubjects.map((s) => (
                            <button
                              key={`${s.kind}-${s.id}`}
                              type="button"
                              onClick={() => { setSubjectId(s.id); setSubjOpen(false); setSubjSearch(""); }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-card-hover"
                            >
                              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 text-[10.5px] font-bold text-fg">
                                {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[12.5px] font-medium text-fg">{s.name}</div>
                                <div className="truncate text-[11px] text-fg-dim">
                                  {SUBJECT_KIND_LABEL[s.kind]}{s.city && ` · ${s.city}`}
                                  {s.platform && ` · ${PLATFORM_LABEL[s.platform]}`}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Field>

              {selectedSubject && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-line/60 bg-white/[0.02] p-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/40 to-blue-500/40 text-[11px] font-bold text-fg">
                    {selectedSubject.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-fg">
                      {selectedSubject.name}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-fg-muted">
                      {SUBJECT_KIND_LABEL[selectedSubject.kind]}
                      {selectedSubject.city && ` · ${selectedSubject.city}`}
                      {selectedSubject.platform && ` · ${PLATFORM_LABEL[selectedSubject.platform]}`}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Detalii document */}
            <section className="rounded-xl border border-line/60 bg-white/[0.02] p-4">
              <h3 className="mb-3 text-[13.5px] font-bold text-fg">Detalii document</h3>
              <Field label="Tip document">
                <div className="flex items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2">
                  <FileText size={14} className="text-fg-dim" />
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DocumentType)}
                    className="w-full bg-transparent text-[13px] text-fg focus:outline-none"
                  >
                    {(Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[]).map((t) => (
                      <option key={t} value={t} className="bg-card text-fg">
                        {DOCUMENT_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Data expirării" error={errors.expiry}>
                  <div className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2",
                    noExpiry ? "border-line/40 bg-white/[0.01] opacity-60" : "border-line bg-card-hover",
                  )}>
                    <Calendar size={14} className="text-fg-dim" />
                    <input
                      type="date"
                      value={expiryIso}
                      onChange={(e) => setExpiryIso(e.target.value)}
                      disabled={noExpiry}
                      className="min-w-0 flex-1 bg-transparent text-[12.5px] text-fg focus:outline-none"
                    />
                  </div>
                  <label className="mt-1 inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-fg-muted">
                    <input
                      type="checkbox"
                      checked={noExpiry}
                      onChange={(e) => setNoExpiry(e.target.checked)}
                      className="h-3 w-3 accent-violet-500"
                    />
                    Nu expiră
                  </label>
                </Field>

                <Field label="Status">
                  <div className="flex items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2">
                    <span className={cn("h-2 w-2 rounded-full", {
                      "bg-sky-400":     status === "in_review",
                      "bg-emerald-400": status === "approved",
                      "bg-rose-400":    status === "rejected",
                      "bg-amber-400":   status === "expired",
                      "bg-fg-dim":      status === "missing",
                    })} />
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as DocumentStatus)}
                      className="w-full bg-transparent text-[13px] text-fg focus:outline-none"
                    >
                      {(Object.keys(DOCUMENT_STATUS_LABEL) as DocumentStatus[]).map((s) => (
                        <option key={s} value={s} className="bg-card text-fg">
                          {DOCUMENT_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
              </div>
            </section>
          </div>

          {/* Drop zone / file preview */}
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                isDragging ? "border-violet-500 bg-violet-500/[0.06]" : "border-line bg-white/[0.02]",
              )}
            >
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/[0.04] text-fg-muted">
                <FileText size={24} />
              </span>
              <div className="text-[14px] font-semibold text-fg">
                Trage fișierul aici sau încarcă de pe dispozitiv
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(99,102,241,0.55)] hover:shadow-[0_8px_22px_-6px_rgba(99,102,241,0.7)]"
              >
                <Upload size={14} strokeWidth={2.4} />
                Alege fișier
              </button>
              <div className="text-[11.5px] text-fg-dim">
                PDF, JPG, PNG · maxim 10 MB
              </div>
              {errors.file && (
                <div className="text-[11.5px] text-rose-400">{errors.file}</div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(",") + "," + ACCEPTED_MIME_TYPES.join(",")}
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-line/60 bg-white/[0.02] p-3">
              <div className="flex items-center gap-3">
                <FileBadge fileName={file.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-fg">
                    {file.name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-fg-muted">
                    <span>{formatFileSize(file.size)}</span>
                    {uploadState === "uploading" && <span>· {uploadProgress}%</span>}
                  </div>
                  {uploadState === "uploading" && (
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
                {uploadState === "success" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                    <CheckCircle2 size={11} strokeWidth={2.5} />
                    Încărcat
                  </span>
                )}
                {uploadState === "error" && (
                  <span className="rounded-md bg-rose-500/20 px-2 py-1 text-[11px] font-semibold text-rose-300">
                    Eroare
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearFile}
                  aria-label="Șterge fișier"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* OCR toggle */}
          <div className="flex items-start gap-3 rounded-xl border border-line/60 bg-white/[0.02] p-3">
            <Switch checked={ocrEnabled} onChange={setOcrEnabled} ariaLabel="Extrage date automat (OCR)" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
                <Sparkles size={13} className="text-violet-300" />
                Extrage date automat (OCR)
              </div>
              <div className="mt-0.5 text-[11.5px] text-fg-muted">
                Numele, seria, data expirării și alte date sunt propuse pentru verificare.
              </div>
              {ocrEnabled && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] text-fg-dim">
                  <Info size={10} />
                  OCR doar propune; datele sensibile necesită verificare umană.
                </div>
              )}
            </div>
          </div>

          {/* Notes + Verified manually */}
          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <Field label="Observații (opțional)">
              <div className="flex items-start gap-2 rounded-lg border border-line bg-card-hover px-3 py-2">
                <MessageSquare size={14} className="mt-0.5 text-fg-dim" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adaugă observații despre document..."
                  rows={2}
                  className="w-full resize-none bg-transparent text-[13px] text-fg placeholder:text-fg-dim focus:outline-none"
                />
              </div>
            </Field>

            <label className="mt-6 inline-flex cursor-pointer items-center gap-2 self-start text-[13px] text-fg">
              <input
                type="checkbox"
                checked={verifiedManually}
                onChange={(e) => setVerifiedManually(e.target.checked)}
                className="h-4 w-4 accent-violet-500"
              />
              <span>Documentul este verificat manual</span>
              {verifiedManually && (
                <span className="ml-1 inline-flex items-center gap-0.5 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-300">
                  <Check size={10} strokeWidth={3} /> va fi „Aprobat"
                </span>
              )}
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-line/60 bg-white/[0.02] px-6 py-4">
          <button
            type="button"
            onClick={requestClose}
            className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[13px] font-medium text-fg hover:bg-white/[0.06]"
          >
            Anulează
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => submit(true)}
              className="text-[13px] font-medium text-violet-300 underline decoration-violet-400/40 underline-offset-4 hover:text-violet-200"
            >
              Salvează ca neconfirmat
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={uploadState === "uploading"}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(99,102,241,0.55)] hover:shadow-[0_8px_22px_-6px_rgba(99,102,241,0.7)]",
                uploadState === "uploading" && "cursor-wait opacity-70",
              )}
            >
              <Upload size={14} strokeWidth={2.4} />
              Încarcă documentul
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Field({
  label, required, error, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </div>
  );
}

function FileBadge({ fileName }: { fileName: string }) {
  const ext = fileName.slice(fileName.lastIndexOf(".") + 1).toUpperCase();
  const isImage = ["JPG", "JPEG", "PNG"].includes(ext);
  const bg = ext === "PDF" ? "bg-rose-500/20 text-rose-300"
    : isImage ? "bg-sky-500/20 text-sky-300"
    : "bg-white/[0.06] text-fg-muted";
  return (
    <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold", bg)}>
      {isImage ? <ImageIcon size={16} /> : ext.slice(0, 3)}
    </span>
  );
}
