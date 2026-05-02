import { normalizePhoneNumber } from "./phone";
import { buildEmergencyAlertBody } from "./templates";
import { attachOutboundDisasterContext } from "./store";
import { send_message } from "./send-message";
import type { SendMessageResult } from "./types";

export type AffectedPerson = {
  phone_number: string;
};

/**
 * Disaster workflow hook: notify affected individuals with the standard safety prompt.
 * Context is attached per recipient so inbound replies associate with this event.
 */
export async function notifyAffectedIndividualsForDisaster(params: {
  disaster_event_id: string;
  disaster_event_name: string;
  affectedPeople: AffectedPerson[];
}): Promise<{
  results: Array<{ phone_number: string } & SendMessageResult>;
}> {
  const text = buildEmergencyAlertBody(params.disaster_event_name);
  const results: Array<{ phone_number: string } & SendMessageResult> = [];

  for (const person of params.affectedPeople) {
    const phone_number = normalizePhoneNumber(person.phone_number);
    const outcome = await send_message(phone_number, text);

    if (outcome.delivery_status !== "failed" && !outcome.error) {
      attachOutboundDisasterContext(
        phone_number,
        params.disaster_event_id,
        params.disaster_event_name
      );
    }

    results.push({ phone_number, ...outcome });
  }

  return { results };
}
