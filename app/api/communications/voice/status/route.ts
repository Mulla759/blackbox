import { NextResponse } from "next/server";
import { appendCommunicationLog } from "@/lib/communications/store";
import { normalizePhoneNumber } from "@/lib/communications/phone";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const phone = normalizePhoneNumber(url.searchParams.get("phone") ?? "");
  const form = await req.formData();
  const status = typeof form.get("CallStatus") === "string" ? String(form.get("CallStatus")) : "unknown";
  const sid = typeof form.get("CallSid") === "string" ? String(form.get("CallSid")) : undefined;

  appendCommunicationLog({
    channel: "voice",
    direction: "outbound",
    phone_number: phone,
    body: `Call status: ${status}`,
    provider: "twilio_voice",
    delivery_status: status === "failed" ? "failed" : "sent",
    provider_message_id: sid,
  });

  return NextResponse.json({ ok: true });
}
