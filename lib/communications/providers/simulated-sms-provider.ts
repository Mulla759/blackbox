import type { SmsProvider, SmsSendResult } from "./sms-provider";

export function createSimulatedSmsProvider(): SmsProvider {
  return {
    name: "simulated",
    async sendSms(): Promise<SmsSendResult> {
      await new Promise((r) => setTimeout(r, 12));
      return {
        delivery_status: "delivered",
        provider_message_id: `sim_${crypto.randomUUID()}`,
      };
    },
  };
}
