"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { useUI } from "@/lib/ui/ui-context";
import { PULL_REFRESH, PULL_REFRESH_DONE } from "@/lib/sync/SyncProvider";

// Gesturi pe touch (telefon/tabletă):
//  - margine stânga → dreapta: deschide meniul (pagini principale) / înapoi (pagini de detaliu)
//  - meniu deschis → stânga: închide meniul (urmărește degetul)
//  - tras în jos din vârful paginii: reîmprospătare date (sync)
// Swipe-down pe ferestre e în components/ui/Dialog.tsx.

const EDGE_PX = 28;          // zona de start pentru gesturile de margine
const LOCK_PX = 10;          // mișcare minimă până decidem direcția
const DRAWER_BREAKPOINT = 1024; // lg — peste, meniul e mereu vizibil
const BACK_TRIGGER_PX = 90;
const PULL_TRIGGER_PX = 70;
const PULL_MAX_PX = 110;

type Mode = "open" | "close" | "back" | "pull";
type Gesture = {
  mode: Mode;
  x0: number; y0: number; t0: number;
  dx: number; dy: number;
  locked: boolean;
  width: number;
  armed: boolean; // a trecut pragul (pentru vibrație o singură dată)
};

function isIOS(): boolean {
  return /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Elementele în care gesturile globale nu intervin (au propriile interacțiuni). */
function isExcludedTarget(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  return !!el.closest('[role="dialog"], [data-modal-shell], input, textarea, select, [contenteditable="true"], [data-no-gesture]');
}

/** Există un container scrolat (nu în vârf) între target și document? */
function insideScrolledContainer(el: EventTarget | null): boolean {
  let node = el instanceof Element ? el : null;
  while (node && node !== document.body) {
    const s = getComputedStyle(node);
    if ((s.overflowY === "auto" || s.overflowY === "scroll") && node.scrollTop > 0) return true;
    node = node.parentElement;
  }
  return false;
}

function vibrate() {
  try { navigator.vibrate?.(8); } catch {}
}

export function GestureNavigation() {
  const { sidebarOpen, openSidebar, closeSidebar } = useUI();
  const router = useRouter();
  const pathname = usePathname();

  // Starea curentă în ref-uri: listener-ele se atașează o singură dată.
  const live = useRef({ sidebarOpen, openSidebar, closeSidebar, router, pathname });
  live.current = { sidebarOpen, openSidebar, closeSidebar, router, pathname };

  const scrimRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const pullRef = useRef<HTMLDivElement>(null);
  const pullIconRef = useRef<HTMLSpanElement>(null);
  const refreshing = useRef(false);

  useEffect(() => {
    const edgeEnabled = isStandalone() || !isIOS(); // în Safari (browser) iOS are propriul swipe-back pe margine
    let g: Gesture | null = null;

    const aside = () => document.querySelector<HTMLElement>('aside[aria-label="Sidebar"]');

    const setDrawer = (x: number | null) => {
      const el = aside();
      if (!el) return;
      if (x == null) {
        el.style.transition = "";
        el.style.translate = "";
      } else {
        el.style.transition = "none";
        el.style.translate = `${x}px 0`;
      }
    };
    const setScrim = (opacity: number | null) => {
      const el = scrimRef.current;
      if (!el) return;
      el.style.display = opacity == null ? "none" : "block";
      if (opacity != null) el.style.opacity = String(opacity);
    };
    const setBack = (dx: number | null) => {
      const el = backRef.current;
      if (!el) return;
      if (dx == null) { el.style.opacity = "0"; el.style.translate = "-48px -50%"; return; }
      const p = Math.min(dx / BACK_TRIGGER_PX, 1);
      el.style.opacity = String(p);
      el.style.translate = `${Math.min(dx, BACK_TRIGGER_PX) * 0.5 - 48}px -50%`;
      el.dataset.armed = p >= 1 ? "1" : "0";
    };
    const setPull = (dist: number | null, spinning = false) => {
      const el = pullRef.current;
      const icon = pullIconRef.current;
      if (!el || !icon) return;
      if (dist == null) {
        el.style.transition = "translate 200ms ease-out, opacity 200ms ease-out";
        el.style.opacity = "0";
        el.style.translate = "-50% -60px";
        icon.classList.remove("animate-spin");
        return;
      }
      el.style.transition = spinning ? "translate 200ms ease-out" : "none";
      el.style.opacity = String(Math.min(dist / PULL_TRIGGER_PX, 1));
      el.style.translate = `-50% ${dist - 44}px`;
      icon.style.rotate = spinning ? "" : `${(dist / PULL_TRIGGER_PX) * 270}deg`;
      icon.classList.toggle("animate-spin", spinning);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || refreshing.current) { g = null; return; }
      const t = e.touches[0];
      const { sidebarOpen: open, pathname: path } = live.current;
      const mobile = window.innerWidth < DRAWER_BREAKPOINT;
      let mode: Mode | null = null;

      if (open && mobile) {
        mode = "close";
      } else if (isExcludedTarget(e.target)) {
        mode = null;
      } else if (mobile && edgeEnabled && t.clientX <= EDGE_PX) {
        mode = path.split("/").filter(Boolean).length > 1 ? "back" : "open";
      } else if (window.scrollY <= 0 && !insideScrolledContainer(e.target)) {
        mode = "pull";
      }
      if (!mode) { g = null; return; }
      g = {
        mode, x0: t.clientX, y0: t.clientY, t0: performance.now(),
        dx: 0, dy: 0, locked: false,
        width: aside()?.offsetWidth ?? 300, armed: false,
      };
    };

    const onMove = (e: TouchEvent) => {
      if (!g) return;
      const t = e.touches[0];
      g.dx = t.clientX - g.x0;
      g.dy = t.clientY - g.y0;

      if (!g.locked) {
        if (Math.abs(g.dx) < LOCK_PX && Math.abs(g.dy) < LOCK_PX) return;
        const horizontal = Math.abs(g.dx) > Math.abs(g.dy);
        const ok =
          (g.mode === "open" && horizontal && g.dx > 0) ||
          (g.mode === "back" && horizontal && g.dx > 0) ||
          (g.mode === "close" && horizontal && g.dx < 0) ||
          (g.mode === "pull" && !horizontal && g.dy > 0 && window.scrollY <= 0);
        if (!ok) { g = null; return; }
        g.locked = true;
      }
      if (e.cancelable) e.preventDefault(); // gestul e al nostru: fără scroll/zoom nativ

      if (g.mode === "open") {
        const x = Math.min(0, -g.width + g.dx);
        setDrawer(x);
        setScrim(0.6 * (1 + x / g.width));
      } else if (g.mode === "close") {
        const x = Math.min(0, g.dx);
        setDrawer(x);
        setScrim(0.6 * (1 + x / g.width));
      } else if (g.mode === "back") {
        setBack(g.dx);
        if (g.dx >= BACK_TRIGGER_PX && !g.armed) { g.armed = true; vibrate(); }
        if (g.dx < BACK_TRIGGER_PX) g.armed = false;
      } else {
        // rezistență: cu cât tragi mai mult, cu atât se mișcă mai puțin
        const dist = Math.min(PULL_MAX_PX, g.dy * 0.5);
        setPull(dist);
        if (dist >= PULL_TRIGGER_PX && !g.armed) { g.armed = true; vibrate(); }
        if (dist < PULL_TRIGGER_PX) g.armed = false;
      }
    };

    const onEnd = () => {
      if (!g) return;
      const cur = g;
      g = null;
      if (!cur.locked) return;
      const ms = Math.max(1, performance.now() - cur.t0);
      const vx = cur.dx / ms; // px/ms
      const { openSidebar: doOpen, closeSidebar: doClose, router: r, pathname: path } = live.current;

      if (cur.mode === "open") {
        const shouldOpen = cur.dx > cur.width * 0.35 || vx > 0.45;
        setDrawer(null); setScrim(null);
        if (shouldOpen) doOpen();
      } else if (cur.mode === "close") {
        const shouldClose = -cur.dx > cur.width * 0.3 || vx < -0.45;
        setDrawer(null); setScrim(null);
        if (shouldClose) doClose();
      } else if (cur.mode === "back") {
        setBack(null);
        if (cur.dx >= BACK_TRIGGER_PX || (vx > 0.6 && cur.dx > 40)) {
          if (window.history.length > 1) r.back();
          else r.push("/" + path.split("/").filter(Boolean).slice(0, -1).join("/"));
        }
      } else {
        const dist = Math.min(PULL_MAX_PX, cur.dy * 0.5);
        if (dist >= PULL_TRIGGER_PX) {
          refreshing.current = true;
          setPull(56, true);
          const done = () => {
            refreshing.current = false;
            setPull(null);
            window.removeEventListener(PULL_REFRESH_DONE, done);
          };
          window.addEventListener(PULL_REFRESH_DONE, done);
          setTimeout(done, 10_000); // plasă de siguranță (offline)
          window.dispatchEvent(new Event(PULL_REFRESH));
        } else {
          setPull(null);
        }
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
      setDrawer(null);
    };
  }, []);

  return (
    <>
      {/* Fundal întunecat cât tragi meniul (înainte ca starea „deschis" să existe). */}
      <div ref={scrimRef} aria-hidden className="pointer-events-none fixed inset-0 z-40 hidden bg-black lg:hidden" style={{ opacity: 0 }} />

      {/* Indicator „înapoi" la marginea stângă. */}
      <div
        ref={backRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-1/2 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-violet-500/50 bg-card text-violet-200 shadow-lg data-[armed=1]:bg-violet-600 data-[armed=1]:text-white lg:hidden"
        style={{ opacity: 0, translate: "-48px -50%" }}
      >
        <ChevronLeft size={22} />
      </div>

      {/* Indicator pull-to-refresh. */}
      <div
        ref={pullRef}
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-[calc(4rem+env(safe-area-inset-top))] z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-violet-300 shadow-lg"
        style={{ opacity: 0, translate: "-50% -60px" }}
      >
        <span ref={pullIconRef} className="inline-flex"><RefreshCw size={18} /></span>
      </div>
    </>
  );
}
