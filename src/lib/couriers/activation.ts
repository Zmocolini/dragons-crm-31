import type { PlatformKey } from "@/lib/dashboard/types";
import type { Courier } from "./types";

type Row = Pick<Courier, "id" | "fullName" | "status" | "platforms" | "waitlistedPlatforms" | "incompleteFields">;
export type ActivationPatch = Partial<Pick<Courier, "status" | "platforms" | "waitlistedPlatforms">>;

export type ActivationPlan = {
  patches: { id: string; patch: ActivationPatch }[];
  done: { id: string; name: string; warning?: string }[];
  skipped: { id: string; name: string; reason: string }[];
};

/**
 * Ce se schimbă la „activează / respinge" (AI Copilot). Pur: executorul aplică `patches`.
 *  - fără platformă: status → active (doar Global Owner);
 *  - cu platformă: mută platforma din așteptare în active (oricine poate edita curierul);
 *  - respinge: status → rejected, nu pe un curier activ (doar Global Owner).
 * `editable` = curierii care pot fi modificați (nu cei demo din seed).
 */
export function planActivation(
  rows: Row[],
  ids: string[],
  opts: { action: "activate" | "reject"; platform?: PlatformKey; isGlobalOwner: boolean; editable: (id: string) => boolean },
): ActivationPlan {
  const plan: ActivationPlan = { patches: [], done: [], skipped: [] };
  if ((opts.action === "reject" || !opts.platform) && !opts.isGlobalOwner) {
    throw new Error("Doar flota (Global Owner) activează sau respinge curieri; subcontractorul ridică un task.");
  }
  for (const id of [...new Set(ids)]) {
    const c = rows.find((x) => x.id === id);
    if (!c) { plan.skipped.push({ id, name: "?", reason: "nu e în flota ta" }); continue; }
    const skip = (reason: string) => plan.skipped.push({ id, name: c.fullName, reason });
    if (!opts.editable(id)) { skip("curier demo (seed), nu se editează"); continue; }

    if (opts.action === "reject") {
      if (c.status === "rejected") { skip("deja respins"); continue; }
      if (c.status === "active") { skip("e activ — pentru oprire folosește update_courier (paused/stopped)"); continue; }
      plan.patches.push({ id, patch: { status: "rejected" } });
      plan.done.push({ id, name: c.fullName });
    } else if (opts.platform) {
      const p = opts.platform;
      const waiting = c.waitlistedPlatforms ?? [];
      if (!waiting.includes(p)) { skip(`nu așteaptă loc pe ${p}`); continue; }
      plan.patches.push({ id, patch: {
        waitlistedPlatforms: waiting.filter((x) => x !== p),
        platforms: c.platforms.includes(p) ? c.platforms : [...c.platforms, p],
      } });
      plan.done.push({ id, name: c.fullName });
    } else {
      if (c.status === "active") { skip("deja activ"); continue; }
      plan.patches.push({ id, patch: { status: "active" } });
      const missing = Array.isArray(c.incompleteFields) ? c.incompleteFields : [];
      plan.done.push({ id, name: c.fullName, ...(missing.length ? { warning: `date lipsă: ${missing.join(", ")}` } : {}) });
    }
  }
  return plan;
}
