import { NextResponse } from "next/server";
import { recordInboundSms } from "@/lib/communications/inbound";
import { resolveTribeDisasterIdForScoring } from "@/lib/communications/tribe-context";
import { evaluateSignal } from "@/lib/tribe-v2";

export const dynamic = "force-dynamic";

type Body = {
  phone_number?: string;
  body?: string;
  disaster_event_id?: string;
  disaster_event_name?: string;
};

export async function POST(req: Request) {
  let json: Body;
  try {
    json = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone_number = typeof json.phone_number === "string" ? json.phone_number : "";
  const body = typeof json.body === "string" ? json.body : "";
  if (!phone_number.trim() || !body.trim()) {
    return NextResponse.json(
      { error: "phone_number and body are required" },
      { status: 400 }
    );
  }

  const recorded = recordInboundSms({
    phone_number,
    raw_body: body,
    fallback_disaster_event_id:
      typeof json.disaster_event_id === "string" ? json.disaster_event_id : undefined,
    fallback_disaster_event_name:
      typeof json.disaster_event_name === "string" ? json.disaster_event_name : undefined,
    provider: "simulated",
  });
  const packet = await evaluateSignal({
    phone_number,
    channel: "sms",
    transcript: body,
    disaster_id: resolveTribeDisasterIdForScoring(recorded.disaster_event_id),
    disaster_name: recorded.disaster_event_name,
  });

  return NextResponse.json({ ok: true, response: recorded, tribe_v2: packet });
}
