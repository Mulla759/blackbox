import twilio from "twilio";
import { appendCommunicationLog, appendSafetyResponse } from "@/lib/communications/store";
import { normalizePhoneNumber } from "@/lib/communications/phone";
import { parseWellnessReply } from "@/lib/communications/wellness";

export const dynamic = "force-dynamic";

function xmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const phone = normalizePhoneNumber(url.searchParams.get("phone") ?? "");
  const eventId = url.searchParams.get("event_id") ?? "wellness-check";
  const eventName = url.searchParams.get("event_name") ?? "Wellness check";

  const form = await req.formData();
  const digits = typeof form.get("Digits") === "string" ? String(form.get("Digits")) : "";
  const speech = typeof form.get("SpeechResult") === "string" ? String(form.get("SpeechResult")) : "";
  const raw = digits || speech || "";

  let responseType: "safe" | "needs_help" | "emergency" | "unknown" = "unknown";
  if (digits === "1") responseType = "needs_help";
  else if (digits === "2") responseType = "safe";
  else if (digits === "3") responseType = "emergency";
  else {
    const parsed = parseWellnessReply(raw);
    responseType = parsed === "okay" ? "safe" : parsed === "needs_help" ? "needs_help" : "unknown";
  }

  appendCommunicationLog({
    channel: "voice",
    direction: "inbound",
    phone_number: phone,
    body: raw || "(no input)",
    provider: "twilio_voice",
    delivery_status: "delivered",
    response_type: responseType,
    disaster_event_id: eventId,
    disaster_event_name: eventName,
  });

  appendSafetyResponse({
    phone_number: phone,
    response_type: responseType,
    disaster_event_id: eventId,
    disaster_event_name: eventName,
    raw_message: raw || "(no input)",
  });

  const twiml = new twilio.twiml.VoiceResponse();
  if (responseType === "needs_help") {
    twiml.say({ voice: "alice" }, "Thank you. Blackbox received that you need help. We are escalating now.");
  } else if (responseType === "safe") {
    twiml.say({ voice: "alice" }, "Thank you. Blackbox marked you as okay.");
  } else if (responseType === "emergency") {
    twiml.say({ voice: "alice" }, "Emergency received. Blackbox is escalating immediately.");
  } else {
    twiml.say({ voice: "alice" }, "Sorry, I could not understand your response. We will follow up by text.");
  }
  twiml.hangup();

  return xmlResponse(twiml.toString());
}
