"use client";

import type { CommunicationAnalytics } from "@/lib/communications/analytics";
import type { DisasterAlert } from "@/lib/disaster";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
    <div className="border border-border bg-card p-5">
      <p className="text-eyebrow">{label}</p>
      <p className={`mt-3 font-display text-3xl font-extrabold tabular-nums ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function AreaCodeHeatmap({ counts }: { counts: Record<string, number> }) {
  const rows = useMemo(() => {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 18);
    const max = Math.max(1, ...entries.map(([, v]) => v));
    return entries.map(([code, n]) => ({
      code,
      n,
      pct: Math.round((n / max) * 100),
    }));
  }, [counts]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No replies yet — regional intensity will appear after inbound SMS (area code inferred from
        numbers).
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map(({ code, n, pct }) => (
        <li key={code} className="flex items-center gap-4">
          <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{code}</span>
          <div className="h-3 min-w-0 flex-1 bg-muted">
            <div
              className="h-full bg-accent transition-[width]"
              style={{ width: `${pct}%`, opacity: 0.35 + (pct / 100) * 0.65 }}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-mono text-xs tabular-nums text-foreground">
            {n}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AnalyticsDashboard({
  initialAnalytics,
  alerts,
  alertError,
}: {
  initialAnalytics: CommunicationAnalytics;
  alerts: DisasterAlert[];
  alertError: string | null;
}) {
  const router = useRouter();
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [formBusy, setFormBusy] = useState(false);

  useEffect(() => {
    setAnalytics(initialAnalytics);
  }, [initialAnalytics]);
  const [simPhone, setSimPhone] = useState("");
  const [simBody, setSimBody] = useState("1");
  const [simEventId, setSimEventId] = useState("");
  const [simEventName, setSimEventName] = useState("");
  const [triggerPhones, setTriggerPhones] = useState("");
  const [triggerEventId, setTriggerEventId] = useState("");
  const [triggerEventName, setTriggerEventName] = useState("Drill: Heat advisory");

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
    router.refresh();
  }

  async function submitSimulatedReply(e: React.FormEvent) {
    e.preventDefault();
    setFormBusy(true);
    try {
      const res = await fetch("/api/communications/simulate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: simPhone,
          body: simBody,
          disaster_event_id: simEventId || undefined,
          disaster_event_name: simEventName || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        alert(err.error ?? "Simulation failed");
        return;
      }
      await refreshAnalytics();
    } finally {
      setFormBusy(false);
    }
  }

  async function submitTrigger(e: React.FormEvent) {
    e.preventDefault();
    setFormBusy(true);
    try {
      const nums = triggerPhones
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/disasters/communications/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disaster_event_id: triggerEventId || undefined,
          disaster_event_name: triggerEventName,
          affected_phone_numbers: nums.length ? nums : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(typeof data.error === "string" ? data.error : "Trigger failed");
        return;
      }
      await refreshAnalytics();
      alert(`Sent ${Array.isArray(data.results) ? data.results.length : 0} messages`);
    } finally {
      setFormBusy(false);
    }
  }

  const { summary } = analytics;

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
      <div className="mb-10 flex flex-col gap-4 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-eyebrow mb-3">Operations analytics</p>
          <h1 className="text-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Communications & incidents
          </h1>
          <p className="mt-4 max-w-xl text-foreground/65">
            SMS provider:{" "}
            <span className="font-mono text-xs text-accent">{analytics.provider}</span>. Voice shows
            placeholder attempts until Twilio Voice is wired.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex w-fit border border-border px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] hover:border-accent hover:text-accent"
        >
          ← Live alerts
        </Link>
      </div>

      {/* Situation / severity */}
      <section className="mb-12">
        <h2 className="font-display text-xl font-extrabold tracking-tight">Current situation</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Active NWS alerts by severity (detection layer). Pair with communication logs for response
          coverage.
        </p>
        {alertError ? (
          <p className="mt-4 text-sm text-[var(--state-critical)]">{alertError}</p>
        ) : alertSeverityMix.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No active alerts.</p>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {alertSeverityMix.map(([label, n]) => (
              <div key={label} className="border border-border bg-card px-4 py-3">
                <p className="text-eyebrow">{label}</p>
                <p className="mt-2 font-display text-2xl font-extrabold tabular-nums">{n}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* KPI */}
      <section className="mb-12 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Outbound SMS" value={summary.outbound_sms} />
        <StatCard label="Inbound replies" value={summary.inbound_sms} tone="accent" />
        <StatCard label="Voice attempts (stub)" value={summary.outbound_voice_attempts} />
        <StatCard label="Failed outbound" value={summary.failed_outbound} tone="critical" />
      </section>

      <section className="mb-12 grid gap-px bg-border md:grid-cols-4">
        <StatCard label="Reply · Safe (1)" value={summary.replies_safe} />
        <StatCard label="Reply · Help (2)" value={summary.replies_needs_help} tone="accent" />
        <StatCard label="Reply · Emergency (3)" value={summary.replies_emergency} tone="critical" />
        <StatCard label="Reply · Unknown" value={summary.replies_unknown} />
      </section>

      <div className="mb-12 grid gap-10 lg:grid-cols-2">
        <section className="border border-border bg-card p-6">
          <h2 className="font-display text-lg font-extrabold">Regional reply intensity</h2>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Approximate heat by NANP area code derived from stored replies — not a geographic map.
          </p>
          <div className="mt-6">
            <AreaCodeHeatmap counts={analytics.area_code_counts} />
          </div>
        </section>

        <section className="border border-border bg-card p-6">
          <h2 className="font-display text-lg font-extrabold">Replies by disaster label</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Uses linked incident name from outbound context or simulation fallback.
          </p>
          <ul className="mt-6 flex flex-col gap-2">
            {Object.entries(analytics.responses_by_disaster_event).length === 0 ? (
              <li className="text-sm text-muted-foreground">No replies recorded.</li>
            ) : (
              Object.entries(analytics.responses_by_disaster_event)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)
                .map(([name, n]) => (
                  <li
                    key={name}
                    className="flex items-center justify-between border-t border-border py-2 first:border-t-0 first:pt-0"
                  >
                    <span className="truncate pr-4 text-sm text-foreground/85">{name}</span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{n}</span>
                  </li>
                ))
            )}
          </ul>
        </section>
      </div>

      <div className="mb-12 grid gap-8 lg:grid-cols-2">
        <section className="border border-border bg-background p-6">
          <h2 className="font-display text-lg font-extrabold">Simulate inbound SMS</h2>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Posts through the same parser as Twilio (1 / 2 / 3). Optional event fields apply when no
            prior outbound context exists for that number.
          </p>
          <form className="mt-6 flex flex-col gap-4" onSubmit={submitSimulatedReply}>
            <div>
              <label className="text-eyebrow mb-2 block" htmlFor="sim-phone">
                Phone
              </label>
              <input
                id="sim-phone"
                className="w-full border border-border bg-card px-3 py-2 font-mono text-sm"
                value={simPhone}
                onChange={(e) => setSimPhone(e.target.value)}
                placeholder="+15551234567"
                required
              />
            </div>
            <div>
              <label className="text-eyebrow mb-2 block" htmlFor="sim-body">
                Body
              </label>
              <input
                id="sim-body"
                className="w-full border border-border bg-card px-3 py-2 font-mono text-sm"
                value={simBody}
                onChange={(e) => setSimBody(e.target.value)}
                placeholder="1"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-eyebrow mb-2 block" htmlFor="sim-ev-id">
                  Event id (optional)
                </label>
                <input
                  id="sim-ev-id"
                  className="w-full border border-border bg-card px-3 py-2 font-mono text-xs"
                  value={simEventId}
                  onChange={(e) => setSimEventId(e.target.value)}
                />
              </div>
              <div>
                <label className="text-eyebrow mb-2 block" htmlFor="sim-ev-name">
                  Event name (optional)
                </label>
                <input
                  id="sim-ev-name"
                  className="w-full border border-border bg-card px-3 py-2 font-mono text-xs"
                  value={simEventName}
                  onChange={(e) => setSimEventName(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={formBusy}
              className="border border-border bg-accent px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-accent-foreground hover:opacity-90 disabled:opacity-40"
            >
              Record simulated reply
            </button>
          </form>
        </section>

        <section className="border border-border bg-background p-6">
          <h2 className="font-display text-lg font-extrabold">Trigger disaster outreach</h2>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Sends the standard safety SMS via Twilio when configured, otherwise simulated delivery.
            Leave numbers blank to use{" "}
            <span className="font-mono text-[0.65rem]">DISASTER_NOTIFY_RECIPIENTS</span>.
          </p>
          <form className="mt-6 flex flex-col gap-4" onSubmit={submitTrigger}>
            <div>
              <label className="text-eyebrow mb-2 block" htmlFor="tr-ev-name">
                Disaster event name
              </label>
              <input
                id="tr-ev-name"
                className="w-full border border-border bg-card px-3 py-2 text-sm"
                value={triggerEventName}
                onChange={(e) => setTriggerEventName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-eyebrow mb-2 block" htmlFor="tr-ev-id">
                Disaster event id (optional)
              </label>
              <input
                id="tr-ev-id"
                className="w-full border border-border bg-card px-3 py-2 font-mono text-xs"
                value={triggerEventId}
                onChange={(e) => setTriggerEventId(e.target.value)}
                placeholder="Defaults to generated id"
              />
            </div>
            <div>
              <label className="text-eyebrow mb-2 block" htmlFor="tr-phones">
                Numbers (comma-separated, optional)
              </label>
              <textarea
                id="tr-phones"
                className="min-h-[88px] w-full border border-border bg-card px-3 py-2 font-mono text-xs"
                value={triggerPhones}
                onChange={(e) => setTriggerPhones(e.target.value)}
                placeholder="+15551234567, +15557654321"
              />
            </div>
            <button
              type="submit"
              disabled={formBusy}
              className="border border-border px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.14em] hover:border-accent hover:text-accent disabled:opacity-40"
            >
              Send notifications
            </button>
          </form>
        </section>
      </div>

      <section className="border border-border">
        <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
          <h2 className="font-display text-lg font-extrabold">Communication log</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Recent outbound/inbound rows — newest first.
          </p>
        </div>
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-muted font-mono text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="border-b border-border px-4 py-3">Time</th>
                <th className="border-b border-border px-4 py-3">Dir</th>
                <th className="border-b border-border px-4 py-3">Ch</th>
                <th className="border-b border-border px-4 py-3">Phone</th>
                <th className="border-b border-border px-4 py-3">Status</th>
                <th className="border-b border-border px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {analytics.recent_logs.map((row) => (
                <tr key={row.id} className="border-b border-border/80 hover:bg-card/50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[0.65rem] text-muted-foreground">
                    {new Date(row.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-[0.65rem]">{row.direction}</td>
                  <td className="px-4 py-3 font-mono text-[0.65rem]">{row.channel}</td>
                  <td className="px-4 py-3 font-mono text-[0.65rem]">{row.phone_number}</td>
                  <td className="px-4 py-3 font-mono text-[0.65rem]">
                    {row.delivery_status ?? "—"}
                    {row.response_type ? ` · ${row.response_type}` : ""}
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-3 text-xs text-foreground/75">
                    {row.error ??
                      row.body ??
                      row.disaster_event_name ??
                      row.provider_message_id ??
                      "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 border border-border">
        <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
          <h2 className="font-display text-lg font-extrabold">Structured safety responses</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Stored replies for dispatch dashboards / downstream APIs.
          </p>
        </div>
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-muted font-mono text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="border-b border-border px-4 py-3">Time</th>
                <th className="border-b border-border px-4 py-3">Phone</th>
                <th className="border-b border-border px-4 py-3">Type</th>
                <th className="border-b border-border px-4 py-3">Event</th>
                <th className="border-b border-border px-4 py-3">Raw</th>
              </tr>
            </thead>
            <tbody>
              {analytics.responses.map((r) => (
                <tr key={r.id} className="border-b border-border/80 hover:bg-card/50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[0.65rem] text-muted-foreground">
                    {new Date(r.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-[0.65rem]">{r.phone_number}</td>
                  <td className="px-4 py-3 font-mono text-[0.65rem]">{r.response_type}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs">{r.disaster_event_name}</td>
                  <td className="max-w-[120px] truncate px-4 py-3 font-mono text-[0.65rem]">
                    {r.raw_message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-10 text-xs text-muted-foreground leading-relaxed">
        Twilio inbound webhook:{" "}
        <span className="font-mono text-[0.65rem]">POST /api/communications/webhooks/twilio</span>.
        Configure Messaging webhook on your Twilio number to hit your public base URL + that path.
      </p>
    </div>
  );
}
