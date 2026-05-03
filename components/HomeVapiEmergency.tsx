"use client";

import { useCallback, useState } from "react";

export function HomeVapiEmergency() {
  const envPhone =
    typeof process.env.NEXT_PUBLIC_BLACKBOX_HOME_VAPI_PHONE === "string"
      ? process.env.NEXT_PUBLIC_BLACKBOX_HOME_VAPI_PHONE.trim()
      : "";
  const [phone, setPhone] = useState(envPhone);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const startCall = useCallback(async () => {
    const n = phone.trim();
    if (!n) {
      setMessage("Add the destination phone number first. Use E.164 format, like +16125550101.");
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const res = await fetch("/api/vapi/call/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: n }),
      });

      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        call_id?: string;
        status?: string;
      };

      if (!res.ok || body.ok === false) {
        setMessage(body.error ?? "Could not start the Vapi AI call.");
        return;
      }

      setMessage(
        body.call_id
          ? `Lifeline AI call started. Status: ${body.status ?? "queued"}.`
          : "Lifeline AI call started. The phone should ring now."
      );
    } catch {
      setMessage("Network error — make sure the Next.js server is running and try again.");
    } finally {
      setBusy(false);
    }
  }, [phone]);

  return (
    <section className="border-b border-border bg-card/40 px-4 py-12 md:py-16">
      <div className="mx-auto grid max-w-[1400px] gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-eyebrow mb-4 text-[var(--state-critical)]">Vapi AI add-on</p>
          <h1 className="text-display mb-5 max-w-4xl text-5xl uppercase md:text-7xl lg:text-8xl">
            Lifeline voice agent.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            Start an outbound Vapi AI safety check from the BLACKBOX home page. The
            agent asks if the person is safe, listens for panic words like emergency,
            help, support, unsafe, or hurt, and uses the configured Vapi transfer tool
            when a human needs to take over.
          </p>
        </div>

        <div className="border border-[var(--state-critical)] bg-background p-4 shadow-[0_0_0_1px_var(--state-critical),0_0_44px_color-mix(in_oklab,var(--state-critical)_22%,transparent)] md:p-6">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            One-tap safety call
          </p>

          {!envPhone ? (
            <label className="mb-5 flex flex-col gap-2 text-left">
              <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                Destination phone number
              </span>
              <input
                type="tel"
                autoComplete="tel"
                placeholder="+16125550101"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border border-border bg-card px-4 py-4 font-mono text-base text-foreground placeholder:text-muted-foreground focus:border-[var(--state-critical)]"
              />
            </label>
          ) : (
            <p className="mb-5 font-mono text-sm text-muted-foreground">
              Calling <span className="text-foreground">{envPhone}</span>
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void startCall()}
            className="w-full rounded-none bg-[var(--state-critical)] px-8 py-8 font-display text-2xl font-black uppercase tracking-tight text-accent-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 md:py-10 md:text-4xl"
          >
            {busy ? "Connecting…" : "Start Lifeline AI Call"}
          </button>

          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            This is an add-on to the existing BLACKBOX dashboard. Vapi handles the live
            voice conversation; BLACKBOX keeps the disaster-response interface and API route.
          </p>

          {message ? (
            <p
              className={`mt-5 text-sm font-semibold ${
                message.startsWith("Lifeline")
                  ? "text-muted-foreground"
                  : "text-[var(--state-critical)]"
              }`}
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
