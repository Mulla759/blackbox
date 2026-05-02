import { NextResponse } from "next/server";
import { getConversationThreadForPhone } from "@/lib/communications/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const phone = new URL(req.url).searchParams.get("phone")?.trim();
  if (!phone) {
    return NextResponse.json({ error: "phone query required" }, { status: 400 });
  }
  return NextResponse.json({ messages: getConversationThreadForPhone(phone) });
}
