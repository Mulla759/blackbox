"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 2000;
const POLL_CAP_MS = 180_000;

export function WellnessSmsBox() {
  const [phone, setPhone] = useState("");
  const [sentSince, setSentSince] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const pollStopRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollStopRef.current !== null) {
      window.clearInterval(pollStopRef.current);
      pollStopRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  async function pollOnce(since: string, normalizedPhone: string) {
    const qs = new URLSearchParams({ phone: normalizedPhone, since });
    const res = await fetch(`/api/wellness-check/reply?${qs}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      reply?: { raw_message: string } | null;
    };
    if (data.reply?.raw_message) {
      setReplyText(data.reply.raw_message);
      stopPolling();
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    stopPolling();
    setReplyText(null);
    setSendError(null);

    const trimmed = phone.trim();
    if (!trimmed) return;

    setBusy(true);
    try {
      const res = await fetch("/api/wellness-check/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: trimmed }),
      });
      const data = (await res.json()) as {
        error?: string;
        sent_at?: string;
        phone_number?: string;
        provider?: string;
        twilio_message_sid?: string | null;
        ok?: boolean;
        delivery_status?: string;
      };

      if (!res.ok || !data.sent_at || !data.phone_number) {
        setSendError(data.error ?? "Could not send.");
        return;
      }

      if (data.provider === "simulated") {
        setSendError(
          "SMS is running in simulated mode (no carrier). Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env — TWILIO_PHONE_NUMBER must be your Twilio From number (E.164), then restart npm run dev."
        );
        return;
      }

      if (data.delivery_status === "failed") {
        setSendError(data.error ?? "SMS failed to send.");
        return;
      }

      setSentSince(data.sent_at);
      void pollOnce(data.sent_at, data.phone_number);

      const started = Date.now();
      const pollPhone = data.phone_number;
      const pollSince = data.sent_at;
      pollStopRef.current = window.setInterval(() => {
        if (Date.now() - started > POLL_CAP_MS) {
          stopPolling();
          return;
        }
        void pollOnce(pollSince, pollPhone);
      }, POLL_MS);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-6 py-16">
      <form onSubmit={handleSend} className="flex flex-col gap-4">
        <label htmlFor="wellness-phone" className="sr-only">
          Phone number
        </label>
        <input
          id="wellness-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+16124331186"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border border-border bg-card px-4 py-4 font-mono text-base text-foreground placeholder:text-muted-foreground/50 focus-visible:border-accent"
        />
        <button
          type="submit"
          disabled={busy || !phone.trim()}
          className="border border-border bg-accent py-4 font-mono text-xs uppercase tracking-[0.2em] text-accent-foreground hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Sending…" : "Send check-in"}
        </button>
      </form>

      {sendError ? (
        <p className="mt-6 text-center text-sm text-[var(--state-critical)]">
          {sendError}
        </p>
      ) : null}

      {replyText !== null ? (
        <output
          className="mt-14 block text-center font-mono text-2xl leading-relaxed text-foreground sm:text-3xl"
          aria-live="polite"
        >
          {replyText}
        </output>
      ) : sentSince && !sendError ? (
        <p className="mt-14 text-center font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Waiting for reply…
        </p>
      ) : null}
    </div>
  );
}
