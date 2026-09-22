import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { DashboardStatsLive } from "@/components/dashboard/DashboardStatsLive";
import {
  ActivePlatformsLive, CourierActivityLive,
  ExpiringDocumentsLive, RecentActivityLive, UpcomingTasksLive, WeeklyRevenueLive,
} from "@/components/dashboard/live";

// Dashboard = doar statistici, derivate din contextele canonice.
export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1520px] space-y-5 px-5 pt-5 pb-4 md:px-6 md:pt-6">
      <DashboardGreeting />
      <DashboardStatsLive />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <CourierActivityLive />
        </div>
        <div className="lg:col-span-4">
          <WeeklyRevenueLive />
        </div>
        <div className="lg:col-span-3">
          <ActivePlatformsLive />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExpiringDocumentsLive />
        <UpcomingTasksLive />
      </div>

      <RecentActivityLive />
    </div>
  );
}
