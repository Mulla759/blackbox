import { NextResponse } from "next/server";
import { buildDashboardData } from "@/lib/disaster-intel";

export const dynamic = "force-dynamic";

type ChatReq = {
  message?: string;
  context?: { active_disaster_id?: string };
};

function buildAggregateContext(disasterId: string) {
  const dashboard = buildDashboardData(disasterId);
  if (!dashboard) return null;
  return {
    disaster: dashboard.disaster,
    accessibility_impact: dashboard.accessibility_impact,
    shelters: dashboard.shelters.map((s) => ({
      id: s.id,
      name: s.name,
      occupancy: s.current_occupancy,
      capacity: s.capacity,
      high_priority: s.high_priority,
      priority_reason: s.priority_reason,
    })),
    hotspots: dashboard.hotspots.map((h) => ({
      id: h.id,
      risk_level: h.risk_level,
      reason: h.reason,
      estimated_people_affected: h.estimated_people_affected,
      estimated_accessibility_needs: h.estimated_accessibility_needs,
    })),
  };
}

export async function POST(req: Request) {
  const key = process.env["GEMINI_API_KEY"]?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY in environment." },
      { status: 500 }
    );
  }

  let body: ChatReq;
  try {
    body = (await req.json()) as ChatReq;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = body.message?.trim();
  const disasterId = body.context?.active_disaster_id?.trim() || "flood-rock-wi-2026-05-02";
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const aggregate = buildAggregateContext(disasterId);
  if (!aggregate) {
    return NextResponse.json({ error: "Unknown disaster id context." }, { status: 404 });
  }

  const systemPrompt =
    "You are BlackBox Disaster Intelligence Assistant. Use aggregate data only. " +
    "Never invent or expose personal identities, phone numbers, medical records, or exact private locations. " +
    "Use words like estimated/probable. Prioritize emergency response and accessibility support recommendations.";

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Question: ${message}\n\nAggregate dashboard context:\n${JSON.stringify(
                aggregate
              )}`,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return NextResponse.json(
      { error: `Gemini API error: ${errText.slice(0, 500)}` },
      { status: 502 }
    );
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim() || "No response generated.";

  return NextResponse.json({
    answer: text,
    privacy: "aggregate_only",
  });
}
