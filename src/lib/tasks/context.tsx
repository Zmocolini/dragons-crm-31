"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/context";
import type { FleetTask } from "./types";

// Sincronizat prin SyncProvider (`crm31-fleet-tasks`, owner = createdBy) — vezi lib/sync/config.ts.
const STORAGE_KEY = "crm31-fleet-tasks";

type NewTask = Pick<FleetTask, "kind" | "title" | "details" | "priority" | "courierId" | "courierName" | "tenantId">;
type TaskPatch = Partial<Pick<FleetTask, "kind" | "title" | "details" | "priority" | "status" | "courierId" | "courierName">>;

type FleetTasksValue = {
  tasks: FleetTask[];
  addTask: (t: NewTask) => void;
  updateTask: (id: string, patch: TaskPatch) => void;
};

const FleetTasksContext = createContext<FleetTasksValue | null>(null);

export function FleetTasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<FleetTask[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { current } = useAuth();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration from localStorage; codebase-wide pattern in all providers.
      if (raw) setTasks(JSON.parse(raw) as FleetTask[]);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {}
  }, [tasks, hydrated]);

  const email = current?.email ?? "";
  const name = current?.name ?? email;

  const addTask = useCallback((t: NewTask) => {
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
    setTasks((prev) => [created, ...prev]);
  }, [email, name]);

  const updateTask = useCallback((id: string, patch: TaskPatch) => {
    const now = new Date().toISOString();
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const resolvedAtIso = patch.status === "resolved" ? (t.resolvedAtIso ?? now) : patch.status ? undefined : t.resolvedAtIso;
      return { ...t, ...patch, resolvedAtIso, updatedAtIso: now };
    }));
  }, []);

  const value = useMemo(() => ({ tasks, addTask, updateTask }), [tasks, addTask, updateTask]);
  return <FleetTasksContext.Provider value={value}>{children}</FleetTasksContext.Provider>;
}

export function useFleetTasks() {
  const ctx = useContext(FleetTasksContext);
  if (!ctx) throw new Error("useFleetTasks must be used within <FleetTasksProvider>");
  return ctx;
}
