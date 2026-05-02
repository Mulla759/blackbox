"use client";

import type { DisasterAlert } from "@/lib/disaster";
import {
  useDeferredValue,
  useMemo,
  useState,
} from "react";

const FILTER_ALL = "__all__";

function severityAccent(severity: string): string {
  const s = severity.toLowerCase();
  if (s === "extreme") return "bg-red-600 text-white";
  if (s === "severe") return "bg-[var(--state-critical)] text-[var(--accent-foreground)]";
  if (s === "moderate") return "bg-[var(--state-watch)] text-[#0a0a0a]";
  if (s === "minor") return "bg-emerald-600/90 text-white";
  return "bg-muted text-foreground/80";
}

function severityStripe(severity: string): string {
  const s = severity.toLowerCase();
  if (s === "extreme") return "border-l-red-600";
  if (s === "severe") return "border-l-[var(--state-critical)]";
  if (s === "moderate") return "border-l-[var(--state-watch)]";
  if (s === "minor") return "border-l-emerald-500";
  return "border-l-muted-foreground/50";
}

function severityRank(severity: string): number {
  const order: Record<string, number> = {
    Extreme: 5,
    Severe: 4,
    Moderate: 3,
    Minor: 2,
    Unknown: 1,
  };
  const trimmed = severity.trim();
  return order[trimmed] ?? 0;
}

function urgencyRank(urgency: string): number {
  const order: Record<string, number> = {
    Immediate: 4,
    Expected: 3,
    Future: 2,
    Past: 1,
    Unknown: 0,
  };
  const trimmed = urgency.trim();
  return order[trimmed] ?? 0;
}

function sortedOptions(values: Set<string>): string[] {
  return [...values].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

export function AlertsDashboard({
  alerts,
  error,
}: {
  alerts: DisasterAlert[];
  error: string | null;
}) {
  const [notifyKey, setNotifyKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState(FILTER_ALL);
  const [urgency, setUrgency] = useState(FILTER_ALL);
  const [disasterType, setDisasterType] = useState(FILTER_ALL);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const { severityOptions, urgencyOptions, typeOptions } = useMemo(() => {
    const severities = new Set<string>();
    const urgencies = new Set<string>();
    const types = new Set<string>();
    for (const a of alerts) {
      if (a.severity) severities.add(a.severity);
      if (a.urgency) urgencies.add(a.urgency);
      if (a.type) types.add(a.type);
    }
    return {
      severityOptions: sortedOptions(severities),
      urgencyOptions: sortedOptions(urgencies),
      typeOptions: sortedOptions(types),
    };
  }, [alerts]);

  const filtered = useMemo(() => {
    return alerts
      .filter((a) => {
        if (severity !== FILTER_ALL && a.severity !== severity) return false;
        if (urgency !== FILTER_ALL && a.urgency !== urgency) return false;
        if (disasterType !== FILTER_ALL && a.type !== disasterType) return false;
        if (!deferredQuery) return true;
        const hay = `${a.type} ${a.location} ${a.description}`.toLowerCase();
        return hay.includes(deferredQuery);
      })
      .sort((x, y) => {
        const rs = severityRank(y.severity) - severityRank(x.severity);
        if (rs !== 0) return rs;
        return urgencyRank(y.urgency) - urgencyRank(x.urgency);
      });
  }, [alerts, deferredQuery, severity, urgency, disasterType]);

  const filtersActive =
    severity !== FILTER_ALL ||
    urgency !== FILTER_ALL ||
    disasterType !== FILTER_ALL ||
    query.trim().length > 0;

  function clearFilters() {
    setQuery("");
    setSeverity(FILTER_ALL);
    setUrgency(FILTER_ALL);
    setDisasterType(FILTER_ALL);
  }

  async function triggerOutreach(a: DisasterAlert, index: number) {
    const key = a.sourceId ?? `${index}-${a.type}-${a.location}`;
    setNotifyKey(key);
    try {
      const res = await fetch("/api/disasters/communications/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disaster_event_id: a.sourceId ?? undefined,
          disaster_event_name: a.type,
        }),
      });
      const data = (await res.json()) as { error?: string; results?: unknown[] };
      if (!res.ok) {
        alert(data.error ?? "Outreach request failed");
        return;
      }
      alert(
        `Notifications queued: ${Array.isArray(data.results) ? data.results.length : 0} message(s).`
      );
    } finally {
      setNotifyKey(null);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="border border-[var(--state-critical)]/35 bg-[var(--state-critical)]/[0.07] p-6 sm:p-8">
          <p className="font-display text-lg font-extrabold text-[var(--state-critical)]">
            Unable to load alerts
          </p>
          <p className="mt-3 max-w-2xl text-foreground/80 leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <div className="flex flex-col gap-6 border-b border-border pb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-eyebrow mb-3">National Weather Service</p>
            <h1 className="text-display text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Active alerts
            </h1>
            <p className="mt-4 max-w-xl text-base text-foreground/65 leading-relaxed">
              Filter by area text, severity, urgency, or event type. Data mirrors{" "}
              <a
                href="/api/alerts"
                className="font-mono text-xs text-accent underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                /api/alerts
              </a>
              .
            </p>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <span>
              Showing{" "}
              <strong className="text-foreground tabular-nums">{filtered.length}</strong>
              <span className="text-foreground/35"> / </span>
              <strong className="text-foreground tabular-nums">{alerts.length}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="alert-search" className="text-eyebrow mb-2 block">
              Search location & text
            </label>
            <input
              id="alert-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="County, state, keywords…"
              autoComplete="off"
              className="w-full border border-border bg-card px-4 py-3 font-sans text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:border-accent"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:max-w-[58%] lg:flex-1">
            <div>
              <label htmlFor="filter-severity" className="text-eyebrow mb-2 block">
                Severity
              </label>
              <select
                id="filter-severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full cursor-pointer border border-border bg-card px-3 py-3 font-mono text-xs uppercase tracking-[0.08em] text-foreground"
              >
                <option value={FILTER_ALL}>All severities</option>
                {severityOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-urgency" className="text-eyebrow mb-2 block">
                Urgency
              </label>
              <select
                id="filter-urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full cursor-pointer border border-border bg-card px-3 py-3 font-mono text-xs uppercase tracking-[0.08em] text-foreground"
              >
                <option value={FILTER_ALL}>All urgency</option>
                {urgencyOptions.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-type" className="text-eyebrow mb-2 block">
                Event type
              </label>
              <select
                id="filter-type"
                value={disasterType}
                onChange={(e) => setDisasterType(e.target.value)}
                className="w-full cursor-pointer border border-border bg-card px-3 py-3 font-mono text-xs uppercase tracking-[0.08em] text-foreground"
              >
                <option value={FILTER_ALL}>All events</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filtersActive ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={clearFilters}
              className="border border-border px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-foreground/85 hover:border-accent hover:text-accent"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </div>

      {alerts.length === 0 ? (
        <p className="mt-12 text-foreground/55">No active alerts returned.</p>
      ) : filtered.length === 0 ? (
        <p className="mt-12 text-foreground/55">
          No alerts match these filters. Try clearing search or widening dropdowns.
        </p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {filtered.map((a, i) => (
            <li
              key={`${a.type}-${a.location}-${i}`}
              className={`flex flex-col border border-border border-l-4 bg-card p-5 ${severityStripe(a.severity)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-display text-lg font-extrabold leading-snug tracking-tight md:text-xl">
                  {a.type}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.1em] ${severityAccent(a.severity)}`}
                  >
                    {a.severity}
                  </span>
                  <span className="border border-border bg-background px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-foreground/75">
                    {a.urgency}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70 line-clamp-4 md:line-clamp-none">
                {a.location}
              </p>
              {a.description ? (
                <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground/85">
                  {a.description}
                </p>
              ) : null}
              {a.coordinates?.length ? (
                <p className="mt-4 border-t border-border pt-3 font-mono text-[0.65rem] text-muted-foreground">
                  Geometry · {a.coordinates.length} lon/lat pair
                  {a.coordinates.length === 1 ? "" : "s"}
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  disabled={notifyKey !== null}
                  onClick={() => void triggerOutreach(a, i)}
                  className="border border-border bg-background px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.12em] hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  {notifyKey === (a.sourceId ?? `${i}-${a.type}-${a.location}`)
                    ? "Sending…"
                    : "SMS outreach"}
                </button>
                <span className="text-[0.65rem] text-muted-foreground self-center">
                  Uses saved recipients or{" "}
                  <span className="font-mono text-[0.6rem]">DISASTER_NOTIFY_RECIPIENTS</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
