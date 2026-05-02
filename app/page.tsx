import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { tierCounts } from "@/lib/mock";

export default function Home() {
  const counts = tierCounts();
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b hairline">
          <div className="mx-auto max-w-[1400px] px-6 pt-24 pb-32">
            <p className="text-eyebrow mb-10">
              AIIS Hackathon · Disaster response · Agentic
            </p>
            <h1 className="text-display text-[clamp(3.5rem,11vw,11rem)]">
              Nobody
              <br />
              gets <span className="text-accent">missed.</span>
            </h1>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-10">
              <p className="md:col-span-7 text-xl md:text-2xl leading-snug text-foreground/85">
                When the lights go out, the most vulnerable households go
                invisible. Lifeline gives every at-risk person an AI agent that
                reaches them in their actual modality — voice, ASL, plain SMS,
                their language — and hands the right ones to dispatchers with a
                fully-prepared brief.
              </p>
              <div className="md:col-span-5 flex flex-col gap-3 md:items-end md:justify-end">
                <Link
                  href="/dispatcher"
                  className="group inline-flex items-center justify-between gap-6 bg-accent text-accent-foreground px-6 py-4 w-full md:w-auto"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.18em]">
                    Open dispatcher console
                  </span>
                  <span aria-hidden className="text-xl">→</span>
                </Link>
                <Link
                  href="/me"
                  className="group inline-flex items-center justify-between gap-6 border hairline px-6 py-4 w-full md:w-auto hover:border-foreground"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.18em]">
                    See an individual&apos;s view
                  </span>
                  <span aria-hidden className="text-xl">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* The gap */}
        <section className="border-b hairline">
          <div className="mx-auto max-w-[1400px] px-6 py-24">
            <p className="text-eyebrow mb-6">The gap</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-foreground/60 mb-3">
                  emPOWER
                </p>
                <p className="text-2xl font-display font-extrabold leading-tight">
                  Federal list of who is at risk.
                </p>
                <p className="mt-3 text-foreground/60">
                  4,000 households in this county. Names, addresses, equipment.
                </p>
              </div>
              <div className="md:pt-12">
                <p className="text-display text-7xl text-accent leading-none">
                  ⟶
                </p>
                <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-foreground/50">
                  Today: nothing connects them
                </p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-foreground/60 mb-3">
                  911 / EMS
                </p>
                <p className="text-2xl font-display font-extrabold leading-tight">
                  Who gets help right now.
                </p>
                <p className="mt-3 text-foreground/60">
                  Reactive. Waits for the call. Has no context when it comes in.
                </p>
              </div>
            </div>
            <div className="mt-16 border-t hairline pt-10">
              <p className="text-2xl md:text-3xl font-display font-extrabold leading-tight max-w-3xl">
                Lifeline is the missing layer in between.
              </p>
            </div>
          </div>
        </section>

        {/* The loop */}
        <section className="border-b hairline">
          <div className="mx-auto max-w-[1400px] px-6 py-24">
            <p className="text-eyebrow mb-12">The loop · per household</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <Step
                n="01"
                title="Reach"
                body="Voice for Marcus. ASL relay for Devon. Plain SMS for Wendell. Hmong for Mai. Every household, in the modality they actually use."
              />
              <Step
                n="02"
                title="Assess"
                body="A structured but conversational check produces a state vector — equipment runtime, mobility, comprehension, distress signals, isolation, unmet needs."
              />
              <Step
                n="03"
                title="Decide"
                body="Stable, watch, or escalate. Only escalations reach a human dispatcher — and they arrive with a prepared brief and ranked alternatives."
              />
            </div>
          </div>
        </section>

        {/* Live snapshot */}
        <section className="border-b hairline">
          <div className="mx-auto max-w-[1400px] px-6 py-24">
            <p className="text-eyebrow mb-10">Live snapshot · this county</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
              <Stat label="Critical" value={counts.critical} tone="critical" />
              <Stat label="Watch" value={counts.watch} tone="watch" />
              <Stat label="Stable" value={counts.stable} tone="stable" />
              <Stat label="Recovery" value={counts.recovery} tone="recovery" />
            </div>
            <div className="mt-10 flex justify-end">
              <Link
                href="/dispatcher"
                className="inline-flex items-center gap-3 text-accent hover:underline"
              >
                <span className="font-mono text-xs uppercase tracking-[0.18em]">
                  Open the queue
                </span>
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        <footer className="py-10">
          <div className="mx-auto max-w-[1400px] px-6 flex justify-between items-center">
            <p className="text-eyebrow">BLACKBOX · A Double Crisis</p>
            <p className="text-eyebrow">Built for AIIS Hackathon</p>
          </div>
        </footer>
      </main>
    </>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="border-t hairline pt-6">
      <p className="font-mono text-xs text-foreground/50">{n}</p>
      <h3 className="mt-3 text-3xl font-display font-extrabold tracking-tight">
        {title}
      </h3>
      <p className="mt-4 text-foreground/70 leading-relaxed">{body}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "critical" | "watch" | "stable" | "recovery";
}) {
  const colorClass = {
    critical: "text-state-critical",
    watch: "text-state-watch",
    stable: "text-state-stable",
    recovery: "text-state-recovery",
  }[tone];
  return (
    <div className="bg-background p-8">
      <p className={`font-mono text-xs uppercase tracking-[0.18em] ${colorClass}`}>
        {label}
      </p>
      <p className="mt-4 text-6xl font-display font-extrabold tabular-nums">
        {value}
      </p>
    </div>
  );
}
