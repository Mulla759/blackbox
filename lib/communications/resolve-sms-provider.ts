import { createSimulatedSmsProvider } from "./providers/simulated-sms-provider";
import { createTwilioSmsProviderFromEnv } from "./providers/twilio-sms-provider";
import type { SmsProvider } from "./providers/sms-provider";

/**
 * Prefer Twilio when all env vars are present; otherwise simulated (no external IO).
 */
export function getSmsProvider(): SmsProvider {
  return createTwilioSmsProviderFromEnv() ?? createSimulatedSmsProvider();
}
