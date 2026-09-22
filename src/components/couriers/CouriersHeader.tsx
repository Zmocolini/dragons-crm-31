"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { useSession } from "@/lib/rbac/session";

type Props = {
  onAddCourier: () => void;
};

export function CouriersHeader({ onAddCourier }: Props) {
  const { can } = useSession();
  const canCreate = can("couriers.create");

  return (
    <header className="flex flex-col gap-3">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12.5px] text-fg-muted">
        <Link href="/" className="hover:text-fg transition-colors">Dashboard</Link>
        <ChevronRight size={12} className="text-fg-dim" />
        <span className="text-fg font-medium">Curieri</span>
      </nav>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold tracking-tight text-fg">Curieri</h1>
          <p className="mt-1 text-[13px] text-fg-muted">
            Gestionează curierii, activările și documentele flotei.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={onAddCourier}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-indigo-900/40 transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <Plus size={15} strokeWidth={2.5} />
            Curier nou
          </button>
        )}
      </div>
    </header>
  );
}
