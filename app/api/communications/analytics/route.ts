import { NextResponse } from "next/server";
import { buildCommunicationAnalytics } from "@/lib/communications/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(buildCommunicationAnalytics());
}
