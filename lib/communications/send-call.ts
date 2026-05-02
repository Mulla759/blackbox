import twilio from "twilio";
import { getPublicAppBaseUrl } from "./public-app-url";
import { normalizePhoneNumber } from "./phone";
import { appendCommunicationLog } from "./store";
import type { SendMessageResult } from "./types";

function twilioErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const o = err as { message?: string; code?: number };
    if (typeof o.message === "string") {
      const code = typeof o.code === "number" ? ` (${o.code})` : "";
      return `${o.message}${code}`;
    }
  }
  return err instanceof Error ? err.message : "Twilio Voice error";
}

/**
 * Places an outbound Twilio voice call.
 * Requires:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_VOICE_FROM_NUMBER or TWILIO_PHONE_NUMBER
 * - PUBLIC_APP_URL (or defaults to production URL)
 */
export async function send_call(
  phone_number: string,
  message: string,
  options?: {
    disaster_event_id?: string;
    disaster_event_name?: string;
  }
): Promise<SendMessageResult> {
  const to = normalizePhoneNumber(phone_number);
  const accountSid = process.env["TWILIO_ACCOUNT_SID"]?.trim();
  const authToken = process.env["TWILIO_AUTH_TOKEN"]?.trim();
  const from =
    process.env["TWILIO_VOICE_FROM_NUMBER"]?.trim() ??
    process.env["TWILIO_PHONE_NUMBER"]?.trim();
  const base = getPublicAppBaseUrl();

  if (!accountSid || !authToken || !from) {
    const log = appendCommunicationLog({
      channel: "voice",
      direction: "outbound",
      phone_number: to,
      body: message,
      delivery_status: "failed",
      provider: "voice_placeholder",
      error:
        "Voice disabled: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VOICE_FROM_NUMBER (or TWILIO_PHONE_NUMBER).",
      disaster_event_id: options?.disaster_event_id,
      disaster_event_name: options?.disaster_event_name,
    });
    return {
      log_id: log.id,
      delivery_status: "failed",
      provider: "voice_placeholder",
      error: log.error,
    };
  }

  const client = twilio(accountSid, authToken);
  const twimlUrl = new URL("/api/communications/voice/wellness", base);
  twimlUrl.searchParams.set("phone", to);
  twimlUrl.searchParams.set("prompt", message);
  if (options?.disaster_event_id) {
    twimlUrl.searchParams.set("event_id", options.disaster_event_id);
  }
  if (options?.disaster_event_name) {
    twimlUrl.searchParams.set("event_name", options.disaster_event_name);
  }

  const statusUrl = new URL("/api/communications/voice/status", base);
  statusUrl.searchParams.set("phone", to);

  try {
    const call = await client.calls.create({
      from,
      to,
      url: twimlUrl.toString(),
      method: "POST",
      statusCallback: statusUrl.toString(),
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    });

    const log = appendCommunicationLog({
      channel: "voice",
      direction: "outbound",
      phone_number: to,
      body: message,
      delivery_status: "queued",
      provider: "twilio_voice",
      provider_message_id: call.sid,
      disaster_event_id: options?.disaster_event_id,
      disaster_event_name: options?.disaster_event_name,
    });

    return {
      log_id: log.id,
      delivery_status: "queued",
      provider: "twilio_voice",
      provider_message_id: call.sid,
    };
  } catch (err) {
    const error = twilioErrorMessage(err);
    const log = appendCommunicationLog({
      channel: "voice",
      direction: "outbound",
      phone_number: to,
      body: message,
      delivery_status: "failed",
      provider: "twilio_voice",
      error,
      disaster_event_id: options?.disaster_event_id,
      disaster_event_name: options?.disaster_event_name,
    });
    return {
      log_id: log.id,
      delivery_status: "failed",
      provider: "twilio_voice",
      error,
      provider_message_id: log.provider_message_id,
    };
  }
}
