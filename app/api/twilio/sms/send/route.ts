import { NextResponse } from "next/server";
import { sendTwilioSms } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { phone_number?: string; message?: string };
  try {
    body = (await req.json()) as { phone_number?: string; message?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.phone_number?.trim()) {
    return NextResponse.json({ error: "phone_number required" }, { status: 400 });
  }
  try {
    const result = await sendTwilioSms(body.phone_number.trim(), body.message?.trim());
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "SMS send failed" },
      { status: 500 }
    );
  }
}
