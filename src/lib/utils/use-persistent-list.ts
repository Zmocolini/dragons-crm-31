"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Listă persistată în localStorage (per cheie). Folosită pentru entitățile adăugate
 * de user în modulele care încă nu au provider dedicat (vehicule/cazări/subcontractori),
 * ca refresh-ul să păstreze adăugările. TODO(real-users): înlocuit de tabel + server.
 */
export function usePersistentList<T>(key: string): [T[], (updater: T[] | ((prev: T[]) => T[])) => void] {
  const [list, setList] = useState<T[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) setList(JSON.parse(raw) as T[]); } catch {}
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
  }, [key, list, hydrated]);

  const update = useCallback((updater: T[] | ((prev: T[]) => T[])) => {
    setList((prev) => (typeof updater === "function" ? (updater as (p: T[]) => T[])(prev) : updater));
  }, []);

  return [list, update];
}
