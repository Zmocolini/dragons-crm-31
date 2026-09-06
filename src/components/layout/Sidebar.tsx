"use client";

import { Eye, EyeOff } from "lucide-react";
import { FleetCard } from "./FleetCard";
import { Logo } from "./Logo";
import { SidebarNav } from "./SidebarNav";
import { useUI } from "@/lib/ui/ui-context";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const { manageNav, toggleManageNav, hiddenHrefs } = useUI();
  const hiddenCount = hiddenHrefs.size;

  return (
    <aside
      aria-label="Sidebar"
      className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col border-r border-line bg-panel"
    >
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <Logo />
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
