import { NWS_ACTIVE_ALERTS_URL, NWS_USER_AGENT } from "./constants";
import type { ActiveAlertsResult, DisasterAlert, NwsAlertFeature } from "./types";
import { mapNwsFeatureToAlert } from "./nws-mapper";

type UnknownRecord = Record<string, unknown>;

function isFeatureArray(raw: unknown): raw is NwsAlertFeature[] {
  return Array.isArray(raw) && raw.every((x) => x !== null && typeof x === "object");
}

function parseFeatureCollection(body: unknown): DisasterAlert[] {
  if (!body || typeof body !== "object") return [];

  const features = (body as UnknownRecord).features;
  if (!isFeatureArray(features)) return [];

  const alerts: DisasterAlert[] = [];
  for (const f of features) {
    const mapped = mapNwsFeatureToAlert(f);
    if (mapped) alerts.push(mapped);
  }
  return alerts;
}

/**
 * Fetches active alerts from the National Weather Service API and maps them to {@link DisasterAlert}.
 */
export async function fetchActiveNwsAlerts(): Promise<ActiveAlertsResult> {
  let response: Response;
  try {
    response = await fetch(NWS_ACTIVE_ALERTS_URL, {
      headers: {
        Accept: "application/geo+json",
        "User-Agent": NWS_USER_AGENT,
      },
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return {
      ok: false,
      error: `Failed to reach weather alerts API: ${message}`,
      statusCode: 503,
    };
  }

  const rawText = await response.text();

  if (!response.ok) {
    return {
      ok: false,
      error: `Weather alerts API returned ${response.status}: ${rawText.slice(0, 200)}`,
      statusCode: response.status >= 500 ? 502 : 502,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch {
    return {
      ok: false,
      error: "Weather alerts API returned invalid JSON",
      statusCode: 502,
    };
  }

  try {
    const alerts = parseFeatureCollection(parsed);
    return { ok: true, alerts };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse error";
    return {
      ok: false,
      error: `Could not parse alerts payload: ${message}`,
      statusCode: 502,
    };
  }
}
