import { NextResponse } from "next/server";
import { fetchActiveNwsAlerts } from "@/lib/disaster";

export const dynamic = "force-dynamic";

/**
 * Disaster detection layer: active NWS alerts, normalized for downstream emergency systems.
 */
export async function GET() {
  const result = await fetchActiveNwsAlerts();

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }

  return NextResponse.json(result.alerts);
}
