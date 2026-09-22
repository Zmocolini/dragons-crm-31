"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import type { CrmDocument, DocumentFileMeta, DocumentStatus, DocumentType } from "./types";
import { buildSeedDocuments } from "./seed";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";

// Extindere client-side a modulului Documente. TODO(real-users): server actions +
// Drizzle + object storage (presigned URLs). Momentan:
// - documente user în localStorage `crm31-documents` (fără binar, ObjectURL doar în sesiune)
// - seed determinist din roster-ul de curieri
// - patch-uri (status/expiry/type/file/deleted) în `crm31-document-patches`
// - activitate + note în localStorage (audit log client-side)

const DOCS_KEY = "crm31-documents";
const PATCHES_KEY = "crm31-document-patches";
const DELETED_KEY = "crm31-document-deleted";
const ACTIVITY_KEY = "crm31-document-activity";
const NOTES_KEY = "crm31-document-notes";
const MAX_DOCUMENTS = 500;

export type DocActivityKind =
  | "uploaded" | "replaced" | "deleted" | "approved" | "rejected"
  | "expiry_changed" | "type_changed" | "ocr_confirmed" | "downloaded"
  | "status_changed" | "note_added" | "requested";

export const DOC_ACTIVITY_LABEL: Record<DocActivityKind, string> = {
  uploaded:       "Document încărcat",
  replaced:       "Document înlocuit",
  deleted:        "Document șters",
  approved:       "Document aprobat",
  rejected:       "Document respins",
  expiry_changed: "Dată expirare modificată",
  type_changed:   "Tip document modificat",
  ocr_confirmed:  "Date OCR confirmate",
  downloaded:     "Document descărcat",
  status_changed: "Status schimbat",
  note_added:     "Notă adăugată",
  requested:      "Documente solicitate",
};

export type DocActivity = {
  id: string;
  subjectId: string;
  docId: string | null;
  kind: DocActivityKind;
  description: string;
  actorName: string;
  createdAtIso: string;
};

export type DocNoteVisibility = "private" | "team" | "tenant";
export type DocNote = {
  id: string;
  subjectId: string;
  text: string;
  authorName: string;
  visibility: DocNoteVisibility;
  createdAtIso: string;
};

type DocPatch = Partial<Pick<CrmDocument, "status" | "expiryIso" | "type" | "file" | "verifiedManually" | "notes" | "ocrProposed">>;

type DocumentsContextValue = {
  hydrated: boolean;
  /** Toate documentele (seed + user) cu patch-uri aplicate, minus șterse — toate flotele. */
  documents: CrmDocument[];
  /** Documentele flotei active (multi-tenant scoping client-side). */
  fleetDocuments: CrmDocument[];
  addDocument: (d: Omit<CrmDocument, "id" | "createdAtIso">, actorName?: string) => CrmDocument;
  documentsForSubject: (subjectId: string) => CrmDocument[];

  setStatus: (id: string, status: DocumentStatus, actorName: string, reason?: string) => void;
  approve: (id: string, actorName: string) => void;
  reject: (id: string, actorName: string, reason?: string) => void;
  replaceFile: (id: string, file: DocumentFileMeta, actorName: string) => void;
  updateExpiry: (id: string, expiryIso: string | null, actorName: string) => void;
  updateType: (id: string, type: DocumentType, actorName: string) => void;
  confirmOcr: (id: string, proposed: Record<string, string>, actorName: string) => void;
  removeDocument: (id: string, actorName: string, reason?: string) => void;
  logDownload: (id: string, actorName: string) => void;
  requestDocuments: (subjectId: string, actorName: string) => void;

  addNote: (subjectId: string, text: string, actorName: string, visibility?: DocNoteVisibility) => void;
  notesForSubject: (subjectId: string) => DocNote[];
  activitiesForSubject: (subjectId: string) => DocActivity[];
};

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

function stripObjectUrl(d: CrmDocument): CrmDocument {
  // Păstrăm dataURL-urile (persistă după refresh). Blob URL-urile sunt curate (expiră la refresh).
  const url = d.file.objectUrl;
  if (url && url.startsWith("data:")) return d;
  return { ...d, file: { ...d.file, objectUrl: null } };
}
function safeRead<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}
function nowIso(): string { return new Date().toISOString(); }

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const { activeFleetId } = useSession();
  const { allRows } = useCouriers();

  const [userDocs, setUserDocs] = useState<CrmDocument[]>([]);
  const [patches, setPatches] = useState<Record<string, DocPatch>>({});
  const [deleted, setDeleted] = useState<string[]>([]);
  const [activity, setActivity] = useState<DocActivity[]>([]);
  const [notes, setNotes] = useState<DocNote[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUserDocs(safeRead<CrmDocument[]>(DOCS_KEY, []));
    setPatches(safeRead<Record<string, DocPatch>>(PATCHES_KEY, {}));
    setDeleted(safeRead<string[]>(DELETED_KEY, []));
    setActivity(safeRead<DocActivity[]>(ACTIVITY_KEY, []));
    setNotes(safeRead<DocNote[]>(NOTES_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DOCS_KEY, JSON.stringify(userDocs.slice(0, MAX_DOCUMENTS).map(stripObjectUrl)));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[documents] localStorage save failed:", err);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("crm31-docs-save-failed"));
      }
    }
  }, [userDocs, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(PATCHES_KEY, JSON.stringify(patches)); } catch {} }, [patches, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(DELETED_KEY, JSON.stringify(deleted)); } catch {} }, [deleted, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity.slice(0, 1000))); } catch {} }, [activity, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); } catch {} }, [notes, hydrated]);

  // seed din roster-ul de curieri (toate flotele; filtrăm mai jos pe fleetId)
  const seedDocs = useMemo(() => buildSeedDocuments(allRows), [allRows]);

  const deletedSet = useMemo(() => new Set(deleted), [deleted]);

  const documents = useMemo(() => {
    const base = [...seedDocs, ...userDocs];
    return base
      .filter((d) => !deletedSet.has(d.id))
      .map((d) => {
        const p = patches[d.id];
        return p ? { ...d, ...p } : d;
      });
  }, [seedDocs, userDocs, patches, deletedSet]);

  const fleetDocuments = useMemo(() => documents.filter((d) => d.fleetId === activeFleetId), [documents, activeFleetId]);

  const pushActivity = useCallback((a: Omit<DocActivity, "id" | "createdAtIso">) => {
    setActivity((prev) => [{ ...a, id: uid("act"), createdAtIso: nowIso() }, ...prev].slice(0, 1000));
  }, []);

  const findDoc = useCallback((id: string) => documents.find((d) => d.id === id) ?? null, [documents]);

  const addDocument = useCallback((d: Omit<CrmDocument, "id" | "createdAtIso">, actorName = "Sistem") => {
    const created: CrmDocument = { ...d, id: uid("doc"), createdAtIso: nowIso() };
    setUserDocs((prev) => [created, ...prev].slice(0, MAX_DOCUMENTS));
    pushActivity({ subjectId: created.subject.id, docId: created.id, kind: "uploaded", description: created.file.name, actorName });
    return created;
  }, [pushActivity]);

  const patchDoc = useCallback((id: string, p: DocPatch) => {
    setPatches((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));
  }, []);

  const setStatus = useCallback((id: string, status: DocumentStatus, actorName: string, reason?: string) => {
    const doc = findDoc(id); patchDoc(id, { status });
    if (doc) pushActivity({ subjectId: doc.subject.id, docId: id, kind: "status_changed", description: `${status}${reason ? " · " + reason : ""}`, actorName });
  }, [findDoc, patchDoc, pushActivity]);

  const approve = useCallback((id: string, actorName: string) => {
    const doc = findDoc(id); patchDoc(id, { status: "approved", verifiedManually: true });
    if (doc) pushActivity({ subjectId: doc.subject.id, docId: id, kind: "approved", description: doc.file.name, actorName });
  }, [findDoc, patchDoc, pushActivity]);

  const reject = useCallback((id: string, actorName: string, reason?: string) => {
    const doc = findDoc(id); patchDoc(id, { status: "rejected", verifiedManually: false, notes: reason ?? null });
    if (doc) pushActivity({ subjectId: doc.subject.id, docId: id, kind: "rejected", description: reason ?? doc.file.name, actorName });
  }, [findDoc, patchDoc, pushActivity]);

  const replaceFile = useCallback((id: string, file: DocumentFileMeta, actorName: string) => {
    const doc = findDoc(id); patchDoc(id, { file, status: "in_review", verifiedManually: false });
    if (doc) pushActivity({ subjectId: doc.subject.id, docId: id, kind: "replaced", description: file.name, actorName });
  }, [findDoc, patchDoc, pushActivity]);

  const updateExpiry = useCallback((id: string, expiryIso: string | null, actorName: string) => {
    const doc = findDoc(id); patchDoc(id, { expiryIso });
    if (doc) pushActivity({ subjectId: doc.subject.id, docId: id, kind: "expiry_changed", description: expiryIso ?? "Nu expiră", actorName });
  }, [findDoc, patchDoc, pushActivity]);

  const updateType = useCallback((id: string, type: DocumentType, actorName: string) => {
    const doc = findDoc(id); patchDoc(id, { type });
    if (doc) pushActivity({ subjectId: doc.subject.id, docId: id, kind: "type_changed", description: type, actorName });
  }, [findDoc, patchDoc, pushActivity]);

  const confirmOcr = useCallback((id: string, proposed: Record<string, string>, actorName: string) => {
    const doc = findDoc(id); patchDoc(id, { ocrProposed: proposed, verifiedManually: true });
    if (doc) pushActivity({ subjectId: doc.subject.id, docId: id, kind: "ocr_confirmed", description: Object.keys(proposed).join(", "), actorName });
  }, [findDoc, patchDoc, pushActivity]);

  const removeDocument = useCallback((id: string, actorName: string, reason?: string) => {
    const doc = findDoc(id);
    setDeleted((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (doc) pushActivity({ subjectId: doc.subject.id, docId: id, kind: "deleted", description: reason ?? doc.file.name, actorName });
  }, [findDoc, pushActivity]);

  const logDownload = useCallback((id: string, actorName: string) => {
    const doc = findDoc(id);
    if (doc) pushActivity({ subjectId: doc.subject.id, docId: id, kind: "downloaded", description: doc.file.name, actorName });
  }, [findDoc, pushActivity]);

  const requestDocuments = useCallback((subjectId: string, actorName: string) => {
    pushActivity({ subjectId, docId: null, kind: "requested", description: "Solicitare documente trimisă curierului.", actorName });
  }, [pushActivity]);

  const addNote = useCallback((subjectId: string, text: string, actorName: string, visibility: DocNoteVisibility = "team") => {
    const note: DocNote = { id: uid("note"), subjectId, text, authorName: actorName, visibility, createdAtIso: nowIso() };
    setNotes((prev) => [note, ...prev]);
    pushActivity({ subjectId, docId: null, kind: "note_added", description: text.slice(0, 60), actorName });
  }, [pushActivity]);

  const documentsForSubject = useCallback((subjectId: string) => documents.filter((d) => d.subject.id === subjectId), [documents]);
  const notesForSubject = useCallback((subjectId: string) => notes.filter((n) => n.subjectId === subjectId), [notes]);
  const activitiesForSubject = useCallback((subjectId: string) => activity.filter((a) => a.subjectId === subjectId), [activity]);

  const value = useMemo<DocumentsContextValue>(() => ({
    hydrated, documents, fleetDocuments, addDocument, documentsForSubject,
    setStatus, approve, reject, replaceFile, updateExpiry, updateType, confirmOcr,
    removeDocument, logDownload, requestDocuments, addNote, notesForSubject, activitiesForSubject,
  }), [hydrated, documents, fleetDocuments, addDocument, documentsForSubject, setStatus, approve, reject, replaceFile, updateExpiry, updateType, confirmOcr, removeDocument, logDownload, requestDocuments, addNote, notesForSubject, activitiesForSubject]);

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error("useDocuments must be used within <DocumentsProvider>");
  return ctx;
}
