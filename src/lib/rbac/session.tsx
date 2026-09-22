"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/context";
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
  /** Branding per flotă. */
  logoDataUrl: string | null;   // data:image/png;base64,... (upload user)
  flagEmoji: string | null;     // "🇷🇴", "🚀" etc. — fallback vizual când n-ai logo
  brandColor: string | null;    // hex, ex "#7c3aed" — folosit în FleetCard, header active-fleet
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
  {
    id: "t_dragon",
    name: "Dragon Delivery",
    slug: "dragon-delivery",
    city: "București",
    country: "România",
    cui: "RO12345678",
    planLabel: "Plan Business",
    planTier: "business",
    planUsage: { used: 0, total: 500 },
    logoDataUrl: null,
    flagEmoji: "🐉",
    brandColor: "#f97316",
  },
];

const DEFAULT_ACTIVE_FLEET_ID = "t_dragon";
const STORAGE_KEY = "crm31-active-fleet";

type SessionContextValue = {
  user: SessionUser;
  can: (permission: Permission) => boolean;
  fleets: FleetTenant[];
  activeFleetId: string;
  setActiveFleet: (id: string) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * SessionProvider — folosește user-ul din AuthProvider dacă e logat.
 * Dacă nu, cade pe MOCK_FLEETS[0] + user demo pentru compatibilitate cu paginile publice.
 * AuthGuard oricum redirecționează la /login când current e null.
 */
export function SessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { current } = useAuth();
  const [activeFleetId, setActiveFleetId] = useState<string>(DEFAULT_ACTIVE_FLEET_ID);

  useEffect(() => {
    if (current) {
      setActiveFleetId(current.fleetId);
      try { localStorage.setItem(STORAGE_KEY, current.fleetId); } catch {}
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setActiveFleetId(stored);
    } catch {}
  }, [current]);

  const setActiveFleet = useCallback((id: string) => {
    setActiveFleetId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  }, []);

  const allFleets = useMemo<FleetTenant[]>(() => {
    return current ? [current.fleet] : MOCK_FLEETS;
  }, [current]);

  const activeTenant = useMemo<FleetTenant>(
    () => allFleets.find((f) => f.id === activeFleetId) ?? allFleets[0] ?? MOCK_FLEETS[0],
    [allFleets, activeFleetId],
  );

  const sessionUser = useMemo<SessionUser>(() => {
    if (current) {
      return {
        id: current.id,
        name: current.name,
        email: current.email,
        role: current.role,
        avatarUrl: current.avatarDataUrl,
        activeTenant,
      };
    }
    return {
      id: "guest",
      name: "Guest",
      email: "",
      role: "viewer",
      avatarUrl: null,
      activeTenant,
    };
  }, [current, activeTenant]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user: sessionUser,
      can: (permission) => hasPermission(sessionUser.role, permission),
      fleets: allFleets,
      activeFleetId: activeTenant.id,
      setActiveFleet,
    }),
    [sessionUser, allFleets, activeTenant, setActiveFleet],
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
