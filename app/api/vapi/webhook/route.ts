import { NextResponse } from "next/server";
import { findContactByPhone, logCommunication } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: {
    customer?: { number?: string };
    summary?: string;
    status?: string;
    language?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = body.customer?.number?.trim();
  if (!phone) return NextResponse.json({ ok: true });
  const contact = await findContactByPhone(phone);
  await logCommunication({
    contact_id: contact?.id ?? null,
    phone_number: phone,
    direction: "INBOUND",
    channel: "VAPI_VOICE",
    status: body.status ?? "completed",
    call_summary: body.summary ?? null,
    language_used: body.language ?? contact?.preferred_language ?? "English",
  });
  return NextResponse.json({ ok: true });
}
