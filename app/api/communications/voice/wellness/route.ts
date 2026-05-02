import twilio from "twilio";
import { normalizePhoneNumber } from "@/lib/communications/phone";
import { getPublicAppBaseUrl } from "@/lib/communications/public-app-url";

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
    "Hello, this is Blackbox emergency check in. Use your keypad now. Press 1 if you need help, press 2 if you are okay, or press 3 for emergency.";
  const eventId = url.searchParams.get("event_id") ?? "wellness-check";
  const eventName = url.searchParams.get("event_name") ?? "Wellness check";
  const repeat = url.searchParams.get("repeat") === "1";

  const twiml = new twilio.twiml.VoiceResponse();
  const publicBase = getPublicAppBaseUrl();
  const gatherAction = new URL("/api/communications/voice/wellness/gather", publicBase);
  gatherAction.searchParams.set("phone", phone);
  gatherAction.searchParams.set("event_id", eventId);
  gatherAction.searchParams.set("event_name", eventName);

  const gather = twiml.gather({
    numDigits: 1,
    input: ["dtmf"],
    action: gatherAction.toString(),
    method: "POST",
  });

  gather.say(
    { voice: "alice" },
    repeat ? "I did not catch that. " + prompt : prompt
  );

  if (repeat) {
    twiml.say({ voice: "alice" }, "No input received. Please call back if you need help. Goodbye.");
    twiml.hangup();
  } else {
    const incoming = new URL(req.url);
    const again = new URL(incoming.pathname + incoming.search, publicBase);
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
