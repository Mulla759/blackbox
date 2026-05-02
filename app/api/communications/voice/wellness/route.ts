import twilio from "twilio";
import { normalizePhoneNumber } from "@/lib/communications/phone";

export const dynamic = "force-dynamic";

function xmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function buildTwiml(req: Request): string {
  const url = new URL(req.url);
  const phone = normalizePhoneNumber(url.searchParams.get("phone") ?? "");
  const prompt =
    url.searchParams.get("prompt") ??
    "Hello, this is Blackbox. Press 1 if you need help, 2 if you are okay, 3 for emergency.";
  const eventId = url.searchParams.get("event_id") ?? "wellness-check";
  const eventName = url.searchParams.get("event_name") ?? "Wellness check";
  const repeat = url.searchParams.get("repeat") === "1";

  const twiml = new twilio.twiml.VoiceResponse();
  const gatherAction = new URL("/api/communications/voice/wellness/gather", url.origin);
  gatherAction.searchParams.set("phone", phone);
  gatherAction.searchParams.set("event_id", eventId);
  gatherAction.searchParams.set("event_name", eventName);

  const gather = twiml.gather({
    numDigits: 1,
    input: ["dtmf", "speech"],
    speechTimeout: "auto",
    action: gatherAction.toString(),
    method: "POST",
  });

  gather.say(
    { voice: "alice" },
    repeat ? "I did not catch that. " + prompt : prompt
  );

  if (repeat) {
    twiml.say({ voice: "alice" }, "No input received. We will follow up by text. Goodbye.");
    twiml.hangup();
  } else {
    const again = new URL(req.url);
    again.searchParams.set("repeat", "1");
    twiml.redirect({ method: "POST" }, again.toString());
  }

  return twiml.toString();
}

export async function GET(req: Request) {
  return xmlResponse(buildTwiml(req));
}

export async function POST(req: Request) {
  return xmlResponse(buildTwiml(req));
}
