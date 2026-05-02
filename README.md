# BLACKBOX

> Disaster response for the people the system forgets.

## The Double Crisis

When disaster strikes, people with disabilities face two crises: the disaster itself, and the loss of the infrastructure that keeps them alive. Power dies and ventilators stop. Pharmacies collapse and medications run out. Alerts broadcast in formats the deaf and blind cannot receive. Evacuation routes were never built for wheelchairs.

First responders arrive without knowing who depends on oxygen, who cannot hear the siren, who needs help leaving the building. The most vulnerable become invisible at the moment they need the most support.

## What BLACKBOX Does

Every at-risk household gets a dedicated AI agent that:

- **Reaches** the person in their actual modality — voice, ASL clip, low-literacy SMS, native language
- **Assesses** their state through a structured conversation
- **Escalates** to a human dispatcher only when they are no longer able to stay safe
- **Stays** with them through recovery, watching for caregiver burnout, missed medications, and isolation drift

**Two users, one system:**
- **First responders** get a triaged queue with prepared briefs and ranked actions instead of a flood of unknowns.
- **Individuals** get someone who reaches out before they have to ask, in a way they can actually understand.

## Architecture

A disaster trigger spawns one persona-aware agent per household. Each agent reads the person's profile, picks a modality, and contacts them through the Modality Router. Raw signals flow into the **TRIBE Harness** — the final triage stage that decides whether to schedule a follow-up or escalate to a dispatcher.

**Flow:** Disaster Trigger → Orchestrator → Per-Household Agents → Modality Router → **TRIBE Harness** (last) → Dispatcher Console

**Per-Person Profile:** age, disability, preferred language, emergency contact, phone, location. The agent reads this at kickoff to pick modality, language, and persona-specific thresholds.

**Why TRIBE is last:** Agents and the router handle *reaching* and *capturing*. TRIBE handles *deciding*. Keeping triage logic in one place means new modalities can be added without touching escalation logic, and new personas can be added without touching the comms stack.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11 + FastAPI (single process) |
| TRIBE harness | Claude (Anthropic API) with structured outputs |
| Voice + SMS | Twilio |
| TTS | ElevenLabs |
| STT | OpenAI Whisper API |
| ASL | Pre-recorded MP4 clips, sent as SMS link |
| State store | SQLite |
| Scheduling + event bus | In-process asyncio + WebSockets |
| Dispatcher console | Next.js 14, Tailwind, shadcn/ui |

## Getting Started

See [`Contributor.md`](./Contributor.md) for setup, repo layout, and how to add personas, modalities, or critics.

## Team

**BLACKBOX** — built for the AIIS Innovation Hackathon.

## License

Hackathon project. License TBD.