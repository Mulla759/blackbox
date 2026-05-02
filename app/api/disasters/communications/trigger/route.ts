import { NextResponse } from "next/server";
import {
  normalizePhoneNumber,
} from "@/lib/communications/phone";
import { notifyAffectedIndividualsForDisaster } from "@/lib/communications/workflow";
import {
  allRegisteredPhones,
  phonesMatchingLocationQuery,
} from "@/lib/registry/store";

export const dynamic = "force-dynamic";

type Body = {
  disaster_event_id?: string;
  disaster_event_name?: string;
  /** Always merged into the recipient list (E.164 or normalizable). */
  affected_phone_numbers?: string[];
  /** Add every saved registry contact. */
  include_all_registered?: boolean;
  /**
   * Add contacts whose saved location matches any geographic token from this string.
   * Use NWS-style text (e.g. "Hennepin County MN") or shorthand like "MN".
   */
  registry_location_query?: string;
};

function phonesFromEnv(): string[] {
  const raw = process.env["DISASTER_NOTIFY_RECIPIENTS"] ?? "";
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => normalizePhoneNumber(p));
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

  const manual =
    Array.isArray(json.affected_phone_numbers)
      ? json.affected_phone_numbers.filter(
          (p): p is string => typeof p === "string" && p.trim().length > 0
        )
      : [];

  const recipients = new Set<string>();

  for (const p of manual) {
    recipients.add(normalizePhoneNumber(p));
  }

  if (json.include_all_registered === true) {
    for (const p of allRegisteredPhones()) recipients.add(p);
  }

  const locQuery =
    typeof json.registry_location_query === "string"
      ? json.registry_location_query.trim()
      : "";
  if (locQuery) {
    for (const p of phonesMatchingLocationQuery(locQuery)) {
      recipients.add(p);
    }
  }

  /** Only fall back to env when registry flags weren’t used and manual list empty. */
  const usedRegistryIntent =
    json.include_all_registered === true || Boolean(locQuery);

  if (!usedRegistryIntent && recipients.size === 0) {
    for (const p of phonesFromEnv()) {
      recipients.add(p);
    }
  }

  const affected_phone_numbers = [...recipients];

  if (usedRegistryIntent && affected_phone_numbers.length === 0) {
    return NextResponse.json(
      {
        error:
          "No recipients matched. Add contacts in Analytics → Registry or widen the location text / numbers.",
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
    recipient_count: affected_phone_numbers.length,
    results,
  });
}
