import { ResponderContacts } from "@/components/ResponderContacts";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

export default function ResponderContactsPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <ResponderContacts />
      </main>
    </>
  );
}
