import { NextResponse } from "next/server";
import { dispatcherSettings, listResponders, logCommunication, startVapiCall } from "@/lib/dispatch";
import twilio from "twilio";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { responder_id?: string; channel?: "TWILIO_VOICE" | "VAPI_VOICE" };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.responder_id || !body.channel) {
    return NextResponse.json({ error: "responder_id and channel required" }, { status: 400 });
  }
  const responders = await listResponders();
  const responder = responders.find((r) => r.id === body.responder_id);
  if (!responder) return NextResponse.json({ error: "Responder not found" }, { status: 404 });
  const dispatch = await dispatcherSettings();
  if (!dispatch) return NextResponse.json({ error: "Dispatcher settings missing" }, { status: 500 });

  if (body.channel === "VAPI_VOICE") {
    const result = await startVapiCall(dispatch.dispatcher_phone_number);
    return NextResponse.json({ ...result, to: dispatch.dispatcher_phone_number });
  }

  const sid = process.env["TWILIO_ACCOUNT_SID"]?.trim();
  const token = process.env["TWILIO_AUTH_TOKEN"]?.trim();
  const from =
    process.env["TWILIO_VOICE_FROM_NUMBER"]?.trim() ??
    process.env["TWILIO_PHONE_NUMBER"]?.trim();
  if (!sid || !token || !from) {
    return NextResponse.json({ error: "Twilio voice env vars missing" }, { status: 500 });
  }
  const client = twilio(sid, token);
  const call = await client.calls.create({
    to: dispatch.dispatcher_phone_number,
    from,
    twiml: `<Response><Say voice="alice">Dispatcher call from responder ${responder.full_name}. Please connect now.</Say></Response>`,
  });
  await logCommunication({
    contact_id: null,
    phone_number: dispatch.dispatcher_phone_number,
    direction: "OUTBOUND",
    channel: "TWILIO_VOICE",
    status: call.status ?? "queued",
    call_summary: `Dispatcher call started by responder ${responder.full_name}`,
    language_used: dispatch.default_language,
  });
  return NextResponse.json({ ok: true, sid: call.sid, status: call.status });
}
