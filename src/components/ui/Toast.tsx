"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, X, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ToastTone = "success" | "info" | "warn" | "error";

type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
};

type ToastContextValue = {
  push: (t: { tone?: ToastTone; title: string; message?: string; ttl?: number }) => void;
  success: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLE: Record<ToastTone, string> = {
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
  info:    "border-sky-500/40 bg-sky-500/10 text-sky-100",
  warn:    "border-amber-500/40 bg-amber-500/10 text-amber-100",
  error:   "border-rose-500/40 bg-rose-500/10 text-rose-100",
};

const TONE_ICON = {
  success: CheckCircle2,
  info:    Info,
  warn:    AlertTriangle,
  error:   AlertTriangle,
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    ({ tone = "info", title, message, ttl = 3500 }: { tone?: ToastTone; title: string; message?: string; ttl?: number }) => {
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, tone, title, message }]);
      if (ttl > 0) setTimeout(() => remove(id), ttl);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, message) => push({ tone: "success", title, message }),
      info:    (title, message) => push({ tone: "info",    title, message }),
      error:   (title, message) => push({ tone: "error",   title, message }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notificări"
        className="pointer-events-none fixed left-1/2 top-4 z-[100] flex w-[340px] max-w-[92vw] -translate-x-1/2 flex-col items-stretch gap-2"
      >
        {toasts.map((t) => {
          const Icon = TONE_ICON[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border px-3.5 py-3 shadow-2xl backdrop-blur",
                "animate-[toast-in_180ms_ease-out]",
                TONE_STYLE[t.tone],
              )}
            >
              <Icon size={16} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[13px] font-semibold">{t.title}</div>
                {t.message && (
                  <div className="mt-0.5 text-[11.5px] opacity-80">{t.message}</div>
                )}
              </div>
              <button
                type="button"
                aria-label="Închide notificarea"
                onClick={() => remove(t.id)}
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-current/70 hover:bg-white/10"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
