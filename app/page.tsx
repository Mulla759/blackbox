import { AlertsDashboard } from "@/components/AlertsDashboard";
import { HomeVapiEmergency } from "@/components/HomeVapiEmergency";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchActiveNwsAlerts } from "@/lib/disaster";

export const dynamic = "force-dynamic";

export default async function Home() {
  const result = await fetchActiveNwsAlerts();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <HomeVapiEmergency />
        <AlertsDashboard
          alerts={result.ok ? result.alerts : []}
          error={result.ok ? null : result.error}
        />
      </main>
    </>
  );
}
