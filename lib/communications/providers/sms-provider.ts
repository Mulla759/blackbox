import type { DeliveryStatus } from "../types";

export type SmsSendResult = {
  provider_message_id?: string;
  delivery_status: DeliveryStatus;
  error?: string;
};

export interface SmsProvider {
  readonly name: string;
  sendSms(params: { to: string; body: string }): Promise<SmsSendResult>;
}
