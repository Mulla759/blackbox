import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { SiteHeader } from "@/components/SiteHeader";
import { buildCommunicationAnalytics } from "@/lib/communications/analytics";
import { summarizeRecentCallLogs } from "@/lib/dispatch";
import { fetchActiveNwsAlerts } from "@/lib/disaster";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [analytics, alertResult, callSummary] = await Promise.all([
    Promise.resolve(buildCommunicationAnalytics()),
    fetchActiveNwsAlerts(),
    summarizeRecentCallLogs(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <AnalyticsDashboard
          initialAnalytics={analytics}
          alerts={alertResult.ok ? alertResult.alerts : []}
          alertError={alertResult.ok ? null : alertResult.error}
          initialCallSummary={callSummary}
        />
      </main>
    </>
  );
}
