"use client";

import { useEffect, useMemo, useState } from "react";

type Contact = {
  id: string;
  full_name: string | null;
  phone_number: string;
  city: string | null;
  state: string | null;
  preferred_language: string | null;
  accessibility_needs: string | null;
  prefers_sms: number;
  prefers_voice: number;
  profile_complete: number;
  is_deaf_or_hard_of_hearing: number;
};

type Responder = { id: string; full_name: string; role: string };

export function ResponderContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [selectedResponderId, setSelectedResponderId] = useState("");
  const [query, setQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedResponder = useMemo(
    () => responders.find((r) => r.id === selectedResponderId) ?? null,
    [responders, selectedResponderId]
  );

  async function load() {
    const [contactsRes, responderRes] = await Promise.all([
      fetch(`/api/contacts/search${query.trim() ? `?query=${encodeURIComponent(query.trim())}` : ""}`, { cache: "no-store" }),
      fetch("/api/responders", { cache: "no-store" }),
    ]);
    const c = (await contactsRes.json()) as { contacts?: Contact[] };
    const r = (await responderRes.json()) as { responders?: Responder[] };
    setContacts(c.contacts ?? []);
    setResponders(r.responders ?? []);
    if (!selectedResponderId && (r.responders?.length ?? 0) > 0) {
      setSelectedResponderId(r.responders?.[0]?.id ?? "");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [query]);

  async function ensureContact() {
    if (!phone.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/find-or-create-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phone.trim() }),
      });
      const body = (await res.json()) as { error?: string; needs_intake?: boolean };
      if (!res.ok) setError(body.error ?? "Could not check contact.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function callDispatcher(channel: "TWILIO_VOICE" | "VAPI_VOICE") {
    if (!selectedResponder) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dispatcher/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responder_id: selectedResponder.id, channel }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) setError(body.error ?? "Could not call dispatcher.");
    } finally {
      setBusy(false);
    }
  }

  async function contactPerson(contact: Contact, mode: "sms" | "twilio_voice" | "vapi_voice") {
    setBusy(true);
    setError(null);
    try {
      const endpoint =
        mode === "sms"
          ? "/api/twilio/sms/send"
          : mode === "twilio_voice"
            ? "/api/twilio/call/start"
            : "/api/vapi/call/start";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: contact.phone_number }),
      });
      const body = (await res.json()) as { error?: string; needs_intake?: boolean };
      if (!res.ok) setError(body.error ?? "Communication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6">
      <div className="mb-4 grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-3">
        <input className="border border-border bg-background px-3 py-2 text-sm" placeholder="Search by phone/name/city" value={query} onChange={(e) => setQuery(e.target.value)} />
        <input className="border border-border bg-background px-3 py-2 text-sm" placeholder="Lookup/create by phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button className="border border-border px-3 py-2 text-xs font-mono uppercase" onClick={() => void ensureContact()} disabled={busy}>Find or create contact</button>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-extrabold">Responder to Dispatcher</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select className="border border-border bg-background px-3 py-2 text-sm" value={selectedResponderId} onChange={(e) => setSelectedResponderId(e.target.value)}>
            {responders.map((r) => (
              <option key={r.id} value={r.id}>{r.full_name} · {r.role}</option>
            ))}
          </select>
          <button className="border border-border px-3 py-2 text-xs font-mono uppercase" disabled={busy || !selectedResponder} onClick={() => void callDispatcher("TWILIO_VOICE")}>Call dispatcher (Twilio)</button>
          <button className="border border-border px-3 py-2 text-xs font-mono uppercase" disabled={busy || !selectedResponder} onClick={() => void callDispatcher("VAPI_VOICE")}>Call dispatcher (Vapi)</button>
        </div>
      </div>

      <div className="grid gap-3">
        {contacts.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="font-semibold">{c.full_name ?? "Unknown contact"} · <span className="font-mono">{c.phone_number}</span></p>
            <p className="text-foreground/75">{c.city ?? ""}, {c.state ?? ""} · {c.preferred_language ?? "Unknown language"}</p>
            <p className="text-foreground/75">Accessibility needs: {c.accessibility_needs ?? "Not provided"}</p>
            {c.is_deaf_or_hard_of_hearing ? <p className="text-[var(--state-critical)]">SMS recommended for this contact.</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="border border-border px-2 py-1 text-xs font-mono uppercase" disabled={busy} onClick={() => void contactPerson(c, "sms")}>Send SMS</button>
              <button className="border border-border px-2 py-1 text-xs font-mono uppercase" disabled={busy} onClick={() => void contactPerson(c, "twilio_voice")}>Twilio call</button>
              <button className="border border-border px-2 py-1 text-xs font-mono uppercase" disabled={busy} onClick={() => void contactPerson(c, "vapi_voice")}>Vapi call</button>
            </div>
          </div>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm text-[var(--state-critical)]">{error}</p> : null}
    </div>
  );
}
