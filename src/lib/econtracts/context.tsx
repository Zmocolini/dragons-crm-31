"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import { useSession } from "@/lib/rbac/session";
import { EMPTY_SIGNING, type Contract, type SignatureStatus } from "./types";
import {
  connectProvider, EMPTY_PROVIDER_CONFIG, sendEnvelope,
  type ProviderConfig, type SigningProvider,
} from "./service";

const STORAGE_KEY = "crm31-econtracts";
const PROVIDER_KEY = "crm31-econtracts-provider";

type NewContractInput = Omit<Contract, "id" | "createdAtIso" | "createdBy" | "status" | "signing">;

type ContractsContextValue = {
  hydrated: boolean;
  contracts: Contract[];
  fleetContracts: Contract[];

  providerConfig: ProviderConfig;
  connect: (input: { provider: SigningProvider; accountEmail: string; apiKey: string; plan?: string }) =>
    Promise<{ ok: true } | { ok: false; error: string }>;
  disconnect: () => void;

  addContract: (input: NewContractInput, actorName: string) => Contract;
  updateContract: (id: string, patch: Partial<Omit<Contract, "id" | "tenantId" | "createdAtIso">>) => void;
  deleteContract: (id: string) => void;

  /** Trimite plicul la providerul selectat (mock). Mută status → sent_for_signing. */
  sendForSigning: (id: string, provider: SigningProvider) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Marchează manual că am semnat noi (interior). */
  markOurSigned: (id: string) => void;
  /** Marchează manual că a semnat contrapartida (webhook mock). */
  markCounterSigned: (id: string) => void;
  /** Contrapartida a respins. */
  markRejected: (id: string, reason: string) => void;
  /** Anulează contractul (revocă plicul). */
  cancelContract: (id: string) => void;
};

const ContractsContext = createContext<ContractsContextValue | null>(null);

function safeRead<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Derivă status expired dacă endDate a trecut și n-a fost semnat sau e activ. */
function withDerivedStatus(c: Contract): Contract {
  if (!c.endDateIso) return c;
  if (c.status === "signed" || c.status === "cancelled" || c.status === "rejected" || c.status === "expired") return c;
  const now = Date.now();
  const t = new Date(c.endDateIso + "T00:00:00Z").getTime();
  if (Number.isFinite(t) && t < now) return { ...c, status: "expired" as const };
  return c;
}

export function ContractsProvider({ children }: { children: ReactNode }) {
  const { activeFleetId } = useSession();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>(EMPTY_PROVIDER_CONFIG);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setContracts(safeRead<Contract[]>(STORAGE_KEY, []));
    setProviderConfig(safeRead<ProviderConfig>(PROVIDER_KEY, EMPTY_PROVIDER_CONFIG));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts)); } catch {}
  }, [contracts, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(PROVIDER_KEY, JSON.stringify(providerConfig)); } catch {}
  }, [providerConfig, hydrated]);

  const connect = useCallback(async (input: { provider: SigningProvider; accountEmail: string; apiKey: string; plan?: string }) => {
    const res = await connectProvider(input);
    if (res.ok) {
      setProviderConfig(res.config);
      return { ok: true as const };
    }
    return { ok: false as const, error: res.error };
  }, []);

  const disconnect = useCallback(() => {
    setProviderConfig(EMPTY_PROVIDER_CONFIG);
  }, []);

  const derived = useMemo(() => contracts.map(withDerivedStatus), [contracts]);
  const fleetContracts = useMemo(
    () => derived.filter((c) => c.tenantId === activeFleetId),
    [derived, activeFleetId],
  );

  const addContract = useCallback((input: NewContractInput, actorName: string): Contract => {
    const created: Contract = {
      ...input,
      id: uid("ct"),
      status: "draft",
      signing: EMPTY_SIGNING,
      createdAtIso: new Date().toISOString(),
      createdBy: actorName,
    };
    setContracts((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateContract = useCallback((id: string, patch: Partial<Omit<Contract, "id" | "tenantId" | "createdAtIso">>) => {
    setContracts((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const deleteContract = useCallback((id: string) => {
    setContracts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const patchSigning = useCallback((id: string, patch: Partial<Contract["signing"]>) => {
    setContracts((prev) => prev.map((c) => c.id === id
      ? { ...c, signing: { ...(c.signing ?? EMPTY_SIGNING), ...patch } }
      : c,
    ));
  }, []);

  const setStatus = useCallback((id: string, status: SignatureStatus) => {
    setContracts((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
  }, []);

  const sendForSigning = useCallback(async (id: string, provider: SigningProvider) => {
    const contract = contracts.find((c) => c.id === id);
    if (!contract) return { ok: false as const, error: "Contract inexistent." };
    if (contract.status === "signed") return { ok: false as const, error: "Deja semnat complet." };

    patchSigning(id, { provider, sentAtIso: new Date().toISOString(), errorMessage: null });
    // apiKey vine din providerConfig salvat de user prin ConnectDialog.
    // pdfBase64 nu-l avem în state (doar nume + size), deci va rula mock în lipsa unui upload real.
    // TODO(real-users): mută PDF-ul în stocare + trimite base64 aici pentru API real.
    const res = await sendEnvelope({
      provider,
      contractNumber: contract.number,
      contractTitle: contract.title,
      documentType: contract.documentType ?? "contract",
      partyName: contract.partyName,
      partyEmail: contract.partyEmail,
      partyCui: contract.partyCui,
      pdfName: contract.pdfName,
      pdfBase64: null,
      apiKey: providerConfig.provider === provider && providerConfig.connected ? "***loaded-from-vault***" : null,
    });
    if (res.ok) {
      patchSigning(id, {
        envelopeId: res.envelopeId,
        signUrl: res.signUrl,
        lastEventIso: new Date().toISOString(),
      });
      setStatus(id, "sent_for_signing");
      return { ok: true as const };
    } else {
      patchSigning(id, { errorMessage: res.error, lastEventIso: new Date().toISOString() });
      return { ok: false as const, error: res.error };
    }
  }, [contracts, providerConfig, patchSigning, setStatus]);

  const markOurSigned = useCallback((id: string) => {
    const iso = new Date().toISOString();
    patchSigning(id, { ourSignedAtIso: iso, lastEventIso: iso });
    setStatus(id, "pending_counterparty");
  }, [patchSigning, setStatus]);

  const markCounterSigned = useCallback((id: string) => {
    const iso = new Date().toISOString();
    patchSigning(id, { counterSignedAtIso: iso, lastEventIso: iso });
    setStatus(id, "signed");
  }, [patchSigning, setStatus]);

  const markRejected = useCallback((id: string, reason: string) => {
    patchSigning(id, { errorMessage: reason, lastEventIso: new Date().toISOString() });
    setStatus(id, "rejected");
  }, [patchSigning, setStatus]);

  const cancelContract = useCallback((id: string) => {
    setStatus(id, "cancelled");
  }, [setStatus]);

  const value = useMemo<ContractsContextValue>(() => ({
    hydrated,
    contracts: derived,
    fleetContracts,
    providerConfig,
    connect, disconnect,
    addContract, updateContract, deleteContract,
    sendForSigning, markOurSigned, markCounterSigned, markRejected, cancelContract,
  }), [
    hydrated, derived, fleetContracts, providerConfig, connect, disconnect,
    addContract, updateContract, deleteContract,
    sendForSigning, markOurSigned, markCounterSigned, markRejected, cancelContract,
  ]);

  return <ContractsContext.Provider value={value}>{children}</ContractsContext.Provider>;
}

export function useContracts(): ContractsContextValue {
  const ctx = useContext(ContractsContext);
  if (!ctx) throw new Error("useContracts must be used within <ContractsProvider>");
  return ctx;
}

export function computeContractsKpi(list: Contract[]): {
  total: number;
  drafts: number;
  awaitingSignature: number;
  signed: number;
  expiringIn30: number;
  monthlyValueSigned: number;
} {
  const now = Date.now();
  const in30 = 30 * 24 * 60 * 60 * 1000;
  let drafts = 0, awaitingSignature = 0, signed = 0, expiringIn30 = 0, monthlyValueSigned = 0;
  for (const c of list) {
    if (c.status === "draft") drafts++;
    if (c.status === "sent_for_signing" || c.status === "pending_counterparty") awaitingSignature++;
    if (c.status === "signed") {
      signed++;
      monthlyValueSigned += c.monthlyValueRon ?? 0;
      if (c.endDateIso) {
        const t = new Date(c.endDateIso + "T00:00:00Z").getTime();
        if (Number.isFinite(t) && t - now <= in30 && t >= now) expiringIn30++;
      }
    }
  }
  return {
    total: list.length,
    drafts,
    awaitingSignature,
    signed,
    expiringIn30,
    monthlyValueSigned: Math.round(monthlyValueSigned * 100) / 100,
  };
}
