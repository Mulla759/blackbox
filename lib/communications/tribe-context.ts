import { WELLNESS_EVENT_ID } from "./wellness-constants";

const DEFAULT_DEMO_DISASTER = "flood-rock-wi-2026-05-02";

/**
 * Wellness logs stay on `wellness-check` for SMS YES/NO semantics; TRIBE scoring should use
 * the seeded dashboard disaster so hotspots and briefs match the live map.
 */
export function resolveTribeDisasterIdForScoring(storedEventId: string): string {
  const override = process.env["BLACKBOX_DEMO_TRIBE_DISASTER_ID"]?.trim();
  if (storedEventId === WELLNESS_EVENT_ID) {
    return override || DEFAULT_DEMO_DISASTER;
  }
  return storedEventId;
}
