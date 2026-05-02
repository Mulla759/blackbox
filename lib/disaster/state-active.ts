import { fetchActiveNwsAlerts } from "./nws-client";

const STATE_NAMES: Record<string, string> = {
  AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california",
  CO: "colorado", CT: "connecticut", DE: "delaware", DC: "district of columbia",
  FL: "florida", GA: "georgia", HI: "hawaii", ID: "idaho", IL: "illinois",
  IN: "indiana", IA: "iowa", KS: "kansas", KY: "kentucky", LA: "louisiana",
  ME: "maine", MD: "maryland", MA: "massachusetts", MI: "michigan", MN: "minnesota",
  MS: "mississippi", MO: "missouri", MT: "montana", NE: "nebraska", NV: "nevada",
  NH: "new hampshire", NJ: "new jersey", NM: "new mexico", NY: "new york",
  NC: "north carolina", ND: "north dakota", OH: "ohio", OK: "oklahoma",
  OR: "oregon", PA: "pennsylvania", RI: "rhode island", SC: "south carolina",
  SD: "south dakota", TN: "tennessee", TX: "texas", UT: "utah", VT: "vermont",
  VA: "virginia", WA: "washington", WV: "west virginia", WI: "wisconsin",
  WY: "wyoming", PR: "puerto rico",
};

export async function getActiveDisasterTypesForState(
  stateAbbr: string,
  limit = 9
): Promise<string[]> {
  const target = stateAbbr.trim().toUpperCase();
  const stateName = STATE_NAMES[target];
  if (!target || !stateName) return [];

  const result = await fetchActiveNwsAlerts();
  if (!result.ok) return [];

  const counts = new Map<string, number>();
  for (const alert of result.alerts) {
    const location = alert.location.toLowerCase();
    const inState =
      location.includes(`, ${target.toLowerCase()}`) ||
      location.includes(stateName);
    if (!inState) continue;
    const key = alert.type.trim() || "Unknown event";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(1, Math.min(9, limit)))
    .map(([event]) => event);
}
