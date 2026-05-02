import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { SiteHeader } from "@/components/SiteHeader";
import { buildCommunicationAnalytics } from "@/lib/communications/analytics";
import { fetchActiveNwsAlerts } from "@/lib/disaster";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [analytics, alertResult] = await Promise.all([
    Promise.resolve(buildCommunicationAnalytics()),
    fetchActiveNwsAlerts(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <AnalyticsDashboard
          initialAnalytics={analytics}
          alerts={alertResult.ok ? alertResult.alerts : []}
          alertError={alertResult.ok ? null : alertResult.error}
        />
      </main>
    </>
  );
}
