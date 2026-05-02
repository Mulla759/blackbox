import { SiteHeader } from "@/components/SiteHeader";
import { DisasterIntelligenceDashboard } from "@/components/DisasterIntelligenceDashboard";
import { buildDashboardData } from "@/lib/disaster-intel";

export const dynamic = "force-dynamic";

function mapsApiKeyFromEnv(): string {
  const raw =
    process.env["GOOGLE_MAPS_API_KEY"]?.trim() ??
    process.env["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"]?.trim() ??
    "";
  return raw.replace(/^["']|["']$/g, "").trim();
}

export default async function DashboardPage() {
  const data = buildDashboardData("flood-rock-wi-2026-05-02");
  if (!data) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-[900px] px-6 py-10">
          <p className="text-[var(--state-critical)]">Disaster dashboard data unavailable.</p>
        </main>
      </>
    );
  }
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <DisasterIntelligenceDashboard initialData={data} mapsApiKey={mapsApiKeyFromEnv()} />
      </main>
    </>
  );
}
