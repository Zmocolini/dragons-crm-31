"use client";

import { Bell, Menu, Sun } from "lucide-react";
import { useUI } from "@/lib/ui/ui-context";
import { HeaderClock } from "./HeaderClock";
import { UserMenu } from "./UserMenu";

export function Header() {
  const { sidebarOpen, toggleSidebar } = useUI();

  return (
    <header
      role="banner"
      className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-app/85 px-5 backdrop-blur"
    >
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? "Ascunde meniul" : "Arată meniul"}
        aria-expanded={sidebarOpen}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
      >
        <Menu size={20} />
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <HeaderClock />

        <div className="mx-1 hidden h-6 w-px bg-line md:block" />

        <button
          type="button"
          aria-label="Schimbă tema"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
        >
          <Sun size={17} />
        </button>

        <button
          type="button"
          aria-label="8 notificări noi"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
        >
          <Bell size={17} />
          <span
            data-non-essential
            className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-app"
          >
            8
          </span>
        </button>

        <div className="ml-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
