"use client";

import Link from "next/link";
import { UserCog } from "lucide-react";

/** Redirect UI la noul /utilizatori (server-side, doar 2 roluri: Global Owner + Subcontractor). */
export function TabUtilizatori() {
  return (
    <div className="rounded-xl border border-line bg-card p-6">
      <div className="flex items-start gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15">
          <UserCog size={22} className="text-violet-300" />
        </span>
        <div>
          <h3 className="text-[15px] font-bold text-fg">Gestiunea utilizatorilor s-a mutat</h3>
          <p className="mt-1 text-[12.5px] text-fg-muted">
            Toate conturile CRM se administrează acum din pagina dedicată,
            cu autentificare server-side și doar 2 roluri: <b>Global Owner</b> și <b>Subcontractor</b>.
          </p>
          <Link
            href="/utilizatori"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-2 text-[12.5px] font-semibold text-white"
          >
            <UserCog size={13} /> Deschide „Utilizatori"
          </Link>
        </div>
      </div>
    </div>
  );
}
