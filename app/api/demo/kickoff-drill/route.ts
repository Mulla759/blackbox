import { NextResponse } from "next/server";
import { notifyAffectedIndividualsForDisaster } from "@/lib/communications/workflow";
import { send_call } from "@/lib/communications/send-call";
import { attachOutboundDisasterContext } from "@/lib/communications/store";
import { buildVoicePromptForProfile } from "@/lib/communications/wellness";
import { getDisasterById } from "@/lib/disaster-intel/service";
import { allRegisteredPhones } from "@/lib/registry/store";

export const dynamic = "force-dynamic";

type Body = { skip_sms?: boolean; skip_voice?: boolean };

/**
 * Demo kickoff: flood SMS to every seeded registry number, then outbound voice check-in
 * with TwiML tied to the same disaster id so TRIBE + dashboard share one context.
 */
export async function POST(req: Request) {
  let body: Body = {};
  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      body = (await req.json()) as Body;
    }
  } catch {
    /* empty */
  }

  const d = getDisasterById("flood-rock-wi-2026-05-02");
  if (!d) {
    return NextResponse.json({ error: "Seeded disaster missing" }, { status: 500 });
  }

  const phones = allRegisteredPhones();
  if (phones.length === 0) {
    return NextResponse.json({ error: "No registry phones seeded" }, { status: 400 });
  }

  const sms_results = !body.skip_sms
    ? (
        await notifyAffectedIndividualsForDisaster({
          disaster_event_id: d.id,
          disaster_event_name: d.title,
          affectedPeople: phones.map((phone_number) => ({ phone_number })),
        })
      ).results
    : [];

  const voice_results: Array<
    Record<string, unknown> & { phone_number: string; delivery_status?: string; error?: string | null }
  > = [];

  if (!body.skip_voice) {
    for (const phone_number of phones) {
      const prompt = buildVoicePromptForProfile(phone_number);
      const r = await send_call(phone_number, prompt, {
        disaster_event_id: d.id,
        disaster_event_name: d.title,
      });
      attachOutboundDisasterContext(phone_number, d.id, d.title);
      voice_results.push({ phone_number, ...r });
    }
  }

  return NextResponse.json({
    ok: true,
    disaster_event_id: d.id,
    disaster_event_name: d.title,
    recipient_count: phones.length,
    sms_results,
    voice_results,
  });
}
