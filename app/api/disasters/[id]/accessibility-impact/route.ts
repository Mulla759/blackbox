import { NextResponse } from "next/server";
import {
  estimate_accessibility_impact,
  fetchActiveNwsAlerts,
  toAccessibilityEventInput,
} from "@/lib/disaster";
import { estimateAccessibilityImpact, getDisasterById } from "@/lib/disaster-intel";

export const dynamic = "force-dynamic";

function parseAffectedPopulation(value: string | null): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Returns aggregate accessibility impact estimates for a disaster event.
 * Privacy-safe by design: response includes only counts, never individual identities.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "disaster id is required" }, { status: 400 });
  }

  const url = new URL(req.url);
  const affectedPopulation = parseAffectedPopulation(
    url.searchParams.get("affected_population")
  );

  const dashboardDisaster = getDisasterById(id);
  if (dashboardDisaster) {
    const impact = estimateAccessibilityImpact({
      ...dashboardDisaster,
      affected_population: affectedPopulation ?? dashboardDisaster.affected_population,
    });
    return NextResponse.json({
      disaster_id: impact.disaster_id,
      estimated_people_with_disabilities_affected:
        impact.estimated_people_with_disabilities_affected,
      estimated_mobility_support_needs: impact.estimated_mobility_support_needs,
      estimated_hearing_vision_support_needs:
        impact.estimated_hearing_vision_support_needs,
      high_priority_shelters: impact.high_priority_shelters,
    });
  }

  const alertsResult = await fetchActiveNwsAlerts();
  const alert = alertsResult.ok
    ? alertsResult.alerts.find((a) => a.sourceId === id)
    : undefined;

  const impact = await estimate_accessibility_impact(
    toAccessibilityEventInput(id, alert, affectedPopulation)
  );

  return NextResponse.json({
    disaster_id: impact.disaster_id,
    estimated_people_with_disabilities_affected:
      impact.estimated_people_with_disabilities_affected,
    estimated_mobility_support_needs: impact.estimated_mobility_support_needs,
    estimated_hearing_vision_support_needs:
      impact.estimated_hearing_vision_support_needs,
    high_priority_shelters_count: impact.high_priority_shelters_count,
    high_priority_shelters: impact.high_priority_shelters_count,
  });
}
