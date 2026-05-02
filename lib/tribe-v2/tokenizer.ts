import type { TribeTokenState } from "./types";

const DISTRESS = [
  "panic",
  "scared",
  "afraid",
  "trapped",
  "can't breathe",
  "cannot breathe",
  "short of breath",
  "dizzy",
  "faint",
  "confused",
  "alone",
  "fall",
  "fell",
  "hurt",
];

const INFRASTRUCTURE = [
  "power",
  "electric",
  "outage",
  "generator",
  "battery",
  "oxygen",
  "concentrator",
  "elevator",
  "water",
  "heat",
  "insulin",
  "refrigerator",
  "dialysis",
  "transport",
];

const MEDICAL = [
  "oxygen",
  "insulin",
  "dialysis",
  "medication",
  "medicine",
  "breathing",
  "chest pain",
  "blood sugar",
  "ventilator",
  "cpap",
];

const COMMUNICATION = [
  "deaf",
  "asl",
  "interpreter",
  "can't hear",
  "cannot hear",
  "text me",
  "spanish",
  "espanol",
  "somali",
  "hmong",
];

const LOCATION = [
  "home",
  "apartment",
  "building",
  "street",
  "shelter",
  "basement",
  "upstairs",
  "address",
  "jane",
  "janesville",
  "beloit",
  "rock county",
];

function matches(text: string, terms: string[]): string[] {
  return terms.filter((term) => text.includes(term));
}

export function tokenizeSignal(text: string): TribeTokenState {
  const normalized = text.toLowerCase();
  const compact = normalized.replace(/\s+/g, " ").trim();
  const no_response = compact.length === 0 || compact === "(no input)" || compact.includes("no input");
  const explicit_emergency =
    compact.includes("emergency") ||
    compact.includes("911") ||
    compact.includes("life") ||
    compact.includes("dying") ||
    compact.includes("can't breathe") ||
    compact.includes("cannot breathe");
  const help_requested =
    compact.includes("need help") ||
    compact.includes("help me") ||
    compact.includes("send help") ||
    compact.includes("press 1") ||
    compact.includes("needs_help");
  const all_clear =
    compact.includes("safe") ||
    compact.includes("okay") ||
    compact.includes("ok") ||
    compact.includes("i'm fine") ||
    compact.includes("im fine");

  let cadence: TribeTokenState["cadence"] = "unknown";
  if (no_response) cadence = "silent";
  else if (explicit_emergency || matches(compact, DISTRESS).length >= 2) cadence = "distressed";
  else if (compact.split(" ").length <= 4 && /[.!?]?$/.test(compact)) cadence = "fragmented";
  else if (all_clear) cadence = "calm";

  return {
    distress_terms: matches(compact, DISTRESS),
    infrastructure_terms: matches(compact, INFRASTRUCTURE),
    medical_terms: matches(compact, MEDICAL),
    location_terms: matches(compact, LOCATION),
    communication_terms: matches(compact, COMMUNICATION),
    explicit_emergency,
    no_response,
    help_requested,
    all_clear,
    cadence,
  };
}

