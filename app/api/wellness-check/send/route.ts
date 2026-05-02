import { NextResponse } from "next/server";
import { normalizePhoneNumber } from "@/lib/communications/phone";
import { sendWellnessCheckSms } from "@/lib/communications/wellness";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { phone_number?: string };
  try {
    body = (await req.json()) as { phone_number?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone_number =
    typeof body.phone_number === "string" ? body.phone_number.trim() : "";
  if (!phone_number) {
    return NextResponse.json({ error: "phone_number required" }, { status: 400 });
  }

  const result = await sendWellnessCheckSms(phone_number);
  const sent_at = new Date().toISOString();
  const normalized = normalizePhoneNumber(phone_number);

  return NextResponse.json({
    ok: true,
    sent_at,
    phone_number: normalized,
    provider: result.provider,
    twilio_message_sid: result.provider_message_id ?? null,
    delivery_status: result.delivery_status,
    error: result.error ?? null,
  });
}
