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
  is_deaf_or_hard_of_hearing: number;
  prefers_sms: number;
  prefers_voice: number;
  profile_complete: number;
  notes: string | null;
  address: string | null;
  zip_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  requires_interpreter: number;
  interpreter_language: string | null;
  updated_at: string;
};

type Log = {
  id: string;
  channel: string;
  direction: string;
  status: string;
  message_body: string | null;
  call_summary: string | null;
  created_at: string;
};

export function DispatcherCommunications() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("");
  const [accessNeed, setAccessNeed] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [smsBody, setSmsBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    preferred_language: "English",
    accessibility_needs: "",
    is_deaf_or_hard_of_hearing: false,
    prefers_sms: false,
    prefers_voice: true,
    requires_interpreter: false,
    interpreter_language: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
  });

  const selected = useMemo(
    () => contacts.find((c) => c.id === selectedId) ?? null,
    [contacts, selectedId]
  );

  async function loadContacts() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (language.trim()) params.set("language", language.trim());
    if (accessNeed.trim()) params.set("accessibility_need", accessNeed.trim());
    const url = `/api/contacts/search${params.toString() ? `?${params}` : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    const body = (await res.json()) as { contacts?: Contact[] };
    setContacts(body.contacts ?? []);
    if (selectedId && !(body.contacts ?? []).some((x) => x.id === selectedId)) {
      setSelectedId(null);
      setLogs([]);
    }
  }

  async function loadLogs(id: string) {
    const res = await fetch(`/api/contacts/${encodeURIComponent(id)}/communication-logs`, {
      cache: "no-store",
    });
    const body = (await res.json()) as { logs?: Log[] };
    setLogs(body.logs ?? []);
  }

  useEffect(() => {
    void loadContacts();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void loadContacts(), 250);
    return () => clearTimeout(t);
  }, [query, language, accessNeed]);

  useEffect(() => {
    if (!selectedId) return;
    void loadLogs(selectedId);
  }, [selectedId]);

  async function submitIntake(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await res.json()) as { error?: string; contact?: Contact };
      if (!res.ok || !body.contact) {
        setError(body.error ?? "Could not create contact.");
        return;
      }
      setSelectedId(body.contact.id);
      setForm({
        full_name: "",
        phone_number: "",
        address: "",
        city: "",
        state: "",
        zip_code: "",
        preferred_language: "English",
        accessibility_needs: "",
        is_deaf_or_hard_of_hearing: false,
        prefers_sms: false,
        prefers_voice: true,
        requires_interpreter: false,
        interpreter_language: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        notes: "",
      });
      await loadContacts();
      await loadLogs(body.contact.id);
    } finally {
      setBusy(false);
    }
  }

  async function action(endpoint: string, payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Action failed.");
        return;
      }
      if (selectedId) await loadLogs(selectedId);
      await loadContacts();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-12">
      <section className="space-y-4 lg:col-span-4">
        <article className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-lg font-extrabold">Contact Search</h2>
          <div className="mt-3 space-y-2">
            <input className="w-full border border-border bg-background px-3 py-2 text-sm" placeholder="Search name/phone/city/address" value={query} onChange={(e) => setQuery(e.target.value)} />
            <input className="w-full border border-border bg-background px-3 py-2 text-sm" placeholder="Language (English/Spanish/Somali)" value={language} onChange={(e) => setLanguage(e.target.value)} />
            <input className="w-full border border-border bg-background px-3 py-2 text-sm" placeholder="Accessibility need filter" value={accessNeed} onChange={(e) => setAccessNeed(e.target.value)} />
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-lg font-extrabold">Contact List</h2>
          <div className="mt-3 max-h-[520px] overflow-auto space-y-2 pr-1">
            {contacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full rounded border p-3 text-left text-sm ${selectedId === c.id ? "border-accent bg-accent/10" : "border-border bg-background"}`}
              >
                <p className="font-semibold">{c.full_name ?? "Unknown contact"}</p>
                <p className="font-mono text-xs">{c.phone_number}</p>
                <p className="text-xs text-foreground/70">{c.preferred_language ?? "Unknown language"} · {c.prefers_sms ? "SMS" : c.prefers_voice ? "Voice" : "No preference"}</p>
                {c.is_deaf_or_hard_of_hearing ? (
                  <p className="mt-1 text-xs text-[var(--state-critical)]">Deaf/hard-of-hearing: SMS recommended</p>
                ) : null}
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="space-y-4 lg:col-span-8">
        <article className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-lg font-extrabold">New Contact Intake Form</h2>
          <form onSubmit={submitIntake} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              ["full_name", "Full name"],
              ["phone_number", "Phone number"],
              ["address", "Address"],
              ["city", "City"],
              ["state", "State"],
              ["zip_code", "Zip"],
              ["preferred_language", "Preferred language"],
              ["accessibility_needs", "Accessibility needs"],
              ["emergency_contact_name", "Emergency contact name"],
              ["emergency_contact_phone", "Emergency contact phone"],
              ["interpreter_language", "Interpreter language (optional)"],
            ].map(([k, label]) => (
              <input
                key={k}
                className="w-full border border-border bg-background px-3 py-2 text-sm"
                placeholder={label}
                value={form[k as keyof typeof form] as string}
                onChange={(e) => setForm((prev) => ({ ...prev, [k]: e.target.value }))}
              />
            ))}
            <textarea className="sm:col-span-2 w-full border border-border bg-background px-3 py-2 text-sm" placeholder="Notes" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.is_deaf_or_hard_of_hearing} onChange={(e) => setForm((prev) => ({ ...prev, is_deaf_or_hard_of_hearing: e.target.checked }))} /> Deaf / hard of hearing</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.requires_interpreter} onChange={(e) => setForm((prev) => ({ ...prev, requires_interpreter: e.target.checked }))} /> Requires interpreter</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.prefers_sms} onChange={(e) => setForm((prev) => ({ ...prev, prefers_sms: e.target.checked }))} /> Prefers SMS</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.prefers_voice} onChange={(e) => setForm((prev) => ({ ...prev, prefers_voice: e.target.checked }))} /> Prefers voice</label>
            <button type="submit" disabled={busy} className="sm:col-span-2 border border-border bg-background px-4 py-2 font-mono text-xs uppercase">{busy ? "Saving..." : "Save contact"}</button>
          </form>
        </article>

        <article className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-lg font-extrabold">Contact Detail Panel</h2>
          {!selected ? (
            <p className="mt-2 text-sm text-muted-foreground">Select a contact to view details and communicate.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="rounded border border-border bg-background p-3 text-sm">
                <p><strong>{selected.full_name ?? "Unknown"}</strong></p>
                <p className="font-mono">{selected.phone_number}</p>
                <p>{selected.address ?? ""} {selected.city ?? ""}, {selected.state ?? ""} {selected.zip_code ?? ""}</p>
                <p>Preferred language: {selected.preferred_language ?? "Unknown"}</p>
                <p>Accessibility needs: {selected.accessibility_needs ?? "None provided"}</p>
                <p>Communication preference: {selected.prefers_sms ? "SMS" : selected.prefers_voice ? "Voice" : "Unspecified"}</p>
                {selected.is_deaf_or_hard_of_hearing ? (
                  <p className="mt-1 rounded border border-[var(--state-critical)]/40 bg-[var(--state-critical)]/10 px-2 py-1 text-xs text-[var(--state-critical)]">
                    SMS or interpreter-assisted communication is recommended for this contact.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="border border-border px-3 py-2 text-xs font-mono uppercase" disabled={busy} onClick={() => void action("/api/twilio/sms/send", { phone_number: selected.phone_number, message: smsBody.trim() || undefined })}>Send SMS (Twilio)</button>
                <button className="border border-border px-3 py-2 text-xs font-mono uppercase" disabled={busy} onClick={() => void action("/api/twilio/call/start", { phone_number: selected.phone_number })}>Start Twilio Voice Call</button>
                <button className="border border-border px-3 py-2 text-xs font-mono uppercase" disabled={busy} onClick={() => void action("/api/vapi/call/start", { phone_number: selected.phone_number })}>Start Vapi AI Call</button>
              </div>
              <textarea className="w-full border border-border bg-background px-3 py-2 text-sm" placeholder="Optional SMS message (blank uses language template)" value={smsBody} onChange={(e) => setSmsBody(e.target.value)} />
              <div className="max-h-[260px] overflow-auto rounded border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-2 py-1 text-left">Time</th>
                      <th className="px-2 py-1 text-left">Channel</th>
                      <th className="px-2 py-1 text-left">Status</th>
                      <th className="px-2 py-1 text-left">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id} className="border-t border-border/60">
                        <td className="px-2 py-1">{new Date(l.created_at).toLocaleString()}</td>
                        <td className="px-2 py-1">{l.channel}</td>
                        <td className="px-2 py-1">{l.status}</td>
                        <td className="px-2 py-1">{l.call_summary ?? l.message_body ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {error ? <p className="mt-2 text-sm text-[var(--state-critical)]">{error}</p> : null}
        </article>
      </section>
    </div>
  );
}
