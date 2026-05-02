import { NextResponse } from "next/server";
import { notifyAffectedIndividualsForDisaster } from "@/lib/communications/workflow";

export const dynamic = "force-dynamic";

type Body = {
  disaster_event_id?: string;
  disaster_event_name?: string;
  affected_phone_numbers?: string[];
};

function phonesFromEnv(): string[] {
  const raw = process.env.DISASTER_NOTIFY_RECIPIENTS ?? "";
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Runs disaster outreach: sends the standard emergency SMS via the configured provider.
 */
export async function POST(req: Request) {
  let json: Body;
  try {
    json = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const disaster_event_id =
    typeof json.disaster_event_id === "string" && json.disaster_event_id.trim()
      ? json.disaster_event_id.trim()
      : `evt_${crypto.randomUUID()}`;
  const disaster_event_name =
    typeof json.disaster_event_name === "string" && json.disaster_event_name.trim()
      ? json.disaster_event_name.trim()
      : "Emergency";

  const explicit =
    Array.isArray(json.affected_phone_numbers) && json.affected_phone_numbers.length > 0
      ? json.affected_phone_numbers.filter((p) => typeof p === "string" && p.trim())
      : [];

  const affected_phone_numbers =
    explicit.length > 0 ? explicit : phonesFromEnv();

  if (affected_phone_numbers.length === 0) {
    return NextResponse.json(
      {
        error:
          "No recipients — provide affected_phone_numbers in the body or set DISASTER_NOTIFY_RECIPIENTS.",
      },
      { status: 400 }
    );
  }

  const { results } = await notifyAffectedIndividualsForDisaster({
    disaster_event_id,
    disaster_event_name,
    affectedPeople: affected_phone_numbers.map((phone_number) => ({ phone_number })),
  });

  return NextResponse.json({
    ok: true,
    disaster_event_id,
    disaster_event_name,
    results,
  });
}
