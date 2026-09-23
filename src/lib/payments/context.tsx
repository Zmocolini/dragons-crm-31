"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import {
  calculateTotal,
  type Payment, type PaymentActivity, type PaymentActivityKind,
  type PaymentBreakdown, type PaymentDocumentRef, type PaymentNote,
  type PaymentStatus,
} from "./types";
import { SEED_PAYMENTS } from "./seed";
import { useSession } from "@/lib/rbac/session";

// TODO(real-users): server action `createPayment(input)` cu authorize(role, "payments.create")
// + insert în tabelul `payments` + audit log server-side. Momentan: seed determinist +
// overlay de patch-uri/activități/note/documente per paymentId, persistat în localStorage.

const KEY_USER  = "crm31-payments";           // plăți adăugate manual
const KEY_PATCH = "crm31-payment-patches";    // modificări peste seed/user
const KEY_ACT   = "crm31-payment-activities"; // audit log
const KEY_NOTES = "crm31-payment-notes";
const KEY_DOCS  = "crm31-payment-documents";
const KEY_DEL   = "crm31-payment-deleted";

type Patch = Partial<Payment>;

type PaymentsContextValue = {
  hydrated: boolean;

  /** Toate plățile (seed + user) cu patch-uri aplicate, minus șterse — toate flotele. */
  payments: Payment[];
  /** Plățile flotei active (multi-tenant scoping). */
  fleetPayments: Payment[];

  addPayment: (p: Omit<Payment, "id" | "createdAtIso">) => Payment;
  /** Legacy: schimbă doar statusul (fără audit explicit). Păstrat pentru compatibilitate. */
  updatePaymentStatus: (id: string, status: PaymentStatus) => void;

  /** Schimbă statusul cu audit (old → new). */
  setStatus: (id: string, status: PaymentStatus, actorName: string, reason?: string) => void;
  approve: (id: string, actorName: string) => void;
  markProcessing: (id: string, actorName: string) => void;
  markPaid: (id: string, actorName: string) => void;
  updatePayment: (id: string, patch: Patch, actorName: string) => void;
  addDeduction: (id: string, key: keyof PaymentBreakdown, amount: number, description: string, actorName: string) => void;
  deletePayment: (id: string, actorName: string) => void;
  /** Verifică dacă un ID de plată e marcat șters (inclusiv pentru sintetice generate live). */
  isDeleted: (id: string) => boolean;

  addNote: (id: string, text: string, actorName: string) => void;
  removeNote: (id: string, noteId: string) => void;
  addDocument: (id: string, doc: Omit<PaymentDocumentRef, "id" | "createdAtIso">) => void;

  notesByPayment: Record<string, PaymentNote[]>;
  documentsByPayment: Record<string, PaymentDocumentRef[]>;
  /** Istoric complet (derivat din câmpuri + activități stocate), sortat descrescător. */
  getActivities: (id: string) => PaymentActivity[];
};

const PaymentsContext = createContext<PaymentsContextValue | null>(null);

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Aplică un patch peste o plată, recalculând totalul dacă breakdown-ul s-a schimbat. */
function applyPatch(base: Payment, patch: Patch | undefined): Payment {
  if (!patch) return base;
  const breakdown = patch.breakdown ?? base.breakdown;
  const totalCalculated =
    patch.totalCalculated ??
    (patch.breakdown ? calculateTotal(patch.breakdown) : base.totalCalculated);
  return { ...base, ...patch, breakdown, totalCalculated };
}

/** Timeline de bază derivat din câmpurile plății (fără a inventa evenimente). */
function deriveBaseActivities(p: Payment): PaymentActivity[] {
  const out: PaymentActivity[] = [];
  out.push({
    id: `${p.id}_base_created`,
    kind: "created",
    description: `Plată generată pentru ${p.recipient.name}`,
    createdAtIso: p.createdAtIso,
    actorName: p.createdBy,
  });
  if (p.approvedAtIso) {
    out.push({
      id: `${p.id}_base_approved`,
      kind: "approved",
      description: "Plată aprobată",
      createdAtIso: p.approvedAtIso,
      actorName: p.approvedBy ?? "Sistem",
    });
  }
  if (p.paidAtIso) {
    out.push({
      id: `${p.id}_base_paid`,
      kind: "paid",
      description: `Plată marcată ca efectuată (${Math.round(p.amountPaid)} ${p.currency ?? "RON"})`,
      createdAtIso: p.paidAtIso,
      actorName: p.paidBy ?? "Sistem",
    });
  }
  return out;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const { activeFleetId, user: sessionUser } = useSession();

  const [userPayments, setUserPayments] = useState<Payment[]>([]);
  const [patches, setPatches] = useState<Record<string, Patch>>({});
  const [activities, setActivities] = useState<Record<string, PaymentActivity[]>>({});
  const [notesByPayment, setNotesByPayment] = useState<Record<string, PaymentNote[]>>({});
  const [documentsByPayment, setDocumentsByPayment] = useState<Record<string, PaymentDocumentRef[]>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hidratare din localStorage (store extern). setState în efect e intenționat aici:
    // evită mismatch-ul de hidratare SSR→client. Pattern comun tuturor providerelor.
    /* eslint-disable react-hooks/set-state-in-effect */
    setUserPayments(safeRead<Payment[]>(KEY_USER, []));
    setPatches(safeRead<Record<string, Patch>>(KEY_PATCH, {}));
    setActivities(safeRead<Record<string, PaymentActivity[]>>(KEY_ACT, {}));
    setNotesByPayment(safeRead<Record<string, PaymentNote[]>>(KEY_NOTES, {}));
    setDocumentsByPayment(safeRead<Record<string, PaymentDocumentRef[]>>(KEY_DOCS, {}));
    setDeletedIds(new Set(safeRead<string[]>(KEY_DEL, [])));
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_USER,  JSON.stringify(userPayments)); } catch {} }, [userPayments, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_PATCH, JSON.stringify(patches)); } catch {} }, [patches, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_ACT,   JSON.stringify(activities)); } catch {} }, [activities, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_NOTES, JSON.stringify(notesByPayment)); } catch {} }, [notesByPayment, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_DOCS,  JSON.stringify(documentsByPayment)); } catch {} }, [documentsByPayment, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_DEL,   JSON.stringify(Array.from(deletedIds))); } catch {} }, [deletedIds, hydrated]);

  // ── Derived: toate plățile cu patch aplicat, minus șterse ──────────────────
  const payments = useMemo<Payment[]>(() => {
    const merged = [...userPayments, ...SEED_PAYMENTS];
    return merged
      .filter((p) => !deletedIds.has(p.id))
      .map((p) => applyPatch(p, patches[p.id]));
  }, [userPayments, patches, deletedIds]);

  const fleetPayments = useMemo(() => {
    let list = payments.filter((p) => p.fleetId === activeFleetId);
    // Subcontractor vede doar plățile create de el (după createdBy = email).
    if (sessionUser.role === "subcontractor_owner") {
      const myEmail = sessionUser.email.toLowerCase();
      list = list.filter((p) => (p.createdBy || "").toLowerCase() === myEmail);
    }
    return list;
  }, [payments, activeFleetId, sessionUser]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const logActivity = useCallback(
    (id: string, kind: PaymentActivityKind, description: string, actorName: string, oldValue?: string | null, newValue?: string | null) => {
      const entry: PaymentActivity = {
        id: uid("act"), kind, description, actorName,
        createdAtIso: nowIso(), oldValue: oldValue ?? null, newValue: newValue ?? null,
      };
      setActivities((prev) => ({ ...prev, [id]: [entry, ...(prev[id] ?? [])].slice(0, 200) }));
    },
    [],
  );

  const patchPayment = useCallback((id: string, patch: Patch) => {
    setPatches((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));
  }, []);

  const addPayment = useCallback((p: Omit<Payment, "id" | "createdAtIso">) => {
    // Forțez createdBy = emailul user-ului curent → filtrarea per rol funcționează.
    const ownerEmail = sessionUser.email || p.createdBy || "";
    const created: Payment = { ...p, createdBy: ownerEmail, id: uid("pay"), createdAtIso: nowIso() };
    setUserPayments((prev) => [created, ...prev]);
    logActivity(created.id, "created", `Plată generată pentru ${created.recipient.name}`, created.createdBy);
    return created;
  }, [logActivity, sessionUser]);

  const updatePaymentStatus = useCallback((id: string, status: PaymentStatus) => {
    patchPayment(id, { status });
  }, [patchPayment]);

  const findPayment = useCallback((id: string): Payment | undefined => {
    return payments.find((p) => p.id === id);
  }, [payments]);

  const setStatus = useCallback((id: string, status: PaymentStatus, actorName: string, reason?: string) => {
    const current = findPayment(id);
    const from = current?.status ?? null;
    patchPayment(id, { status, ...(reason ? { overrideReason: reason } : {}) });
    logActivity(id, "status_changed", `Status: ${from ?? "?"} → ${status}${reason ? ` · ${reason}` : ""}`, actorName, from, status);
  }, [findPayment, patchPayment, logActivity]);

  const approve = useCallback((id: string, actorName: string) => {
    patchPayment(id, { status: "partial", approvedBy: actorName, approvedAtIso: nowIso(), operatorName: actorName });
    logActivity(id, "approved", "Plată aprobată → În proces", actorName);
  }, [patchPayment, logActivity]);

  const markProcessing = useCallback((id: string, actorName: string) => {
    patchPayment(id, { status: "partial", operatorName: actorName });
    logActivity(id, "processing", "Marcată în proces", actorName);
  }, [patchPayment, logActivity]);

  const markPaid = useCallback((id: string, actorName: string) => {
    const p = findPayment(id);
    const total = p?.totalCalculated ?? 0;
    patchPayment(id, {
      status: "paid",
      amountPaid: total,
      paidBy: actorName,
      paidAtIso: nowIso(),
      operatorName: actorName,
    });
    logActivity(id, "paid", `Plată marcată ca efectuată (${Math.round(total)} RON)`, actorName);
  }, [findPayment, patchPayment, logActivity]);

  const updatePayment = useCallback((id: string, patch: Patch, actorName: string) => {
    patchPayment(id, patch);
    const summary = Object.keys(patch).join(", ");
    logActivity(id, "edited", `Câmpuri modificate: ${summary}`, actorName);
  }, [patchPayment, logActivity]);

  const addDeduction = useCallback((id: string, key: keyof PaymentBreakdown, amount: number, description: string, actorName: string) => {
    const p = findPayment(id);
    if (!p) return;
    const nextBreakdown: PaymentBreakdown = { ...p.breakdown, [key]: (p.breakdown[key] || 0) + amount };
    patchPayment(id, { breakdown: nextBreakdown });
    logActivity(id, "deduction_added", `Deducere +${amount} RON (${description || key})`, actorName);
  }, [findPayment, patchPayment, logActivity]);

  const deletePayment = useCallback((id: string, actorName: string) => {
    setDeletedIds((prev) => new Set(prev).add(id));
    logActivity(id, "edited", `Plată ștearsă de ${actorName}`, actorName);
  }, [logActivity]);

  const addNote = useCallback((id: string, text: string, actorName: string) => {
    const note: PaymentNote = { id: uid("note"), text, authorName: actorName, createdAtIso: nowIso() };
    setNotesByPayment((prev) => ({ ...prev, [id]: [note, ...(prev[id] ?? [])] }));
    logActivity(id, "note_added", "Notiță adăugată", actorName);
  }, [logActivity]);

  const removeNote = useCallback((id: string, noteId: string) => {
    setNotesByPayment((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((n) => n.id !== noteId) }));
  }, []);

  const addDocument = useCallback((id: string, doc: Omit<PaymentDocumentRef, "id" | "createdAtIso">) => {
    const created: PaymentDocumentRef = { ...doc, id: uid("doc"), createdAtIso: nowIso() };
    setDocumentsByPayment((prev) => ({ ...prev, [id]: [created, ...(prev[id] ?? [])] }));
    logActivity(id, "document_added", `Document: ${created.label}`, created.createdBy);
  }, [logActivity]);

  const getActivities = useCallback((id: string): PaymentActivity[] => {
    const p = payments.find((x) => x.id === id);
    const base = p ? deriveBaseActivities(p) : [];
    const stored = activities[id] ?? [];
    return [...stored, ...base].sort((a, b) => (a.createdAtIso < b.createdAtIso ? 1 : -1));
  }, [payments, activities]);

  const isDeleted = useCallback((id: string) => deletedIds.has(id), [deletedIds]);

  const value = useMemo<PaymentsContextValue>(() => ({
    hydrated,
    payments, fleetPayments,
    addPayment, updatePaymentStatus,
    setStatus, approve, markProcessing, markPaid, updatePayment, addDeduction, deletePayment,
    isDeleted,
    addNote, removeNote, addDocument,
    notesByPayment, documentsByPayment, getActivities,
  }), [
    hydrated, payments, fleetPayments, addPayment, updatePaymentStatus,
    setStatus, approve, markProcessing, markPaid, updatePayment, addDeduction, deletePayment,
    isDeleted,
    addNote, removeNote, addDocument, notesByPayment, documentsByPayment, getActivities,
  ]);

  return <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>;
}

export function usePayments() {
  const ctx = useContext(PaymentsContext);
  if (!ctx) throw new Error("usePayments must be used within <PaymentsProvider>");
  return ctx;
}
