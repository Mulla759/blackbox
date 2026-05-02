import { NextResponse } from "next/server";
import { isUsE164, normalizePhoneNumber } from "@/lib/communications/phone";
import { sendWellnessCheckCall, sendWellnessCheckSms } from "@/lib/communications/wellness";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { phone_number?: string; mode?: "sms" | "call" | "both" };
  try {
    body = (await req.json()) as { phone_number?: string; mode?: "sms" | "call" | "both" };
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

  const mode = body.mode ?? "sms";
  const smsResult =
    mode === "call" ? null : await sendWellnessCheckSms(normalizedInput);
  const callResult =
    mode === "sms" ? null : await sendWellnessCheckCall(normalizedInput);

  const result = callResult ?? smsResult;
  if (!result) {
    return NextResponse.json({ error: "No action selected" }, { status: 400 });
  }
  const sent_at = new Date().toISOString();
  const normalized = normalizedInput;

  return NextResponse.json({
    ok: true,
    sent_at,
    phone_number: normalized,
    mode,
    sms: smsResult
      ? {
          provider: smsResult.provider,
          status: smsResult.delivery_status,
          sid: smsResult.provider_message_id ?? null,
          error: smsResult.error ?? null,
        }
      : null,
    call: callResult
      ? {
          provider: callResult.provider,
          status: callResult.delivery_status,
          sid: callResult.provider_message_id ?? null,
          error: callResult.error ?? null,
        }
      : null,
    provider: result.provider,
    twilio_message_sid: result.provider_message_id ?? null,
    delivery_status: result.delivery_status,
    error: result.error ?? null,
  });
}
