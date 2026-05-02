import twilio from "twilio";
import { appendCommunicationLog, appendSafetyResponse } from "@/lib/communications/store";
import { normalizePhoneNumber } from "@/lib/communications/phone";
import { getPublicAppBaseUrl } from "@/lib/communications/public-app-url";

export const dynamic = "force-dynamic";

function xmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function buildStageAction(
  stage: string,
  phone: string,
  eventId: string,
  eventName: string
): string {
  const next = new URL("/api/communications/voice/wellness/gather", getPublicAppBaseUrl());
  next.searchParams.set("stage", stage);
  next.searchParams.set("phone", phone);
  next.searchParams.set("event_id", eventId);
  next.searchParams.set("event_name", eventName);
  return next.toString();
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const stage = url.searchParams.get("stage") ?? "primary";
    const phone = normalizePhoneNumber(url.searchParams.get("phone") ?? "");
    const eventId = url.searchParams.get("event_id") ?? "wellness-check";
    const eventName = url.searchParams.get("event_name") ?? "Wellness check";

    const form = await req.formData();
    const digits = typeof form.get("Digits") === "string" ? String(form.get("Digits")) : "";
    const raw = digits || "(no input)";

    appendCommunicationLog({
      channel: "voice",
      direction: "inbound",
      phone_number: phone,
      body: `Stage ${stage}: ${raw}`,
      provider: "twilio_voice",
      delivery_status: "delivered",
      disaster_event_id: eventId,
      disaster_event_name: eventName,
    });

    const twiml = new twilio.twiml.VoiceResponse();

    if (stage === "primary") {
      let responseType: "safe" | "needs_help" | "emergency" | "unknown" = "unknown";
      if (digits === "1") responseType = "needs_help";
      else if (digits === "2") responseType = "safe";
      else if (digits === "3") responseType = "emergency";

      appendSafetyResponse({
        phone_number: phone,
        response_type: responseType,
        disaster_event_id: eventId,
        disaster_event_name: eventName,
        raw_message: raw,
      });

      if (digits === "1") {
        twiml.say({ voice: "alice" }, "You selected that you need help.");
        const gather = twiml.gather({
          numDigits: 1,
          input: ["dtmf"],
          action: buildStageAction("needs_help_followup", phone, eventId, eventName),
          method: "POST",
        });
        gather.say(
          { voice: "alice" },
          "Press 1 for medical help, press 2 for evacuation support, or press 3 if your situation is now an emergency."
        );
        twiml.say({ voice: "alice" }, "No selection received. We are escalating your help request now.");
        twiml.hangup();
      } else if (digits === "2") {
        twiml.say({ voice: "alice" }, "Glad you are okay.");
        const gather = twiml.gather({
          numDigits: 1,
          input: ["dtmf"],
          action: buildStageAction("safe_followup", phone, eventId, eventName),
          method: "POST",
        });
        gather.say(
          { voice: "alice" },
          "Press 1 if you can assist neighbors, press 2 if you need supplies later, or press 3 to report a nearby hazard."
        );
        twiml.say({ voice: "alice" }, "No additional update received. Thank you for checking in.");
        twiml.hangup();
      } else if (digits === "3") {
        twiml.say({ voice: "alice" }, "Emergency option selected.");
        const gather = twiml.gather({
          numDigits: 1,
          input: ["dtmf"],
          action: buildStageAction("emergency_followup", phone, eventId, eventName),
          method: "POST",
        });
        gather.say(
          { voice: "alice" },
          "Press 1 to confirm immediate emergency response, press 2 if this was a mistaken input, or press 3 for urgent but non life threatening help."
        );
        twiml.say({ voice: "alice" }, "No confirmation received. We are escalating this as an emergency.");
        twiml.hangup();
      } else {
        twiml.say({ voice: "alice" }, "Sorry, I could not understand your response. Please call again and use 1, 2, or 3.");
        twiml.hangup();
      }

      return xmlResponse(twiml.toString());
    }

    if (stage === "needs_help_followup") {
      if (digits === "1") {
        twiml.say({ voice: "alice" }, "Medical help requested. Blackbox is escalating this now.");
      } else if (digits === "2") {
        twiml.say({ voice: "alice" }, "Evacuation support requested. Blackbox is escalating this now.");
      } else if (digits === "3") {
        twiml.say({ voice: "alice" }, "Emergency upgrade received. Blackbox is escalating immediately.");
      } else {
        twiml.say({ voice: "alice" }, "Unknown selection. We are escalating your request as general help.");
      }
      twiml.hangup();
      return xmlResponse(twiml.toString());
    }

    if (stage === "safe_followup") {
      if (digits === "1") {
        twiml.say({ voice: "alice" }, "Thank you. You are marked as available to assist nearby neighbors.");
      } else if (digits === "2") {
        twiml.say({ voice: "alice" }, "Supplies support noted. We may follow up if conditions change.");
      } else if (digits === "3") {
        twiml.say({ voice: "alice" }, "Hazard report received. Blackbox will flag this for review.");
      } else {
        twiml.say({ voice: "alice" }, "Thank you for checking in. Stay safe.");
      }
      twiml.hangup();
      return xmlResponse(twiml.toString());
    }

    if (stage === "emergency_followup") {
      if (digits === "1") {
        twiml.say({ voice: "alice" }, "Emergency confirmed. Blackbox is escalating immediately.");
      } else if (digits === "2") {
        twiml.say({ voice: "alice" }, "Mistaken emergency input noted. Your status is unchanged.");
      } else if (digits === "3") {
        twiml.say({ voice: "alice" }, "Urgent support requested. Blackbox is escalating now.");
      } else {
        twiml.say({ voice: "alice" }, "No valid selection received. Emergency escalation remains active.");
      }
      twiml.hangup();
      return xmlResponse(twiml.toString());
    }

    twiml.say({ voice: "alice" }, "Call flow stage was not recognized. Please try again.");
    twiml.hangup();
    return xmlResponse(twiml.toString());
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unexpected error";
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(
      { voice: "alice" },
      "Blackbox hit a temporary error processing your reply. Please try calling again shortly."
    );
    twiml.hangup();
    console.error("[voice/wellness/gather]", detail);
    return xmlResponse(twiml.toString());
  }
}
