"use client";

import { Eye, EyeOff, X } from "lucide-react";
import { FleetCard } from "./FleetCard";
import { Logo } from "./Logo";
import { SidebarNav } from "./SidebarNav";
import { useUI } from "@/lib/ui/ui-context";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const { sidebarOpen, closeSidebar, manageNav, toggleManageNav, hiddenHrefs } = useUI();
  const hiddenCount = hiddenHrefs.size;

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        // Mobile: fixed drawer, controlat de state
        "fixed inset-y-0 left-0 z-50 flex h-dvh w-[85vw] max-w-[360px] pb-[env(safe-area-inset-bottom)] flex-col border-r border-line bg-panel transition-transform duration-200 ease-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: mereu în flux, mereu vizibil (override total)
        "lg:sticky lg:top-0 lg:z-30 lg:w-[240px] lg:!translate-x-0 lg:transition-none",
      )}
    >
      <div className="flex items-start justify-between gap-2 px-5 pt-5 pb-3">
        <Logo />
        <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleManageNav}
          aria-label={manageNav ? "Termină ascunderea meniului" : "Ascunde secțiuni"}
          aria-expanded={manageNav}
          title={manageNav ? "Termină" : "Ascunde secțiuni"}
          className={cn(
            "relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40",
            manageNav
              ? "border-violet-500/60 bg-violet-500/15 text-violet-300"
              : "border-line bg-card text-fg-dim hover:border-white/15 hover:text-fg-muted",
          )}
        >
          {manageNav ? <EyeOff size={13} /> : <Eye size={13} />}
          {!manageNav && hiddenCount > 0 && (
            <span
              aria-label={`${hiddenCount} secțiuni ascunse`}
              className="absolute -right-0.5 -top-0.5 inline-flex h-3 min-w-3 items-center justify-center rounded-full bg-amber-500 px-0.5 text-[8px] font-bold text-black ring-2 ring-panel"
            >
              {hiddenCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={closeSidebar}
          aria-label="Închide meniul"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-card text-fg-dim hover:text-fg lg:hidden"
        >
          <X size={13} />
        </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-1">
        <SidebarNav />
      </div>

      {/* Card unic: flotă activă + plan + Schimbă flota. */}
      <div className="border-t border-line/80 px-4 pt-3 pb-2">
        <FleetCard />
      </div>

      <div className="px-4 pt-2 pb-3 text-[10px] font-mono text-fg-dim">v3.1.0</div>
    </aside>
  );
}
