import { normalizePhoneNumber } from "./phone";
import { attachOutboundDisasterContext } from "./store";
import { send_message } from "./send-message";
import {
  WELLNESS_EVENT_ID,
  WELLNESS_EVENT_NAME,
} from "./wellness-constants";
import type { SendMessageResult } from "./types";

export function buildWellnessCheckBody(): string {
  return `Are you okay? Reply YES if you need help, or NO if you don't need help.`;
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
