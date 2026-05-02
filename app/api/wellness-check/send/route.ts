import { NextResponse } from "next/server";
import { isUsE164, normalizePhoneNumber } from "@/lib/communications/phone";
import { sendWellnessCheckCall } from "@/lib/communications/wellness";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { phone_number?: string };
  try {
    body = (await req.json()) as { phone_number?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const requested =
    typeof body.phone_number === "string" ? body.phone_number.trim() : "";
  const fallback = process.env["TEST_RECIPIENT_NUMBER"]?.trim() ?? "";
  const phone_number = requested || fallback;
  if (!phone_number) {
    return NextResponse.json(
      { error: "phone_number required (or set TEST_RECIPIENT_NUMBER in .env)" },
      { status: 400 }
    );
  }

  const normalizedInput = normalizePhoneNumber(phone_number);
  if (!isUsE164(normalizedInput)) {
    return NextResponse.json(
      {
        error:
          "Use a full US number in E.164 format (+1XXXXXXXXXX). Example: +16124331186.",
      },
      { status: 400 }
    );
  }

  const result = await sendWellnessCheckCall(normalizedInput);
  const sent_at = new Date().toISOString();
  const normalized = normalizedInput;

  return NextResponse.json({
    ok: true,
    sent_at,
    phone_number: normalized,
    mode: "call",
    call: {
      provider: result.provider,
      status: result.delivery_status,
      sid: result.provider_message_id ?? null,
      error: result.error ?? null,
    },
    provider: result.provider,
    twilio_call_sid: result.provider_message_id ?? null,
    delivery_status: result.delivery_status,
    error: result.error ?? null,
  });
}
