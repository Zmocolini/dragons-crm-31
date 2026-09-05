import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SessionProvider } from "@/lib/rbac/session";
import { UIProvider } from "@/lib/ui/ui-context";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <UIProvider>
        <AppShell>{children}</AppShell>
      </UIProvider>
    </SessionProvider>
  );
}
