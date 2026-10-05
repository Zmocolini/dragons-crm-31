"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, Sparkles } from "lucide-react";
import { AICopilotPage } from "@/components/ai/AICopilotPage";
import { IssuesPage } from "@/components/issues/IssuesPage";
import { useSession } from "@/lib/rbac/session";
import { useSettings } from "@/lib/settings/context";
import { cn } from "@/lib/utils/cn";

/** AI Copilot + Probleme / Suport într-o singură pagină (tab-uri). /probleme redirecționează aici cu ?tab=issues. */
export default function AiRoute() {
  const { can } = useSession();
  const { isModuleEnabled } = useSettings();
  const issuesAllowed = can("issues.view") && isModuleEnabled("issues");
  const [tab, setTab] = useState<"copilot" | "issues">("copilot");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "issues") setTab("issues");
  }, []);

  const select = (t: "copilot" | "issues") => {
    setTab(t);
    window.history.replaceState(null, "", t === "issues" ? "/ai?tab=issues" : "/ai");
  };
  const view = tab === "issues" && issuesAllowed ? "issues" : "copilot";

  return (
    <>
      {issuesAllowed && (
        <div role="tablist" className="mx-4 mt-4 inline-flex w-fit rounded-lg border border-line bg-card-2 p-0.5 text-[12.5px] font-medium lg:mx-6 lg:mt-6">
          <button type="button" role="tab" aria-selected={view === "copilot"} onClick={() => select("copilot")} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5", view === "copilot" ? "bg-white/[0.08] text-fg" : "text-fg-muted hover:text-fg")}><Sparkles size={13} /> AI Copilot</button>
          <button type="button" role="tab" aria-selected={view === "issues"} onClick={() => select("issues")} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5", view === "issues" ? "bg-white/[0.08] text-fg" : "text-fg-muted hover:text-fg")}><LifeBuoy size={13} /> Probleme / Suport</button>
        </div>
      )}
      {view === "issues" ? <IssuesPage /> : <AICopilotPage />}
    </>
  );
}
