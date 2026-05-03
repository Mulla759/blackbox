import { randomUUID } from "node:crypto";
import { getDispatchDb } from "./db";
import type {
  Channel,
  CommunicationLogRecord,
  ContactRecord,
  Direction,
  ResponderRecord,
} from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function normPhone(input: string): string {
  const d = input.replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  if (input.trim().startsWith("+")) return `+${d}`;
  return `+${d}`;
}

export async function findContactByPhone(phone_number: string) {
  const db = await getDispatchDb();
  return db.get<ContactRecord>(
    "SELECT * FROM contacts WHERE phone_number = ?",
    normPhone(phone_number)
  );
}

export async function findOrCreateContact(phone_number: string) {
  const normalized = normPhone(phone_number);
  if (!normalized) throw new Error("phone_number required");
  const existing = await findContactByPhone(normalized);
  if (existing) return { contact: existing, needsIntake: existing.profile_complete === 0 };

  const db = await getDispatchDb();
  const now = nowIso();
  const row: ContactRecord = {
    id: randomUUID(),
    full_name: null,
    phone_number: normalized,
    address: null,
    city: null,
    state: null,
    zip_code: null,
    preferred_language: null,
    accessibility_needs: null,
    is_deaf_or_hard_of_hearing: 0,
    requires_interpreter: 0,
    interpreter_language: null,
    prefers_sms: 0,
    prefers_voice: 1,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    notes: null,
    opted_out_sms: 0,
    profile_complete: 0,
    created_at: now,
    updated_at: now,
  };
  await db.run(
    `INSERT INTO contacts (
      id, full_name, phone_number, address, city, state, zip_code, preferred_language,
      accessibility_needs, is_deaf_or_hard_of_hearing, requires_interpreter, interpreter_language,
      prefers_sms, prefers_voice, emergency_contact_name, emergency_contact_phone, notes,
      opted_out_sms, profile_complete, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    row.id,
    row.full_name,
    row.phone_number,
    row.address,
    row.city,
    row.state,
    row.zip_code,
    row.preferred_language,
    row.accessibility_needs,
    row.is_deaf_or_hard_of_hearing,
    row.requires_interpreter,
    row.interpreter_language,
    row.prefers_sms,
    row.prefers_voice,
    row.emergency_contact_name,
    row.emergency_contact_phone,
    row.notes,
    row.opted_out_sms,
    row.profile_complete,
    row.created_at,
    row.updated_at
  );
  return { contact: row, needsIntake: true };
}

export async function createContact(input: Partial<ContactRecord> & { phone_number: string }) {
  const db = await getDispatchDb();
  const now = nowIso();
  const id = input.id ?? randomUUID();
  const phone = normPhone(input.phone_number);
  await db.run(
    `INSERT INTO contacts (
      id, full_name, phone_number, address, city, state, zip_code, preferred_language,
      accessibility_needs, is_deaf_or_hard_of_hearing, requires_interpreter, interpreter_language,
      prefers_sms, prefers_voice, emergency_contact_name, emergency_contact_phone, notes,
      opted_out_sms, profile_complete, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id,
    input.full_name ?? null,
    phone,
    input.address ?? null,
    input.city ?? null,
    input.state ?? null,
    input.zip_code ?? null,
    input.preferred_language ?? null,
    input.accessibility_needs ?? null,
    input.is_deaf_or_hard_of_hearing ? 1 : 0,
    input.requires_interpreter ? 1 : 0,
    input.interpreter_language ?? null,
    input.prefers_sms ? 1 : 0,
    input.prefers_voice === undefined ? 1 : input.prefers_voice ? 1 : 0,
    input.emergency_contact_name ?? null,
    input.emergency_contact_phone ? normPhone(input.emergency_contact_phone) : null,
    input.notes ?? null,
    input.opted_out_sms ? 1 : 0,
    input.profile_complete === undefined ? 1 : input.profile_complete ? 1 : 0,
    now,
    now
  );
  return db.get<ContactRecord>("SELECT * FROM contacts WHERE id = ?", id);
}

export async function updateContact(id: string, input: Partial<ContactRecord>) {
  const db = await getDispatchDb();
  const existing = await db.get<ContactRecord>("SELECT * FROM contacts WHERE id = ?", id);
  if (!existing) return null;
  const merged: ContactRecord = {
    ...existing,
    ...input,
    phone_number: input.phone_number ? normPhone(input.phone_number) : existing.phone_number,
    emergency_contact_phone: input.emergency_contact_phone
      ? normPhone(input.emergency_contact_phone)
      : existing.emergency_contact_phone,
    updated_at: nowIso(),
  };
  await db.run(
    `UPDATE contacts SET
      full_name=?, phone_number=?, address=?, city=?, state=?, zip_code=?, preferred_language=?,
      accessibility_needs=?, is_deaf_or_hard_of_hearing=?, requires_interpreter=?, interpreter_language=?,
      prefers_sms=?, prefers_voice=?, emergency_contact_name=?, emergency_contact_phone=?, notes=?,
      opted_out_sms=?, profile_complete=?, updated_at=?
      WHERE id=?`,
    merged.full_name,
    merged.phone_number,
    merged.address,
    merged.city,
    merged.state,
    merged.zip_code,
    merged.preferred_language,
    merged.accessibility_needs,
    merged.is_deaf_or_hard_of_hearing,
    merged.requires_interpreter,
    merged.interpreter_language,
    merged.prefers_sms,
    merged.prefers_voice,
    merged.emergency_contact_name,
    merged.emergency_contact_phone,
    merged.notes,
    merged.opted_out_sms,
    merged.profile_complete,
    merged.updated_at,
    id
  );
  return db.get<ContactRecord>("SELECT * FROM contacts WHERE id = ?", id);
}

export async function getContactById(id: string) {
  const db = await getDispatchDb();
  return db.get<ContactRecord>("SELECT * FROM contacts WHERE id = ?", id);
}

export async function listContacts() {
  const db = await getDispatchDb();
  return db.all<ContactRecord[]>("SELECT * FROM contacts ORDER BY updated_at DESC");
}

export async function searchContacts(params: {
  query?: string;
  language?: string;
  accessibility_need?: string;
  phone_number?: string;
}) {
  const db = await getDispatchDb();
  const where: string[] = [];
  const values: string[] = [];

  if (params.phone_number) {
    where.push("phone_number = ?");
    values.push(normPhone(params.phone_number));
  }
  if (params.language) {
    where.push("LOWER(preferred_language) = LOWER(?)");
    values.push(params.language);
  }
  if (params.accessibility_need) {
    where.push("LOWER(accessibility_needs) LIKE LOWER(?)");
    values.push(`%${params.accessibility_need}%`);
  }
  if (params.query) {
    where.push(
      "(LOWER(full_name) LIKE LOWER(?) OR LOWER(phone_number) LIKE LOWER(?) OR LOWER(city) LIKE LOWER(?) OR LOWER(address) LIKE LOWER(?))"
    );
    values.push(`%${params.query}%`, `%${params.query}%`, `%${params.query}%`, `%${params.query}%`);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return db.all<ContactRecord[]>(`SELECT * FROM contacts ${clause} ORDER BY updated_at DESC`, ...values);
}

export async function logCommunication(entry: {
  contact_id?: string | null;
  phone_number: string;
  direction: Direction;
  channel: Channel;
  status: string;
  message_body?: string | null;
  call_summary?: string | null;
  language_used?: string | null;
}) {
  const db = await getDispatchDb();
  const row: CommunicationLogRecord = {
    id: randomUUID(),
    contact_id: entry.contact_id ?? null,
    phone_number: normPhone(entry.phone_number),
    direction: entry.direction,
    channel: entry.channel,
    status: entry.status,
    message_body: entry.message_body ?? null,
    call_summary: entry.call_summary ?? null,
    language_used: entry.language_used ?? null,
    created_at: nowIso(),
  };
  await db.run(
    `INSERT INTO communication_logs (
      id, contact_id, phone_number, direction, channel, status, message_body, call_summary, language_used, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.contact_id,
    row.phone_number,
    row.direction,
    row.channel,
    row.status,
    row.message_body,
    row.call_summary,
    row.language_used,
    row.created_at
  );
  return row;
}

export async function logsForContact(contactId: string) {
  const db = await getDispatchDb();
  return db.all<CommunicationLogRecord[]>(
    "SELECT * FROM communication_logs WHERE contact_id = ? ORDER BY created_at DESC",
    contactId
  );
}

export async function recentLogs(limit = 120) {
  const db = await getDispatchDb();
  return db.all<CommunicationLogRecord[]>(
    "SELECT * FROM communication_logs ORDER BY created_at DESC LIMIT ?",
    limit
  );
}

export async function listResponders() {
  const db = await getDispatchDb();
  return db.all<ResponderRecord[]>("SELECT * FROM responders ORDER BY created_at DESC");
}

export async function dispatcherSettings() {
  const db = await getDispatchDb();
  return db.get<{
    id: string;
    dispatcher_name: string;
    dispatcher_phone_number: string;
    default_language: string;
  }>("SELECT * FROM dispatcher_settings WHERE id = 'default'");
}
