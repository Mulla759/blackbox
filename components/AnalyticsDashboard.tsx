"use client";

import type { CommunicationAnalytics } from "@/lib/communications/analytics";
import type { DisasterAlert } from "@/lib/disaster";
import type { RegisteredContact } from "@/lib/registry/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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
}: {
  initialAnalytics: CommunicationAnalytics;
  alerts: DisasterAlert[];
  alertError: string | null;
}) {
  const router = useRouter();
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [contacts, setContacts] = useState<RegisteredContact[]>([]);
  const [formBusy, setFormBusy] = useState(false);

  const [simPhone, setSimPhone] = useState("");
  const [simBody, setSimBody] = useState("1");
  const [simEventId, setSimEventId] = useState("");
  const [simEventName, setSimEventName] = useState("");

  const [regPhone, setRegPhone] = useState("");
  const [regLocation, setRegLocation] = useState("");
  const [regLabel, setRegLabel] = useState("");

  const [evName, setEvName] = useState("Severe weather");
  const [evId, setEvId] = useState("");
  const [extraPhones, setExtraPhones] = useState("");
  const [allReg, setAllReg] = useState(false);
  const [locFilter, setLocFilter] = useState("");

  useEffect(() => {
    setAnalytics(initialAnalytics);
  }, [initialAnalytics]);

  const loadContacts = useCallback(async () => {
    const res = await fetch("/api/registry/contacts", { cache: "no-store" });
    if (res.ok) {
      const d = (await res.json()) as { contacts: RegisteredContact[] };
      setContacts(d.contacts ?? []);
    }
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

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

  async function submitSim(e: React.FormEvent) {
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
        alert(err.error ?? "Failed");
        return;
      }
      await refreshAnalytics();
      setSimBody("1");
    } finally {
      setFormBusy(false);
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setFormBusy(true);
    try {
      const res = await fetch("/api/registry/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: regPhone,
          location: regLocation,
          label: regLabel || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        alert(err.error ?? "Failed");
        return;
      }
      setRegPhone("");
      setRegLocation("");
      setRegLabel("");
      await loadContacts();
    } finally {
      setFormBusy(false);
    }
  }

  async function removeContact(id: string) {
    await fetch(`/api/registry/contacts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await loadContacts();
  }

  async function submitBroadcast(e: React.FormEvent) {
    e.preventDefault();
    const extras = extraPhones
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    setFormBusy(true);
    try {
      const res = await fetch("/api/disasters/communications/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disaster_event_id: evId || undefined,
          disaster_event_name: evName,
          affected_phone_numbers: extras.length ? extras : undefined,
          include_all_registered: allReg || undefined,
          registry_location_query: locFilter.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        recipient_count?: number;
      };
      if (!res.ok) {
        alert(typeof data.error === "string" ? data.error : "Failed");
        return;
      }
      await refreshAnalytics();
      alert(`Sent to ${data.recipient_count ?? 0} recipient(s)`);
    } finally {
      setFormBusy(false);
    }
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

      {/* Registry */}
      <section className="mb-12 border border-border p-5">
        <h2 className="font-display font-extrabold">Contacts by location</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Used for broadcasts: we match tokens in this location string (e.g. <span className="font-mono">MN</span>,{" "}
          <span className="font-mono">Minneapolis</span>) against alert text when you filter.
        </p>
        <form onSubmit={submitRegister} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <div>
            <label className="text-eyebrow mb-1 block">Phone</label>
            <input
              className="w-full border border-border bg-background px-2 py-2 font-mono text-sm"
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder="+1…"
              required
            />
          </div>
          <div>
            <label className="text-eyebrow mb-1 block">Location</label>
            <input
              className="w-full border border-border bg-background px-2 py-2 text-sm"
              value={regLocation}
              onChange={(e) => setRegLocation(e.target.value)}
              placeholder="Minneapolis, MN"
              required
            />
          </div>
          <div>
            <label className="text-eyebrow mb-1 block">Label</label>
            <input
              className="w-full border border-border bg-background px-2 py-2 text-sm"
              value={regLabel}
              onChange={(e) => setRegLabel(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <button
            type="submit"
            disabled={formBusy}
            className="border border-border px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.12em] hover:border-accent hover:text-accent disabled:opacity-40"
          >
            Add
          </button>
        </form>
        <ul className="mt-6 divide-y divide-border border-t border-border font-mono text-xs">
          {contacts.length === 0 ? (
            <li className="py-4 text-muted-foreground">No contacts yet.</li>
          ) : (
            contacts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>{c.phone_number}</span>
                <span className="text-muted-foreground">{c.location}</span>
                <button
                  type="button"
                  onClick={() => void removeContact(c.id)}
                  className="text-[var(--state-critical)] hover:underline"
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <div className="mb-12 grid gap-8 lg:grid-cols-2">
        <section className="border border-border p-5">
          <h2 className="font-display font-extrabold">Simulate reply</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Same path as Twilio inbound. Uses 1 / 2 / 3 unless that number has a wellness check context.
          </p>
          <form onSubmit={submitSim} className="mt-4 flex flex-col gap-3">
            <input
              className="border border-border bg-background px-3 py-2 font-mono text-sm"
              placeholder="Phone"
              value={simPhone}
              onChange={(e) => setSimPhone(e.target.value)}
              required
            />
            <input
              className="border border-border bg-background px-3 py-2 font-mono text-sm"
              placeholder="Body (e.g. 1)"
              value={simBody}
              onChange={(e) => setSimBody(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="border border-border bg-background px-2 py-2 font-mono text-xs"
                placeholder="Event id (opt)"
                value={simEventId}
                onChange={(e) => setSimEventId(e.target.value)}
              />
              <input
                className="border border-border bg-background px-2 py-2 font-mono text-xs"
                placeholder="Event name (opt)"
                value={simEventName}
                onChange={(e) => setSimEventName(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={formBusy}
              className="bg-accent py-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-accent-foreground disabled:opacity-40"
            >
              Record reply
            </button>
          </form>
        </section>

        <section className="border border-border p-5">
          <h2 className="font-display font-extrabold">SMS broadcast</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Sends the emergency template to everyone you select. Locations use token match (MN, Ramsey, …).
          </p>
          <form onSubmit={submitBroadcast} className="mt-4 flex flex-col gap-3">
            <input
              className="border border-border bg-background px-3 py-2 text-sm"
              placeholder="Event name"
              value={evName}
              onChange={(e) => setEvName(e.target.value)}
              required
            />
            <input
              className="border border-border bg-background px-3 py-2 font-mono text-xs"
              placeholder="Event id (optional)"
              value={evId}
              onChange={(e) => setEvId(e.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input type="checkbox" checked={allReg} onChange={(e) => setAllReg(e.target.checked)} /> All
              registered contacts
            </label>
            <input
              className="border border-border bg-background px-3 py-2 text-sm"
              placeholder="Also match locations containing… (paste alert area text or MN)"
              value={locFilter}
              onChange={(e) => setLocFilter(e.target.value)}
            />
            <textarea
              className="min-h-[72px] border border-border bg-background px-3 py-2 font-mono text-xs"
              placeholder="Extra numbers, comma-separated (optional)"
              value={extraPhones}
              onChange={(e) => setExtraPhones(e.target.value)}
            />
            <button
              type="submit"
              disabled={formBusy}
              className="border border-border py-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] hover:border-accent hover:text-accent disabled:opacity-40"
            >
              Send SMS
            </button>
          </form>
        </section>
      </div>

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
