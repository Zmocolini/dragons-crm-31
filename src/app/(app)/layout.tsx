import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SessionProvider } from "@/lib/rbac/session";
import { UIProvider } from "@/lib/ui/ui-context";
import { ProfileProvider } from "@/lib/profile/context";
import { SettingsProvider } from "@/lib/settings/context";
import { CandidatesProvider } from "@/lib/candidates/context";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ProfileProvider>
        <SettingsProvider>
          <CandidatesProvider>
            <UIProvider>
              <ToastProvider>
                <AppShell>{children}</AppShell>
              </ToastProvider>
            </UIProvider>
          </CandidatesProvider>
        </SettingsProvider>
      </ProfileProvider>
    </SessionProvider>
  );
}
