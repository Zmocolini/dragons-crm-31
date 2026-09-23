import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SessionProvider } from "@/lib/rbac/session";
import { BackupProvider } from "@/lib/backup/context";
import { UIProvider } from "@/lib/ui/ui-context";
import { ProfileProvider } from "@/lib/profile/context";
import { SettingsProvider } from "@/lib/settings/context";
import { CandidatesProvider } from "@/lib/candidates/context";
import { CandidatesStageProvider } from "@/lib/candidates/stage-context";
import { CouriersProvider } from "@/lib/couriers/context";
import { DuplicatePairsProvider } from "@/lib/subcontractors/duplicate-pairs-context";
import { OwnerScopeProvider } from "@/lib/owner-scope/context";
import { PaymentsProvider } from "@/lib/payments/context";
import { ReportsProvider } from "@/lib/reports/context";
import { DocumentsProvider } from "@/lib/documents/context";
import { VehiclesProvider } from "@/lib/vehicles/context";
import { AccommodationsProvider } from "@/lib/accommodations/context";
import { InvoicesProvider } from "@/lib/invoices/context";
import { ContractsProvider } from "@/lib/econtracts/context";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <BackupProvider>
    <OwnerScopeProvider>
    <SessionProvider>
      <ProfileProvider>
        <SettingsProvider>
          <CandidatesProvider>
            <CandidatesStageProvider>
              <CouriersProvider>
                <DuplicatePairsProvider>
                <VehiclesProvider>
                <AccommodationsProvider>
                <InvoicesProvider>
                <ContractsProvider>
                <PaymentsProvider>
                  <ReportsProvider>
                    <DocumentsProvider>
                      <UIProvider>
                        <ToastProvider>
                          <AppShell>{children}</AppShell>
                        </ToastProvider>
                      </UIProvider>
                    </DocumentsProvider>
                  </ReportsProvider>
                </PaymentsProvider>
                </ContractsProvider>
                </InvoicesProvider>
                </AccommodationsProvider>
                </VehiclesProvider>
                </DuplicatePairsProvider>
              </CouriersProvider>
            </CandidatesStageProvider>
          </CandidatesProvider>
        </SettingsProvider>
      </ProfileProvider>
    </SessionProvider>
    </OwnerScopeProvider>
    </BackupProvider>
  );
}
