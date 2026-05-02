import { NextResponse } from "next/server";
import { getLatestWellnessReplyAfter } from "@/lib/communications/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const since = searchParams.get("since");
  if (!phone?.trim() || !since?.trim()) {
    return NextResponse.json(
      { error: "phone and since query params required" },
      { status: 400 }
    );
  }

  const reply = getLatestWellnessReplyAfter(phone.trim(), since.trim());
  return NextResponse.json({
    reply: reply
      ? { raw_message: reply.raw_message, timestamp: reply.timestamp }
      : null,
  });
}
