"use client";

import { type ReactNode } from "react";

/**
 * NO-OP: auth-ul e făcut server-side de `middleware.ts` (redirect la /login
 * dacă lipsește cookie-ul). Componenta asta doar randează copiii.
 * Vechiul redirect client-side făcea loop cu middleware-ul.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
