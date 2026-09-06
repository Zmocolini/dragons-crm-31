"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role } from "./roles";
import { hasPermission, type Permission } from "./roles";

export type PlanTier = "trial" | "start" | "business" | "professional" | "enterprise";

export type FleetTenant = {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  cui: string;
  planLabel: string;
  planTier: PlanTier;
  planUsage: {
    used: number;
    total: number;
  };
};

// Alias pentru retro-compatibilitate cu componentele care foloseau Tenant
export type Tenant = FleetTenant;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  activeTenant: FleetTenant;
};

// TODO(real-users): înlocuiește mock-ul cu useSession() din Better-Auth server-side +
// tabela user_tenants pentru lista de flote accesibile per user.
const MOCK_FLEETS: FleetTenant[] = [
  { id: "t_dragon",  name: "Dragon Delivery", slug: "dragon-delivery", city: "București",    country: "România", cui: "RO12345678", planLabel: "Plan Business",     planTier: "business",     planUsage: { used: 324, total: 500 } },
  { id: "t_cluj",    name: "DD Cluj",         slug: "dd-cluj",         city: "Cluj-Napoca",  country: "România", cui: "RO87654321", planLabel: "Plan Professional", planTier: "professional", planUsage: { used: 48,  total: 200 } },
  { id: "t_tm",      name: "DD Timișoara",    slug: "dd-timisoara",    city: "Timișoara",    country: "România", cui: "RO11223344", planLabel: "Plan Business",     planTier: "business",     planUsage: { used: 76,  total: 300 } },
  { id: "t_iasi",    name: "DD Iași",         slug: "dd-iasi",         city: "Iași",         country: "România", cui: "RO55667788", planLabel: "Plan Start",        planTier: "start",        planUsage: { used: 62,  total: 250 } },
  { id: "t_ct",      name: "DD Constanța",    slug: "dd-constanta",    city: "Constanța",    country: "România", cui: "RO99887766", planLabel: "Plan Start",        planTier: "start",        planUsage: { used: 41,  total: 150 } },
  { id: "t_brasov",  name: "DD Brașov",       slug: "dd-brasov",       city: "Brașov",       country: "România", cui: "RO44556677", planLabel: "Plan Trial",        planTier: "trial",        planUsage: { used: 28,  total: 100 } },
];

const DEFAULT_ACTIVE_FLEET_ID = "t_dragon";
const STORAGE_KEY = "crm31-active-fleet";

const MOCK_SESSION: Omit<SessionUser, "activeTenant"> = {
  id: "u_ioan",
  name: "Ioan Varga",
  email: "cryptoportofolio1@gmail.com",
  role: "global_owner",
  avatarUrl: null,
};

type SessionContextValue = {
  user: SessionUser;
  can: (permission: Permission) => boolean;
  fleets: FleetTenant[];
  activeFleetId: string;
  setActiveFleet: (id: string) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeFleetId, setActiveFleetId] = useState<string>(DEFAULT_ACTIVE_FLEET_ID);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && MOCK_FLEETS.some((f) => f.id === stored)) setActiveFleetId(stored);
    } catch {}
  }, []);

  const setActiveFleet = useCallback((id: string) => {
    if (!MOCK_FLEETS.some((f) => f.id === id)) return;
    setActiveFleetId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  }, []);

  const activeTenant = useMemo(
    () => MOCK_FLEETS.find((f) => f.id === activeFleetId) ?? MOCK_FLEETS[0],
    [activeFleetId],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      user: { ...MOCK_SESSION, activeTenant },
      can: (permission) => hasPermission(MOCK_SESSION.role, permission),
      fleets: MOCK_FLEETS,
      activeFleetId,
      setActiveFleet,
    }),
    [activeTenant, activeFleetId, setActiveFleet],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a <SessionProvider>");
  }
  return ctx;
}
