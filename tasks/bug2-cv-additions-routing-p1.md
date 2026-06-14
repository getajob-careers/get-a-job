# P1 — CV agent: route "add X to my CV" through a data ADD, then regenerate

Status: FILED, not built (agreed 2026-06-14). Post-email. Stop-gap (Bug 1
StoryBank honesty) ships first.

> ⚠️ Cross-ref: this is the SAME capability as task **#390** (chat→story-save,
> being built by terminal 1). Do NOT build this twice — fold the CV-additions
> routing into #390's propose→confirm→write flow. This note is the diagnosis
>
> - fix direction; #390 is the implementation.

## Problem (diagnosed 2026-06-14)

A user telling the chat/CV agent "add X to my resume" sees X NOT appear. Root
cause is the LLM↔server authority split having NO additions channel, plus
anti-fab correctly refusing ungrounded content:

- Chat emits `SUGGESTED_CV_GENERATION_JSON:{target_role, application_id,
job_description}` (ai-chat/prompt-lib.ts:316) — no field for user additions;
  the "add X" text is dropped at the handoff.
- `CVManagement` invokes `generate-tailored-cv` with only those 3 fields
  (CVManagement.jsx:76-80).
- `generate-tailored-cv` rebuilds the CV strictly from authoritative DB rows
  (experiences, stories, proof_signals) with aggressive anti-fab (even
  "must-include phrases" are rejected as fabrication, index.ts:191). It has no
  additions input (body parsed at index.ts:319).
  So "add X" never reaches authoring, and even if it did, anti-fab refuses
  anything not grounded in the user's real data. (Correct behavior — the CV is a
  faithful projection of authoritative data; it must not fabricate.)

## Fix direction

Route an "add X to my CV/resume" request to a DATA MUTATION first, then
regenerate so the CV includes X because it's now grounded:

1. The chat agent detects "add X to my CV/resume" intent and, instead of (or
   before) a bare CV regen, proposes a story/profile ADD — reuse the existing
   `SUGGESTED_STORY_CAPTURE_JSON` (or a profile-edit action) in a
   propose→confirm→write flow.
2. On confirm, write X to stories/experiences (the authoritative layer).
3. THEN emit `SUGGESTED_CV_GENERATION_JSON` to regenerate — the new CV now
   contains X, grounded, no anti-fab conflict.

## Guardrails

- Keep propose→confirm→write (never silent writes to user data).
- If X is already in the profile but the CV omitted it, that's a surfacing
  gap, not anti-fab — handle separately (don't double-add).
- Anti-fab in generate-tailored-cv stays as-is; this routes around it via the
  data layer, it does NOT weaken it.
