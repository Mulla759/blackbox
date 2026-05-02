import { NextResponse } from "next/server";
import { getDisasterById } from "@/lib/disaster-intel/service";
import { listRegisteredContacts } from "@/lib/registry/store";

export const dynamic = "force-dynamic";

/** Stage cue sheet: seeded profiles, lanes, and keypad instructions for presenters. */
export async function GET() {
  const d = getDisasterById("flood-rock-wi-2026-05-02");
  const profiles = listRegisteredContacts().map((c) => ({
    id: c.id,
    label: c.label,
    phone_e164: c.phone_number,
    demo_lane: c.demo_lane,
    demo_presenter_cue: c.demo_presenter_cue,
    avatar_url: c.avatar_url,
    location: c.location,
    preferred_language: c.preferred_language,
  }));

  return NextResponse.json({
    disaster: d ? { id: d.id, title: d.title, location_name: d.location_name } : null,
    keypad: {
      "1": "Need help (follow-up / escalation lane)",
      "2": "Okay / safe (live-clear lane)",
      "3": "Emergency",
    },
    profiles,
    setup:
      "Set BLACKBOX_DEMO_PRESENTERS to four comma-separated E.164 numbers in demo 1–4 order, or set BLACKBOX_DEMO_PROFILE_1_PHONE … _4_PHONE individually.",
    kickoff:
      "POST /api/demo/kickoff-drill with an empty body to send the flood SMS blast and place voice calls to all four seeded numbers.",
  });
}
