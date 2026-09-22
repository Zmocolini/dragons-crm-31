"use client";

import { useEffect } from "react";
import { useProfile } from "@/lib/profile/context";

/**
 * Aplică preferințele globale (temă / focus / animații) pe <html> ca data-attributes.
 * globals.css definește reguli pentru: [data-theme=light], [data-focus-mode], [data-animations-off].
 */
export function ThemeApplier() {
  const { profile, hydrated } = useProfile();

  useEffect(() => {
    if (!hydrated || typeof document === "undefined") return;
    const root = document.documentElement;

    const applyTheme = () => {
      let theme = profile.theme;
      if (theme === "system") {
        theme = typeof window !== "undefined" &&
          window.matchMedia?.("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
      }
      root.setAttribute("data-theme", theme);
    };

    applyTheme();

    // Focus mode
    if (profile.focusMode) root.setAttribute("data-focus-mode", "true");
    else root.removeAttribute("data-focus-mode");

    // Animations
    if (profile.reduceMotion) root.setAttribute("data-animations-off", "true");
    else root.removeAttribute("data-animations-off");

    // Density
    root.setAttribute("data-density", profile.density);

    // Tips
    if (!profile.showTips) root.setAttribute("data-tips-off", "true");
    else root.removeAttribute("data-tips-off");

    // Listener OS: doar când tema e "system", ne interesează schimbările de sistem.
    if (profile.theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [profile.theme, profile.focusMode, profile.reduceMotion, profile.density, profile.showTips, hydrated]);

  return null;
}
