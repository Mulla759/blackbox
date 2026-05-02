# Contributor Guide

For humans and AI coding agents working on BLACKBOX. Read this before changing code.

## What BLACKBOX Is

A disaster trigger spawns one AI agent per at-risk household. Each agent reaches its
person in their actual modality (voice, SMS, ASL clip link, native language), captures
raw signals, and ships them to TRIBE. TRIBE is the final stage — it tokenizes, scores
against persona thresholds, runs swarm critique, and decides: stable / watch / escalate.
The dispatcher confirms any real-world action.

## Architectural Invariants

Don't break these. If you want to, raise it before writing code.

1. **TRIBE is last.** Agents capture, router routes, TRIBE decides. No escalation
   logic upstream of TRIBE.
2. **Persona logic lives in TRIBE only.** Tokenizer is persona-agnostic. Thresholds
   live in persona JSON, read by TRIBE.
3. **One agent per household.** Bound at orchestrator