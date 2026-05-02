# TRIBE-V2 Harness Implementation Handoff

## Imperative Judgment

Use the current Next.js stack for TRIBE-V2 now.

The fastest correct implementation in this repo is not a new Python/FastAPI/Postgres/Redis service. This checkout already has:

- Next.js API routes
- Twilio SMS and voice routes
- an in-memory communication store
- a seeded disaster intelligence dashboard with hotspots
- a registry store that now includes demo person profiles

So TRIBE-V2 is implemented as a TypeScript harness under `lib/tribe-v2` with stable JSON endpoints under `app/api/tribe-v2`. Vapi, Twilio, the map, and any future backend can all call the same contracts. A later engineer can replace the in-memory store with SQLite/Postgres without changing the orchestration surface.

## What Exists Now

### Profile Store

Files:

- `lib/registry/types.ts`
- `lib/registry/store.ts`
- `app/api/registry/contacts/route.ts`

The registry now supports:

- age
- disability
- preferred language
- emergency contact phone
- phone number
- latitude / longitude
- communication preference and cadence

Four synthetic demo profiles are seeded:

- `demo-oxygen-elder`
- `demo-asl-deaf`
- `demo-spanish-wheelchair`
- `demo-dialysis-insulin`

The phone numbers default to safe `+1555...` placeholders. Override them with:

- `BLACKBOX_DEMO_PROFILE_1_PHONE`
- `BLACKBOX_DEMO_PROFILE_2_PHONE`
- `BLACKBOX_DEMO_PROFILE_3_PHONE`
- `BLACKBOX_DEMO_PROFILE_4_PHONE`

Emergency contact defaults to `+16124331186`.

### TRIBE-V2 Harness

Files:

- `lib/tribe-v2/types.ts`
- `lib/tribe-v2/tokenizer.ts`
- `lib/tribe-v2/scoring.ts`
- `lib/tribe-v2/store.ts`
- `lib/tribe-v2/harness.ts`
- `lib/tribe-v2/index.ts`

Public API:

```ts
evaluateLive({
  household_id,
  full_transcript,
  latest_turn,
  call_id,
  disaster_id,
})
```

Used during live voice turns. It returns a Vapi-friendly `LiveDecision`:

```json
{
  "say": "Okay. I am alerting the dispatcher now. Stay on the line with me.",
  "continue": true,
  "end_call": false,
  "escalate_now": true,
  "escalate_reason": "respiratory equipment dependency"
}
```

```ts
evaluateSignal({
  household_id,
  phone_number,
  channel,
  transcript,
  disaster_id,
  disaster_name,
  audio_url,
})
```

Used after SMS, ASL, no-response, completed call, or dropped call. It creates a final escalation packet and a dispatcher case.

### API Routes

Files:

- `app/api/tribe-v2/live-turn/route.ts`
- `app/api/tribe-v2/snapshots/route.ts`
- `app/api/tribe-v2/dispatcher-cases/route.ts`

Use these contracts:

```http
POST /api/tribe-v2/live-turn
```

```json
{
  "household_id": "demo-oxygen-elder",
  "call_id": "demo-call-1",
  "disaster_id": "flood-rock-wi-2026-05-02",
  "full_transcript_so_far": "Agent: Are you safe?",
  "latest_user_turn": "The power is out and my oxygen is low."
}
```

```http
POST /api/tribe-v2/snapshots
```

```json
{
  "phone_number": "+15550100001",
  "channel": "sms",
  "disaster_id": "flood-rock-wi-2026-05-02",
  "transcript": "Need help. Power is out and oxygen concentrator stopped."
}
```

```http
GET /api/tribe-v2/dispatcher-cases
```

Returns the live/final cases the dispatcher map can render.

## Current Orchestration Wiring

Existing routes now call TRIBE-V2:

- `app/api/communications/webhooks/twilio/route.ts`
- `app/api/communications/simulate-reply/route.ts`
- `app/api/communications/voice/wellness/gather/route.ts`
- `lib/communications/analytics.ts`

That means:

- Twilio SMS replies create post-signal escalation packets.
- Simulated replies create post-signal escalation packets.
- Current Twilio DTMF voice checkpoints create post-signal escalation packets.
- Vapi can call `/api/tribe-v2/live-turn` during a live call without replacing the existing Twilio demo flow.
- Communications analytics now includes `dispatcher_cases` so existing dashboards can read escalation state without another fetch.

## Vapi Bridge

Do not force the Vapi SDK into this repo yet. Configure Vapi to call the HTTP endpoint as a tool:

Tool name:

```text
tribe_evaluate_turn
```

Server URL:

```text
https://<public-demo-host>/api/tribe-v2/live-turn
```

Parameters:

```json
{
  "household_id": "demo-oxygen-elder",
  "call_id": "{{call.id}}",
  "full_transcript_so_far": "{{transcript}}",
  "latest_user_turn": "{{latest_user_turn}}",
  "disaster_id": "flood-rock-wi-2026-05-02"
}
```

Vapi should speak only the returned `say` field and keep the call open when `continue` is true. If `escalate_now` is true, the dispatcher case is already written by the harness.

## Map Feature Contract

The map should call:

```http
GET /api/tribe-v2/dispatcher-cases
```

Each case includes:

- `household_id`
- profile
- severity
- score
- location label
- latitude / longitude when known
- channel
- latest transcript
- brief
- recommended action

This is intentionally close to the disaster dashboard hotspot model. It lets the map render live vulnerable-person cases without needing to understand tokenizer internals.

## Semantic Reconstruction Track

Huth Lab style semantic decoding is research inspiration, not a demo dependency.

What to copy from that work:

- reconstruct meaning rather than exact words
- maintain a rolling semantic state
- compare new utterances against historical profile context
- surface uncertainty and alternate interpretations

What not to do now:

- do not depend on fMRI, brain scans, or subject-specific neural models
- do not describe emergency triage as brain decoding
- do not use this for live escalation until clinically and ethically validated

For this app, "semantic reconstruction" means deterministic reconstruction from transcript/audio metadata into:

- infrastructure risk
- medical continuity risk
- communication modality mismatch
- location certainty
- urgency
- dispatcher action

## Next Agent Work Queue

1. Wire dispatcher map UI to `GET /api/tribe-v2/dispatcher-cases`.
2. Add visible states: `in_progress`, `final`, `CRITICAL`, `ELEVATED`, `WATCH`, `LOW`.
3. Configure Vapi tool call to hit `/api/tribe-v2/live-turn`.
4. Add a Vapi call-start route only after the engineer confirms Vapi credentials and phone-number setup.
5. Persist `lib/tribe-v2/store.ts` to SQLite or Postgres when demo state needs to survive server restarts.
6. Add audio metadata fields later: silence duration, interruption count, low-confidence transcript flag, speaking rate.
7. Add multilingual utterance templates beyond Spanish after confirming Vapi voice availability.

## Files Recently Worked

- `TRIBI.md`
- `lib/registry/types.ts`
- `lib/registry/store.ts`
- `app/api/registry/contacts/route.ts`
- `lib/tribe-v2/types.ts`
- `lib/tribe-v2/tokenizer.ts`
- `lib/tribe-v2/scoring.ts`
- `lib/tribe-v2/store.ts`
- `lib/tribe-v2/harness.ts`
- `lib/tribe-v2/index.ts`
- `app/api/tribe-v2/live-turn/route.ts`
- `app/api/tribe-v2/snapshots/route.ts`
- `app/api/tribe-v2/dispatcher-cases/route.ts`
- `app/api/communications/webhooks/twilio/route.ts`
- `app/api/communications/simulate-reply/route.ts`
- `app/api/communications/voice/wellness/gather/route.ts`
- `lib/communications/analytics.ts`
