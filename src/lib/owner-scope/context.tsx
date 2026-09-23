"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "crm31-owner-scope";

export type OwnerScope = { userId: string; email: string; name: string } | null;

type Ctx = {
  scope: OwnerScope;
  setScope: (s: OwnerScope) => void;
};

const OwnerScopeContext = createContext<Ctx | null>(null);

export function OwnerScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScopeState] = useState<OwnerScope>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setScopeState(JSON.parse(raw));
    } catch {}
  }, []);

  const setScope = useCallback((s: OwnerScope) => {
    setScopeState(s);
    try {
      if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const value = useMemo<Ctx>(() => ({ scope, setScope }), [scope, setScope]);
  return <OwnerScopeContext.Provider value={value}>{children}</OwnerScopeContext.Provider>;
}

export function useOwnerScope(): Ctx {
  const c = useContext(OwnerScopeContext);
  if (!c) throw new Error("useOwnerScope must be inside OwnerScopeProvider");
  return c;
}
