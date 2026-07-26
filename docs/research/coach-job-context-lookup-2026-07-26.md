---
title: Coach job-context lookup - DEEP map, held for joint scoping
owner: cv-lane
last_reviewed: 2026-07-26
status: report-and-hold (DEEP; do NOT build without joint scoping)
code_paths:
  - supabase/functions/ai-chat/index.ts
  - supabase/functions/ai-chat/prompt-lib.ts
  - supabase/functions/ai-chat/page-context.ts
---

# Coach job-context lookup (item B.1)

Trigger: a real walkthrough. The coach told Eli it had NO job description for a
"Chainalysis - Intelligence Analyst" role that was sitting in his Jobs feed,
FULLY EXTRACTED. Item B split by depth (Eli): the phrasing fix (B.2) shipped alone
(PR #770); job-lookup-by-name is DEEP -> this map, HELD for joint scoping. The
phrasing failures are a separate fix and are NOT what this doc covers.

## What the coach can reach today (VERIFIED, file:line)

- **Coach edge fn:** `supabase/functions/ai-chat/index.ts` (single-shot chat
  completion, `callOpenAI` ~304-345). Prompt library `prompt-lib.ts` (shared
  verbatim with the eval harness). Page context `page-context.ts`.
- **Job context is ID-driven only.** Assembled in `buildUserContext`
  (`prompt-lib.ts:649-925`) from `page_context`, which the drawer forwards as the
  current route + entity **IDs**, hydrated in `fetchPageContextEntities`
  (`page-context.ts:370`). Two job paths:
  - **TARGET JOB** - fires only when the frontend passes a `job_id` (a job the
    user is actively viewing). Fetched `page-context.ts:400-409`, rendered
    `273-296`. The select at `403-404` **deliberately omits the JD prose**
    (`jobs.description`) - so even a pinned job gives metadata, never the JD text.
  - **VISIBLE ON SCREEN** job list - compact rows, no JD (`439-448`).
  - Merely NAMING a job in chat surfaces nothing. If no `job_id` was passed for
    the Chainalysis role, the coach truthfully had zero context - the walkthrough gap.
  - (Contrast: TARGET APPLICATION DOES carry JD text, capped 2000 chars,
    `prompt-lib.ts:874-891`.)
- **No tools / function-calling.** `index.ts` never sends `tools`/`tool_choice`;
  it is a single-shot completion whose text carries `SUGGESTED_*_JSON` blocks
  parsed deterministically (`parseSuggestions`, `prompt-lib.ts:1201+`). The model
  cannot invoke a lookup mid-generation. **There is no harness to hang a lookup tool on.**

## Why "coach looks up a named job" is DEEP

- **No name+company query exists.** The one relevant RPC,
  `search_jobs_by_role_titles(TEXT[], ...)` (`20260612_jobs_search_deterministic_order.sql:19`),
  is trigram over `jobs.title` ONLY - no company param, cannot disambiguate
  "Intelligence Analyst" to Chainalysis. A name+company lookup is net-new (new RPC
  or an inline `.ilike('title',...).ilike('company_name',...)` on the public `jobs`
  table, filtered `is_il`/`is_active`).
- **No tool loop.** Autonomous lookup means either (i) building a tool-calling loop
  on a currently single-shot completion (net-new infra), or (ii) a deterministic
  server-side pre-pass in `index.ts` (like the existing `targetAppRole` fetch at
  `425-433`) that detects "the user named a corpus job" - a fuzzy new heuristic.
- **Correctness + budget risk.** A fuzzy match can pick the WRONG row; JD prose
  needs a context-budget cap (mirror the 2000-char app-JD cap); new eval fixtures
  needed.

**Surface if built:** `index.ts` (pre-pass + injection) + `page-context.ts` /
`buildUserContext` (new block) + a migration or inline query + `prompt-lib.ts`
(rules telling the coach it may reference a looked-up job) + tests + eval.

## The adjacent SHALLOW win (also held - needs a frontend answer first)

Even when a job IS pinned (`job_id` present), the coach can't quote the JD because
the TARGET JOB select omits `description`. Adding a capped `description` to the
select (`page-context.ts:403-404`) + render (`273-296`) is small and scoped.
**BUT** it only helps if the frontend actually passes a `job_id` when a Jobs-feed
row is open - unverified, and the frontend hook is the design lane's. It does NOT
solve the walkthrough (user named an UNpinned job). Open question for joint scoping:
does the Jobs feed pass `job_id` to the coach drawer today?

## Options for joint scoping (pick at scoping time; do not build unasked)

1. **SHALLOW-A:** add capped JD to the pinned TARGET JOB block. Cheap; helps only
   the "job open on screen" case; gated on the frontend `job_id` question above.
2. **MEDIUM:** deterministic server-side pre-pass in `index.ts` - detect a named
   job (title + optional company) in the user's message, run an `.ilike` lookup,
   inject a capped JD block. No tool loop. Risk: fuzzy match picks wrong row;
   needs a confidence floor + "which one did you mean?" fallback.
3. **DEEP:** real tool-calling loop with a `lookup_job(title, company)` tool +
   new RPC. Most general, most infra, highest cost.

## Advisory carried from B.2 verification (belongs here, not the pre-flip fix)

Tracker-action anti-fabrication is currently PROMPT-ONLY. CV generation has a
deterministic backstop (`stripUnbackedCvGenerationClaim`, `prompt-lib.ts:444`) that
strips unbacked "generating now" sentences regardless of model compliance. If
tracker-fabrication recurs after the B.2 phrasing fix deploys, a sibling regex
strip for unbacked "I'll add / added / tracked" claims is the deterministic hardening.

## Ledger

- **VERIFIED:** coach job context is ID-driven, JD-omitted on the pinned-job path,
  zero tools, no name+company RPC.
- **Verdict:** job-lookup-by-name = DEEP -> HOLD for joint scoping. Phrasing fix
  (B.2) shipped alone: PR #770.
- **Open questions:** (1) does the Jobs feed pass `job_id` to the coach today?
  (2) which option (1/2/3) at scoping? (3) eval-harness import path for prompt-lib
  (to size fixture churn before any prompt/context change).
