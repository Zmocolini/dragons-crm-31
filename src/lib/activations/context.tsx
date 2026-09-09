"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import type { PlatformKey } from "@/lib/dashboard/types";
import type { DocumentType } from "@/lib/documents/types";
import {
  DEFAULT_RULES, defaultChecklist,
  type Activation, type ActivationStage, type ChecklistItemStatus, type ChecklistKey,
  type PlatformRules,
} from "./types";
import { useSession } from "@/lib/rbac/session";

// TODO(real-users): mutare pe server actions + Drizzle. Momentan localStorage.

const KEY_ACTIVATIONS = "crm31-activations";
const KEY_RULES       = "crm31-activation-rules";
const KEY_EVENTS      = "crm31-activation-events";

export type ActivationEvent = {
  id: string;
  activationId: string;
  createdAtIso: string;
  actorName: string;
  action: string;
  before: string | null;
  after: string | null;
  reason: string | null;
};

type ActivationsContextValue = {
  activations: Activation[];
  fleetActivations: Activation[];
  rules: Record<PlatformKey, PlatformRules>;
  events: Record<string, ActivationEvent[]>;

  addActivation: (a: Omit<Activation, "id" | "startedAtIso" | "updatedAtIso">) => Activation;
  updateStage: (id: string, stage: ActivationStage, actorName: string, reason?: string) => void;
  updateChecklistItem: (id: string, key: ChecklistKey, status: ChecklistItemStatus, actorName: string) => void;
  markPresentDoc: (id: string, docType: DocumentType, actorName: string) => void;
  markMissingDoc: (id: string, docType: DocumentType, actorName: string) => void;
  setBlockedReason: (id: string, reason: string | null, actorName: string) => void;
  setPlatformAccountId: (id: string, accountId: string, activatedAtIso: string, actorName: string) => void;
  setResponsible: (id: string, responsible: string, actorName: string) => void;
  addNote: (id: string, note: string, actorName: string) => void;
  deleteActivation: (id: string, actorName: string, reason: string) => void;

  updateRules: (platform: PlatformKey, rules: Partial<PlatformRules>, actorName: string) => void;
  hydrated: boolean;
};

const ActivationsContext = createContext<ActivationsContextValue | null>(null);

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}

export function ActivationsProvider({ children }: { children: ReactNode }) {
  const { activeFleetId } = useSession();
  const [activations, setActivations] = useState<Activation[]>([]);
  const [rules, setRules] = useState<Record<PlatformKey, PlatformRules>>(DEFAULT_RULES);
  const [events, setEvents] = useState<Record<string, ActivationEvent[]>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setActivations(safeRead<Activation[]>(KEY_ACTIVATIONS, []));
    setRules(safeRead<Record<PlatformKey, PlatformRules>>(KEY_RULES, DEFAULT_RULES));
    setEvents(safeRead<Record<string, ActivationEvent[]>>(KEY_EVENTS, {}));
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_ACTIVATIONS, JSON.stringify(activations)); } catch {} }, [activations, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_RULES,       JSON.stringify(rules));       } catch {} }, [rules, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_EVENTS,      JSON.stringify(events));      } catch {} }, [events, hydrated]);

  const logEvent = useCallback((
    activationId: string, actorName: string, action: string,
    before: string | null = null, after: string | null = null, reason: string | null = null,
  ) => {
    const ev: ActivationEvent = {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      activationId, actorName, action, before, after, reason,
      createdAtIso: new Date().toISOString(),
    };
    setEvents((prev) => ({
      ...prev,
      [activationId]: [ev, ...(prev[activationId] ?? [])].slice(0, 200),
    }));
  }, []);

  const touchUpdated = (a: Activation): Activation => ({ ...a, updatedAtIso: new Date().toISOString() });

  const addActivation = useCallback((a: Omit<Activation, "id" | "startedAtIso" | "updatedAtIso">) => {
    const now = new Date().toISOString();
    const created: Activation = {
      ...a,
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      startedAtIso: now,
      updatedAtIso: now,
    };
    setActivations((prev) => [created, ...prev]);
    logEvent(created.id, a.createdBy, "Activare inițiată", null, created.stage);
    return created;
  }, [logEvent]);

  const updateStage = useCallback((id: string, stage: ActivationStage, actorName: string, reason?: string) => {
    setActivations((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      const before = a.stage;
      logEvent(id, actorName, "Stadiu schimbat", before, stage, reason ?? null);
      const patch: Partial<Activation> = { stage };
      if (stage === "activated") patch.activatedAtIso = new Date().toISOString();
      if (stage === "blocked" && reason) patch.blockedReason = reason;
      return touchUpdated({ ...a, ...patch });
    }));
  }, [logEvent]);

  const updateChecklistItem = useCallback((id: string, key: ChecklistKey, status: ChecklistItemStatus, actorName: string) => {
    setActivations((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      const before = a.checklist[key];
      logEvent(id, actorName, `Checklist: ${key}`, before, status);
      return touchUpdated({ ...a, checklist: { ...a.checklist, [key]: status } });
    }));
  }, [logEvent]);

  const markPresentDoc = useCallback((id: string, docType: DocumentType, actorName: string) => {
    setActivations((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      if (a.presentDocuments.includes(docType)) return a;
      logEvent(id, actorName, "Document adăugat la dosar", null, docType);
      return touchUpdated({ ...a, presentDocuments: [...a.presentDocuments, docType] });
    }));
  }, [logEvent]);

  const markMissingDoc = useCallback((id: string, docType: DocumentType, actorName: string) => {
    setActivations((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      logEvent(id, actorName, "Document marcat lipsă", docType, null);
      return touchUpdated({ ...a, presentDocuments: a.presentDocuments.filter((d) => d !== docType) });
    }));
  }, [logEvent]);

  const setBlockedReason = useCallback((id: string, reason: string | null, actorName: string) => {
    setActivations((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      logEvent(id, actorName, "Motiv blocare actualizat", a.blockedReason, reason);
      return touchUpdated({ ...a, blockedReason: reason });
    }));
  }, [logEvent]);

  const setPlatformAccountId = useCallback((id: string, accountId: string, activatedAtIso: string, actorName: string) => {
    setActivations((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      logEvent(id, actorName, "Cont platformă activat", a.platformAccountId, accountId);
      return touchUpdated({ ...a, platformAccountId: accountId, activatedAtIso, stage: "activated" });
    }));
  }, [logEvent]);

  const setResponsible = useCallback((id: string, responsible: string, actorName: string) => {
    setActivations((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      logEvent(id, actorName, "Responsabil schimbat", a.responsible, responsible);
      return touchUpdated({ ...a, responsible });
    }));
  }, [logEvent]);

  const addNote = useCallback((id: string, note: string, actorName: string) => {
    setActivations((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      logEvent(id, actorName, "Notiță adăugată", null, note.slice(0, 60));
      return touchUpdated({ ...a, notes: a.notes ? `${a.notes}\n\n${note}` : note });
    }));
  }, [logEvent]);

  const deleteActivation = useCallback((id: string, actorName: string, reason: string) => {
    setActivations((prev) => prev.map((a) => a.id === id ? touchUpdated({ ...a, stage: "cancelled", blockedReason: reason }) : a));
    logEvent(id, actorName, "Activare anulată", null, "cancelled", reason);
  }, [logEvent]);

  const updateRules = useCallback((platform: PlatformKey, patch: Partial<PlatformRules>, _actorName: string) => {
    setRules((prev) => ({ ...prev, [platform]: { ...prev[platform], ...patch } }));
  }, []);

  const fleetActivations = useMemo(
    () => activations.filter((a) => a.fleetId === activeFleetId),
    [activations, activeFleetId],
  );

  const value = useMemo<ActivationsContextValue>(() => ({
    activations, fleetActivations, rules, events,
    addActivation, updateStage, updateChecklistItem, markPresentDoc, markMissingDoc,
    setBlockedReason, setPlatformAccountId, setResponsible, addNote, deleteActivation,
    updateRules, hydrated,
  }), [activations, fleetActivations, rules, events, addActivation, updateStage,
       updateChecklistItem, markPresentDoc, markMissingDoc, setBlockedReason,
       setPlatformAccountId, setResponsible, addNote, deleteActivation, updateRules, hydrated]);

  return <ActivationsContext.Provider value={value}>{children}</ActivationsContext.Provider>;
}

export function useActivations() {
  const ctx = useContext(ActivationsContext);
  if (!ctx) throw new Error("useActivations must be used within <ActivationsProvider>");
  return ctx;
}
