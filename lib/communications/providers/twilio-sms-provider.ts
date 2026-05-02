import twilio from "twilio";
import type { DeliveryStatus } from "../types";
import type { SmsProvider, SmsSendResult } from "./sms-provider";

function mapTwilioStatus(status?: string): DeliveryStatus {
  const s = (status ?? "").toLowerCase();
  if (s === "queued" || s === "accepted") return "queued";
  if (s === "sending" || s === "sent") return "sent";
  if (s === "delivered") return "delivered";
  if (s === "failed" || s === "undelivered") return "failed";
  return "unknown";
}

function twilioErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const o = err as { message?: string; code?: number; moreInfo?: string };
    if (typeof o.message === "string") {
      const code = typeof o.code === "number" ? ` (${o.code})` : "";
      return `${o.message}${code}`;
    }
  }
  return err instanceof Error ? err.message : "Twilio SMS error";
}

/**
 * Live SMS via Twilio — equivalent to:
 * POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
 * with To, From, Body (application/x-www-form-urlencoded) and Basic auth.
 *
 * Env (no secrets in repo):
 * — TWILIO_ACCOUNT_SID
 * — TWILIO_AUTH_TOKEN
 * — TWILIO_PHONE_NUMBER = your Twilio “From” number in E.164 (must match a number on this account)
 */
export function createTwilioSmsProviderFromEnv(): SmsProvider | null {
  // Bracket keys so Next doesn’t replace these with compile-time `undefined` when `.env` loads late.
  const accountSid = process.env["TWILIO_ACCOUNT_SID"]?.trim();
  const authToken = process.env["TWILIO_AUTH_TOKEN"]?.trim();
  const from = process.env["TWILIO_PHONE_NUMBER"]?.trim();

  if (!accountSid || !authToken || !from) {
    return null;
  }

  const client = twilio(accountSid, authToken);

  return {
    name: "twilio",
    async sendSms({ to, body }): Promise<SmsSendResult> {
      try {
        const msg = await client.messages.create({
          from,
          to,
          body,
        });
        return {
          provider_message_id: msg.sid,
          delivery_status: mapTwilioStatus(msg.status),
        };
      } catch (e) {
        return {
          delivery_status: "failed",
          error: twilioErrorMessage(e),
        };
      }
    },
  };
}
