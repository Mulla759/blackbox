import { describe, expect, it } from "vitest";
import { estimate_accessibility_impact } from "@/lib/disaster/accessibility-impact";

describe("estimate_accessibility_impact", () => {
  it("uses default affected population when missing", async () => {
    const result = await estimate_accessibility_impact({
      id: "event-default",
    }, {
      fetchFn: (async () => new Response("[]", { status: 500 })) as typeof fetch,
    });

    expect(result.disaster_id).toBe("event-default");
    expect(result.estimated_people_with_disabilities_affected).toBe(5600);
    expect(result.estimated_mobility_support_needs).toBe(1792);
    expect(result.estimated_hearing_vision_support_needs).toBe(896);
    expect(result.high_priority_shelters_count).toBeGreaterThan(0);
  });

  it("calculates values from provided affected population", async () => {
    const result = await estimate_accessibility_impact({
      id: "event-pop",
      location: "Hennepin County, Minnesota",
      affected_population: 50000,
    }, {
      fetchFn: (async () => new Response("[]", { status: 500 })) as typeof fetch,
    });

    expect(result.estimated_people_with_disabilities_affected).toBe(7000);
    expect(result.estimated_mobility_support_needs).toBe(2240);
    expect(result.estimated_hearing_vision_support_needs).toBe(1120);
  });
});
