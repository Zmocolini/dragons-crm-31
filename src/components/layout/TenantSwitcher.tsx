"use client";

import { ChevronsUpDown } from "lucide-react";
import { useSession } from "@/lib/rbac/session";

export function TenantSwitcher() {
  const { user, can } = useSession();
  const t = user.activeTenant;
  const canSwitch = can("tenant.switch");

  return (
    <button
      type="button"
      disabled={!canSwitch}
      className="group flex w-full items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5 text-left transition-colors hover:bg-card-hover disabled:cursor-default disabled:opacity-90"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-[13px] font-black text-white">
        {t.name.charAt(0)}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-fg-dim">
          Flotă activă
        </span>
        <span className="block truncate text-[13px] font-semibold text-fg">
          {t.name}
        </span>
        {canSwitch && (
          <span className="block text-[10px] text-fg-dim">Schimbă flotă</span>
        )}
      </span>
      {canSwitch && (
        <ChevronsUpDown
          size={14}
          className="shrink-0 text-fg-dim group-hover:text-fg-muted"
        />
      )}
    </button>
  );
}
