"use client";

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from "react";

const KEY_PREFIX = "crm31-";
const DEBOUNCE_MS = 4000;
const HYDRATION_FLAG = "__crm31_backup_hydrated__";

export type BackupInfo = { filename: string; size: number; mtime: string };
type State = {
  lastBackupIso: string | null;
  busy: boolean;
  error: string | null;
  autoRestored: boolean;
};

type Ctx = {
  state: State;
  backupNow: () => Promise<void>;
  listBackups: () => Promise<BackupInfo[]>;
  restoreBackup: (filename: string) => Promise<boolean>;
  restoreLatest: () => Promise<boolean>;
};

const BackupContext = createContext<Ctx | null>(null);

function collectCrmKeys(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(KEY_PREFIX)) {
      const v = localStorage.getItem(k);
      if (v != null) out[k] = v;
    }
  }
  return out;
}

function hasAnyCrmData(): boolean {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(KEY_PREFIX)) {
      const v = localStorage.getItem(k);
      // consider empty arrays / empty objects ca "fără date" pentru trigger de auto-restore
      if (v && v !== "[]" && v !== "{}" && v !== "null" && v !== "") return true;
    }
  }
  return false;
}

async function postBackup(keys: Record<string, string>): Promise<void> {
  const res = await fetch("/api/backup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(keys),
  });
  if (!res.ok) throw new Error(`backup failed: ${res.status}`);
}

export function BackupProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({
    lastBackupIso: null, busy: false, error: null, autoRestored: false,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  const backupNow = useCallback(async () => {
    const keys = collectCrmKeys();
    if (Object.keys(keys).length === 0) return;
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      await postBackup(keys);
      setState({ lastBackupIso: new Date().toISOString(), busy: false, error: null, autoRestored: false });
      dirtyRef.current = false;
    } catch (e) {
      setState((s) => ({ ...s, busy: false, error: String((e as Error).message ?? e) }));
    }
  }, []);

  const listBackups = useCallback(async (): Promise<BackupInfo[]> => {
    try {
      const res = await fetch("/api/backup");
      const j = await res.json();
      return (j.backups ?? []) as BackupInfo[];
    } catch { return []; }
  }, []);

  const restoreBackup = useCallback(async (filename: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/backup/${encodeURIComponent(filename)}`);
      if (!res.ok) return false;
      const backup = await res.json();
      const keys = backup.keys as Record<string, string> | undefined;
      if (!keys) return false;
      for (const [k, v] of Object.entries(keys)) {
        localStorage.setItem(k, v);
      }
      return true;
    } catch { return false; }
  }, []);

  const restoreLatest = useCallback(async (): Promise<boolean> => {
    const list = await listBackups();
    if (list.length === 0) return false;
    return await restoreBackup(list[0].filename);
  }, [listBackups, restoreBackup]);

  useEffect(() => {
    let cancelled = false;

    // Setup 1: auto-restore la prima încărcare dacă localStorage e gol
    (async () => {
      if (sessionStorage.getItem(HYDRATION_FLAG)) return; // deja verificat în sesiunea asta
      sessionStorage.setItem(HYDRATION_FLAG, "1");
      if (hasAnyCrmData()) return;
      const restored = await restoreLatest();
      if (restored && !cancelled) {
        setState((s) => ({ ...s, autoRestored: true }));
        // Reload ca providerii de state (couriers, payments, etc) să rehydreze din localStorage
        window.location.reload();
      }
    })();

    // Setup 2: patch localStorage.setItem/removeItem ca să detectăm modificări în același tab
    const origSet = localStorage.setItem.bind(localStorage);
    const origRemove = localStorage.removeItem.bind(localStorage);

    const markDirty = () => {
      dirtyRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => { backupNow(); }, DEBOUNCE_MS);
    };

    localStorage.setItem = function (k: string, v: string) {
      origSet(k, v);
      if (k.startsWith(KEY_PREFIX)) markDirty();
    };
    localStorage.removeItem = function (k: string) {
      origRemove(k);
      if (k.startsWith(KEY_PREFIX)) markDirty();
    };

    // Setup 3: storage event pentru modificări din alte taburi
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith(KEY_PREFIX)) markDirty();
    };
    window.addEventListener("storage", onStorage);

    // Setup 4: backup înainte de închidere via sendBeacon (nu poate fi cancelled)
    const onBeforeUnload = () => {
      if (!dirtyRef.current) return;
      const keys = collectCrmKeys();
      if (Object.keys(keys).length === 0) return;
      const blob = new Blob([JSON.stringify(keys)], { type: "application/json" });
      navigator.sendBeacon("/api/backup", blob);
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    // Setup 5: backup periodic (fallback) la fiecare 5 minute dacă e dirty
    const interval = setInterval(() => {
      if (dirtyRef.current) backupNow();
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      localStorage.setItem = origSet;
      localStorage.removeItem = origRemove;
    };
  }, [backupNow, restoreLatest]);

  return (
    <BackupContext.Provider value={{ state, backupNow, listBackups, restoreBackup, restoreLatest }}>
      {children}
    </BackupContext.Provider>
  );
}

export function useBackup(): Ctx {
  const c = useContext(BackupContext);
  if (!c) throw new Error("useBackup trebuie folosit în interiorul BackupProvider");
  return c;
}
