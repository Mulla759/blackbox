import { NextResponse } from "next/server";
import { searchContacts } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("query")?.trim();
  const language = url.searchParams.get("language")?.trim();
  const accessibility_need = url.searchParams.get("accessibility_need")?.trim();
  const phone_number = url.searchParams.get("phone_number")?.trim();
  const contacts = await searchContacts({
    query,
    language,
    accessibility_need,
    phone_number,
  });
  return NextResponse.json({ contacts });
}
