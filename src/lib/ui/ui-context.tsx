"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type UIContextValue = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  manageNav: boolean;
  toggleManageNav: () => void;
  hiddenHrefs: Set<string>;
  toggleHiddenHref: (href: string) => void;
  isHidden: (href: string) => boolean;
};

const UIContext = createContext<UIContextValue | null>(null);

const STORAGE_KEY = "crm31-hidden-nav";

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [manageNav, setManageNav] = useState(false);
  const [hiddenHrefs, setHiddenHrefs] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHiddenHrefs(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, []);

  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const toggleManageNav = () => setManageNav((v) => !v);
  const toggleHiddenHref = (href: string) => {
    setHiddenHrefs((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };
  const isHidden = (href: string) => hiddenHrefs.has(href);

  return (
    <UIContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        manageNav,
        toggleManageNav,
        hiddenHrefs,
        toggleHiddenHref,
        isHidden,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within <UIProvider>");
  return ctx;
}
