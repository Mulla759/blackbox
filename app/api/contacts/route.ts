import { NextResponse } from "next/server";
import { createContact, listContacts } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

export async function GET() {
  const contacts = await listContacts();
  return NextResponse.json({ contacts });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.phone_number !== "string" || !body.phone_number.trim()) {
    return NextResponse.json({ error: "phone_number required" }, { status: 400 });
  }
  const contact = await createContact({
    phone_number: body.phone_number.trim(),
    full_name: typeof body.full_name === "string" ? body.full_name.trim() : null,
    address: typeof body.address === "string" ? body.address.trim() : null,
    city: typeof body.city === "string" ? body.city.trim() : null,
    state: typeof body.state === "string" ? body.state.trim() : null,
    zip_code: typeof body.zip_code === "string" ? body.zip_code.trim() : null,
    preferred_language:
      typeof body.preferred_language === "string" ? body.preferred_language.trim() : null,
    accessibility_needs:
      typeof body.accessibility_needs === "string" ? body.accessibility_needs.trim() : null,
    is_deaf_or_hard_of_hearing: body.is_deaf_or_hard_of_hearing ? 1 : 0,
    requires_interpreter: body.requires_interpreter ? 1 : 0,
    interpreter_language:
      typeof body.interpreter_language === "string" ? body.interpreter_language.trim() : null,
    prefers_sms: body.prefers_sms ? 1 : 0,
    prefers_voice: body.prefers_voice === false ? 0 : 1,
    emergency_contact_name:
      typeof body.emergency_contact_name === "string"
        ? body.emergency_contact_name.trim()
        : null,
    emergency_contact_phone:
      typeof body.emergency_contact_phone === "string"
        ? body.emergency_contact_phone.trim()
        : null,
    notes: typeof body.notes === "string" ? body.notes.trim() : null,
    profile_complete: 1,
  });
  return NextResponse.json({ contact });
}
