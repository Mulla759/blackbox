import { NextResponse } from "next/server";
import { listResponders } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

export async function GET() {
  const responders = await listResponders();
  return NextResponse.json({ responders });
}
