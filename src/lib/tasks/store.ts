import { normalizeTask, type FleetTask } from "./types";

// Sincronizat prin SyncProvider (`crm31-fleet-tasks`, owner = createdBy) — vezi lib/sync/config.ts.
export const STORAGE_KEY = "crm31-fleet-tasks";

export function readStored(): FleetTask[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.flatMap((r) => normalizeTask(r) ?? []) : [];
  } catch { return []; }
}

/** Citește-modifică-scrie din localStorage, NU din starea React: sync-ul poate fi adus între timp task-uri noi
 *  (ex. bannerul „Date noi" cât owner-ul scrie în formular). Un snapshot vechi scris peste ele = engine-ul trimite
 *  ștergerea lor la server. */
export function mutateStored(fn: (cur: FleetTask[]) => FleetTask[]): FleetTask[] {
  const next = fn(readStored());
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  return next;
}
