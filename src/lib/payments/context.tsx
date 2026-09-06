"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import type { Payment, PaymentStatus } from "./types";
import { useSession } from "@/lib/rbac/session";

// TODO(real-users): server action `createPayment(input)` cu authorize(role, "payments.create")
// + insert în tabelul `payments` + audit log server-side.

const STORAGE_KEY = "crm31-payments";

type PaymentsContextValue = {
  payments: Payment[];
  addPayment: (p: Omit<Payment, "id" | "createdAtIso">) => Payment;
  updatePaymentStatus: (id: string, status: PaymentStatus) => void;
  /** Toate plățile pentru flota activă (filtrate). */
  fleetPayments: Payment[];
  hydrated: boolean;
};

const PaymentsContext = createContext<PaymentsContextValue | null>(null);

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const { activeFleetId } = useSession();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPayments(JSON.parse(raw) as Payment[]);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
    } catch {}
  }, [payments, hydrated]);

  const addPayment = useCallback((p: Omit<Payment, "id" | "createdAtIso">) => {
    const created: Payment = {
      ...p,
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAtIso: new Date().toISOString(),
    };
    setPayments((prev) => [created, ...prev]);
    return created;
  }, []);

  const updatePaymentStatus = useCallback((id: string, status: PaymentStatus) => {
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }, []);

  const fleetPayments = useMemo(
    () => payments.filter((p) => p.fleetId === activeFleetId),
    [payments, activeFleetId],
  );

  const value = useMemo<PaymentsContextValue>(
    () => ({ payments, addPayment, updatePaymentStatus, fleetPayments, hydrated }),
    [payments, addPayment, updatePaymentStatus, fleetPayments, hydrated],
  );

  return <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>;
}

export function usePayments() {
  const ctx = useContext(PaymentsContext);
  if (!ctx) throw new Error("usePayments must be used within <PaymentsProvider>");
  return ctx;
}
