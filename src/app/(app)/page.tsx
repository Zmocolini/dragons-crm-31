import { ActivePlatformsCard } from "@/components/dashboard/ActivePlatformsCard";
import { ActivationStatusCard } from "@/components/dashboard/ActivationStatusCard";
import { AICopilotBanner } from "@/components/dashboard/AICopilotBanner";
import { CourierActivityChart } from "@/components/dashboard/CourierActivityChart";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DragonsCommunityBanner } from "@/components/dashboard/DragonsCommunityBanner";
import { ExpiringDocumentsCard } from "@/components/dashboard/ExpiringDocumentsCard";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
import { RecentActivityTabs } from "@/components/dashboard/RecentActivityTabs";
import { UpcomingTasksCard } from "@/components/dashboard/UpcomingTasksCard";
import { WeeklyRevenueChart } from "@/components/dashboard/WeeklyRevenueChart";
import { getDashboardData } from "@/lib/dashboard/service";

export default async function DashboardPage() {
  // TODO(real-users): înlocuiește contextul cu await getServerSession() → { tenantId, role }.
  const data = await getDashboardData({
    tenantId: "t_dragon",
    role: "global_owner",
  });

  return (
    <div className="mx-auto w-full max-w-[1520px] px-5 pt-5 pb-4 md:px-6 md:pt-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* MAIN COLUMN */}
        <div className="min-w-0 space-y-5">
          <DashboardGreeting />
          <DashboardStats stats={data.stats} />

          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5 xl:col-span-5">
              <CourierActivityChart data={data.courierActivity} />
            </div>
            <div className="lg:col-span-4 xl:col-span-4">
              <WeeklyRevenueChart data={data.revenue} trend={data.revenueTrend} />
            </div>
            <div className="lg:col-span-3 xl:col-span-3">
              <ActivePlatformsCard platforms={data.platforms} />
            </div>
          </div>

          <RecentActivityTabs
            couriers={data.recentCouriers}
            candidates={data.recentCandidates}
            activations={data.recentActivations}
            payments={data.recentPayments}
            issues={data.recentIssues}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <AICopilotBanner />
            <DragonsCommunityBanner />
          </div>
        </div>

        {/* RIGHT OPERATIONS PANEL */}
        <aside
          aria-label="Operațiuni rapide"
          className="min-w-0 space-y-4 lg:sticky lg:top-[80px] lg:self-start"
        >
          <QuickActionsPanel />
          <ActivationStatusCard stats={data.activationStats} />
          <ExpiringDocumentsCard docs={data.expiringDocuments} />
          <UpcomingTasksCard tasks={data.tasks} />
        </aside>
      </div>
    </div>
  );
}
