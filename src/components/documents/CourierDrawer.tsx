"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Download, ExternalLink, FileText, MoreHorizontal, RefreshCw,
  Trash2, Upload, X, XCircle,
} from "lucide-react";
import { Popover } from "@/components/reports/controls";
import { CourierAvatar } from "@/components/reports/bits";
import { StatusDot } from "@/components/reports/bits";
import { ConfirmDialog, RejectDialog } from "./dialogs";
import { ddmmyyyy } from "./status-bits";
import { useDocuments } from "@/lib/documents/context";
import { DOC_ACTIVITY_LABEL } from "@/lib/documents/context";
import { useSession } from "@/lib/rbac/session";
import { useToast } from "@/components/ui/Toast";
import { DOCUMENT_STATUS_LABEL, DOCUMENT_TYPE_LABEL, type CrmDocument } from "@/lib/documents/types";
import { NATIONALITY_LABEL } from "@/lib/candidates/types";
import { VEHICLE_TYPE_LABEL } from "@/lib/couriers/types";
import { fileToMeta, validateFile } from "@/lib/documents/file-utils";
import { daysUntil } from "@/lib/documents/rules";
import type { CourierDocRow } from "@/lib/documents/rules";
import { PlatformBadges } from "./status-bits";
import { cn } from "@/lib/utils/cn";

type DrawerTab = "docs" | "info" | "activity" | "notes";

const STATUS_COLOR: Record<string, string> = {
  approved: "text-[color:var(--color-success)]",
  in_review: "text-[color:var(--color-warn)]",
  rejected: "text-[color:var(--color-danger)]",
  expired: "text-[color:var(--color-danger)]",
  missing: "text-fg-dim",
};

export function CourierDrawer({
  row,
  onClose,
  onUpload,
  canManage,
  canDelete,
}: {
  row: CourierDocRow;
  onClose: () => void;
  onUpload: (courierId: string) => void;
  canManage: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const docsCtx = useDocuments();
  const { user, can } = useSession();
  const toast = useToast();
  const replaceRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<DrawerTab>("docs");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<CrmDocument | null>(null);
  const [rejectDoc, setRejectDoc] = useState<CrmDocument | null>(null);
  const [replaceForId, setReplaceForId] = useState<string | null>(null);

  const c = row.courier;
  const docs = useMemo(() => docsCtx.documentsForSubject(c.id), [docsCtx, c.id]);
  const notes = docsCtx.notesForSubject(c.id);
  const activity = docsCtx.activitiesForSubject(c.id);
  const selectedDoc = docs.find((d) => d.id === selectedDocId) ?? null;

  const doDownload = (d: CrmDocument) => {
    if (d.file.objectUrl) {
      const a = document.createElement("a"); a.href = d.file.objectUrl; a.download = d.file.name; a.click();
      docsCtx.logDownload(d.id, user.name);
      toast.success("Descărcare pornită", d.file.name);
    } else {
      toast.info("Fișier indisponibil", "Documentul seed nu are binar în sesiune. Încarcă un fișier real pentru descărcare.");
    }
  };
  const triggerReplace = (docId: string) => { setReplaceForId(docId); replaceRef.current?.click(); };
  const onReplaceFile = (f: File) => {
    if (!replaceForId) return;
    const v = validateFile(f); if (!v.ok) { toast.error("Fișier invalid", v.error); return; }
    docsCtx.replaceFile(replaceForId, fileToMeta(f), user.name);
    toast.success("Document înlocuit", `${f.name} → în verificare.`);
    setReplaceForId(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-line bg-panel shadow-2xl">
        <input ref={replaceRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onReplaceFile(f); e.target.value = ""; }} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-[13px] font-semibold text-fg">Detalii curier</span>
          <button type="button" onClick={onClose} aria-label="Închide" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.06] hover:text-fg"><X size={16} /></button>
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <CourierAvatar name={c.fullName} size={44} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold text-fg">{c.fullName}</div>
            <StatusDot status={c.status} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-line px-3">
          {([["docs", "Documente"], ["info", "Informații"], ["activity", "Activitate"], ["notes", "Note"]] as Array<[DrawerTab, string]>).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn("relative px-2.5 py-2 text-[12.5px] font-medium", tab === k ? "text-fg" : "text-fg-muted hover:text-fg")}>
              {l}{tab === k && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "docs" && (
            <div className="flex flex-col">
              {canManage && (
                <button type="button" onClick={() => onUpload(c.id)} className="m-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-2 text-[12.5px] font-medium text-fg-muted hover:border-accent/40 hover:text-fg">
                  <Upload size={14} /> Încarcă document pentru {c.fullName.split(" ")[0]}
                </button>
              )}
              {docs.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="text-[12.5px] text-fg-muted">Curierul nu are documente încărcate.</div>
                  {canManage && <button type="button" onClick={() => onUpload(c.id)} className="mt-2 text-[12px] font-medium text-[color:var(--color-info)] hover:underline">Încarcă document</button>}
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-line/60 px-1">
                  {docs.map((d) => {
                    const dl = daysUntil(d.expiryIso);
                    return (
                      <div key={d.id} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/[0.02]", selectedDocId === d.id && "bg-accent/[0.06]")}>
                        <button type="button" onClick={() => setSelectedDocId(d.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                          <FileText size={16} className="shrink-0 text-fg-dim" />
                          <span className="min-w-0">
                            <span className="block truncate text-[12.5px] font-medium text-fg">{DOCUMENT_TYPE_LABEL[d.type]}</span>
                            <span className="block truncate text-[11px] text-fg-dim">{d.file.name} · {ddmmyyyy(d.createdAtIso)}</span>
                          </span>
                        </button>
                        <div className="shrink-0 text-right">
                          <span className={cn("text-[11px] font-medium", STATUS_COLOR[d.status] ?? "text-fg-muted")}>
                            {d.expiryIso && dl !== null && dl >= 0 && dl <= 30 ? `Expiră în ${dl} zile` : DOCUMENT_STATUS_LABEL[d.status]}
                          </span>
                          {d.expiryIso && <span className="block text-[10px] text-fg-dim">{ddmmyyyy(d.expiryIso)}</span>}
                        </div>
                        <DocMenu
                          canManage={canManage} canDelete={canDelete}
                          onView={() => setSelectedDocId(d.id)}
                          onDownload={() => doDownload(d)}
                          onReplace={() => triggerReplace(d.id)}
                          onApprove={() => { docsCtx.approve(d.id, user.name); toast.success("Marcat verificat", d.file.name); }}
                          onReject={() => setRejectDoc(d)}
                          onHistory={() => setTab("activity")}
                          onDelete={() => setConfirmDelete(d)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Preview */}
              {selectedDoc && (
                <div className="m-3 rounded-xl border border-line bg-card-2 p-2">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="truncate text-[12px] font-medium text-fg">{selectedDoc.file.name}</span>
                    <span className="text-[10.5px] text-fg-dim">{DOCUMENT_TYPE_LABEL[selectedDoc.type]}</span>
                  </div>
                  <DocPreview doc={selectedDoc} />
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" onClick={() => doDownload(selectedDoc)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-card-hover py-1.5 text-[12px] font-medium text-fg hover:bg-white/[0.06]"><Download size={13} /> Descarcă</button>
                    {canManage && <button type="button" onClick={() => triggerReplace(selectedDoc.id)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-card-hover py-1.5 text-[12px] font-medium text-fg hover:bg-white/[0.06]"><RefreshCw size={13} /> Înlocuiește</button>}
                    {canDelete && <button type="button" onClick={() => setConfirmDelete(selectedDoc)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[12px] font-medium text-[color:var(--color-danger)] hover:bg-rose-500/15"><Trash2 size={13} /></button>}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "info" && (
            <div className="flex flex-col gap-2.5 p-4">
              <InfoRow label="Naționalitate" value={NATIONALITY_LABEL[c.nationality]} />
              <InfoRow label="Oraș" value={c.city} />
              <InfoRow label="Telefon" value={c.phone} />
              <InfoRow label="Email" value={c.email ?? "—"} />
              <div className="flex items-center justify-between gap-3 py-1"><span className="text-[12px] text-fg-dim">Platforme</span><PlatformBadges platforms={c.platforms} /></div>
              <InfoRow label="Vehicul" value={VEHICLE_TYPE_LABEL[c.vehicleType]} />
              {can("subcontractors.view") && <InfoRow label="Subcontractor" value={c.subcontractorName ?? "Flotă directă"} />}
              <InfoRow label="ID intern" value={`#${c.id.toUpperCase()}`} />
              <InfoRow label="Data adăugării" value={ddmmyyyy(c.createdAtIso)} />
              <button type="button" onClick={() => router.push(`/curieri/${c.id}`)} className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-card-hover py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">
                <ExternalLink size={14} /> Vezi profil complet
              </button>
            </div>
          )}

          {tab === "activity" && (
            <div className="p-4">
              {activity.length === 0 ? (
                <div className="py-8 text-center text-[12.5px] text-fg-muted">Nicio activitate înregistrată.</div>
              ) : (
                <ol className="relative ml-1.5 flex flex-col gap-3 border-l border-line pl-4">
                  {activity.map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-accent" />
                      <div className="text-[12.5px] font-medium text-fg">{DOC_ACTIVITY_LABEL[a.kind]}</div>
                      <div className="text-[11.5px] text-fg-muted">{a.description}</div>
                      <div className="text-[10.5px] text-fg-dim">{new Date(a.createdAtIso).toLocaleString("ro-RO")} · {a.actorName}</div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {tab === "notes" && (
            <div className="flex flex-col gap-3 p-4">
              <div>
                <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} placeholder="Adaugă o notă..." className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60" />
                <button type="button" disabled={!noteText.trim()} onClick={() => { docsCtx.addNote(c.id, noteText, user.name); setNoteText(""); toast.success("Notă salvată"); }} className={cn("mt-2 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-[12.5px] font-semibold text-white", !noteText.trim() && "opacity-50")}>Salvează</button>
              </div>
              <div className="flex flex-col gap-2">
                {notes.length === 0 ? <div className="text-[12px] text-fg-dim">Nicio notă încă.</div> : notes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-line bg-card-2 p-2.5">
                    <div className="text-[12.5px] text-fg">{n.text}</div>
                    <div className="mt-1 text-[10.5px] text-fg-dim">{n.authorName} · {new Date(n.createdAtIso).toLocaleString("ro-RO")} · {n.visibility}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Șterge document"
        message={`Sigur vrei să ștergi „${confirmDelete?.file.name}"? Acțiunea e înregistrată în audit log.`}
        confirmLabel="Șterge" danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) { docsCtx.removeDocument(confirmDelete.id, user.name); toast.success("Document șters", confirmDelete.file.name); if (selectedDocId === confirmDelete.id) setSelectedDocId(null); } setConfirmDelete(null); }}
      />
      <RejectDialog
        open={!!rejectDoc} docName={rejectDoc?.file.name ?? ""}
        onCancel={() => setRejectDoc(null)}
        onConfirm={(reason) => { if (rejectDoc) { docsCtx.reject(rejectDoc.id, user.name, reason); toast.success("Document respins", rejectDoc.file.name); } setRejectDoc(null); }}
      />
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 py-1"><span className="text-[12px] text-fg-dim">{label}</span><span className="max-w-[220px] truncate text-[12.5px] font-medium text-fg">{value}</span></div>;
}

function DocPreview({ doc }: { doc: CrmDocument }) {
  const url = doc.file.objectUrl;
  const isImage = doc.file.type.startsWith("image/");
  if (!url) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-card text-center">
        <FileText size={22} className="text-fg-dim" />
        <span className="text-[11.5px] text-fg-muted">Preview indisponibil</span>
        <span className="text-[10.5px] text-fg-dim">Fișier seed / neîncărcat în sesiune</span>
      </div>
    );
  }
  if (isImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={doc.file.name} className="max-h-56 w-full rounded-lg object-contain" />;
  }
  return <iframe src={url} title={doc.file.name} className="h-56 w-full rounded-lg border border-line" />;
}

function DocMenu({
  canManage, canDelete, onView, onDownload, onReplace, onApprove, onReject, onHistory, onDelete,
}: {
  canManage: boolean; canDelete: boolean;
  onView: () => void; onDownload: () => void; onReplace: () => void; onApprove: () => void; onReject: () => void; onHistory: () => void; onDelete: () => void;
}) {
  const items = [
    { label: "Vezi", icon: FileText, fn: onView, show: true, danger: false },
    { label: "Descarcă", icon: Download, fn: onDownload, show: true, danger: false },
    { label: "Înlocuiește", icon: RefreshCw, fn: onReplace, show: canManage, danger: false },
    { label: "Marchează verificat", icon: CheckCircle2, fn: onApprove, show: canManage, danger: false },
    { label: "Marchează respins", icon: XCircle, fn: onReject, show: canManage, danger: false },
    { label: "Istoric", icon: FileText, fn: onHistory, show: true, danger: false },
    { label: "Șterge", icon: Trash2, fn: onDelete, show: canDelete, danger: true },
  ];
  return (
    <Popover align="right" className="w-[190px] p-1"
      trigger={({ toggle }) => <button type="button" onClick={toggle} aria-label="Acțiuni document" className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.06] hover:text-fg"><MoreHorizontal size={15} /></button>}
    >
      {(close) => (
        <div className="flex flex-col">
          {items.filter((i) => i.show).map((i) => { const Icon = i.icon; return (
            <button key={i.label} type="button" onClick={() => { i.fn(); close(); }} className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-white/[0.05]", i.danger ? "text-[color:var(--color-danger)]" : "text-fg")}>
              <Icon size={14} className={i.danger ? "" : "text-fg-dim"} /> {i.label}
            </button>
          ); })}
        </div>
      )}
    </Popover>
  );
}
