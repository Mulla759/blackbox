import { normalizePhoneNumber } from "@/lib/communications/phone";
import { seededPhoneForSlot } from "./demo-phones";
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

/**
 * ── Demo profile location ──
 * All four profiles sit inside the Lake County, MN NWS alert zone
 * (near Ely, MN on the South Kawishiwi River).  The dashboard already
 * pulls live alerts from api.weather.gov — these pins just need to
 * fall inside whatever polygon the NWS is currently broadcasting.
 *
 * Coordinates: 47.9032 N, -91.8671 W — Ely, Lake County, MN
 */
const DEMO_LAT = 47.9032;
const DEMO_LNG = -91.8671;
const DEMO_LOCATION = "Ely, Lake County, MN";

function seededProfiles(): RegisteredContact[] {
  return [
    {
      id: "demo-oxygen-elder",
      phone_number: seededPhoneForSlot(0, "+16125179429", "BLACKBOX_DEMO_PROFILE_1_PHONE"),
      label: "Johnathan - oxygen dependent elder",
      location: DEMO_LOCATION,
      latitude: DEMO_LAT,
      longitude: DEMO_LNG,
      age: 78,
      disability: "COPD; oxygen concentrator; needs power for breathing support",
      preferred_language: "English",
      emergency_contact_phone: "+16124331186",
      communication_preferences: { modality: "both", cadence: "slow" },
      avatar_url: "/demo-profiles/demo-oxygen-elder.svg",
      demo_lane: "kickoff",
      demo_presenter_cue:
        "Kickoff lead (Johnathan): you get the disaster SMS first, then this voice call. Press 1 (need help) to drive a full TRIBE escalation on the live dashboard.",
    },
    {
      id: "demo-asl-deaf",
      phone_number: seededPhoneForSlot(1, "+16513520203", "BLACKBOX_DEMO_PROFILE_2_PHONE"),
      label: "Keith - Deaf ASL signer",
      location: DEMO_LOCATION,
      latitude: DEMO_LAT,
      longitude: DEMO_LNG,
      age: 42,
      disability: "deaf; uses ASL; cannot receive sirens or voice-only alerts",
      preferred_language: "English",
      emergency_contact_phone: "+16124331186",
      communication_preferences: { modality: "asl_video", cadence: "slow" },
      avatar_url: "/demo-profiles/demo-asl-deaf.svg",
      demo_lane: "live_clear",
      demo_presenter_cue:
        "Keith is Deaf — NEVER voice-call this profile. TRIBE sends SMS instructions automatically. Dispatcher can initiate a live ASL video call for escalation.",
    },
    {
      id: "demo-spanish-wheelchair",
      phone_number: seededPhoneForSlot(2, "+16124331186", "BLACKBOX_DEMO_PROFILE_3_PHONE"),
      label: "Maria - Spanish wheelchair user",
      location: DEMO_LOCATION,
      latitude: DEMO_LAT,
      longitude: DEMO_LNG,
      age: 55,
      disability: "wheelchair user; elevator dependent; limited evacuation access",
      preferred_language: "Spanish",
      emergency_contact_phone: "+16124331186",
      communication_preferences: { modality: "both", cadence: "standard" },
      avatar_url: "/demo-profiles/demo-spanish-wheelchair.svg",
      demo_lane: "live_clear",
      demo_presenter_cue:
        "Maria (Spanish): Spanish prompt if your number matches this profile — press 2 (okay).",
    },
    {
      id: "demo-dialysis-insulin",
      phone_number: seededPhoneForSlot(3, "+16123936826", "BLACKBOX_DEMO_PROFILE_4_PHONE"),
      label: "Terry - medication and dialysis risk",
      location: DEMO_LOCATION,
      latitude: DEMO_LAT,
      longitude: DEMO_LNG,
      age: 63,
      disability: "dialysis schedule; insulin refrigerated; critical medication access",
      preferred_language: "English",
      emergency_contact_phone: "+16124331186",
      communication_preferences: { modality: "sms", cadence: "urgent" },
      avatar_url: "/demo-profiles/demo-dialysis-insulin.svg",
      demo_lane: "follow_up",
      demo_presenter_cue:
        "Terry: press 1 (need help) so TRIBE keeps this case in an elevated / watch band for dispatcher follow-up.",
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
