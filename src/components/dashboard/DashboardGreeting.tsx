"use client";

import { useSession } from "@/lib/rbac/session";
import { formatRoLongDate } from "@/lib/utils/date";

export function DashboardGreeting() {
  const { user } = useSession();
  const firstName = user.name.split(" ")[0];
  const now = new Date();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold tracking-tight text-fg md:text-[28px]">
          Bun venit, {firstName}!
        </h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">
          Aici ai o imagine completă a flotei tale.
        </p>
      </div>
      <div className="text-left md:text-right">
        <div className="text-[13px] font-medium text-fg-muted">
          {formatRoLongDate(now)}
        </div>
        <div className="mt-0.5 text-[11.5px] italic text-fg-dim">
          &bdquo;O echipă puternică livrează mai mult decât comenzi.&rdquo;
        </div>
      </div>
    </div>
  );
}
