"use client";

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from "react";

const KEY_PREFIX = "crm31-";
const DEBOUNCE_MS = 4000;

export type BackupInfo = { filename: string; size: number; mtime: string; items?: number; shrunk?: boolean };
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

// Cheile cu datele reale. Restul (settings, profile, schema-version, sesiuni) există mereu
// pe orice device — nu indică faptul că device-ul are date.
const CORE_KEYS = ["crm31-couriers", "crm31-payments"];

function hasCoreData(): boolean {
  return CORE_KEYS.some((k) => {
    try {
      const v = JSON.parse(localStorage.getItem(k) ?? "[]");
      return Array.isArray(v) && v.length > 0;
    } catch { return false; }
  });
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
    // Device gol (telefon nou, browser curat) nu trimite backup — altfel împinge afară
    // snapshot-urile bune din rotația de pe server.
    if (!hasCoreData()) return;
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
    const list = (await listBackups()).filter((b) => !b.shrunk);
    if (list.length === 0) return false;
    // Cel mai nou snapshot care are volum comparabil cu cel mai mare (sare peste snapshot-uri goale).
    const maxItems = Math.max(...list.map((b) => b.items ?? 0));
    const good = list.find((b) => (b.items ?? 0) >= maxItems * 0.6) ?? list[0];
    return await restoreBackup(good.filename);
  }, [listBackups, restoreBackup]);

  useEffect(() => {
    let cancelled = false;

    // Auto-restore-ul a fost înlocuit de sincronizarea per cont (lib/sync): un device nou
    // primește de la server exact datele contului logat. Restore-ul manual rămâne în BackupBadge.

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
      if (!dirtyRef.current || !hasCoreData()) return;
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
