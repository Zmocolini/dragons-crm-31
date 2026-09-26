"use client";

import type { ReactNode } from "react";
import { FaviconApplier } from "./FaviconApplier";
import { Footer } from "./Footer";
import { GestureNavigation } from "./GestureNavigation";
import { GlobalBanners } from "./GlobalBanners";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ThemeApplier } from "./ThemeApplier";
import { useUI } from "@/lib/ui/ui-context";

export function AppShell({ children }: { children: ReactNode }) {
  const { sidebarOpen, closeSidebar } = useUI();

  return (
    <div className="flex min-h-dvh bg-app text-fg">
      <ThemeApplier />
      <FaviconApplier />
      <Sidebar />
      <GestureNavigation />
      {/* Backdrop mobil când sidebar-ul e deschis */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Închide meniul"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <GlobalBanners />
        <Header />
        <main className="min-w-0 flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
