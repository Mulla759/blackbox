import { NextResponse } from "next/server";
import { evaluateSignal, listEscalationPackets } from "@/lib/tribe-v2";
import type { RawSignal, SignalChannel } from "@/lib/tribe-v2";

export const dynamic = "force-dynamic";

type Body = {
  household_id?: string;
  phone_number?: string;
  channel?: SignalChannel;
  transcript?: string;
  latest_turn?: string;
  call_id?: string;
  disaster_id?: string;
  disaster_name?: string;
  audio_url?: string;
};

export async function GET() {
  return NextResponse.json({ packets: listEscalationPackets() });
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript) {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 });
  }
  if (!body.household_id && !body.phone_number) {
    return NextResponse.json(
      { error: "household_id or phone_number is required" },
      { status: 400 }
    );
  }

  const rawSignal: RawSignal = {
    household_id: typeof body.household_id === "string" ? body.household_id : undefined,
    phone_number: typeof body.phone_number === "string" ? body.phone_number : undefined,
    channel: body.channel ?? "unknown",
    transcript,
    latest_turn: typeof body.latest_turn === "string" ? body.latest_turn : undefined,
    call_id: typeof body.call_id === "string" ? body.call_id : undefined,
    disaster_id: typeof body.disaster_id === "string" ? body.disaster_id : undefined,
    disaster_name: typeof body.disaster_name === "string" ? body.disaster_name : undefined,
    audio_url: typeof body.audio_url === "string" ? body.audio_url : undefined,
  };

  const packet = await evaluateSignal(rawSignal);
  return NextResponse.json({ ok: true, packet });
}

