import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { StateBadge } from "@/components/StateBadge";
import { ModalityIndicator } from "@/components/ModalityIndicator";
import { byTier, tierCounts, HOUSEHOLDS } from "@/lib/mock";
import type { HouseholdRecord, Tier } from "@/lib/types";

export default function DispatcherPage() {
  const counts = tierCounts();
  const red = byTier("critical").sort(
    (a, b) =>
      (a.decision.predictedTimeToHarmMin ?? 99999) -
      (b.decision.predictedTimeToHarmMin ?? 99999)
  );
  const yellow = byTier("watch");
  const green = byTier("stable");
  const recovery = byTier("recovery");

  return (
    <>
      <SiteHeader context="Dispatcher console · Zone Ops" />
      <main className="flex-1">
        {/* Operations bar */}
        <section className="border-b hairline">
          <div className="mx-auto max-w-[1600px] px-6 py-6 flex flex-wrap items-baseline gap-x-10 gap-y-3">
            <div>
              <p className="text-eyebrow">Active event</p>
              <p className="font-display font-extrabold text-2xl tracking-tight">
                Severe storm · landfall +2h
              </p>
            </div>
            <Counter label="Critical" value={counts.critical} tone="critical" />
            <Counter label="Watch" value={counts.watch} tone="watch" />
            <Counter label="Stable" value={counts.stable} tone="stable" />
            <Counter label="Recovery" value={counts.recovery} tone="recovery" />
            <div className="ml-auto text-right">
              <p className="text-eyebrow">Households monitored</p>
              <p className="font-mono text-xl tabular-nums">{HOUSEHOLDS.length}</p>
            </div>
          </div>
        </section>

        {/* Triage queues */}
        <section className="mx-auto max-w-[1600px] px-6 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border">
            <Column
              tier="critical"
              title="Critical"
              subtitle="Escalated. Ranked by predicted time-to-harm."
              records={red}
              showTimeToHarm
            />
            <Column
              tier="watch"
              title="Watch"
              subtitle="Agent handling. Intervene if your gut says otherwise."
              records={yellow}
            />
            <Column
              tier="stable"
              title="Stable & recovery"
              subtitle="Confirmed safe. Recovery cadence ongoing."
              records={[...green, ...recovery]}
            />
          </div>
        </section>
      </main>
    </>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: Tier;
}) {
  const color = {
    critical: "text-state-critical",
    watch: "text-state-watch",
    stable: "text-state-stable",
    recovery: "text-state-recovery",
  }[tone];
  return (
    <div className="border-l hairline pl-6">
      <p className={`text-eyebrow ${color}`}>{label}</p>
      <p className="font-mono text-2xl tabular-nums">{value}</p>
    </div>
  );
}

function Column({
  tier,
  title,
  subtitle,
  records,
  showTimeToHarm,
}: {
  tier: Tier;
  title: string;
  subtitle: string;
  records: HouseholdRecord[];
  showTimeToHarm?: boolean;
}) {
  const accent = {
    critical: "border-t-state-critical",
    watch: "border-t-state-watch",
    stable: "border-t-state-stable",
    recovery: "border-t-state-recovery",
  }[tier];
  return (
    <div className={`bg-background border-t-2 ${accent}`}>
      <div className="px-5 py-5">
        <h2 className="font-display font-extrabold text-2xl tracking-tight">
          {title}{" "}
          <span className="text-foreground/40 font-mono text-base">
            {records.length}
          </span>
        </h2>
        <p className="text-eyebrow mt-1">{subtitle}</p>
      </div>
      <ul className="flex flex-col">
        {records.map((r) => (
          <QueueCard key={r.household.id} record={r} showTimeToHarm={showTimeToHarm} />
        ))}
        {records.length === 0 ? (
          <li className="px-5 py-10 text-foreground/40 text-sm">Empty.</li>
        ) : null}
      </ul>
    </div>
  );
}

function QueueCard({
  record,
  showTimeToHarm,
}: {
  record: HouseholdRecord;
  showTimeToHarm?: boolean;
}) {
  const { household, decision, state } = record;
  const isCritical = decision.tier === "critical";
  return (
    <li className="border-t hairline">
      <Link
        href={`/dispatcher/${household.id}`}
        className={`block px-5 py-5 hover:bg-card transition-colors ${
          isCritical ? "bg-state-critical/[0.04]" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display font-extrabold text-xl tracking-tight truncate">
              {household.persona.name}
              <span className="text-foreground/40 font-mono text-sm font-normal ml-2">
                {household.persona.age}
              </span>
            </p>
            <p className="text-sm text-foreground/60 mt-1 truncate">
              {household.persona.oneLine}
            </p>
          </div>
          <StateBadge tier={decision.tier} />
        </div>

        <div className="mt-4 flex items-center gap-4 text-eyebrow">
          <ModalityIndicator
            modality={household.modality}
            language={household.language}
          />
          <span className="text-foreground/30">·</span>
          <span>{household.zone}</span>
        </div>

        {showTimeToHarm && decision.predictedTimeToHarmMin !== undefined ? (
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-eyebrow text-state-critical">
              Time to harm
            </span>
            <span className="font-mono text-lg tabular-nums text-state-critical">
              {formatMinutes(decision.predictedTimeToHarmMin)}
            </span>
          </div>
        ) : null}

        {state.unmetNeeds.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {state.unmetNeeds.slice(0, 2).map((n) => (
              <span
                key={n}
                className="border hairline px-2 py-0.5 text-xs text-foreground/70"
              >
                {n}
              </span>
            ))}
          </div>
        ) : null}
      </Link>
    </li>
  );
}

function formatMinutes(m: number) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
