import { NextResponse } from "next/server";
import { summarizeRecentCallLogs } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await summarizeRecentCallLogs();
  return NextResponse.json({ summary });
}
