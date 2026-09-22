"use client";

import { Suspense } from "react";
import { ReportsFilterProvider } from "@/lib/reports/filters-context";
import { SavedReportsProvider } from "@/lib/reports/saved";
import { ReportsPage } from "@/components/reports/ReportsPage";

// /rapoarte — pagina Rapoarte. Providerele de filtre + rapoarte salvate sunt montate
// LOCAL aici (nu în layout-ul global) ca să nu afecteze celelalte module.
// ReportsFilterProvider folosește useSearchParams → necesită graniță <Suspense>.
export default function RapoartePage() {
  return (
    <Suspense fallback={<div className="p-6 text-[13px] text-fg-muted">Se încarcă rapoartele…</div>}>
      <ReportsFilterProvider>
        <SavedReportsProvider>
          <ReportsPage />
        </SavedReportsProvider>
      </ReportsFilterProvider>
    </Suspense>
  );
}
