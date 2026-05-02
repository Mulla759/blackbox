import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { StateBadge } from "@/components/StateBadge";
import { ModalityIndicator } from "@/components/ModalityIndicator";
import { CadenceTimer } from "@/components/CadenceTimer";
import { Waveform } from "@/components/Waveform";
import { findHousehold, DEFAULT_ME_ID, HOUSEHOLDS } from "@/lib/mock";
import { notFound } from "next/navigation";

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { as } = await searchParams;
  const id = as ?? DEFAULT_ME_ID;
  const record = findHousehold(id);
  if (!record) notFound();
  const { household, decision, transcript, state } = record;

  return (
    <>
      <SiteHeader context={`Hello, ${household.persona.name.split(" ")[0]}`} />
      <main className="flex-1">
        {/* "as" picker — demo affordance, hidden in eyebrow */}
        <div className="border-b hairline">
          <div className="mx-auto max-w-[1100px] px-6 py-3 flex items-center gap-3 overflow-x-auto">
            <span className="text-eyebrow">View as</span>
            {HOUSEHOLDS.map((h) => (
              <Link
                key={h.household.id}
                href={`/me?as=${h.household.id}`}
                className={`text-eyebrow whitespace-nowrap px-2 py-1 border ${
                  h.household.id === id
                    ? "border-accent text-accent"
                    : "hairline hover:text-foreground"
                }`}
              >
                {h.household.persona.name.split(" ")[0]}
              </Link>
            ))}
          </div>
        </div>

        {/* Hero check-in */}
        <section className="border-b hairline">
          <div className="mx-auto max-w-[1100px] px-6 pt-16 pb-12">
            <div className="flex items-baseline justify-between flex-wrap gap-4">
              <ModalityIndicator
                modality={household.modality}
                language={household.language}
              />
              <StateBadge tier={decision.tier} />
            </div>
            <h1 className="mt-8 text-display text-5xl md:text-7xl">
              Lifeline is{" "}
              <span className="text-accent">on the line.</span>
            </h1>
            <p className="mt-6 text-xl text-foreground/70 max-w-2xl">
              {decision.tier === "critical"
                ? "We’re moving fast. Stay with me — help is being arranged right now."
                : decision.tier === "watch"
                  ? "I’m checking in often. Tell me anything that changes."
                  : decision.tier === "recovery"
                    ? "The storm is over. We’re keeping in touch while you get back to normal."
                    : "All quiet. I’ll check back soon."}
            </p>

            <div className="mt-10 flex items-center gap-8 flex-wrap">
              <CadenceTimer
                nextCheckInAt={decision.nextCheckInAt}
                label={
                  decision.tier === "recovery" ? "Next call" : "Next check-in"
                }
              />
              <button
                type="button"
                className="bg-accent text-accent-foreground font-mono text-xs uppercase tracking-[0.18em] px-5 py-3"
              >
                I need help now
              </button>
              <button
                type="button"
                className="border hairline hover:border-foreground font-mono text-xs uppercase tracking-[0.18em] px-5 py-3"
              >
                I&apos;m okay
              </button>
            </div>
          </div>
        </section>

        {/* Transcript */}
        <section className="border-b hairline">
          <div className="mx-auto max-w-[1100px] px-6 py-12">
            <p className="text-eyebrow mb-6">This conversation</p>
            <ul className="flex flex-col gap-6">
              {transcript.map((t, i) => (
                <Bubble
                  key={i}
                  speaker={t.speaker}
                  text={t.text}
                  ts={t.ts}
                  amplitude={t.amplitude}
                  modality={household.modality}
                  personName={household.persona.name.split(" ")[0]}
                />
              ))}
            </ul>
          </div>
        </section>

        {/* What we know */}
        <section className="border-b hairline">
          <div className="mx-auto max-w-[1100px] px-6 py-12">
            <p className="text-eyebrow mb-6">What Lifeline knows about you</p>
            <p className="text-foreground/60 mb-8 max-w-2xl">
              Only what you&apos;ve shared. You can change or remove any of this
              at any time.
            </p>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              <Row label="Address" value={household.address} />
              <Row label="Zone" value={household.zone} />
              <Row
                label="Equipment"
                value={
                  household.equipment.length > 0
                    ? household.equipment
                        .map((e) => e.kind.replace("-", " "))
                        .join(", ")
                    : "None on file"
                }
              />
              <Row label="Caregiver" value={household.caregiver ?? "None"} />
              <Row label="Mobility" value={state.mobility} />
              <Row label="Preferred contact" value={household.modality.replace("-", " ")} />
            </dl>
          </div>
        </section>

        <footer className="py-10">
          <div className="mx-auto max-w-[1100px] px-6 flex justify-between items-center">
            <p className="text-eyebrow">Lifeline</p>
            <Link
              href="/dispatcher"
              className="text-eyebrow hover:text-foreground"
            >
              Dispatcher view →
            </Link>
          </div>
        </footer>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-t hairline py-3">
      <dt className="text-eyebrow">{label}</dt>
      <dd className="text-foreground/85 capitalize">{value}</dd>
    </div>
  );
}

function Bubble({
  speaker,
  text,
  ts,
  amplitude,
  modality,
  personName,
}: {
  speaker: "agent" | "person";
  text: string;
  ts: string;
  amplitude?: number[];
  modality: string;
  personName: string;
}) {
  const isAgent = speaker === "agent";
  return (
    <li className={`flex flex-col gap-2 ${isAgent ? "items-start" : "items-end"}`}>
      <span className="text-eyebrow">
        {isAgent ? "Lifeline" : personName} · {ts}
      </span>
      <div
        className={`max-w-[85%] px-5 py-4 ${
          isAgent
            ? "bg-card border hairline text-foreground"
            : "bg-accent text-accent-foreground"
        }`}
      >
        <p className="text-lg leading-snug">{text}</p>
        {amplitude && modality === "voice" ? (
          <div className="mt-3 text-foreground/60">
            <Waveform amplitude={amplitude} />
          </div>
        ) : null}
      </div>
    </li>
  );
}
