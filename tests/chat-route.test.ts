import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";

describe("POST /api/chat privacy behavior", () => {
  beforeEach(() => {
    process.env["GEMINI_API_KEY"] = "test-key";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns aggregate-only answer and avoids individual fields in context payload", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const bodyText = String(init?.body ?? "");
      expect(bodyText.includes("phone_number")).toBe(false);
      expect(bodyText.includes("medical_record")).toBe(false);
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "Use shelter s1 and hotspot h1 first." }] } }],
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Which shelters need most help?",
        context: { active_disaster_id: "flood-rock-wi-2026-05-02" },
      }),
    });
    const res = await POST(req);
    const body = (await res.json()) as { answer?: string; privacy?: string };
    expect(res.status).toBe(200);
    expect(body.answer).toContain("shelter");
    expect(body.privacy).toBe("aggregate_only");
  });
});
