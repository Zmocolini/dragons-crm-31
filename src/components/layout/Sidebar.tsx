import { Logo } from "./Logo";
import { PlanUsage } from "./PlanUsage";
import { SidebarNav } from "./SidebarNav";
import { TenantSwitcher } from "./TenantSwitcher";

export function Sidebar() {
  return (
    <aside
      aria-label="Sidebar"
      className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col border-r border-line bg-panel"
    >
      <div className="px-5 pt-5 pb-4">
        <Logo />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-1">
        <SidebarNav />
      </div>

      <div className="border-t border-line/80 px-4 pt-3 pb-2">
        <TenantSwitcher />
      </div>

      <div className="px-4 pt-3 pb-2">
        <PlanUsage />
      </div>

      <div className="px-4 pt-2 pb-3 text-[10px] font-mono text-fg-dim">v3.1.0</div>
    </aside>
  );
}
