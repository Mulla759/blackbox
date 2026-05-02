import { NextResponse } from "next/server";
import { recordInboundSms } from "@/lib/communications/inbound";
import { evaluateSignal } from "@/lib/tribe-v2";

export const dynamic = "force-dynamic";

/**
 * Twilio Messaging webhook — configure “A message comes in” on your Twilio number
 * to POST here (public URL required in production, e.g. ngrok).
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected form data" }, { status: 400 });
  }

  const From = form.get("From");
  const Body = form.get("Body");
  const MessageSid = form.get("MessageSid");

  if (typeof From !== "string" || typeof Body !== "string") {
    return NextResponse.json({ error: "Missing From or Body" }, { status: 400 });
  }

  const recorded = recordInboundSms({
    phone_number: From,
    raw_body: Body,
    provider: "twilio",
    provider_message_id: typeof MessageSid === "string" ? MessageSid : undefined,
  });

  await evaluateSignal({
    phone_number: From,
    channel: "sms",
    transcript: Body,
    disaster_id: recorded.disaster_event_id,
    disaster_name: recorded.disaster_event_name,
  });

  return new NextResponse(null, { status: 204 });
}
