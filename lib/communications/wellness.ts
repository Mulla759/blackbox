import { normalizePhoneNumber } from "./phone";
import { getProfileByPhone } from "@/lib/registry/store";
import { attachOutboundDisasterContext } from "./store";
import { send_call } from "./send-call";
import { send_message } from "./send-message";
import {
  WELLNESS_EVENT_ID,
  WELLNESS_EVENT_NAME,
} from "./wellness-constants";
import type { SendMessageResult } from "./types";

export function buildWellnessCheckBody(): string {
  return `Are you okay? Reply YES if you need help, or NO if you don't need help.`;
}

export function buildWellnessCallPrompt(): string {
  return "Hello, this is Blackbox emergency check-in. Press 1 if you need help now, press 2 if you are okay, or press 3 for emergency.";
}

/** Voice script keyed off registry profile (e.g. Spanish vs English). */
export function buildVoicePromptForProfile(phone_number: string): string {
  const p = getProfileByPhone(normalizePhoneNumber(phone_number));
  const lang = (p?.preferred_language ?? "").toLowerCase();
  if (lang.includes("spanish")) {
    return "Hola, le llamamos de Blackbox por la emergencia en Rock County. Use el teclado: oprima 1 si necesita ayuda ahora, 2 si está bien, u 3 para emergencia.";
  }
  return buildWellnessCallPrompt();
}

/**
 * YES → needs help. NO → okay (don't need help).
 */
export function parseWellnessReply(raw: string): "needs_help" | "okay" | "unknown" {
  const t = raw.trim().toLowerCase();
  if (!t) return "unknown";
  const first = t.split(/[\s,.;:!?]+/)[0] ?? "";
  if (first === "yes" || first === "y") return "needs_help";
  if (first === "no" || first === "n") return "okay";
  return "unknown";
}

export async function sendWellnessCheckSms(
  phone_number: string
): Promise<SendMessageResult> {
  const to = normalizePhoneNumber(phone_number);
  const body = buildWellnessCheckBody();
  const outcome = await send_message(to, body);

  if (outcome.delivery_status !== "failed" && !outcome.error) {
    attachOutboundDisasterContext(to, WELLNESS_EVENT_ID, WELLNESS_EVENT_NAME);
  }

  return outcome;
}

export async function sendWellnessCheckCall(
  phone_number: string
): Promise<SendMessageResult> {
  const to = normalizePhoneNumber(phone_number);
  const outcome = await send_call(to, buildVoicePromptForProfile(to), {
    disaster_event_id: WELLNESS_EVENT_ID,
    disaster_event_name: WELLNESS_EVENT_NAME,
  });

  if (outcome.delivery_status !== "failed" && !outcome.error) {
    attachOutboundDisasterContext(to, WELLNESS_EVENT_ID, WELLNESS_EVENT_NAME);
  }

  return outcome;
}
