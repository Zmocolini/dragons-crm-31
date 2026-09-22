"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";

// Loading global cu progres 0-100%. Feel natural — ~2.5 secunde tipic, max 4.
// Trigger-uri:
//  - schimbare de route (via <RouteLoadingBridge>)
//  - manual: useLoading().start() / finish() în orice component

const MAX_DURATION_MS = 3200;   // animația de bază; hard cap la 4000ms
const HARD_CAP_MS     = 4000;

type LoadingContextValue = {
  visible: boolean;
  progress: number;             // 0-100
  start: () => void;
  finish: () => void;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);
  const hardCapRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAll = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (hardCapRef.current !== null) { clearTimeout(hardCapRef.current); hardCapRef.current = null; }
  }, []);

  const finish = useCallback(() => {
    clearAll();
    setProgress(100);
    // fade out după 200ms
    setTimeout(() => { setVisible(false); setProgress(0); }, 220);
  }, [clearAll]);

  const start = useCallback(() => {
    clearAll();
    setVisible(true);
    setProgress(0);
    startTsRef.current = performance.now();

    // Curbă „reală" — urcă natural cu 2 pauze scurte (ca și cum așteaptă răspuns server).
    // 0-40% rapid (fetch inițial), pauză, 40-75% mediu (procesare), pauză, 75-90% lent (render).
    const tick = () => {
      const elapsed = performance.now() - startTsRef.current;
      const t = Math.min(1, elapsed / MAX_DURATION_MS);
      let pct: number;
      if (t < 0.25) {
        // Fetch inițial — accelerează repede la 40%
        pct = (t / 0.25) * 40;
      } else if (t < 0.35) {
        // Pauză 1 — micro-stall la 40-42% (server thinking)
        pct = 40 + ((t - 0.25) / 0.10) * 2;
      } else if (t < 0.65) {
        // Processing — urcă la 75%
        pct = 42 + ((t - 0.35) / 0.30) * 33;
      } else if (t < 0.75) {
        // Pauză 2 — stall la 75-77%
        pct = 75 + ((t - 0.65) / 0.10) * 2;
      } else {
        // Render final — urcă lent la 92%
        pct = 77 + ((t - 0.75) / 0.25) * 15;
      }
      setProgress(Math.min(92, Math.round(pct)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    // Hard cap — dacă nimeni nu cheamă finish, se închide oricum
    hardCapRef.current = setTimeout(() => { finish(); }, HARD_CAP_MS);
  }, [clearAll, finish]);

  useEffect(() => () => clearAll(), [clearAll]);

  const value = useMemo<LoadingContextValue>(() => ({
    visible, progress, start, finish,
  }), [visible, progress, start, finish]);

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used within <LoadingProvider>");
  return ctx;
}
