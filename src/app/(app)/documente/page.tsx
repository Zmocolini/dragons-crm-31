"use client";

import { Suspense } from "react";
import { DocumentsFilterProvider } from "@/lib/documents/filters-context";
import { DocumentsPage } from "@/components/documents/DocumentsPage";

// /documente — providerul de filtre e montat LOCAL (nu în layout global).
// DocumentsProvider (date) e deja în layout-ul (app). Filtrele folosesc
// useSearchParams → necesită graniță <Suspense>.
export default function DocumentePage() {
  return (
    <Suspense fallback={<div className="p-6 text-[13px] text-fg-muted">Se încarcă documentele…</div>}>
      <DocumentsFilterProvider>
        <DocumentsPage />
      </DocumentsFilterProvider>
    </Suspense>
  );
}
