import { normalizePhoneNumber } from "./phone";
import { appendCommunicationLog } from "./store";
import type { SendMessageResult } from "./types";

/**
 * Placeholder for outbound voice. Swap body for Twilio Voice once credentials and
 * public TwiML URLs are configured (see comments below).
 */
export async function send_call(
  phone_number: string,
  message: string
): Promise<SendMessageResult> {
  const to = normalizePhoneNumber(phone_number);

  // ─── Future Twilio Voice wiring (do not hardcode secrets — use env vars) ───
  // const accountSid = process.env.TWILIO_ACCOUNT_SID;
  // const authToken = process.env.TWILIO_AUTH_TOKEN;
  // const from = process.env.TWILIO_VOICE_FROM_NUMBER ?? process.env.TWILIO_PHONE_NUMBER;
  // const client = twilio(accountSid, authToken);
  // await client.calls.create({
  //   from,
  //   to,
  //   url: `${process.env.PUBLIC_APP_URL}/api/communications/voice/outbound-twiml`,
  // });
  // TwiML route would call `<Say voice="Polly.Joanna">${escape(message)}</Say>` or stream audio.
  // For inbound, configure the Twilio number’s Voice webhook → `/api/communications/voice/inbound`.
  // ─────────────────────────────────────────────────────────────────────────────

  const log = appendCommunicationLog({
    channel: "voice",
    direction: "outbound",
    phone_number: to,
    body: message,
    delivery_status: "unknown",
    provider: "voice_placeholder",
  });

  return {
    log_id: log.id,
    delivery_status: "unknown",
    provider: "voice_placeholder",
  };
}
