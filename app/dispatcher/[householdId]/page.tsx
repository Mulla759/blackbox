import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { StateBadge } from "@/components/StateBadge";
import { ModalityIndicator } from "@/components/ModalityIndicator";
import { CadenceTimer } from "@/components/CadenceTimer";
import { findHousehold } from "@/lib/mock";

export default async function HouseholdBriefPage({
  params,
}: {
  params: Promise<{ householdId: string }>;
}) {
  const { householdId } = await params;
  const record = findHousehold(householdId);
  if (!record) notFound();
  const { household, state, decision, transcript } = record;

  return (
    <>
      <SiteHeader context={`Brief · ${household.persona.name}`} />
      <main className="flex-1">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <Link
            href="/dispatcher"
            className="text-eyebrow hover:text-foreground inline-flex items-center gap-2"
          >
            <span aria-hidden>←</span> Back to queue
          </Link>
        </div>

        {/* Header */}
        <section className="border-y hairline">
          <div className="mx-auto max-w-[1400px] px-6 py-10">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <p className="text-eyebrow mb-3">{household.zone} · {household.address}</p>
                <h1 className="text-display text-6xl md:text-7xl">
                  {household.persona.name}
                  <span className="text-foreground/40 ml-4 text-4xl md:text-5xl font-display font-extrabold">
                    {household.persona.age}
                  </span>
                </h1>
                <p className="mt-4 text-xl text-foreground/70 max-w-2xl">
                  {household.persona.oneLine}
                </p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <StateBadge tier={decision.tier} size="lg" />
                <ModalityIndicator
                  modality={household.modality}
                  language={household.language}
                />
                <CadenceTimer nextCheckInAt={decision.nextCheckInAt} />
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1400px] px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* LEFT: brief + actions */}
          <div className="lg:col-span-7 flex flex-col gap-12">
            {/* Brief */}
            <section>
              <p className="text-eyebrow mb-4">Prepared brief</p>
              <p className="text-2xl leading-snug font-display font-extrabold tracking-tight">
                {decision.brief}
              </p>
              <p className="mt-6 text-foreground/70 leading-relaxed border-l-2 border-accent pl-4">
                {decision.rationale}
              </p>
            </section>

            {/* Actions */}
            <section>
              <p className="text-eyebrow mb-4">Ranked alternatives</p>
              <ol className="flex flex-col">
                {decision.alternatives.map((a, i) => (
                  <li
                    key={a.label}
                    className={`border-t hairline py-5 ${
                      i === decision.alternatives.length - 1
                        ? "border-b"
                        : ""
                    }`}
                  >
                    <div className="flex items-start gap-5">
                      <span className="font-mono text-xs text-foreground/40 mt-1 w-6">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-3 flex-wrap">
                          <h3 className="font-display font-extrabold text-xl tracking-tight">
                            {a.label}
                          </h3>
                          {a.recommended ? (
                            <span className="text-eyebrow text-accent">
                              ★ Recommended
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-foreground/70">{a.rationale}</p>
                        <div className="mt-3 flex gap-5 text-eyebrow">
                          {a.eta ? <span>ETA {a.eta}</span> : null}
                          {a.cost ? <span>Cost · {a.cost}</span> : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`shrink-0 font-mono text-xs uppercase tracking-[0.18em] px-4 py-3 ${
                          a.recommended
                            ? "bg-accent text-accent-foreground"
                            : "border hairline hover:border-foreground"
                        }`}
                      >
                        Confirm →
                      </button>
                    </div>
                  </li>
                ))}
                {decision.alternatives.length === 0 ? (
                  <li className="text-foreground/40 text-sm border-t hairline pt-5">
                    No action required. Agent will continue scheduled check-ins.
                  </li>
                ) : null}
              </ol>
            </section>

            {/* Transcript */}
            <section>
              <p className="text-eyebrow mb-4">Recent contact</p>
              <ul className="flex flex-col gap-4">
                {transcript.map((t, i) => (
                  <li
                    key={i}
                    className={`flex flex-col gap-1 ${
                      t.speaker === "person" ? "items-end" : "items-start"
                    }`}
                  >
                    <span className="text-eyebrow">
                      {t.speaker === "agent" ? "Agent" : household.persona.name.split(" ")[0]} · {t.ts}
                    </span>
                    <p
                      className={`max-w-[85%] px-4 py-3 ${
                        t.speaker === "agent"
                          ? "bg-card border hairline"
                          : "bg-accent text-accent-foreground"
                      }`}
                    >
                      {t.text}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* RIGHT: state vector */}
          <aside className="lg:col-span-5 flex flex-col gap-8">
            <section className="border hairline p-6">
              <p className="text-eyebrow mb-4">State vector</p>
              <dl className="grid grid-cols-1 gap-y-4">
                <Field
                  label="Equipment runtime"
                  value={
                    state.equipmentRuntimeMin === null
                      ? "—"
                      : `${state.equipmentRuntimeMin} min`
                  }
                  emphasize={
                    state.equipmentRuntimeMin !== null &&
                    state.equipmentRuntimeMin < 120
                  }
                />
                <Field label="Mobility" value={state.mobility} />
                <Field
                  label="Comprehension"
                  value={`${Math.round(state.comprehensionConfidence * 100)}%`}
                />
                <Field
                  label="Isolation"
                  value={`${Math.round(state.isolationScore * 100)}%`}
                />
                <Field label="Location" value={state.location} />
                <Field
                  label="Last contact"
                  value={new Date(state.lastContactAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              </dl>
            </section>

            <section>
              <p className="text-eyebrow mb-4">Distress signals</p>
              {state.distressSignals.length === 0 ? (
                <p className="text-foreground/50">None detected.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {state.distressSignals.map((d) => (
                    <li
                      key={d}
                      className="border border-state-critical/50 text-state-critical px-3 py-1 text-sm"
                    >
                      {d}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <p className="text-eyebrow mb-4">Unmet needs</p>
              {state.unmetNeeds.length === 0 ? (
                <p className="text-foreground/50">None.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {state.unmetNeeds.map((n) => (
                    <li key={n} className="border-l-2 border-accent pl-3 py-1">
                      {n}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <p className="text-eyebrow mb-4">Equipment</p>
              {household.equipment.length === 0 ? (
                <p className="text-foreground/50">None registered.</p>
              ) : (
                <ul className="flex flex-col">
                  {household.equipment.map((e, i) => (
                    <li
                      key={i}
                      className="border-t hairline py-3 flex items-baseline justify-between"
                    >
                      <span className="capitalize">
                        {e.kind.replace("-", " ")}
                      </span>
                      <span className="font-mono text-sm text-foreground/60">
                        {e.powered ? "powered" : "passive"}
                        {e.runtimeMin
                          ? ` · ${e.runtimeMin}m`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <p className="text-eyebrow mb-4">Caregiver</p>
              <p className="text-foreground/80">
                {household.caregiver ?? "None on record"}
              </p>
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}

function Field({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between border-t hairline pt-3 first:border-t-0 first:pt-0">
      <dt className="text-eyebrow">{label}</dt>
      <dd
        className={`font-mono text-sm capitalize ${
          emphasize ? "text-state-critical" : "text-foreground/85"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
