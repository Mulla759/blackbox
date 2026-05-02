import { normalizePhoneNumber } from "@/lib/communications/phone";
import type { RegisteredContact } from "./types";

type RegistryRoot = {
  contacts: RegisteredContact[];
};

const KEY = "__BLACKBOX_CONTACT_REGISTRY__";

function root(): RegistryRoot {
  const g = globalThis as unknown as Record<string, RegistryRoot | undefined>;
  if (!g[KEY]) g[KEY] = { contacts: [] };
  return g[KEY]!;
}

const MAX_CONTACTS = 5000;

export function listRegisteredContacts(): RegisteredContact[] {
  return [...root().contacts];
}

export function addRegisteredContact(entry: {
  phone_number: string;
  label?: string;
  location: string;
}): RegisteredContact {
  const phone_number = normalizePhoneNumber(entry.phone_number);
  const location = entry.location.trim() || "Unknown";
  const label = entry.label?.trim() || undefined;
  const row: RegisteredContact = {
    id: crypto.randomUUID(),
    phone_number,
    label,
    location,
  };
  const state = root();
  state.contacts.unshift(row);
  if (state.contacts.length > MAX_CONTACTS) state.contacts.length = MAX_CONTACTS;
  return row;
}

export function removeRegisteredContact(id: string): boolean {
  const state = root();
  const i = state.contacts.findIndex((c) => c.id === id);
  if (i === -1) return false;
  state.contacts.splice(i, 1);
  return true;
}

function tokenizeLocationText(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[,;\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/** Phones for contacts whose `location` contains any ≥2-char token from `query`. */
export function phonesMatchingLocationQuery(query: string): string[] {
  const qTokens = tokenizeLocationText(query);
  if (qTokens.length === 0) return [];

  const out = new Set<string>();
  for (const c of root().contacts) {
    const loc = c.location.toLowerCase();
    if (qTokens.some((t) => loc.includes(t))) {
      out.add(normalizePhoneNumber(c.phone_number));
    }
  }
  return [...out];
}

export function allRegisteredPhones(): string[] {
  const s = new Set<string>();
  for (const c of root().contacts) s.add(normalizePhoneNumber(c.phone_number));
  return [...s];
}
