import { normalizePhoneNumber } from "@/lib/communications/phone";
import type { PersonProfile, RegisteredContact } from "./types";

type RegistryRoot = {
  contacts: RegisteredContact[];
};

const KEY = "__BLACKBOX_CONTACT_REGISTRY__";

function root(): RegistryRoot {
  const g = globalThis as unknown as Record<string, RegistryRoot | undefined>;
  if (!g[KEY]) g[KEY] = { contacts: seededProfiles() };
  return g[KEY]!;
}

const MAX_CONTACTS = 5000;

function seededProfiles(): RegisteredContact[] {
  return [
    {
      id: "demo-oxygen-elder",
      phone_number: normalizePhoneNumber(process.env["BLACKBOX_DEMO_PROFILE_1_PHONE"] ?? "+15550100001"),
      label: "Demo 1 - oxygen dependent elder",
      location: "Janesville, WI",
      latitude: 42.6828,
      longitude: -89.0187,
      age: 78,
      disability: "COPD; oxygen concentrator; needs power for breathing support",
      preferred_language: "English",
      emergency_contact_phone: "+16124331186",
      communication_preferences: { modality: "both", cadence: "slow" },
    },
    {
      id: "demo-asl-deaf",
      phone_number: normalizePhoneNumber(process.env["BLACKBOX_DEMO_PROFILE_2_PHONE"] ?? "+15550100002"),
      label: "Demo 2 - Deaf ASL signer",
      location: "Beloit, WI",
      latitude: 42.5083,
      longitude: -89.0318,
      age: 42,
      disability: "deaf; uses ASL; cannot receive sirens or voice-only alerts",
      preferred_language: "English",
      emergency_contact_phone: "+16124331186",
      communication_preferences: { modality: "asl_video", cadence: "slow" },
    },
    {
      id: "demo-spanish-wheelchair",
      phone_number: normalizePhoneNumber(process.env["BLACKBOX_DEMO_PROFILE_3_PHONE"] ?? "+15550100003"),
      label: "Demo 3 - Spanish wheelchair user",
      location: "Janesville, WI",
      latitude: 42.7112,
      longitude: -89.0563,
      age: 55,
      disability: "wheelchair user; elevator dependent; limited evacuation access",
      preferred_language: "Spanish",
      emergency_contact_phone: "+16124331186",
      communication_preferences: { modality: "both", cadence: "standard" },
    },
    {
      id: "demo-dialysis-insulin",
      phone_number: normalizePhoneNumber(process.env["BLACKBOX_DEMO_PROFILE_4_PHONE"] ?? "+15550100004"),
      label: "Demo 4 - medication and dialysis risk",
      location: "Rock County, WI",
      latitude: 42.7341,
      longitude: -89.227,
      age: 63,
      disability: "dialysis schedule; insulin refrigerated; critical medication access",
      preferred_language: "English",
      emergency_contact_phone: "+16124331186",
      communication_preferences: { modality: "sms", cadence: "urgent" },
    },
  ];
}

export function listRegisteredContacts(): RegisteredContact[] {
  return [...root().contacts];
}

export function getProfileByPhone(phone_number: string): PersonProfile | undefined {
  const phone = normalizePhoneNumber(phone_number);
  return root().contacts.find((c) => normalizePhoneNumber(c.phone_number) === phone);
}

export function getProfileById(id: string): PersonProfile | undefined {
  return root().contacts.find((c) => c.id === id);
}

export function listProfiles(): PersonProfile[] {
  return listRegisteredContacts();
}

export function addRegisteredContact(entry: {
  phone_number: string;
  label?: string;
  location: string;
  age?: number;
  disability?: string;
  preferred_language?: string;
  emergency_contact_phone?: string;
  latitude?: number;
  longitude?: number;
  communication_preferences?: RegisteredContact["communication_preferences"];
}): RegisteredContact {
  const phone_number = normalizePhoneNumber(entry.phone_number);
  const location = entry.location.trim() || "Unknown";
  const label = entry.label?.trim() || undefined;
  const disability = entry.disability?.trim() || undefined;
  const preferred_language = entry.preferred_language?.trim() || undefined;
  const emergency_contact_phone = entry.emergency_contact_phone
    ? normalizePhoneNumber(entry.emergency_contact_phone)
    : undefined;
  const row: RegisteredContact = {
    id: crypto.randomUUID(),
    phone_number,
    label,
    location,
    ...(typeof entry.age === "number" && Number.isFinite(entry.age) ? { age: entry.age } : {}),
    ...(disability ? { disability } : {}),
    ...(preferred_language ? { preferred_language } : {}),
    ...(emergency_contact_phone ? { emergency_contact_phone } : {}),
    ...(typeof entry.latitude === "number" ? { latitude: entry.latitude } : {}),
    ...(typeof entry.longitude === "number" ? { longitude: entry.longitude } : {}),
    ...(entry.communication_preferences ? { communication_preferences: entry.communication_preferences } : {}),
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
