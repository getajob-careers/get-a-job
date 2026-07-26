---
title: Skill coverage - corpus mining + joint re-rank of the expansion batches
owner: cv-lane
last_reviewed: 2026-07-26
status: research (measurement only; reshapes the batch order, does NOT gate on Eli)
code_paths:
  - supabase/functions/_shared/libraries/01_skill_library.ts
  - supabase/functions/_shared/skill-aliases.ts
  - supabase/functions/extract-job-requirements/index.ts
  - scripts/reresolve-corpus.ts
supersedes_batch_order_in: docs/research/skill-coverage-and-suggester-2026-07-26.md
---

# Corpus mining: ground the skill expansion in JD supply, not just user labels

Queue item 3. All numbers VERIFIED via live SQL on `ilmqmodklutztuybsvwd` this session. Files it; proceeds to the batches without an Eli gate (per standing order).

## (a) Supply-side resolution failure (VERIFIED)

Source: `jobs.extraction_unmapped_skills` (the raw extracted skill phrases that failed `resolveSkill`), across `is_il AND is_active`. NOTE: the earlier code map claimed a table `extraction_unmapped_skills`; it is actually a **column on `jobs`** (corrected).

| Metric                                                | Value           |
| ----------------------------------------------------- | --------------- |
| Active IL jobs                                        | 6,018           |
| **Avg `skill_coverage_ratio`** (resolved / extracted) | **0.243**       |
| Jobs with coverage < 0.5                              | **5,325 (88%)** |
| Total unmapped occurrences                            | 81,485          |
| Distinct unmapped terms                               | 55,578          |

The library resolves only ~~24% of what JDs demand; 88% of jobs are below half-coverage. The supply gap dwarfs the user gap (1,165 user occ), but its head is mostly generic soft-terms (ownership 107, independent work 100, working under pressure 90, service orientation 84, english 74, multitasking 66) - noise, already the `GENERIC_SKILLS` class. Real hard skills live below n~~30. So raw supply frequency over-weights noise; the useful ranker is the JOINT signal below.

## (b) Joint evidence: labels users claim AND JDs demand (VERIFIED, top priority)

Intersection of the 1,067 distinct real-user unmapped labels (scrubbed) with the JD unmapped terms, JD-frequency >= 5. ~180 labels. Filtered to real skills (dropping the generic both-sided noise: performance 92, reporting 61, accuracy 50, planning 43, teamwork 36, execution 39, optimization 38, delivery, writing, coordination, decision-making, resilience, innovation - all leave-unmapped).

**Both-sided real clusters, by strength:**

- **Finance / accounting functions (STRONGEST):** quality control (49), internal controls (31), accounts payable (23), variance analysis (20), financial statements (18), journal entries (17), financial planning (17), accounts receivable (12), invoice processing (9), cash management (9), profitability analysis (8), month-end close (7), accruals (7), treasury (6), reconciliation (5), account reconciliations (5).
- **PM functions:** product vision (20), user stories (19), sprint planning (19), product analytics (18), discovery (18), product ownership (14), roadmap ownership (8), feature prioritization (7), acceptance criteria (9), prds (5).
- **Security / risk:** risk assessments (23) + risk assessment (19), security operations (21), security controls (12), risk mitigation (10), risk identification (10).
- **Marketing / growth / CX:** customer experience (29), segmentation (29), retention (29), customer engagement (20), competitive analysis (18), conversion optimization (12), marketing operations (12), customer acquisition (8), gtm (7), campaign management (9).
- **Dev / data / infra tools:** solidworks (27), caching (17), solution architecture (16), azure devops (15), webhooks (13), deployment pipelines (11), sdks (11), data models (11), vlookup (11), openshift (9), scipy (8), dynamodb (7), advanced sql (7 -> alias `sql`), clean architecture (6), vba (5), anomaly detection (20), telemetry (14).
- **HR / people:** employee relations (15), employee engagement (10), talent management (8), succession planning (8), linkedin recruiter (8), compensation (7), hris (5).
- **Office tools:** word (15), ms project (13), outlook (10), ms office (10).
- **AI tools (ALIAS -> `ai_tool_fluency`):** chatgpt (6), gemini (5), microsoft copilot (5), mcp servers (5), multi-agent orchestration (5), ai-driven workflows (7), ai-powered workflows (6). (Lower JD-unmapped freq than expected because many JDs' AI phrasing already resolves; but chatgpt is the #1 USER label, 9.)
- **Ops / quality:** quality control (49, also finance-adjacent), capa (8), root cause analysis (13), benchmarking (16), process optimization (16).
- **Misc real:** hardware (14), drones (10), medical devices (6), mechanical engineering (5).

**User-only (no/low JD demand) - keep, but lower joint priority:** supabase, vercel, tailwind css, wordpress, wix, base44, quickbooks, xero (modern infra + no-code + accounting SaaS the JD corpus barely names). Add for user-side coverage; they will not move the corpus resolution rate.

## (c) Re-ranked batch order (supersedes the 7-batch order in the coverage doc)

Ranked by joint evidence (both-sided real demand) x cost (alias < new-ID):

1. **AI-tools alias** -> `ai_tool_fluency` (+ `llm_integration`/`prompt_engineering` if they exist). Alias-only, 1 file, top user label. Unchanged as #1.
2. **Finance / accounting functions + SaaS** [NEW IDs]. Strongest both-sided cluster. Promoted (was #3).
3. **PM functions** [NEW IDs]. Strong both-sided. Promoted.
4. **Security / risk functions** [NEW IDs; re-resolve vs the prior Security batch first, add residual only].
5. **Marketing / growth / CX functions** [NEW IDs + alias].
6. **Office / collaboration tools** [ALIAS-heavy: word, outlook, ms office, ms project, clickup, trello, zoom].
7. **Modern web/cloud/data-eng + no-code + HRIS/ATS SaaS** [NEW IDs]. Includes the user-only infra (supabase/vercel/tailwind) - lowest joint payoff, highest novelty; do last of the substantive batches.
8. **Hebrew aliases - DEMOTED to optional/last.** VERIFIED: the JD supply side has only **12 Hebrew unmapped skill terms, all singletons** (the extractor emits English canonical phrases even for Hebrew JDs). So Hebrew skill aliases have ZERO supply-side payoff; benefit is user-display-only for ~40 Hebrew user labels. Recommend defer, or a minimal user-display-only pass, not a full batch.

**Alias-gaps folded into the relevant batches (all [A]):** customer support -> `customer_support_operations`; quality assurance -> qa id; advanced sql -> `sql`; python for data -> `python_data`; ms office / google suite -> office id(s).

## Coverage-movement measurement (per-batch gate)

`scripts/reresolve-corpus.ts` exists; after each batch merge, re-resolve and report the two numbers before/after: (i) real-user unmapped-label count (baseline 1,165 occ / 1,067 distinct across 41/60 users), (ii) corpus avg `skill_coverage_ratio` (baseline 0.243) + jobs-under-0.5 (baseline 5,325). Alias batches move (i); new-ID batches move both. Batches 2-5 (functions) should move the corpus ratio most; batch 7 (user-only infra) moves (i) but barely (ii).

## Ledger

- **VERIFIED:** supply coverage 0.243, 88% under 0.5; joint both-sided set (SQL intersection); Hebrew supply = 12 singletons.
- **Corrected (was REPORTED by the code map):** `extraction_unmapped_skills` is a `jobs` column, not a table.
- **Reshapes:** promotes finance + PM functions; demotes Hebrew to optional; keeps AI-alias at #1.
- Batches remain builder/reviewer-split, additive-only, eval-guarded (GOOD-band movement 0) per Eli's protocol.
