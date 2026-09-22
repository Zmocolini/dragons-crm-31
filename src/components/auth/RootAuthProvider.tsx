"use client";

import { Suspense, type ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/context";
import { LoadingProvider } from "@/lib/loading/context";
import { DragonLoader } from "@/components/loading/DragonLoader";
import { RouteLoadingBridge } from "@/components/loading/RouteLoadingBridge";
import { AuthGuard } from "./AuthGuard";

/**
 * Wrapper client pentru layout-ul root — încarcă auth-ul și loading-ul global.
 * Login/register sunt tratate ca publice și lăsate să treacă prin AuthGuard.
 * DragonLoader apare la fiecare schimbare de route, max 3 secunde.
 */
export function RootAuthProvider({ children }: { children: ReactNode }) {
  return (
    <LoadingProvider>
      <AuthProvider>
        <Suspense fallback={null}>
          <RouteLoadingBridge />
        </Suspense>
        <AuthGuard>{children}</AuthGuard>
        <DragonLoader />
      </AuthProvider>
    </LoadingProvider>
  );
}
