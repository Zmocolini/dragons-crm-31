"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/rbac/session";

export type AccountInfo = { name: string; role: string; active?: boolean };
export type CourierOwner = { kind: "internal" | "subcontractor"; label: string };

/** email cont → {nume, rol}. Doar Global Owner poate lista conturile; pentru ceilalți harta rămâne goală. */
export function useAccountDirectory(): Map<string, AccountInfo> {
  const { user } = useSession();
  const [map, setMap] = useState<Map<string, AccountInfo>>(new Map());
  const isOwner = user.role === "global_owner";
  useEffect(() => {
    if (!isOwner) return;
    let alive = true;
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((j: { users?: Array<{ email: string; name: string; role: string; active?: boolean }> }) => {
        if (alive) setMap(new Map((j.users ?? []).map((u) => [u.email.toLowerCase(), { name: u.name, role: u.role, active: u.active }])));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [isOwner]);
  return map;
}

/** Curier intern = creat de un cont Global Owner (sau fără cont cunoscut); al subcontractorului = creat de contul lui. */
export function courierOwner(
  c: { createdBy?: string | null; subcontractorName?: string | null },
  dir: Map<string, AccountInfo>,
): CourierOwner {
  if (c.subcontractorName) return { kind: "subcontractor", label: c.subcontractorName };
  const acc = dir.get((c.createdBy ?? "").toLowerCase());
  if (acc?.role === "subcontractor_owner") return { kind: "subcontractor", label: acc.name };
  return { kind: "internal", label: "Intern" };
}
