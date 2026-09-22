"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLoading } from "@/lib/loading/context";

/**
 * Declanșează loading-ul global la fiecare schimbare de pathname / searchParams
 * INCLUSIV la prima încărcare / reload — user vrea să vadă dragonul mereu.
 */
export function RouteLoadingBridge() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { start, finish } = useLoading();

  useEffect(() => {
    start();
    // Natural — 1.8-2.8s per navigare, ca și cum ar veni date reale. Hard-cap 4s.
    const delay = 1800 + Math.random() * 1000;
    const t = setTimeout(() => { finish(); }, delay);
    return () => { clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return null;
}
