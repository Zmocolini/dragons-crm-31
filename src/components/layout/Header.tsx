"use client";

import { Menu, Moon, Sun } from "lucide-react";
import { useUI } from "@/lib/ui/ui-context";
import { HeaderClock } from "./HeaderClock";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import { useProfile } from "@/lib/profile/context";
import { BackupBadge } from "./BackupBadge";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const { sidebarOpen, toggleSidebar } = useUI();
  const { profile, updateProfile } = useProfile();

  return (
    <header
      role="banner"
      className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-app/85 px-3 backdrop-blur sm:gap-4 sm:px-5"
    >
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? "Ascunde meniul" : "Arată meniul"}
        aria-expanded={sidebarOpen}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 lg:hidden"
      >
        <Menu size={22} />
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <BackupBadge />
        <HeaderClock />

        <div className="mx-1 hidden h-6 w-px bg-line md:block" />

        <LanguageSwitcher />

        <button
          type="button"
          onClick={() => updateProfile({ theme: profile.theme === "light" ? "dark" : "light" })}
          aria-label="Schimbă tema"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
        >
          {profile.theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        <NotificationBell />

        <div className="ml-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
