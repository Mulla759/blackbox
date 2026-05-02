import { DispatcherCommunications } from "@/components/DispatcherCommunications";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

export default function DispatcherCommunicationsPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <DispatcherCommunications />
      </main>
    </>
  );
}
