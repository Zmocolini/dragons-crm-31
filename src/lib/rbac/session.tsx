"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Role } from "./roles";
import { hasPermission, type Permission } from "./roles";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  planLabel: string;
  planUsage: {
    used: number;
    total: number;
  };
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  activeTenant: Tenant;
};

// TODO(real-users): înlocuiește mock-ul cu useSession() din Better-Auth server-side.
const MOCK_SESSION: SessionUser = {
  id: "u_ioan",
  name: "Ioan Varga",
  email: "cryptoportofolio1@gmail.com",
  role: "global_owner",
  avatarUrl: null,
  activeTenant: {
    id: "t_dragon",
    name: "Dragon Delivery",
    slug: "dragon-delivery",
    planLabel: "Plan Business",
    planUsage: { used: 324, total: 500 },
  },
};

type SessionContextValue = {
  user: SessionUser;
  can: (permission: Permission) => boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
  user = MOCK_SESSION,
}: {
  children: ReactNode;
  user?: SessionUser;
}) {
  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      can: (permission) => hasPermission(user.role, permission),
    }),
    [user],
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
