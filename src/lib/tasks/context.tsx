"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/context";
import { useOwnerScope } from "@/lib/owner-scope/context";
import type { FleetTask } from "./types";
import { mutateStored, readStored } from "./store";

type NewTask = Pick<FleetTask, "kind" | "title" | "details" | "priority" | "courierId" | "courierName" | "tenantId">;
type TaskPatch = Partial<Pick<FleetTask, "kind" | "title" | "details" | "priority" | "status" | "courierId" | "courierName">>;

type FleetTasksValue = {
  /** Task-urile vizibile: toate pentru Global Owner, doar ale subcontractorului ales dacă e activ un scope. */
  tasks: FleetTask[];
  /** Toate task-urile nescurtate de scope, utile pentru sumarul per subcontractor. */
  allTasks: FleetTask[];
  /** false = sesiunea nu e încă încărcată (fără email nu putem atribui task-ul). */
  canCreate: boolean;
  addTask: (t: NewTask) => boolean;
  updateTask: (id: string, patch: TaskPatch) => void;
};

const FleetTasksContext = createContext<FleetTasksValue | null>(null);

export function FleetTasksProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<FleetTask[]>([]);
  const { current } = useAuth();
  const { scope } = useOwnerScope();

  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration from localStorage; codebase-wide pattern in all providers.
  useEffect(() => { setStored(readStored()); }, []);

  const email = current?.email ?? "";
  const name = current?.name ?? email;

  const addTask = useCallback((t: NewTask) => {
    if (!email) return false;
    const now = new Date().toISOString();
    const created: FleetTask = {
      ...t,
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      status: "open",
      createdBy: email,
      raisedBy: name,
      createdAtIso: now,
      updatedAtIso: now,
    };
    setStored(mutateStored((cur) => [created, ...cur]));
    return true;
  }, [email, name]);

  const updateTask = useCallback((id: string, patch: TaskPatch) => {
    const now = new Date().toISOString();
    setStored(mutateStored((cur) => cur.map((t) => {
      if (t.id !== id) return t;
      const resolvedAtIso = patch.status === "resolved" ? (t.resolvedAtIso ?? now) : patch.status ? undefined : t.resolvedAtIso;
      return { ...t, ...patch, resolvedAtIso, updatedAtIso: now };
    })));
  }, []);

  // Același scoping ca la curieri (couriers/context.tsx): scope activ → doar task-urile acelui subcontractor.
  const tasks = useMemo(() => {
    if (!scope) return stored;
    const scopeEmail = scope.email.toLowerCase();
    return stored.filter((t) => t.createdBy.toLowerCase() === scopeEmail);
  }, [stored, scope]);

  const value = useMemo(() => ({ tasks, allTasks: stored, canCreate: !!email, addTask, updateTask }), [tasks, stored, email, addTask, updateTask]);
  return <FleetTasksContext.Provider value={value}>{children}</FleetTasksContext.Provider>;
}

export function useFleetTasks() {
  const ctx = useContext(FleetTasksContext);
  if (!ctx) throw new Error("useFleetTasks must be used within <FleetTasksProvider>");
  return ctx;
}
