# BLACKBOX — Slide Topics

> Every topic maps to something built and working in this repo. Nothing speculative.

---

## Slide 1 — Title

BLACKBOX — Disaster Detection · Accessibility-First Emergency Response

---

## Slide 2 — Problem

Emergency systems fail the people who need them most.

- Voice-only sirens don't reach Deaf residents
- Phone trees skip people on oxygen or dialysis
- Evacuation plans ignore wheelchair users
- No real-time triage by individual vulnerability
- Population-level estimates miss person-level needs

---

## Slide 3 — What BLACKBOX Is

A live disaster response layer that treats accessibility as infrastructure.

- Next.js app pulling real-time data from three federal APIs
- NWS (National Weather Service) — live alerts
- Census ACS — county disability population data
- CDC PLACES — mobility, hearing, vision rates by county
- Person-level triage engine (TRIBE v2) that scores individual risk
- Multi-channel outreach: SMS, voice calls, AI-assisted calls, ASL video

---

## Slide 4 — Architecture

How the pieces connect (what's actually wired in the repo):

```
NWS Alerts API
    ↓
AlertsDashboard (/, live feed with search + filter + severity sort)
    ↓
Disaster Intelligence Dashboard (/dashboard)
  - Google Maps with shelter/hotspot pins + disaster radius
  - Accessibility impact estimator (Census ACS + CDC PLACES + OpenFEMA)
  - Gemini AI chatbot (aggregate data queries)
    ↓
Communications Layer
  - Twilio SMS (outbound alerts, inbound safety replies)
  - Twilio Voice (DTMF wellness check IVR, multi-stage)
  - VAPI (live AI conversation, transcript → TRIBE)
    ↓
TRIBE v2 Harness
  - Tokenizer → Persona Scorer → Escalation Packets → Dispatcher Cases
    ↓
Dispatcher / Map
  - Live cases with severity, location, recommended actions
```

---

## Slide 5 — Live Alerts Dashboard

Page: `/`

What it does:
- Pulls every active alert from `api.weather.gov/alerts/active` in real time
- Filter by event type, severity, urgency
- Sort: Extreme → Severe → Moderate → Minor
- Per-alert accessibility impact estimator (one click → hits Census + CDC)
- No cached data — every page load is a fresh NWS fetch

---

## Slide 6 — Disaster Intelligence Dashboard

Page: `/dashboard`

What it shows:
- Google Maps with disaster epicenter, affected radius circle, shelter pins, hotspot pins
- Shelter details: occupancy/capacity, wheelchair accessible, medical support, backup power, transport support
- Hotspot details: risk level, estimated people affected, estimated accessibility needs
- Accessibility impact panel: estimated disabled population, mobility needs, hearing/vision needs, high-priority shelter count
- Live re-estimate button: calls Census ACS + CDC PLACES on demand
- Gemini AI chatbot: natural language queries about priorities, hotspots, shelters (aggregate data only, no PII)

---

## Slide 7 — Communications System

Three channels, routed by who the person is:

**SMS (Twilio)**
- Emergency alert broadcast to affected contacts
- Inbound reply: "1" = need help, "2" = safe, "3" = emergency
- Inbound webhook processes reply → feeds into TRIBE for scoring
- Works for Deaf individuals (Keith's primary channel)

**Voice (Twilio DTMF)**
- Outbound wellness check-in call
- IVR: press 1/2/3 for status
- Multi-stage: state code entry via keypad, active disaster selection from live NWS data
- Status callbacks tracked in communication log

**VAPI (AI live call)**
- Real-time AI conversation with the person
- Full transcript sent to TRIBE harness each turn
- Persona-aware responses (language, disability, cadence)
- Mid-call escalation when TRIBE scores CRITICAL

**Disaster dispatch trigger**: one API call sends to all registered contacts or filters by location.

---

## Slide 8 — TRIBE v2 Escalation Harness

The core triage engine. Person-level, not population-level.

**Pipeline**:
1. Signal comes in (voice transcript, SMS reply, DTMF keypress, silence)
2. Tokenizer extracts terms across five categories:
   - Distress: panic, trapped, can't breathe, alone, hurt
   - Infrastructure: power, outage, oxygen, elevator, dialysis, generator
   - Medical: insulin, chest pain, ventilator, blood sugar, medication
   - Communication: deaf, ASL, interpreter, spanish, somali, hmong
   - Location: home, apartment, shelter, basement, address
3. Persona Scorer combines signal tokens + profile data (age, disability, equipment dependencies, language, cadence)
4. Outputs a risk band: CRITICAL / ELEVATED / WATCH / LOW
5. Hard thresholds trigger immediate escalation (e.g., oxygen-dependent + power outage)
6. Escalation packet written with brief, recommended action, four critiques (medical fragility, dignity, modality, continuity)
7. Dispatcher case created with location, severity, transcript, action

**Scoring examples from the code**:
- Oxygen elder + "power is out" → score 78+ → CRITICAL, hard threshold
- Deaf user + no response → ELEVATED (modality mismatch flagged)
- Spanish wheelchair user + "estoy bien" → LOW (all-clear detected)
- Dialysis patient + "need help" → ELEVATED → dispatcher follow-up queued

---

## Slide 9 — Four Demo Profiles

All pinned at Ely, Lake County, MN (47.9032, -91.8671) — inside a live NWS alert zone.

**Johnathan** — oxygen dependent elder, age 78
- COPD, oxygen concentrator, needs power
- Voice + SMS, slow cadence
- Demo: press 1 (need help) → drives CRITICAL escalation

**Keith** — Deaf ASL signer, age 42
- Cannot receive sirens or voice-only alerts
- NEVER voice-called — SMS only + ASL video for escalation
- TRIBE enforces this at every level (utterance, recommended action, critique)

**Maria** — Spanish wheelchair user, age 55
- Elevator dependent, limited evacuation access
- Voice + SMS, Spanish prompts
- Demo: press 2 (safe) → LOW risk

**Terry** — dialysis and insulin dependent, age 63
- Dialysis schedule, insulin must stay refrigerated
- SMS preferred, urgent cadence
- Demo: press 1 (help) → ELEVATED → follow-up

Hardcoded phone numbers. Pins sit inside whatever NWS alert polygon is active for Lake County, MN — the dashboard pulls that live.

---

## Slide 10 — Accessibility Impact Estimator

Three federal APIs feeding one estimate per disaster:

**Census ACS** (api.census.gov)
- County total population
- County disabled population percentage
- Replaces the 14% national assumption with real local data

**CDC PLACES** (data.cdc.gov)
- Mobility disability rate by county
- Hearing disability rate by county
- Vision disability rate by county
- Replaces the 32% mobility / 16% hearing-vision assumptions

**OpenFEMA** (fema.gov)
- Recent disaster declarations in the county (last 2 years)
- Factors into high-priority shelter count calculation

**Output**: estimated people with disabilities affected, mobility support needs, hearing/vision support needs, high-priority shelter count.

Falls back to national rates when any API is unavailable.

---

## Slide 11 — Analytics & Operations Dashboard

Page: `/analytics`

What it shows:
- Stat cards: outbound SMS, inbound replies, voice attempts, failed deliveries
- Safety response breakdown: safe / needs help / emergency / unknown
- Responses grouped by disaster event
- Area code distribution
- Communication log (recent messages with status)
- Contact registry: add/remove people with disability, language, location, lat/lng, communication preferences
- Disaster broadcast trigger: send to all registered or filter by location text
- Simulate inbound reply (for demos without real phones)
- TRIBE dispatcher cases integrated into the analytics view
- NWS alert sidebar

---

## Slide 12 — Contact Registry

How profiles are managed:

- CRUD via `/api/registry/contacts`
- Fields: phone, label, location, age, disability, preferred language, emergency contact, lat/lng, communication preferences (modality + cadence)
- Four demo profiles seeded on startup (Johnathan, Keith, Maria, Terry)
- Location-based broadcast: "send to everyone in MN" matches registry contacts by location text
- Profiles feed directly into TRIBE scoring — disability, age, language, modality all affect risk bands and recommended actions

---

## Slide 13 — Live Demo Flow

What happens when you trigger the demo:

1. Hit disaster broadcast → SMS goes to all four profiles in Ely, MN
2. Johnathan's phone rings (Twilio voice wellness check)
3. Johnathan presses 1 (need help) → TRIBE tokenizes → oxygen + power context → CRITICAL → dispatcher case opens immediately
4. Keith gets SMS instructions (never called) → dispatcher case shows ASL video call option for escalation
5. Maria hears Spanish prompt → presses 2 (safe) → TRIBE scores LOW → recorded
6. Terry presses 1 (help) → TRIBE scores ELEVATED → follow-up queued, dispatcher case created
7. Dashboard map shows four pins at Ely, MN overlapping the live NWS flood warning polygon
8. Dispatcher cases panel shows all four with severity bands, briefs, and recommended actions
9. Analytics dashboard updates in real time with message counts and response breakdown

---

## Slide 14 — What's Next

What's ready but not yet wired:
- VAPI live AI call integration — `/api/tribe-v2/live-turn` endpoint is built and tested, waiting on VAPI credentials + phone number setup
- Dispatcher map UI — `/api/tribe-v2/dispatcher-cases` endpoint returns everything the map needs (severity, lat/lng, brief, action)
- Persistent storage — replace in-memory stores with SQLite or Postgres so state survives server restarts
- Audio metadata — silence duration, interruption count, speaking rate, low-confidence transcript flags
- More languages — utterance templates beyond English and Spanish (Somali, Hmong in tokenizer already)
- Production routing — real Twilio numbers, real VAPI assistant, real deployment

---

## Slide 15 — Close

BLACKBOX — the system that calls you back.
