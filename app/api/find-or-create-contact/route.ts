import { NextResponse } from "next/server";
import { findOrCreateContact } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { phone_number?: string };
  try {
    body = (await req.json()) as { phone_number?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.phone_number?.trim()) {
    return NextResponse.json({ error: "phone_number required" }, { status: 400 });
  }
  const result = await findOrCreateContact(body.phone_number.trim());
  return NextResponse.json({
    contact: result.contact,
    needs_intake: result.needsIntake,
  });
}
