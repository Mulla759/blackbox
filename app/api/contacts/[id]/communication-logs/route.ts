import { NextResponse } from "next/server";
import { logsForContact } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const logs = await logsForContact(id);
  return NextResponse.json({ logs });
}
