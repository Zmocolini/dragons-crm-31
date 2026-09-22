"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/settings/context";

/**
 * Aplică favicon-ul upload-at în /setari pe tab-ul de browser.
 * Modifică/injectează DOAR link-ul cu id="custom-favicon" — nu atinge alte <link>
 * ca să nu conflictueze cu managerul de head Next.js.
 */
export function FaviconApplier() {
  const { settings, hydrated } = useSettings();
  const favicon = settings.organization.faviconDataUrl;
  const orgName = settings.organization.name;

  useEffect(() => {
    if (!hydrated || typeof document === "undefined") return;
    const CUSTOM_ID = "custom-favicon";
    const existing = document.getElementById(CUSTOM_ID) as HTMLLinkElement | null;

    if (favicon) {
      if (existing) {
        existing.href = favicon;
      } else {
        const link = document.createElement("link");
        link.id = CUSTOM_ID;
        link.rel = "icon";
        link.type = "image/png";
        link.href = favicon;
        document.head.appendChild(link);
      }
    } else if (existing) {
      try { existing.remove(); } catch {}
    }

    if (orgName) document.title = `${orgName} — CRM`;
  }, [favicon, orgName, hydrated]);

  return null;
}
