# CV lane - latest handoff (resume point)

Overwrite-on-update (standing rule). **After any context clear, read THIS +
`tasks/lessons.md` first.** ~150-line resume point, not a log.

## Standing protocol (session hygiene - Eli)

- **Name canary.** Begin EVERY reply to Eli with "Eli, ...". When it stops, Eli says
  **"canary"** -> overwrite THIS file + tell him to `/clear`.
- **Statusline** shows context % (green<60, yellow 60-79, red>=80). **Offer a handoff at ~80%.**
- **Reports end with a compact ledger** (PR - SHA - state - claims - evidence - open qs).
- **NEVER delete rows** (even void/test/dry-run) without an explicit Eli ruling; mark eras by
  `created_at` ([[never-delete-rows-without-ruling]]).
- **Formatter reflows WHOLE files + strips just-added imports.** Add an import in the SAME edit as
  its first usage; after any Edit to a dense file, check `git diff --stat` for churn
  ([[formatter-strips-just-added-imports]]).
- **No em dashes** in repo artifacts (code/docs/PR bodies) - hyphens. Grep additions before commit.
  (prompt-lib.ts is FULL of pre-existing em dashes; still add hyphens only in new lines.)
- **Per-PR clean branch:** `git stash push -- <tracked dirty>` -> `git checkout -b <b> origin/main`
  -> commit ONLY the item's files by explicit path (NEVER `git add -A`; the tree carries dirty
  `.claude/settings.local.json` + schema-validator `errors.json`/`schemas.json` + many untracked docs).
  NOTE: `git stash pop` UNSTAGES your files - re-`git add` before committing (bit me on item A).
- Protocol lives HERE (design lane owns CLAUDE.md).

## SELF-VERIFICATION PIPELINE (Eli standing upgrade 2026-07-26 - MANDATORY per item)

Eli removed per-PR human review for pre-ruled queue items; in exchange EVERY item passes independent
agent verification before it is HELD. After the build, spawn IN PARALLEL (fresh-context general-purpose
agents; do NOT add agent-definition files):

1. **SPEC VERIFIER** - ruled spec (queue text) + diff. Implements EXACTLY what was ruled, nothing
   missing/extra/creep?
2. **QA BREAKER** - acceptance criteria + preview/harness. Adversarial: try to break it (edge inputs,
   over-resolution, state transitions, render sanity, console clean). For data/prompt changes with no
   live surface: run a real harness/tests (resolveSkill vs the full ID set; assembled-prompt tests;
   scoreJobFit numeric-invariance) - not assertion.
3. **FLAG-SCOPE AUDITOR** - only when the item claims flag gating; reference-equality/render-identity
   evidence that changed lines are unreachable flag-off, or an explicit UNCONDITIONAL-with-reason call-out.
4. **GATEKEEPER** (existing agent) - lint / typecheck net-delta vs baseline / build / tests.

**Disagreement rule:** any verifier failure OR doubt = fix it or drop that piece and log it. Never argue
a finding down. **PR body MUST carry a VERIFICATION block** (one line per verifier + verdict + key
evidence) or it is not HELD-ready. Clean-block PRs merge at batch time on HUB verification alone.
Still ELI-ONLY: reserved categories (real users, emails, auth config, reveal flag, schema beyond approved
migrations, anything irreversible), HOLD-for-Eli taste/IA items, the final re-audit triage.

Gatekeeper gotchas verified this session: `.obsidian/` lint RED is gitignored local cruft CI never sees
(non-.obsidian lint clean); typecheck baseline ~522 (net delta is what matters - measure per-file via
stash/pop, don't trust the count); flags.js has 2 PRE-EXISTING TS errors (line 18 .ts import, line 107
import.meta.env) - not yours.

## CURRENT ARC - Skill-library expansion (Eli ruling 2026-07-26): runs NOW, in full

Plan of record + joint re-rank: `docs/research/skill-corpus-mining-2026-07-26.md`. Standing order:
finish an item -> next immediately; PRs pile HELD; merges in batch by the hub; stop only for reserved
categories / failing gate / 80% context. [[skill-library-expansion-arc]].

**Per-batch MANDATORY protocol (library batches):**

- **Builder/reviewer split** (I propose; independent fresh-context reviewer validates each alias->ID and
  each new ID: means-that-skill-in-hiring / no collision-or-shadow / real distinct skill / not noise).
  **Reviewer reject OR doubt -> DROP + log, never argue in.** Then run the 4-agent SELF-VERIFICATION
  PIPELINE above on the built diff.
- **Additive ONLY** (never repoint/delete). Alias-only = single-file edit to `SKILL_ALIASES`
  (`supabase/functions/_shared/skill-aliases.ts`, single source; `resolveSkill` lowercases+collapses,
  falls back to snake-ID). NEW IDs -> edit `01_skill_library.ts` AND regen `src/lib/skillIdsGenerated.json`
  via `node scripts/regen-skill-ids.mjs`; run `library-changes` skill's CONCEPT-grep (not stem-grep) for
  every new ID; schema-validator must be byte-identical to baseline (`common_roles_xref` noise is baseline;
  new entries use `common_roles:[]`); `deno check` both files.
- **After each batch MERGES (hub):** run `scripts/reresolve-corpus.ts` (--dry then --write); report coverage
  movement: user-unmapped (baseline **1,165 occ / 1,067 distinct / 41 of 60 users**) + corpus avg
  `skill_coverage_ratio` (baseline **0.243**) / jobs<0.5 (baseline **5,325**). Alias batches move USER side;
  new-ID batches move both.
- **EVAL GUARD per batch:** 160-label eval, GOOD-band movement must be 0 (regression FAILS the batch ->
  report + hold, do NOT tune); assert the three #757 acceptance profiles' flag-on top-10 stay
  majority-relevant (`scripts/walkthrough-diag-next.ts rankscore <snap>`; snaps in `$CLAUDE_JOB_DIR/tmp`,
  may need re-fetch).

**Re-ranked batch order (doc section c):**

1. **AI-tools alias -> `ai_tool_fluency` - DONE, PR #766 HELD** (see PRs below).
2. **Finance/accounting functions + SaaS [NEW IDs] - NEXT.** Strongest both-sided cluster: quality control
   (49), internal controls (31), accounts payable (23), variance analysis (20), financial statements (18),
   journal entries (17), financial planning (17), accounts receivable (12), invoice processing (9), cash
   management (9), month-end close (7), accruals (7), treasury (6), reconciliation (5). Plus SaaS aliases
   quickbooks/xero (user-only). NEW-ID batch = heavy: concept-grep each, regen, full pipeline.
3. PM functions [NEW]. 4. Security/risk [NEW; re-resolve vs prior Security batch first]. 5. Marketing/
   growth/CX [NEW+alias]. 6. Office tools [ALIAS: word/outlook/ms office/ms project]. 7. Modern web/cloud/
   no-code/HRIS-ATS [NEW; supabase/vercel/tailwind user-only]. 8. Hebrew - DEMOTED optional (JD supply = 12
   Hebrew terms only).

- **Generative-image AI tools follow-up (batch 1 drops):** midjourney/dall-e/dalle/adobe firefly ->
  `generative_ai_creative` (L338, names all 3 verbatim) OR `ai_design_tools` (L316). Ambiguous target ->
  needs its own reviewed mini-batch. Also `ai tools`/`genai`/`generative ai` currently resolve to
  `machine_learning_fundamentals` - a possible future RE-POINT question (additive-only forbids doing it now).

## PRs THIS SESSION (all HELD, all carry a VERIFICATION block)

- **#766** batch 1 AI-tool aliases (`eli/skill-batch-1-ai-aliases`). 14 additive: 12 -> ai_tool_fluency
  (chatgpt/gemini/copilot/perplexity/notebooklm/...), mcp servers -> mcp_protocol, multi-agent orchestration
  -> agentic_systems. Reviewer dropped image-gen + buzz-phrases (logged in PR). Alias-only, no regen.
  Verified: spec PASS, QA-breaker 5/5 (no over-resolution vs 618-id set), gate GREEN. Post-merge: edge fns
  importing resolveSkill need redeploy; run reresolve-corpus.
- **#768** honest_match_labels DEFAULT ON + `?honest_match_labels=0` kill switch (`eli/honest-labels-default-on`,
  SHA b6e3726). Display-only flip in flags.js; renders in BOTH scoring_v2 states incl former flag-off prod
  (UNCONDITIONAL, accepted, more honest - called out in PR). Verified: spec/QA(7/7)/flag-scope PASS,
  gate GREEN (flags.js 2 TS errors pre-existing per stash/pop). Frontend-only, no deploy.
- **#770** coach phrasing fix (`eli/coach-phrasing-contract`). APPLICATION_ACTIONS_RULES (career_agent-only):
  ASK-DON'T-TELL (no "I'll add"/"queue up the CV" before confirm) + DON'T-RE-ASK just-provided values.
  Backend prompt only. Verified: spec/QA(7/7 static)/gate GREEN, prompt-lib.test 52/52. **Post-merge REQUIRED:
  `supabase functions deploy ai-chat --project-ref ilmqmodklutztuybsvwd` + fingerprint (edge fns don't
  auto-deploy); hub re-verifies live behavior.**
- **#771** coach job-context DEEP map (`eli/coach-job-lookup-deep-map`). Docs-only report-and-hold. B.1 =
  job-lookup-by-name is DEEP (no tool harness, no name+company RPC, JD omitted on pinned path). 3 scoping
  options for the joint session. `docs/research/coach-job-context-lookup-2026-07-26.md`.

## Facts from the hub

- **Design lane theater PR = #765, HELD not merged** (owns JobGridCard.jsx, JobDetailModal.jsx,
  useJobCardActions.js - STAY OUT). **My above-ceiling chip stays shelved** (branch `eli/above-ceiling-chip`,
  SHA `a15699b`) until the hub ANNOUNCES the theater merge; then rebase on post-theater main + reconcile.
- #765 gets the self-verification pipeline run RETROACTIVELY - that's the DESIGN LANE's job (cross-lane,
  don't touch). The queue-tail final re-audit is also design-lane (parallel specialist tracks).

## PARKED - do NOT touch

- **Emails: fully parked until Flip 2** (digest enable + re-engagement + new-look announce = ONE Eli-gated
  moment AFTER the reveal). Don't touch EMAIL_SEND_ENABLED / cron / dry_run. Runbook:
  `docs/Handoffs/email-automation-arc.md`. [[outreach-register-arc]].
- **All scoring formula/weight work** (adjacency, specificity, field-relevant years, C3/C4/C5) - post-launch
  re-measure ([[scoring-parked-postlaunch-remeasure]]). Library work is DATA not formula; if a batch tempts
  a scoring change, that's the line.

## Resume here (fresh session order - Eli 2026-07-26)

The batch containing #766/#768/#770/#771/#772 was MERGED by this session at the hub's go
(SHAs in the PRs-this-session section once filled). Fresh session's order:

**FIRST ACT - batch-1 post-merge tail (do this before anything else):**

1. **Redeploy the edge fns that import `resolveSkill`:** `extract-job-requirements` AND
   `generate-career-analysis` (`supabase functions deploy <slug> --project-ref
ilmqmodklutztuybsvwd`). Fingerprint BOTH (deployed != merged; deploy-edge-fn skill).
2. **`scripts/reresolve-corpus.ts`** (--dry then --write). Report coverage movement vs
   baseline: corpus avg `skill_coverage_ratio` **0.243** / jobs<0.5 **5,325**; user-unmapped
   **1,165 occ / 1,067 distinct / 41 of 60 users**. (Alias batch moves the USER side most.)
3. **160-label eval guard:** GOOD-band movement must be **0** (any GOOD regression = report,
   do NOT tune).
4. **#757 three-profile top-10 spot-check** (walkthrough/finance/marketing stay
   majority-relevant; `scripts/walkthrough-diag-next.ts rankscore <snap>`).

**SECOND - B+C coach-visibility item (ONE backend item, un-parked pre-flip; see
`docs/research/coach-job-context-lookup-2026-07-26.md`):**

- **B:** capped `description` on the TARGET JOB select (`page-context.ts:403`) + render +
  a prompt-lib line permitting reference to it. Mirror the 2000-char app-JD cap.
- **C:** STRICT-MATCH name lookup, deterministic server-side pre-pass in ai-chat: inline
  title+company match on active IL jobs, exact-ish only; on ambiguity the coach ASKS
  ("I found 3 analyst roles - which company?"), never guesses. NO fuzzy, NO tool loop
  (post-flip). Inject matched JD capped. Tests + small eval fixture set for wrong-row
  protection. Edge-fn deploy + fingerprint after its merge.
- (Piece A - frontend job_id + visible-feed-ids wiring - is the DESIGN LANE's, already
  queued there. The frontend does NOT pass job_id today: `Career.jsx:443` `visibleJobIds: []`.)
- Builder/reviewer split + 4-agent SELF-VERIFICATION PIPELINE, HELD PR with VERIFICATION block.

**THIRD - BATCH 2 (Finance/accounting, NEW IDs)** per the per-batch protocol above, then
batches 3-7. Chip (`a15699b`) re-inserts only after the hub announces the theater (#765) merge.
