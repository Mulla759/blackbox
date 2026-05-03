import { NextResponse } from "next/server";
import { startVapiCall } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

type StartVapiCallBody = {
  phone_number?: string;
  phone?: string;
  number?: string;
};

export async function POST(req: Request) {
  let body: StartVapiCallBody = {};
  try {
    body = (await req.json()) as StartVapiCallBody;
  } catch {
    body = {};
  }

  const fallbackPhone =
    process.env["BLACKBOX_HOME_VAPI_PHONE"]?.trim() ??
    process.env["NEXT_PUBLIC_BLACKBOX_HOME_VAPI_PHONE"]?.trim() ??
    "";

  const phone =
    body.phone_number?.trim() || body.phone?.trim() || body.number?.trim() || fallbackPhone;

  if (!phone) {
    return NextResponse.json(
      { error: "phone_number required. Send a phone_number in the request or set BLACKBOX_HOME_VAPI_PHONE." },
      { status: 400 }
    );
  }

  try {
    const result = await startVapiCall(phone);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Vapi call failed" },
      { status: 500 }
    );
  }
}
