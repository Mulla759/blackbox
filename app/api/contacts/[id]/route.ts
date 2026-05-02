import { NextResponse } from "next/server";
import { getContactById, updateContact } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const contact = await getContactById(id);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ contact });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const contact = await updateContact(id, {
    full_name: typeof body.full_name === "string" ? body.full_name.trim() : undefined,
    phone_number: typeof body.phone_number === "string" ? body.phone_number.trim() : undefined,
    address: typeof body.address === "string" ? body.address.trim() : undefined,
    city: typeof body.city === "string" ? body.city.trim() : undefined,
    state: typeof body.state === "string" ? body.state.trim() : undefined,
    zip_code: typeof body.zip_code === "string" ? body.zip_code.trim() : undefined,
    preferred_language:
      typeof body.preferred_language === "string"
        ? body.preferred_language.trim()
        : undefined,
    accessibility_needs:
      typeof body.accessibility_needs === "string"
        ? body.accessibility_needs.trim()
        : undefined,
    is_deaf_or_hard_of_hearing:
      typeof body.is_deaf_or_hard_of_hearing === "boolean"
        ? body.is_deaf_or_hard_of_hearing
          ? 1
          : 0
        : undefined,
    requires_interpreter:
      typeof body.requires_interpreter === "boolean"
        ? body.requires_interpreter
          ? 1
          : 0
        : undefined,
    interpreter_language:
      typeof body.interpreter_language === "string"
        ? body.interpreter_language.trim()
        : undefined,
    prefers_sms:
      typeof body.prefers_sms === "boolean" ? (body.prefers_sms ? 1 : 0) : undefined,
    prefers_voice:
      typeof body.prefers_voice === "boolean"
        ? body.prefers_voice
          ? 1
          : 0
        : undefined,
    emergency_contact_name:
      typeof body.emergency_contact_name === "string"
        ? body.emergency_contact_name.trim()
        : undefined,
    emergency_contact_phone:
      typeof body.emergency_contact_phone === "string"
        ? body.emergency_contact_phone.trim()
        : undefined,
    notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
    opted_out_sms:
      typeof body.opted_out_sms === "boolean" ? (body.opted_out_sms ? 1 : 0) : undefined,
    profile_complete:
      typeof body.profile_complete === "boolean"
        ? body.profile_complete
          ? 1
          : 0
        : undefined,
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ contact });
}
