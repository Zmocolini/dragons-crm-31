"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";

/**
 * Redirecționează la /login dacă user-ul nu e autentificat.
 * Publicele: /login, /register.
 * Rendarea copiiilor începe doar după hidratarea auth-ului ca să evităm flash de conținut.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { hydrated, current } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hydrated) return;
    const isPublic = pathname === "/login" || pathname === "/register" || pathname === "/invite";
    if (!current && !isPublic) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
    if (current && isPublic) {
      router.replace("/");
    }
  }, [hydrated, current, pathname, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <div className="text-[13px] text-fg-dim">Se încarcă…</div>
      </div>
    );
  }

  const isPublic = pathname === "/login" || pathname === "/register";
  if (!current && !isPublic) {
    // În curs de redirect — nu randăm children.
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <div className="text-[13px] text-fg-dim">Redirecționez la login…</div>
      </div>
    );
  }

  return <>{children}</>;
}
