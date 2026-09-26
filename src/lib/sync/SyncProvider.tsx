"use client";

import { Fragment, useCallback, useEffect, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { syncEngine } from "./engine";

const PULL_INTERVAL_MS = 15_000;

/** Evenimente pentru pull-to-refresh (declanșat din GestureNavigation). */
export const PULL_REFRESH = "crm:pull-refresh";
export const PULL_REFRESH_DONE = "crm:pull-refresh-done";

/** Poate fi reîncărcat arborele de date fără să pierdem ce scrie userul acum? */
function isSafeToRemount(): boolean {
  if (document.querySelector('[role="dialog"], [data-modal-shell]')) return false;
  const el = document.activeElement;
  return !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement);
}

/**
 * Sincronizează datele CRM cu serverul (per cont). Randează copiii DOAR după ce datele
 * vizibile contului au ajuns în localStorage — providerii se hidratează apoi normal.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [staleBanner, setStaleBanner] = useState(false);

  const remount = useCallback(() => {
    setStaleBanner(false);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    syncEngine.onExternalChange = () => {
      if (isSafeToRemount()) remount(); else setStaleBanner(true);
    };
    syncEngine.init().then((r) => {
      if (cancelled) return;
      if (r === "unauthorized") { window.location.href = "/login"; return; }
      setReady(true);
    });
    return () => { cancelled = true; syncEngine.onExternalChange = null; };
  }, [remount]);

  useEffect(() => {
    if (!ready) return;
    const refresh = async () => {
      const changed = await syncEngine.pull();
      if (changed === 0) return;
      // Actualizez direct; butonul apare doar dacă userul e în mijlocul unui formular.
      if (isSafeToRemount()) remount(); else setStaleBanner(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        syncEngine.diffNow();
        void syncEngine.flush({ keepalive: true });
        return;
      }
      void refresh();
    };
    // iOS: revenirea din alt app / din cache-ul Safari nu declanșează mereu visibilitychange.
    const onFocus = () => { void refresh(); };
    // Pull-to-refresh (GestureNavigation): urc ce e local, aduc tot ce e nou, reîncarc vederea.
    const onPullRefresh = async () => {
      try {
        syncEngine.diffNow();
        await syncEngine.flush();
        await syncEngine.pull();
      } finally {
        remount();
        window.dispatchEvent(new Event(PULL_REFRESH_DONE));
      }
    };
    window.addEventListener(PULL_REFRESH, onPullRefresh);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onFocus);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, PULL_INTERVAL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onFocus);
      window.removeEventListener(PULL_REFRESH, onPullRefresh);
      clearInterval(t);
    };
  }, [ready, remount]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-app text-fg-muted">
        <div className="flex items-center gap-2 text-[13px]">
          <RefreshCw size={15} className="animate-spin" />
          Se sincronizează datele…
        </div>
      </div>
    );
  }

  return (
    <>
      {staleBanner && (
        <div className="fixed inset-x-0 top-0 z-[120] flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
          <button
            type="button"
            onClick={remount}
            className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white shadow-lg"
          >
            <RefreshCw size={14} />
            Date noi de pe alt dispozitiv — actualizează
          </button>
        </div>
      )}
      <Fragment key={version}>{children}</Fragment>
    </>
  );
}
