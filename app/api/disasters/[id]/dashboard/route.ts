import { NextResponse } from "next/server";
import { buildDashboardDataLive } from "@/lib/disaster-intel";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const data = await buildDashboardDataLive(id);
  if (!data) {
    return NextResponse.json({ error: "Disaster not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
