import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/disasters/[id]/dashboard/route";

describe("GET /api/disasters/:id/dashboard", () => {
  it("returns expected dashboard response shape", async () => {
    const res = await GET(new Request("http://localhost/api/disasters/flood-rock-wi-2026-05-02/dashboard"), {
      params: Promise.resolve({ id: "flood-rock-wi-2026-05-02" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("disaster");
    expect(body).toHaveProperty("accessibility_impact");
    expect(body).toHaveProperty("shelters");
    expect(body).toHaveProperty("hotspots");
    expect(body).toHaveProperty("map_center");
  });
});
