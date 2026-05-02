import type { ContactRecord } from "./types";

export function recommendCommunicationChannel(contact: ContactRecord): {
  recommended: "TWILIO_SMS" | "TWILIO_VOICE" | "VAPI_VOICE";
  reason: string;
  warning?: string;
} {
  const language = (contact.preferred_language ?? "English").toLowerCase();
  const vapiSupported = language.includes("english") || language.includes("spanish") || language.includes("somali");

  if (contact.is_deaf_or_hard_of_hearing) {
    return {
      recommended: "TWILIO_SMS",
      reason: "Contact is marked deaf/hard-of-hearing",
      warning: "This contact is marked deaf/hard of hearing. SMS is recommended.",
    };
  }
  if (contact.prefers_sms) {
    return { recommended: "TWILIO_SMS", reason: "Contact prefers SMS" };
  }
  if (contact.prefers_voice && vapiSupported) {
    return { recommended: "VAPI_VOICE", reason: "Voice preferred and language supported by Vapi" };
  }
  return { recommended: "TWILIO_VOICE", reason: "Defaulting to Twilio voice fallback" };
}
