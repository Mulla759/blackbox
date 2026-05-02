import { normalizePhoneNumber } from "./phone";
import { getSmsProvider } from "./resolve-sms-provider";
import { appendCommunicationLog } from "./store";
import type { SendMessageResult } from "./types";

/**
 * Sends one SMS via the configured provider (Twilio when env is complete, otherwise simulated).
 */
export async function send_message(
  phone_number: string,
  message: string
): Promise<SendMessageResult> {
  const to = normalizePhoneNumber(phone_number);
  const provider = getSmsProvider();
  const outcome = await provider.sendSms({ to, body: message });

  const log = appendCommunicationLog({
    channel: "sms",
    direction: "outbound",
    phone_number: to,
    body: message,
    delivery_status: outcome.delivery_status,
    provider: provider.name,
    provider_message_id: outcome.provider_message_id,
    error: outcome.error,
  });

  return {
    log_id: log.id,
    delivery_status: outcome.delivery_status,
    provider_message_id: outcome.provider_message_id,
    error: outcome.error,
    provider: provider.name,
  };
}
