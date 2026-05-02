import { NextResponse } from "next/server";
import {
  addRegisteredContact,
  listRegisteredContacts,
  removeRegisteredContact,
} from "@/lib/registry/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ contacts: listRegisteredContacts() });
}

export async function POST(req: Request) {
  let body: {
    phone_number?: string;
    label?: string;
    location?: string;
    age?: number;
    disability?: string;
    preferred_language?: string;
    emergency_contact_phone?: string;
    latitude?: number;
    longitude?: number;
    communication_preferences?: {
      modality?: "sms" | "voice" | "both" | "asl_video";
      cadence?: "standard" | "slow" | "urgent";
    };
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const phone = typeof body.phone_number === "string" ? body.phone_number.trim() : "";
  const location =
    typeof body.location === "string" ? body.location.trim() : "";
  const label =
    typeof body.label === "string" ? body.label.trim() : "";

  if (!phone) {
    return NextResponse.json({ error: "phone_number required" }, { status: 400 });
  }
  if (!location) {
    return NextResponse.json(
      { error: "location required (e.g. Minneapolis, MN)" },
      { status: 400 }
    );
  }

  const contact = addRegisteredContact({
    phone_number: phone,
    location,
    ...(label ? { label } : {}),
    ...(typeof body.age === "number" ? { age: body.age } : {}),
    ...(typeof body.disability === "string" ? { disability: body.disability } : {}),
    ...(typeof body.preferred_language === "string"
      ? { preferred_language: body.preferred_language }
      : {}),
    ...(typeof body.emergency_contact_phone === "string"
      ? { emergency_contact_phone: body.emergency_contact_phone }
      : {}),
    ...(typeof body.latitude === "number" ? { latitude: body.latitude } : {}),
    ...(typeof body.longitude === "number" ? { longitude: body.longitude } : {}),
    ...(body.communication_preferences ? { communication_preferences: body.communication_preferences } : {}),
  });

  return NextResponse.json({ contact });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id query required" }, { status: 400 });
  }
  const ok = removeRegisteredContact(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
