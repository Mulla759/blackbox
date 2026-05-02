import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/disaster", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/disaster")>();
  return {
    ...actual,
    fetchActiveNwsAlerts: vi.fn(async () => ({
      ok: true as const,
      alerts: [
        {
          sourceId: "123",
          type: "Flood Warning",
          location: "Dakota County, Minnesota",
          severity: "Severe",
          urgency: "Immediate",
          description: "River overflow risk.",
        },
      ],
    })),
    estimate_accessibility_impact: vi.fn(async () => ({
      disaster_id: "123",
      estimated_people_with_disabilities_affected: 5600,
      estimated_mobility_support_needs: 1792,
      estimated_hearing_vision_support_needs: 896,
      high_priority_shelters_count: 5,
    })),
  };
});

describe("GET /api/disasters/[id]/accessibility-impact", () => {
  it("returns expected aggregate response shape", async () => {
    const { GET } = await import(
      "@/app/api/disasters/[id]/accessibility-impact/route"
    );

    const req = new Request(
      "http://localhost:3000/api/disasters/123/accessibility-impact?affected_population=40000"
    );
    const res = await GET(req, { params: Promise.resolve({ id: "123" }) });
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.disaster_id).toBe("123");
    expect(typeof body.estimated_people_with_disabilities_affected).toBe("number");
    expect(typeof body.estimated_mobility_support_needs).toBe("number");
    expect(typeof body.estimated_hearing_vision_support_needs).toBe("number");
    expect(typeof body.high_priority_shelters).toBe("number");
    expect(typeof body.high_priority_shelters_count).toBe("number");
  });

  it("does not expose any individual user data", async () => {
    const { GET } = await import(
      "@/app/api/disasters/[id]/accessibility-impact/route"
    );
    const req = new Request(
      "http://localhost:3000/api/disasters/123/accessibility-impact"
    );
    const res = await GET(req, { params: Promise.resolve({ id: "123" }) });
    const body = (await res.json()) as Record<string, unknown>;
    const keys = Object.keys(body);

    expect(keys).toEqual(
      expect.arrayContaining([
        "disaster_id",
        "estimated_people_with_disabilities_affected",
        "estimated_mobility_support_needs",
        "estimated_hearing_vision_support_needs",
        "high_priority_shelters",
      ])
    );
    expect(keys).not.toEqual(
      expect.arrayContaining([
        "users",
        "people",
        "identities",
        "phone_number",
        "name",
        "address",
      ])
    );
  });
});
