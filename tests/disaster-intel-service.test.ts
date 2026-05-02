import { describe, expect, it } from "vitest";
import { SEEDED_DISASTER, SEEDED_SHELTERS } from "@/lib/disaster-intel/mock-data";
import {
  estimateAccessibilityImpact,
  generateHotspots,
  prioritizeSheltersForDisaster,
} from "@/lib/disaster-intel";

describe("disaster intelligence service", () => {
  it("calculates accessibility estimate with required rates", () => {
    const res = estimateAccessibilityImpact(SEEDED_DISASTER);
    expect(res.disaster_id).toBe(SEEDED_DISASTER.id);
    expect(res.estimated_people_with_disabilities_affected).toBe(21362);
    expect(res.estimated_mobility_support_needs).toBe(6836);
    expect(res.estimated_hearing_vision_support_needs).toBe(3418);
  });

  it("marks shelters high priority using distance/occupancy/accessibility", () => {
    const shelters = prioritizeSheltersForDisaster(SEEDED_DISASTER, SEEDED_SHELTERS, 10254);
    expect(shelters.length).toBeGreaterThan(0);
    expect(shelters.some((s) => s.high_priority)).toBe(true);
    expect(
      shelters.every((s) =>
        ["near disaster zone", "high occupancy", "supports accessibility needs", "baseline coverage"].includes(
          s.priority_reason
        )
      )
    ).toBe(true);
  });

  it("generates hotspot risk output with required fields", () => {
    const shelters = prioritizeSheltersForDisaster(SEEDED_DISASTER, SEEDED_SHELTERS, 10254);
    const hotspots = generateHotspots(SEEDED_DISASTER, shelters, 10254);
    expect(hotspots.length).toBe(4);
    expect(hotspots[0]).toHaveProperty("risk_level");
    expect(hotspots[0]).toHaveProperty("estimated_people_affected");
    expect(hotspots[0]).toHaveProperty("estimated_accessibility_needs");
  });
});
