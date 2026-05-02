import { NextResponse } from "next/server";
import { evaluateLive } from "@/lib/tribe-v2";

export const dynamic = "force-dynamic";

type Body = {
  household_id?: string;
  full_transcript?: string;
  full_transcript_so_far?: string;
  latest_turn?: string;
  latest_user_turn?: string;
  call_id?: string;
  disaster_id?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const household_id = typeof body.household_id === "string" ? body.household_id.trim() : "";
  const latest_turn =
    typeof body.latest_user_turn === "string"
      ? body.latest_user_turn
      : typeof body.latest_turn === "string"
        ? body.latest_turn
        : "";
  if (!household_id || !latest_turn.trim()) {
    return NextResponse.json(
      { error: "household_id and latest_user_turn are required" },
      { status: 400 }
    );
  }

  const decision = await evaluateLive({
    household_id,
    latest_turn,
    full_transcript:
      typeof body.full_transcript_so_far === "string"
        ? body.full_transcript_so_far
        : typeof body.full_transcript === "string"
          ? body.full_transcript
          : latest_turn,
    call_id: typeof body.call_id === "string" ? body.call_id : undefined,
    disaster_id: typeof body.disaster_id === "string" ? body.disaster_id : undefined,
  });

  return NextResponse.json(decision);
}

