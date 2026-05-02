import { parseSafetyReply } from "./response-parser";
import { normalizePhoneNumber } from "./phone";
import {
  appendCommunicationLog,
  appendSafetyResponse,
  getDisasterContextForPhone,
} from "./store";
import type { SafetyCheckResponse, SafetyResponseType } from "./types";
import { parseWellnessReply } from "./wellness";
import { WELLNESS_EVENT_ID } from "./wellness-constants";

/**
 * Records an inbound SMS (Twilio webhook or local simulation) and stores structured safety state.
 */
export function recordInboundSms(params: {
  phone_number: string;
  raw_body: string;
  /** Used when no prior outbound context exists for this number. */
  fallback_disaster_event_id?: string;
  fallback_disaster_event_name?: string;
  provider?: string;
  provider_message_id?: string;
}): SafetyCheckResponse {
  const phone = normalizePhoneNumber(params.phone_number);
  const trimmed = params.raw_body.trim();

  const ctx =
    getDisasterContextForPhone(phone) ?? {
      disaster_event_id: params.fallback_disaster_event_id ?? "unattributed",
      disaster_event_name: params.fallback_disaster_event_name ?? "Unknown event",
    };

  let response_type: SafetyResponseType;
  if (ctx.disaster_event_id === WELLNESS_EVENT_ID) {
    const w = parseWellnessReply(trimmed);
    response_type =
      w === "okay" ? "safe" : w === "needs_help" ? "needs_help" : "unknown";
  } else {
    response_type = parseSafetyReply(trimmed);
  }

  appendCommunicationLog({
    channel: "sms",
    direction: "inbound",
    phone_number: phone,
    body: trimmed,
    disaster_event_id: ctx.disaster_event_id,
    disaster_event_name: ctx.disaster_event_name,
    delivery_status: "delivered",
    response_type,
    provider: params.provider ?? "inbound",
    provider_message_id: params.provider_message_id,
  });

  return appendSafetyResponse({
    phone_number: phone,
    response_type,
    disaster_event_id: ctx.disaster_event_id,
    disaster_event_name: ctx.disaster_event_name,
    raw_message: trimmed,
  });
}
