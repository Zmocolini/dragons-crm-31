"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type UIContextValue = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  manageNav: boolean;
  toggleManageNav: () => void;
  hiddenHrefs: Set<string>;
  toggleHiddenHref: (href: string) => void;
  isHidden: (href: string) => boolean;
  /** Ordinea salvată a meniului (liste de href). Itemii necunoscuți merg la coadă. */
  navOrder: string[];
  setNavOrder: (hrefs: string[]) => void;
};

const UIContext = createContext<UIContextValue | null>(null);

const STORAGE_KEY = "crm31-hidden-nav";
const ORDER_KEY = "crm31-nav-order";

export function UIProvider({ children }: { children: ReactNode }) {
  // Sidebar: pe desktop mereu vizibil via CSS. Pe mobil = drawer controlat de această stare.
  // Default false (închis) — evită flash la mount pe mobil.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [manageNav, setManageNav] = useState(false);
  const [hiddenHrefs, setHiddenHrefs] = useState<Set<string>>(new Set());
  const [navOrder, setNavOrderState] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHiddenHrefs(new Set(JSON.parse(raw) as string[]));
      const ord = localStorage.getItem(ORDER_KEY);
      if (ord) setNavOrderState(JSON.parse(ord) as string[]);
    } catch {}
  }, []);

  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);
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
  const setNavOrder = (hrefs: string[]) => {
    setNavOrderState(hrefs);
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(hrefs));
    } catch {}
  };

  return (
    <UIContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        openSidebar,
        closeSidebar,
        manageNav,
        toggleManageNav,
        hiddenHrefs,
        toggleHiddenHref,
        isHidden,
        navOrder,
        setNavOrder,
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
