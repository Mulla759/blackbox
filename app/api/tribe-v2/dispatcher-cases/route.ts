import { NextResponse } from "next/server";
import { listDispatcherCases } from "@/lib/tribe-v2";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ cases: listDispatcherCases() });
}

