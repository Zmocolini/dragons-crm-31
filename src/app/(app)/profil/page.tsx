"use client";

import { useState } from "react";
import { ProfileBreadcrumb } from "@/components/profile/Breadcrumb";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileTabs, type ProfileTab } from "@/components/profile/ProfileTabs";
import { RightColumn } from "@/components/profile/RightColumn";
import { TabActivity } from "@/components/profile/tabs/TabActivity";
import { TabNotifications } from "@/components/profile/tabs/TabNotifications";
import { TabPersonal } from "@/components/profile/tabs/TabPersonal";
import { TabPreferences } from "@/components/profile/tabs/TabPreferences";
import { TabSecurity } from "@/components/profile/tabs/TabSecurity";

export default function ProfilPage() {
  const [tab, setTab] = useState<ProfileTab>("personal");

  return (
    <div className="mx-auto w-full max-w-[1520px] px-5 pt-5 pb-6 md:px-6">
      <ProfileBreadcrumb />

      <div className="mt-3 flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-fg md:text-[28px]">
            Profilul meu
          </h1>
          <p className="mt-1 text-[13.5px] text-fg-muted">
            Gestionează informațiile contului tău și preferințele personale.
          </p>
        </div>
        <p className="max-w-sm text-[11.5px] italic text-fg-dim md:text-right">
          „O echipă puternică începe cu oameni bine organizați."
        </p>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <ProfileHero />
          <ProfileTabs active={tab} onChange={setTab} />
          <div className="pt-1">
            {tab === "personal"      && <TabPersonal />}
            {tab === "preferences"   && <TabPreferences />}
            {tab === "security"      && <TabSecurity />}
            {tab === "notifications" && <TabNotifications />}
            {tab === "activity"      && <TabActivity />}
          </div>
        </div>
        <aside aria-label="Contextul contului" className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <RightColumn onOpenTab={setTab} />
        </aside>
      </div>
    </div>
  );
}
