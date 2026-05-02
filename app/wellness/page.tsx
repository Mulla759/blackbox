import Link from "next/link";
import { WellnessSmsBox } from "@/components/WellnessSmsBox";

export default function WellnessPage() {
  return (
    <div className="min-h-full flex flex-col">
      <div className="border-b border-border px-6 py-4">
        <Link
          href="/"
          className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Link>
      </div>
      <main className="flex-1">
        <WellnessSmsBox />
      </main>
    </div>
  );
}
