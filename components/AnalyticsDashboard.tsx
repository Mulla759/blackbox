"use client";

import type { CommunicationAnalytics } from "@/lib/communications/analytics";
import type { DisasterAlert } from "@/lib/disaster";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "accent" | "critical";
}) {
  const toneClass =
    tone === "accent"
      ? "text-accent"
      : tone === "critical"
        ? "text-[var(--state-critical)]"
        : "text-foreground";
  return (
    <div className="border border-border bg-card p-4">
      <p className="text-eyebrow">{label}</p>
      <p className={`mt-2 font-display text-2xl font-extrabold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

export function AnalyticsDashboard({
  initialAnalytics,
  alerts,
  alertError,
  initialCallSummary,
}: {
  initialAnalytics: CommunicationAnalytics;
  alerts: DisasterAlert[];
  alertError: string | null;
  initialCallSummary: string;
}) {
  const router = useRouter();
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [callSummary, setCallSummary] = useState(initialCallSummary);

  const alertSeverityMix = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of alerts) {
      const k = a.severity || "Unknown";
      m[k] = (m[k] ?? 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [alerts]);

  async function refreshAnalytics() {
    const res = await fetch("/api/communications/analytics", { cache: "no-store" });
    if (res.ok) setAnalytics((await res.json()) as CommunicationAnalytics);
    const sumRes = await fetch("/api/dispatch/call-summary", { cache: "no-store" });
    if (sumRes.ok) {
      const d = (await sumRes.json()) as { summary?: string };
      if (typeof d.summary === "string") setCallSummary(d.summary);
    }
    router.refresh();
  }

  const { summary } = analytics;

  return (
    <div className="mx-auto max-w-[900px] px-4 pb-20 pt-8 sm:px-6">
      <header className="mb-10 flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-eyebrow mb-2">Overview</p>
          <h1 className="text-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Alerts & outreach
          </h1>
        </div>
        <Link
          href="/"
          className="w-fit border border-border px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground hover:border-accent hover:text-accent"
        >
          Live map
        </Link>
      </header>

      <section className="mb-10">
        <h2 className="font-display font-extrabold">NWS snapshot</h2>
        {alertError ? (
          <p className="mt-2 text-sm text-[var(--state-critical)]">{alertError}</p>
        ) : alertSeverityMix.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No active alerts.</p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {alertSeverityMix.map(([label, n]) => (
              <div key={label} className="border border-border bg-card px-3 py-2">
                <p className="text-eyebrow">{label}</p>
                <p className="mt-1 font-mono text-lg tabular-nums">{n}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mb-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Outbound SMS" value={summary.outbound_sms} />
        <StatCard label="Inbound" value={summary.inbound_sms} tone="accent" />
        <StatCard label="Failed" value={summary.failed_outbound} tone="critical" />
        <StatCard label="Provider" value={analytics.provider} />
      </div>

      <section className="mb-8 border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display font-extrabold">Recent call log summary</h2>
          <button
            type="button"
            onClick={() => void refreshAnalytics()}
            className="border border-border px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] hover:border-accent hover:text-accent"
          >
            Refresh
          </button>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{callSummary}</p>
      </section>

      <section className="border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-display font-extrabold text-base">Recent log</h2>
        </div>
        <div className="max-h-[360px] overflow-auto text-xs">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 bg-muted font-mono uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="border-b border-border px-3 py-2">Time</th>
                <th className="border-b border-border px-3 py-2">Dir</th>
                <th className="border-b border-border px-3 py-2">Phone</th>
                <th className="border-b border-border px-3 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {analytics.recent_logs.slice(0, 80).map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[0.65rem]">
                    {new Date(row.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-2">{row.direction}</td>
                  <td className="px-3 py-2 font-mono">{row.phone_number}</td>
                  <td className="max-w-[200px] truncate px-3 py-2">
                    {row.error ?? row.body ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
