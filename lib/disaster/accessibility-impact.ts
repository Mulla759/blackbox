import type { DisasterAlert } from "./types";

export type DisasterEventForAccessibility = {
  id: string;
  location?: string;
  affected_population?: number | null;
};

export type AccessibilityImpactEstimate = {
  disaster_id: string;
  estimated_people_with_disabilities_affected: number;
  estimated_mobility_support_needs: number;
  estimated_hearing_vision_support_needs: number;
  high_priority_shelters_count: number;
};

type EstimatorDeps = { fetchFn?: typeof fetch };
type CountyProfile = {
  stateFips: string;
  countyFips: string;
  countyName: string;
  totalPopulation: number;
  disabledPopulation: number;
};
type PlacesRates = {
  mobilityRate?: number;
  hearingRate?: number;
  visionRate?: number;
};

// Aggregate assumptions only; replace these with ACS / CDC sources later.
export const ACCESSIBILITY_ASSUMPTION_RATES = {
  disability_rate: 0.14,
  mobility_support_rate: 0.32,
  hearing_vision_support_rate: 0.16,
  default_affected_population: 40000,
} as const;

const OPEN_FEMA_BASE = "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries";
const CDC_PLACES_BASE = "https://data.cdc.gov/resource/swc5-untb.json";
const ACS_BASE = "https://api.census.gov/data/2023/acs/acs5/subject";

const STATE_ABBR_TO_FIPS: Record<string, string> = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09", DE: "10",
  DC: "11", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17", IN: "18", IA: "19",
  KS: "20", KY: "21", LA: "22", ME: "23", MD: "24", MA: "25", MI: "26", MN: "27",
  MS: "28", MO: "29", MT: "30", NE: "31", NV: "32", NH: "33", NJ: "34", NM: "35",
  NY: "36", NC: "37", ND: "38", OH: "39", OK: "40", OR: "41", PA: "42", RI: "44",
  SC: "45", SD: "46", TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53",
  WV: "54", WI: "55", WY: "56", PR: "72",
};
const STATE_NAME_TO_ABBR: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "puerto rico": "PR",
};

function roundEstimate(value: number): number {
  return Math.round(Number.isFinite(value) ? value : 0);
}

function clampPopulation(value: number | null | undefined): number {
  if (!Number.isFinite(value ?? NaN)) {
    return ACCESSIBILITY_ASSUMPTION_RATES.default_affected_population;
  }
  return Math.max(0, Math.round(value as number));
}

function parseLocationHint(location?: string): { county?: string; stateAbbr?: string } {
  if (!location) return {};
  const parts = location.split(/[;,]/).map((x) => x.trim()).filter(Boolean);
  if (parts.length === 0) return {};

  const tail = parts[parts.length - 1] ?? "";
  const maybeAbbr = tail.toUpperCase();
  const stateAbbr =
    (STATE_ABBR_TO_FIPS[maybeAbbr] ? maybeAbbr : undefined) ??
    STATE_NAME_TO_ABBR[tail.toLowerCase()];

  const countyRaw = parts[0] ?? "";
  const county = countyRaw
    .replace(/\b(county|parish|borough|municipality|census area|city and borough)\b/gi, "")
    .trim();

  return { county: county || undefined, stateAbbr };
}

function parseNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchCountyProfile(
  countyName: string,
  stateAbbr: string,
  fetchFn: typeof fetch
): Promise<CountyProfile | null> {
  const stateFips = STATE_ABBR_TO_FIPS[stateAbbr];
  if (!stateFips) return null;

  const url = new URL(ACS_BASE);
  url.searchParams.set("get", "NAME,S1810_C01_001E,S1810_C02_001E");
  url.searchParams.set("for", "county:*");
  url.searchParams.set("in", `state:${stateFips}`);
  const key = process.env["CENSUS_API_KEY"]?.trim();
  if (key) url.searchParams.set("key", key);

  const res = await fetchFn(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  const rows = (await res.json()) as string[][];
  if (!Array.isArray(rows) || rows.length < 2) return null;

  const data = rows.slice(1);
  const match =
    data.find((row) =>
      (row[0] ?? "").toLowerCase().startsWith(countyName.toLowerCase())
    ) ?? data[0];
  if (!match) return null;

  return {
    countyName,
    stateFips,
    countyFips: match[4] ?? "",
    totalPopulation: parseNumber(match[1]),
    disabledPopulation: parseNumber(match[2]),
  };
}

async function fetchCdcPlacesRates(
  countyProfile: CountyProfile,
  fetchFn: typeof fetch
): Promise<PlacesRates> {
  const locationId = `${countyProfile.stateFips}${countyProfile.countyFips}`;
  const url = new URL(CDC_PLACES_BASE);
  url.searchParams.set("$select", "measureid,data_value,year");
  url.searchParams.set(
    "$where",
    `locationid='${locationId}' and datavaluetypeid='CrdPrv' and measureid in ('MOBILITY','HEARING','VISION')`
  );
  url.searchParams.set("$limit", "50");
  const res = await fetchFn(url.toString(), { cache: "no-store" });
  if (!res.ok) return {};
  const rows = (await res.json()) as Array<{
    measureid?: string;
    data_value?: string;
    year?: string;
  }>;
  if (!Array.isArray(rows)) return {};

  const latestByMeasure = new Map<string, { year: number; value: number }>();
  for (const row of rows) {
    const key = row.measureid ?? "";
    const year = parseNumber(row.year);
    const value = parseNumber(row.data_value) / 100;
    if (!key || !Number.isFinite(value) || value <= 0) continue;
    const prev = latestByMeasure.get(key);
    if (!prev || year >= prev.year) latestByMeasure.set(key, { year, value });
  }

  return {
    mobilityRate: latestByMeasure.get("MOBILITY")?.value,
    hearingRate: latestByMeasure.get("HEARING")?.value,
    visionRate: latestByMeasure.get("VISION")?.value,
  };
}

async function fetchRecentFemaCount(
  countyName: string,
  stateAbbr: string,
  fetchFn: typeof fetch
): Promise<number> {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 2);
  const filter = `stateCode eq '${stateAbbr}' and declarationDate ge '${since.toISOString()}'`;
  const url = new URL(OPEN_FEMA_BASE);
  url.searchParams.set("$select", "designatedArea,declarationDate");
  url.searchParams.set("$filter", filter);
  url.searchParams.set("$top", "200");
  const res = await fetchFn(url.toString(), { cache: "no-store" });
  if (!res.ok) return 0;
  const payload = (await res.json()) as {
    DisasterDeclarationsSummaries?: Array<{ designatedArea?: string }>;
  };
  const rows = payload.DisasterDeclarationsSummaries ?? [];
  return rows.filter((r) =>
    (r.designatedArea ?? "").toLowerCase().includes(countyName.toLowerCase())
  ).length;
}

function computeHighPrioritySheltersCount(params: {
  affectedPopulation: number;
  mobilityNeeds: number;
  hearingVisionNeeds: number;
  femaRecentCount: number;
}): number {
  const nearDisasterAreaScore = params.femaRecentCount > 0 ? 2 : 1;
  const highCheckInVolumeScore = Math.max(1, Math.round(params.affectedPopulation / 25000));
  const reportedNeedsScore = Math.max(
    1,
    Math.round((params.mobilityNeeds + params.hearingVisionNeeds) / 4000)
  );
  return Math.max(
    1,
    Math.min(12, nearDisasterAreaScore + highCheckInVolumeScore + reportedNeedsScore)
  );
}

/**
 * Aggregate-only estimator for accessibility planning.
 * Never returns user-level disability data.
 * Uses ACS + CDC PLACES + OpenFEMA when location can be resolved.
 */
export async function estimate_accessibility_impact(
  disaster_event: DisasterEventForAccessibility,
  deps?: EstimatorDeps
): Promise<AccessibilityImpactEstimate> {
  const fetchFn = deps?.fetchFn ?? fetch;
  const place = parseLocationHint(disaster_event.location);
  const countyProfile =
    place.county && place.stateAbbr
      ? await fetchCountyProfile(place.county, place.stateAbbr, fetchFn).catch(() => null)
      : null;
  const placesRates = countyProfile
    ? await fetchCdcPlacesRates(countyProfile, fetchFn).catch(() => ({}))
    : {};
  const femaRecentCount =
    place.county && place.stateAbbr
      ? await fetchRecentFemaCount(place.county, place.stateAbbr, fetchFn).catch(() => 0)
      : 0;

  const affectedPopulation = clampPopulation(
    disaster_event.affected_population ?? countyProfile?.totalPopulation ?? null
  );
  const disabilityRate = countyProfile?.totalPopulation
    ? countyProfile.disabledPopulation / countyProfile.totalPopulation
    : ACCESSIBILITY_ASSUMPTION_RATES.disability_rate;
  const disabledAffected = affectedPopulation * disabilityRate;

  const mobilityNeeds =
    placesRates.mobilityRate !== undefined
      ? affectedPopulation * placesRates.mobilityRate
      : disabledAffected * ACCESSIBILITY_ASSUMPTION_RATES.mobility_support_rate;
  const hearingVisionRate =
    placesRates.hearingRate !== undefined && placesRates.visionRate !== undefined
      ? (placesRates.hearingRate + placesRates.visionRate) / 2
      : undefined;
  const hearingVisionNeeds =
    hearingVisionRate !== undefined
      ? affectedPopulation * hearingVisionRate
      : disabledAffected * ACCESSIBILITY_ASSUMPTION_RATES.hearing_vision_support_rate;
  const highPrioritySheltersCount = computeHighPrioritySheltersCount({
    affectedPopulation,
    mobilityNeeds,
    hearingVisionNeeds,
    femaRecentCount,
  });

  return {
    disaster_id: disaster_event.id,
    estimated_people_with_disabilities_affected: roundEstimate(disabledAffected),
    estimated_mobility_support_needs: roundEstimate(mobilityNeeds),
    estimated_hearing_vision_support_needs: roundEstimate(hearingVisionNeeds),
    high_priority_shelters_count: highPrioritySheltersCount,
  };
}

export function toAccessibilityEventInput(
  id: string,
  alert?: DisasterAlert,
  affected_population?: number | null
): DisasterEventForAccessibility {
  return {
    id,
    location: alert?.location,
    affected_population,
  };
}
