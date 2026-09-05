"use client";

import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ThemeApplier } from "./ThemeApplier";
import { useUI } from "@/lib/ui/ui-context";

export function AppShell({ children }: { children: ReactNode }) {
  const { sidebarOpen } = useUI();

  return (
    <div className="flex min-h-screen bg-app text-fg">
      <ThemeApplier />
      {sidebarOpen && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="min-w-0 flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
