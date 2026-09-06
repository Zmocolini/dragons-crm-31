import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SessionProvider } from "@/lib/rbac/session";
import { UIProvider } from "@/lib/ui/ui-context";
import { ProfileProvider } from "@/lib/profile/context";
import { SettingsProvider } from "@/lib/settings/context";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ProfileProvider>
        <SettingsProvider>
          <UIProvider>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </UIProvider>
        </SettingsProvider>
      </ProfileProvider>
    </SessionProvider>
  );
}
