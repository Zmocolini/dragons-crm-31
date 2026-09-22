"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import { useSession } from "@/lib/rbac/session";
import { computeInvoiceTotals, daysUntilDue, type Invoice, type InvoiceStatus } from "./types";

const STORAGE_KEY = "crm31-invoices";

type NewInvoiceInput = Omit<Invoice, "id" | "createdAtIso" | "createdBy" | "vatRon" | "totalRon" | "status" | "paidAtIso"> & {
  status?: InvoiceStatus;
};

type InvoicesContextValue = {
  hydrated: boolean;
  invoices: Invoice[];
  fleetInvoices: Invoice[];

  addInvoice: (input: NewInvoiceInput, actorName: string) => Invoice;
  updateInvoice: (id: string, patch: Partial<Omit<Invoice, "id" | "tenantId" | "createdAtIso">>) => void;
  deleteInvoice: (id: string) => void;
  markPaid: (id: string, paidAtIso?: string) => void;
  cancelInvoice: (id: string) => void;
};

const InvoicesContext = createContext<InvoicesContextValue | null>(null);

function safeRead<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Aplică status "overdue" derivat: dacă e sent și dueDate a trecut. Doar în read-model. */
function withDerivedStatus(inv: Invoice): Invoice {
  if (inv.status !== "sent" || !inv.dueDateIso) return inv;
  const d = daysUntilDue(inv.dueDateIso);
  if (d !== null && d < 0) return { ...inv, status: "overdue" as const };
  return inv;
}

export function InvoicesProvider({ children }: { children: ReactNode }) {
  const { activeFleetId } = useSession();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setInvoices(safeRead<Invoice[]>(STORAGE_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices)); } catch {}
  }, [invoices, hydrated]);

  const derived = useMemo(() => invoices.map(withDerivedStatus), [invoices]);
  const fleetInvoices = useMemo(
    () => derived.filter((i) => i.tenantId === activeFleetId),
    [derived, activeFleetId],
  );

  const addInvoice = useCallback((input: NewInvoiceInput, actorName: string): Invoice => {
    const { vatRon, totalRon } = computeInvoiceTotals(input.baseRon, input.vatPct);
    const created: Invoice = {
      ...input,
      id: uid("inv"),
      vatRon,
      totalRon,
      status: input.status ?? "draft",
      paidAtIso: null,
      createdAtIso: new Date().toISOString(),
      createdBy: actorName,
    };
    setInvoices((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateInvoice = useCallback((id: string, patch: Partial<Omit<Invoice, "id" | "tenantId" | "createdAtIso">>) => {
    setInvoices((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const merged = { ...i, ...patch };
      if (patch.baseRon !== undefined || patch.vatPct !== undefined) {
        const t = computeInvoiceTotals(merged.baseRon, merged.vatPct);
        merged.vatRon = t.vatRon;
        merged.totalRon = t.totalRon;
      }
      return merged;
    }));
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const markPaid = useCallback((id: string, paidAtIso?: string) => {
    const iso = paidAtIso ?? new Date().toISOString().slice(0, 10);
    setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status: "paid" as const, paidAtIso: iso } : i));
  }, []);

  const cancelInvoice = useCallback((id: string) => {
    setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status: "cancelled" as const } : i));
  }, []);

  const value = useMemo<InvoicesContextValue>(() => ({
    hydrated,
    invoices: derived,
    fleetInvoices,
    addInvoice, updateInvoice, deleteInvoice, markPaid, cancelInvoice,
  }), [hydrated, derived, fleetInvoices, addInvoice, updateInvoice, deleteInvoice, markPaid, cancelInvoice]);

  return <InvoicesContext.Provider value={value}>{children}</InvoicesContext.Provider>;
}

export function useInvoices(): InvoicesContextValue {
  const ctx = useContext(InvoicesContext);
  if (!ctx) throw new Error("useInvoices must be used within <InvoicesProvider>");
  return ctx;
}

export function computeInvoicesKpi(list: Invoice[]): {
  totalIssued: number;
  totalReceived: number;
  paidIssued: number;
  overdueIssued: number;
  overdueCount: number;
  unpaidIssuedAmount: number;
  netProfit: number;
} {
  let totalIssued = 0, totalReceived = 0, paidIssued = 0, overdueIssued = 0, overdueCount = 0, unpaidIssuedAmount = 0;
  for (const i of list) {
    if (i.status === "cancelled") continue;
    if (i.direction === "issued") {
      totalIssued += i.totalRon;
      if (i.status === "paid") paidIssued += i.totalRon;
      if (i.status === "overdue") { overdueIssued += i.totalRon; overdueCount++; }
      if (i.status !== "paid") unpaidIssuedAmount += i.totalRon;
    } else {
      totalReceived += i.totalRon;
    }
  }
  return {
    totalIssued: Math.round(totalIssued * 100) / 100,
    totalReceived: Math.round(totalReceived * 100) / 100,
    paidIssued: Math.round(paidIssued * 100) / 100,
    overdueIssued: Math.round(overdueIssued * 100) / 100,
    overdueCount,
    unpaidIssuedAmount: Math.round(unpaidIssuedAmount * 100) / 100,
    netProfit: Math.round((totalIssued - totalReceived) * 100) / 100,
  };
}
