"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ThreadMsg = {
  id: string;
  timestamp: string;
  channel: "voice";
  direction: "outbound" | "inbound";
  body: string;
  delivery_status?: string;
};

const POLL_MS = 2500;

export function WellnessSmsBox() {
  const [phone, setPhone] = useState("");
  const [messages, setMessages] = useState<ThreadMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchThread = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.length < 10) return;
    const res = await fetch(
      `/api/wellness-check/thread?phone=${encodeURIComponent(trimmed)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return;
    const data = (await res.json()) as { messages?: ThreadMsg[] };
    setMessages(Array.isArray(data.messages) ? data.messages : []);
  }, []);

  useEffect(() => {
    const q = phone.trim();
    if (q.length < 10) {
      setMessages([]);
      return;
    }
    const t = window.setTimeout(() => void fetchThread(q), 450);
    return () => window.clearTimeout(t);
  }, [phone, fetchThread]);

  useEffect(() => {
    const q = phone.trim();
    if (q.length < 10) return;
    const id = window.setInterval(() => void fetchThread(q), POLL_MS);
    return () => window.clearInterval(id);
  }, [phone, fetchThread]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
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
        phone_number?: string;
        provider?: string;
        delivery_status?: string;
      };

      if (!res.ok || !data.phone_number) {
        setSendError(data.error ?? "Could not send.");
        return;
      }

      if (data.provider === "simulated") {
        setSendError(
          "Call is in placeholder mode. Add Twilio voice vars in .env and restart dev."
        );
        return;
      }

      if (data.delivery_status === "failed") {
        setSendError(data.error ?? "Call failed to start.");
        return;
      }

      setPhone(data.phone_number);
      await fetchThread(data.phone_number);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      {/* Virtual call/reply thread */}
      <div
        ref={listRef}
        className="mb-8 flex max-h-[min(50vh,420px)] flex-col gap-3 overflow-y-auto border border-border bg-card/40 p-4"
      >
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Call events and keypad/speech replies for this number will show here.
          </p>
        ) : (
          messages.map((m) => {
            const out = m.direction === "outbound";
            return (
              <div
                key={m.id}
                className={`max-w-[90%] border px-3 py-2 text-sm ${
                  out
                    ? "self-end border-accent/40 bg-accent/15 text-foreground"
                    : "self-start border-border bg-background text-foreground"
                }`}
              >
                <p className="mb-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">
                  {out ? "Sent" : "Received"} · {m.channel} ·{" "}
                  {new Date(m.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
                <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="flex flex-col gap-3">
        <label htmlFor="wellness-phone" className="sr-only">
          Phone number
        </label>
        <input
          id="wellness-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+16124331186 (or leave blank to use TEST_RECIPIENT_NUMBER)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border border-border bg-card px-4 py-3 font-mono text-base text-foreground placeholder:text-muted-foreground/50 focus-visible:border-accent"
        />
        <button
          type="submit"
          disabled={busy}
          className="border border-border bg-accent py-3 font-mono text-xs uppercase tracking-[0.18em] text-accent-foreground hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Calling…" : "Start call check-in"}
        </button>
      </form>

      {sendError ? (
        <p className="mt-4 text-center text-sm text-[var(--state-critical)]">
          {sendError}
        </p>
      ) : null}
    </div>
  );
}
