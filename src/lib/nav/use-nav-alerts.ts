"use client";

import { useMemo } from "react";
import { usePayments } from "@/lib/payments/context";
import { useDocuments } from "@/lib/documents/context";

/**
 * Returnează setul de href-uri care au acțiuni în așteptare (punct roșu în sidebar).
 * Derivat 100% din datele reale ale userului — dacă totul e gol, setul e gol.
 */
export function useNavAlerts(): Set<string> {
  const { fleetPayments } = usePayments();
  const { fleetDocuments } = useDocuments();

  return useMemo(() => {
    const out = new Set<string>();

    const needsAttentionPayments = fleetPayments.filter((p) =>
      p.status === "unpaid" || p.status === "in_review" || p.status === "blocked" || p.status === "issue",
    );
    if (needsAttentionPayments.length > 0) out.add("/plati");

    const problemDocs = fleetDocuments.filter((d) =>
      d.status === "expired" || d.status === "missing" || d.status === "rejected",
    );
    if (problemDocs.length > 0) out.add("/documente");

    return out;
  }, [fleetPayments, fleetDocuments]);
}
