"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import {
  calculateTotal, round2, paymentSourceDetail,
  type Payment, type PaymentActivity, type PaymentActivityKind,
  type PaymentBreakdown, type PaymentDocumentRef, type PaymentNote,
  type PaymentSourceDetail, type PaymentStatus,
} from "./types";
import { SEED_PAYMENTS } from "./seed";
import { MERGED_ID_PREFIX } from "./merge-duplicates";
import { useSession } from "@/lib/rbac/session";
import { useOwnerScope } from "@/lib/owner-scope/context";

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
  deletePayments: (ids: string[], actorName: string) => void;
  /** Șterge toate plățile dintr-o perioadă/raport, returnând numărul de plăți eliminate. */
  clearPeriod: (periodStartIso: string, actorName: string, sourceDetail?: PaymentSourceDetail | "all") => number;
  /** Resetează complet toate plățile importate din orice perioadă. */
  clearAllImported: (actorName: string) => number;
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

/**
 * Plafonează comisionul și taxa flotei la venitul disponibil pentru a preveni trecerea
 * artificială pe minus a curierului.
 * Dacă balanța negativă (cash încasat din comenzi) depășește venitul brut:
 *  - Nu se percepe comision și nici taxă (0 RON).
 *  - Minusul reflectă strict datoria reală de cash a curierului față de flotă (ex: 200 - 400 = -200 RON).
 * Dacă venitul brut este egal cu balanța negativă (ex: 17.61 cu 17.61):
 *  - Comision = 0, taxă = 0, totalCalculated = 0.00 RON.
 */
export function sanitizePaymentFee(p: Payment): Payment {
  const b = p.breakdown;
  if (!b) return p;
  const gross = round2((b.grossRevenue || 0) + (b.tips || 0));
  const ded = Math.max(0, b.deductions || 0);
  const otherCosts = (b.vehicleCost || 0) + (b.housingCost || 0) + (b.equipmentCost || 0) + (b.guarantee || 0) + (b.penalty || 0) + (b.advance || 0);
  const rawCashResidual = round2(gross - ded - otherCosts);

  // Cazul 1 & 2: Cash-ul încasat este egal sau mai mare decât venitul brut
  if (rawCashResidual <= 0) {
    const rawTotal = round2(rawCashResidual + (b.correction || 0) + (b.otherAdjustments || 0));
    const totalCalculated = Math.abs(rawTotal) < 0.001 ? 0 : rawTotal;
    if (b.fleetCommission !== 0 || b.tax !== 0 || totalCalculated !== p.totalCalculated) {
      return {
        ...p,
        breakdown: { ...b, fleetCommission: 0, tax: 0 },
        totalCalculated,
      };
    }
    return p;
  }

  // Cazul 3 & 4: Venit disponibil după deducerea cash-ului
  const available = rawCashResidual;
  const comm = Math.max(0, b.fleetCommission || 0);
  const cappedComm = Math.min(comm, available);
  const availableForTax = Math.max(0, round2(available - cappedComm));
  const cappedTax = Math.min(Math.max(0, b.tax || 0), availableForTax);

  const rawTotal = round2(availableForTax - cappedTax + (b.correction || 0) + (b.otherAdjustments || 0));
  const totalCalculated = Math.abs(rawTotal) < 0.001 ? 0 : rawTotal;

  if (cappedTax !== b.tax || cappedComm !== b.fleetCommission || totalCalculated !== p.totalCalculated) {
    return {
      ...p,
      breakdown: { ...b, fleetCommission: cappedComm, tax: cappedTax },
      totalCalculated,
      notes: p.notes && !p.notes.includes("plafonată") && b.tax > cappedTax
        ? `${p.notes} · Taxă contract ${b.tax} RON plafonată la ${cappedTax} RON (venit disponibil).`
        : p.notes,
    };
  }
  return p;
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
  const { scope: ownerScope } = useOwnerScope();

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
    const rawUserPayments = safeRead<Payment[]>(KEY_USER, []);
    // Migrare automată: aliniem plățile Wolt Gusty importate cu ciclul 16-22 Sep la săptămâna de plată 21-27 Sep
    const migratedUserPayments = rawUserPayments.map((p) => {
      const isWoltGusty = (p.reference ?? "").toLowerCase().includes("wolt") || (p.recipient.platform === "wolt");
      if (isWoltGusty && p.periodStartIso === "2026-09-16") {
        return {
          ...p,
          periodStartIso: "2026-09-21",
          periodEndIso: "2026-09-27",
          paymentDateIso: "2026-09-27",
          reference: (p.reference ?? "").replace("16 – 22 Sep", "21 – 27 Sep").replace("16-22 Sep", "21-27 Sep"),
        };
      }
      return p;
    });
    setUserPayments(migratedUserPayments);
    const rawPatches = safeRead<Record<string, Patch>>(KEY_PATCH, {});
    const migratedPatches: Record<string, Patch> = {};
    let hasMerged = false;
    for (const [patchId, patchVal] of Object.entries(rawPatches)) {
      if (patchId.startsWith(MERGED_ID_PREFIX)) {
        hasMerged = true;
        const subIds = patchId.replace(MERGED_ID_PREFIX, "").split("__");
        for (const subId of subIds) {
          migratedPatches[subId] = { ...(migratedPatches[subId] ?? {}), ...patchVal };
        }
      } else {
        migratedPatches[patchId] = { ...(migratedPatches[patchId] ?? {}), ...patchVal };
      }
    }
    if (hasMerged) {
      try { localStorage.setItem(KEY_PATCH, JSON.stringify(migratedPatches)); } catch {}
    }
    setPatches(migratedPatches);
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
      .map((p) => sanitizePaymentFee(applyPatch(p, patches[p.id])));
  }, [userPayments, patches, deletedIds]);

  const fleetPayments = useMemo(() => {
    let list = payments.filter((p) => p.fleetId === activeFleetId);
    if (sessionUser.role === "subcontractor_owner") {
      const myEmail = sessionUser.email.toLowerCase();
      list = list.filter((p) => (p.createdBy || "").toLowerCase() === myEmail);
    } else if (ownerScope) {
      // Global Owner cu scope activ → vede plățile subcontractorului selectat.
      const scopeEmail = ownerScope.email.toLowerCase();
      list = list.filter((p) => (p.createdBy || "").toLowerCase() === scopeEmail);
    }
    return list;
  }, [payments, activeFleetId, sessionUser, ownerScope]);

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
    if (id.startsWith(MERGED_ID_PREFIX)) {
      const subIds = id.replace(MERGED_ID_PREFIX, "").split("__");
      setPatches((prev) => {
        const next = { ...prev };
        for (const subId of subIds) {
          next[subId] = { ...(next[subId] ?? {}), ...patch };
        }
        return next;
      });
      return;
    }
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
    const isPaid = status === "paid";
    if (id.startsWith(MERGED_ID_PREFIX)) {
      const subIds = id.replace(MERGED_ID_PREFIX, "").split("__");
      for (const subId of subIds) {
        const current = findPayment(subId);
        const from = current?.status ?? null;
        patchPayment(subId, {
          status,
          ...(reason ? { overrideReason: reason } : {}),
          ...(isPaid ? {
            amountPaid: current?.totalCalculated ?? 0,
            paidBy: actorName,
            paidAtIso: nowIso(),
            operatorName: actorName,
          } : {
            amountPaid: 0,
            paidBy: null,
            paidAtIso: null,
          }),
        });
        logActivity(subId, "status_changed", `Status: ${from ?? "?"} → ${status}${reason ? ` · ${reason}` : ""}`, actorName, from, status);
      }
      return;
    }
    const current = findPayment(id);
    const from = current?.status ?? null;
    patchPayment(id, {
      status,
      ...(reason ? { overrideReason: reason } : {}),
      ...(isPaid ? {
        amountPaid: current?.totalCalculated ?? 0,
        paidBy: actorName,
        paidAtIso: nowIso(),
        operatorName: actorName,
      } : {
        amountPaid: 0,
        paidBy: null,
        paidAtIso: null,
      }),
    });
    logActivity(id, "status_changed", `Status: ${from ?? "?"} → ${status}${reason ? ` · ${reason}` : ""}`, actorName, from, status);
  }, [findPayment, patchPayment, logActivity]);

  const approve = useCallback((id: string, actorName: string) => {
    if (id.startsWith(MERGED_ID_PREFIX)) {
      const subIds = id.replace(MERGED_ID_PREFIX, "").split("__");
      for (const subId of subIds) {
        patchPayment(subId, { status: "partial", approvedBy: actorName, approvedAtIso: nowIso(), operatorName: actorName, amountPaid: 0, paidBy: null, paidAtIso: null });
        logActivity(subId, "approved", "Plată aprobată → În proces", actorName);
      }
      return;
    }
    patchPayment(id, { status: "partial", approvedBy: actorName, approvedAtIso: nowIso(), operatorName: actorName, amountPaid: 0, paidBy: null, paidAtIso: null });
    logActivity(id, "approved", "Plată aprobată → În proces", actorName);
  }, [patchPayment, logActivity]);

  const markProcessing = useCallback((id: string, actorName: string) => {
    if (id.startsWith(MERGED_ID_PREFIX)) {
      const subIds = id.replace(MERGED_ID_PREFIX, "").split("__");
      for (const subId of subIds) {
        patchPayment(subId, { status: "partial", operatorName: actorName, amountPaid: 0, paidBy: null, paidAtIso: null });
        logActivity(subId, "processing", "Marcată în proces", actorName);
      }
      return;
    }
    patchPayment(id, { status: "partial", operatorName: actorName, amountPaid: 0, paidBy: null, paidAtIso: null });
    logActivity(id, "processing", "Marcată în proces", actorName);
  }, [patchPayment, logActivity]);

  const markPaid = useCallback((id: string, actorName: string) => {
    if (id.startsWith(MERGED_ID_PREFIX)) {
      const subIds = id.replace(MERGED_ID_PREFIX, "").split("__");
      for (const subId of subIds) {
        const p = findPayment(subId);
        const total = p?.totalCalculated ?? 0;
        patchPayment(subId, {
          status: "paid",
          amountPaid: total,
          paidBy: actorName,
          paidAtIso: nowIso(),
          operatorName: actorName,
        });
        logActivity(subId, "paid", `Plată marcată ca efectuată (${Math.round(total)} RON)`, actorName);
      }
      return;
    }
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
    const statusClear = patch.status && patch.status !== "paid"
      ? { amountPaid: 0, paidBy: null, paidAtIso: null }
      : {};
    const effectivePatch = { ...patch, ...statusClear };

    if (id.startsWith(MERGED_ID_PREFIX)) {
      const subIds = id.replace(MERGED_ID_PREFIX, "").split("__");
      for (const subId of subIds) {
        patchPayment(subId, effectivePatch);
        const summary = Object.keys(effectivePatch).join(", ");
        logActivity(subId, "edited", `Câmpuri modificate: ${summary}`, actorName);
      }
      return;
    }
    patchPayment(id, effectivePatch);
    const summary = Object.keys(effectivePatch).join(", ");
    logActivity(id, "edited", `Câmpuri modificate: ${summary}`, actorName);
  }, [patchPayment, logActivity]);

  const addDeduction = useCallback((id: string, key: keyof PaymentBreakdown, amount: number, description: string, actorName: string) => {
    const targetId = id.startsWith(MERGED_ID_PREFIX) ? id.replace(MERGED_ID_PREFIX, "").split("__")[0] : id;
    const p = findPayment(targetId);
    if (!p) return;
    const nextBreakdown: PaymentBreakdown = { ...p.breakdown, [key]: (p.breakdown[key] || 0) + amount };
    patchPayment(targetId, { breakdown: nextBreakdown });
    logActivity(targetId, "deduction_added", `Deducere +${amount} RON (${description || key})`, actorName);
  }, [findPayment, patchPayment, logActivity]);

  const deletePayment = useCallback((id: string, actorName: string) => {
    if (id.startsWith(MERGED_ID_PREFIX)) {
      const subIds = id.replace(MERGED_ID_PREFIX, "").split("__");
      setDeletedIds((prev) => {
        const next = new Set(prev);
        for (const subId of subIds) next.add(subId);
        return next;
      });
      setUserPayments((prev) => prev.filter((p) => !subIds.includes(p.id)));
      for (const subId of subIds) {
        logActivity(subId, "edited", `Plată ștearsă de ${actorName}`, actorName);
      }
      return;
    }
    setDeletedIds((prev) => new Set(prev).add(id));
    setUserPayments((prev) => prev.filter((p) => p.id !== id));
    logActivity(id, "edited", `Plată ștearsă de ${actorName}`, actorName);
  }, [logActivity]);

  const deletePayments = useCallback((ids: string[], actorName: string) => {
    const unrolledIds: string[] = [];
    for (const id of ids) {
      if (id.startsWith(MERGED_ID_PREFIX)) {
        const subIds = id.replace(MERGED_ID_PREFIX, "").split("__");
        for (const subId of subIds) unrolledIds.push(subId);
      } else {
        unrolledIds.push(id);
      }
    }
    const idSet = new Set(unrolledIds);
    setDeletedIds((prev) => {
      const next = new Set(prev);
      for (const id of unrolledIds) next.add(id);
      return next;
    });
    setUserPayments((prev) => {
      const remaining = prev.filter((p) => !idSet.has(p.id));
      try { localStorage.setItem(KEY_USER, JSON.stringify(remaining)); } catch {}
      return remaining;
    });
    for (const id of unrolledIds) {
      logActivity(id, "edited", `Plată ștearsă de ${actorName}`, actorName);
    }
  }, [logActivity]);

  const clearPeriod = useCallback((periodStartIso: string, actorName: string, sourceDetail?: PaymentSourceDetail | "all") => {
    let deletedCount = 0;
    const removedIds: string[] = [];
    setUserPayments((prev) => {
      const remaining = prev.filter((p) => {
        const matchesPeriod = p.periodStartIso === periodStartIso;
        const matchesSource = !sourceDetail || sourceDetail === "all" || paymentSourceDetail(p.reference) === sourceDetail;
        if (matchesPeriod && matchesSource) {
          deletedCount++;
          removedIds.push(p.id);
          return false;
        }
        return true;
      });
      try { localStorage.setItem(KEY_USER, JSON.stringify(remaining)); } catch {}
      return remaining;
    });
    setDeletedIds((prev) => {
      const next = new Set(prev);
      for (const id of removedIds) next.add(id);
      try { localStorage.setItem(KEY_DEL, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
    return deletedCount;
  }, []);

  const clearAllImported = useCallback((actorName: string) => {
    let count = 0;
    setUserPayments((prev) => {
      count = prev.length;
      try { localStorage.setItem(KEY_USER, JSON.stringify([])); } catch {}
      return [];
    });
    setDeletedIds(new Set());
    setPatches({});
    try {
      localStorage.setItem(KEY_DEL, JSON.stringify([]));
      localStorage.setItem(KEY_PATCH, JSON.stringify({}));
    } catch {}
    return count;
  }, []);

  const addNote = useCallback((id: string, text: string, actorName: string) => {
    if (id.startsWith(MERGED_ID_PREFIX)) {
      const subIds = id.replace(MERGED_ID_PREFIX, "").split("__");
      for (const subId of subIds) {
        const note: PaymentNote = { id: uid("note"), text, authorName: actorName, createdAtIso: nowIso() };
        setNotesByPayment((prev) => ({ ...prev, [subId]: [note, ...(prev[subId] ?? [])] }));
        logActivity(subId, "note_added", "Notiță adăugată", actorName);
      }
      return;
    }
    const note: PaymentNote = { id: uid("note"), text, authorName: actorName, createdAtIso: nowIso() };
    setNotesByPayment((prev) => ({ ...prev, [id]: [note, ...(prev[id] ?? [])] }));
    logActivity(id, "note_added", "Notiță adăugată", actorName);
  }, [logActivity]);

  const removeNote = useCallback((id: string, noteId: string) => {
    setNotesByPayment((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((n) => n.id !== noteId) }));
  }, []);

  const addDocument = useCallback((id: string, doc: Omit<PaymentDocumentRef, "id" | "createdAtIso">) => {
    if (id.startsWith(MERGED_ID_PREFIX)) {
      const subIds = id.replace(MERGED_ID_PREFIX, "").split("__");
      for (const subId of subIds) {
        const created: PaymentDocumentRef = { ...doc, id: uid("doc"), createdAtIso: nowIso() };
        setDocumentsByPayment((prev) => ({ ...prev, [subId]: [created, ...(prev[subId] ?? [])] }));
        logActivity(subId, "document_added", `Document: ${created.label}`, created.createdBy);
      }
      return;
    }
    const created: PaymentDocumentRef = { ...doc, id: uid("doc"), createdAtIso: nowIso() };
    setDocumentsByPayment((prev) => ({ ...prev, [id]: [created, ...(prev[id] ?? [])] }));
    logActivity(id, "document_added", `Document: ${created.label}`, created.createdBy);
  }, [logActivity]);

  const getActivities = useCallback((id: string): PaymentActivity[] => {
    if (id.startsWith(MERGED_ID_PREFIX)) {
      const subIds = id.replace(MERGED_ID_PREFIX, "").split("__");
      const list: PaymentActivity[] = [];
      for (const subId of subIds) {
        const p = payments.find((x) => x.id === subId);
        const base = p ? deriveBaseActivities(p) : [];
        const stored = activities[subId] ?? [];
        list.push(...stored, ...base);
      }
      return list.sort((a, b) => (a.createdAtIso < b.createdAtIso ? 1 : -1));
    }
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
    setStatus, approve, markProcessing, markPaid, updatePayment, addDeduction,
    deletePayment, deletePayments, clearPeriod, clearAllImported,
    isDeleted,
    addNote, removeNote, addDocument,
    notesByPayment, documentsByPayment, getActivities,
  }), [
    hydrated, payments, fleetPayments, addPayment, updatePaymentStatus,
    setStatus, approve, markProcessing, markPaid, updatePayment, addDeduction,
    deletePayment, deletePayments, clearPeriod, clearAllImported,
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
