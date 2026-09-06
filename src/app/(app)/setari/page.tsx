"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Bell, Brush, ChevronRight, CreditCard, Home, Plug, ShieldCheck, Users } from "lucide-react";
import { useCallback } from "react";
import { RightRail } from "@/components/settings/RightRail";
import { SettingsTabs, type SettingsTab } from "@/components/settings/SettingsTabs";
import { TabFlota } from "@/components/settings/tabs/TabFlota";
import { TabGeneral } from "@/components/settings/tabs/TabGeneral";
import { TabIntegrari } from "@/components/settings/tabs/TabIntegrari";
import { TabPlaceholder } from "@/components/settings/tabs/TabPlaceholder";
import { TabUtilizatori } from "@/components/settings/tabs/TabUtilizatori";

const VALID: SettingsTab[] = ["general", "flota", "integrari", "utilizatori", "notificari", "securitate", "facturare", "personalizare"];

export default function SetariPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-[1520px] px-5 pt-5 pb-6 md:px-6" />}>
      <SetariPageInner />
    </Suspense>
  );
}

function SetariPageInner() {
  const params  = useSearchParams();
  const router  = useRouter();
  const tabRaw  = (params.get("tab") ?? "general") as SettingsTab;
  const tab     = VALID.includes(tabRaw) ? tabRaw : "general";

  const changeTab = useCallback((t: SettingsTab) => {
    const url = t === "general" ? "/setari" : `/setari?tab=${t}`;
    router.replace(url);
  }, [router]);

  return (
    <div className="mx-auto w-full max-w-[1520px] px-5 pt-5 pb-6 md:px-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-fg">
          <Home size={12} />
          Dashboard
        </Link>
        <ChevronRight size={12} className="text-fg-dim" />
        <span className="text-fg">Setări</span>
      </nav>

      {/* Title */}
      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-fg md:text-[28px]">Setări</h1>
          <p className="mt-1 text-[13.5px] text-fg-muted">
            Configurează aplicația și preferințele organizației tale.
          </p>
        </div>
        <p className="max-w-sm text-[11.5px] italic text-fg-dim md:text-right">
          „Setările potrivite astăzi, o creștere mai mare mâine."
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-4">
        <SettingsTabs active={tab} onChange={changeTab} />
      </div>

      {/* Body: 2-col main + right rail */}
      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {tab === "general"       && <TabGeneral />}
          {tab === "flota"         && <TabFlota />}
          {tab === "integrari"     && <TabIntegrari />}
          {tab === "utilizatori"   && <TabUtilizatori />}
          {tab === "notificari"    && (
            <TabPlaceholder
              icon={Bell}
              title="Notificări (nivel organizație)"
              description="Reguli globale pentru notificările CRM: cine primește, cum, când. Preferințele individuale rămân în Profilul meu → Notificări."
              planned={[
                "Reguli globale per categorie",
                "Escaladare pentru probleme urgente",
                "Digest zilnic / săptămânal",
                "Blackout hours (fără notificări pe timp de noapte)",
              ]}
            />
          )}
          {tab === "securitate"    && (
            <TabPlaceholder
              icon={ShieldCheck}
              title="Securitate organizație"
              description="Politici de parolă, MFA obligatoriu, SSO, whitelist IP, retenție log-uri."
              planned={[
                "Politici parolă (lungime, complexitate)",
                "2FA obligatoriu pentru roluri sensibile",
                "SSO (Google Workspace / Microsoft Entra)",
                "Whitelist IP admin",
                "Retenție audit logs",
                "Export GDPR",
              ]}
            />
          )}
          {tab === "facturare"     && (
            <TabPlaceholder
              icon={CreditCard}
              title="Facturare"
              description="Planul curent, facturile emise, metode de plată, factori TVA, upgrade."
              planned={[
                "Detalii Plan Business",
                "Metodă de plată",
                "Istoric facturi (PDF)",
                "Upgrade / downgrade plan",
                "Adresă facturare + CUI",
                "TVA și facturi în lună",
              ]}
            />
          )}
          {tab === "personalizare" && (
            <TabPlaceholder
              icon={Brush}
              title="Personalizare"
              description="Culori accent, logo dark/light, semnătură email, template PDF pentru contracte, denumiri custom pentru câmpuri."
              planned={[
                "Culoare accent brand",
                "Logo dark / light variants",
                "Semnătură email automată",
                "Template PDF contracte curier",
                "Câmpuri custom pe profilul curier",
              ]}
            />
          )}
        </div>

        <aside aria-label="Context Setări" className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <RightRail />
        </aside>
      </div>
    </div>
  );
}
