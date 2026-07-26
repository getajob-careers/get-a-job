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
- **Per-PR clean branch:** `git checkout -b <b> origin/main` (current CV branch == origin/main byte-even)
  -> `git add` ONLY the item's files by explicit path (NEVER `git add -A`; the tree carries dirty
  `.claude/settings.local.json` + schema-validator `errors.json`/`schemas.json` + many untracked docs)
  -> confirm the STAGED column in `git status --short` before commit.
- **Protocol update (Eli 2026-07-26):** docs-only handoff PRs MERGE + `/clear` immediately, no hub
  confirmation wait. Code PRs stay HELD for hub-verified batch merges; edge-fn deploys get fingerprint
  reports. One consolidated report per close-out. Protocol lives HERE (design lane owns CLAUDE.md).

## SERVICE-ROLE KEY - unblocked (finding this session, 2026-07-26)

The CLI-retrievable `service_role` JWT (`supabase projects api-keys --project-ref
ilmqmodklutztuybsvwd`, the `service_role` row) **WORKS for PostgREST reads/writes** (HTTP 200 on
`jobs` raw cols; PATCH writes succeed). The [[service-role-key-runtime-drift]] "CLI keys fail" caveat
applies ONLY to the edge-fn RUNTIME env var, NOT the REST API. So `reresolve-corpus.ts`,
`match-eval-harness.ts`, `walkthrough-diag-next.ts` all run locally: pass the key inline per-run
(`export SUPABASE_SERVICE_ROLE_KEY=$(...)`), NEVER write it to `scripts/.bakeoff.env` (none exists;
keep it that way). anon key reads 0 rows on jobs raw cols (RLS) - do not use it.

## SELF-VERIFICATION PIPELINE (Eli standing upgrade 2026-07-26 - MANDATORY per item)

Per pre-ruled queue item, after the build spawn IN PARALLEL fresh-context general-purpose agents:

1. **SPEC VERIFIER** - ruled spec + diff. Exactly what was ruled, nothing missing/extra/creep?
2. **QA BREAKER** - adversarial; for data/prompt changes with no live surface, run a real harness/tests.
3. **FLAG-SCOPE AUDITOR** - only when the item claims flag gating (skip if not flag-gated; say so).
4. **GATEKEEPER** (agent) - lint / typecheck net-delta / build / tests.
   **Disagreement rule:** any verifier failure OR doubt = fix it or drop that piece + log. Never argue a
   finding down. PR body MUST carry a VERIFICATION block. Clean-block PRs merge at batch time on HUB
   verification alone. Still ELI-ONLY: reserved categories (real users, emails, auth config, reveal flag,
   schema beyond approved migrations, anything irreversible), HOLD-for-Eli taste/IA items, final re-audit.
   Gatekeeper gotchas: `.obsidian/` lint RED is gitignored cruft CI never sees; typecheck baseline ~522
   (net delta is what matters; live 520 now); flags.js has 2 PRE-EXISTING TS errors (not yours).

## CURRENT ARC - Skill-library expansion (Eli ruling 2026-07-26): runs NOW, in full

Plan of record + re-rank: `docs/research/skill-corpus-mining-2026-07-26.md`. Finish an item -> next
immediately; code PRs pile HELD; hub merges in batch; stop only for reserved categories / failing gate
/ 80% context. [[skill-library-expansion-arc]].

**Per-batch MANDATORY protocol (library batches):**

- **Builder/reviewer split** (I propose; independent fresh-context reviewer validates each alias->ID +
  each new ID: means-that-skill-in-hiring / no collision-or-shadow / real distinct skill / not noise).
  Reviewer reject OR doubt -> DROP + log. Then run the 4-agent SELF-VERIFICATION PIPELINE.
- **Additive ONLY** (never repoint/delete). Alias-only = single-file edit to `SKILL_ALIASES`
  (`supabase/functions/_shared/skill-aliases.ts`, single source; `resolveSkill` lowercases+collapses,
  exact-normalized direct lookup then snake/hyphen/suffix retries). NEW IDs -> edit `01_skill_library.ts`
  AND regen `src/lib/skillIdsGenerated.json` via `node scripts/regen-skill-ids.mjs`; run the
  `library-changes` skill's CONCEPT-grep (not stem-grep) for every new ID; schema-validator byte-identical
  to baseline (`common_roles_xref` noise is baseline; new entries use `common_roles:[]`); `deno check` both.
- **After each batch MERGES (hub):** run `scripts/reresolve-corpus.ts` (--dry then --write) with the
  service-role key inline; report coverage movement. New-ID batches move BOTH corpus + user side.
- **EVAL GUARD per batch:** 160-label eval (16 profiles x 10 = `match-eval-harness.ts`; frozen labels in
  `docs/eval/match-eval-labels.md`, served order `match-eval-pinned.json` - harness OVERWRITES both, so
  cp output to tmp then `git checkout --` to restore Eli's labels). GOOD-band movement must be 0. Plus the
  three #757 profiles (`walkthrough-diag-next.ts rankscore <snap>`; snaps + corpus in `$CLAUDE_JOB_DIR/tmp`,
  RE-FETCH corpus after any --write). Method proven this session (see batch-1 tail below).

**Re-ranked batch order (doc section c):**

1. AI-tools alias -> `ai_tool_fluency` - DONE (#766 merged+LIVE).
2. **Finance/accounting functions + SaaS [NEW IDs] - NEXT (batch 2).** Strongest both-sided cluster:
   quality control (49), internal controls (31), accounts payable (23), variance analysis (20), financial
   statements (18), journal entries (17), financial planning (17), accounts receivable (12), invoice
   processing (9), cash management (9), month-end close (7), accruals (7), treasury (6), reconciliation (5).
   Plus SaaS aliases quickbooks/xero (user-only). NEW-ID batch = heavy: concept-grep each vs the 618-ID set,
   regen, full pipeline. Check each against existing finance IDs before minting (budget_forecasting,
   financial_modeling, financial_reporting, excel_advanced_finance etc. already exist).
3. PM functions [NEW]. 4. Security/risk [NEW; re-resolve vs prior Security batch]. 5. Marketing/growth/CX
   [NEW+alias]. 6. Office tools [ALIAS]. 7. Modern web/cloud/no-code/HRIS-ATS [NEW]. 8. Hebrew - DEMOTED.

- Gen-image AI-tool drops from batch 1 (midjourney/dall-e/adobe firefly -> `generative_ai_creative` L338
  or `ai_design_tools` L316) need their own reviewed mini-batch; `ai tools`/`genai` currently ->
  `machine_learning_fundamentals` is a possible future RE-POINT (additive-only forbids now).

## DONE THIS SESSION

**Batch-1 post-merge tail - DONE + LIVE + clean (2026-07-26).**

- `extract-job-requirements` **v29** + `generate-career-analysis` **v117** deployed; both DEPLOYED bodies
  carry the #766 aliases (fingerprints `notebooklm`, `multi-agent orchestration`). ai-chat v115 already live.
- `reresolve-corpus --write`: **227 jobs written, 0 err**; avg `skill_coverage_ratio` 0.239 -> 0.241;
  zero-core jobs 706 -> 694. (#766-isolated corpus effect = only 35 jobs; the other ~192 are accumulated
  drift the write reconciled - stored resolution predated the current alias file.) Pre-write snapshot of all
  5763 resolved rows was in `$CLAUDE_JOB_DIR/tmp/pre-write-snapshot.json` (job dir; cleaned on delete).
- USER side (scrubbed, 60 real users): #766 resolves **-20 unmapped occ (1165->1145), -10 distinct, 12 of 41
  users**. Baseline reproduced EXACTLY (validates the scrub).
- **EVAL GUARD PASS:** GOOD-band movement = 0 (pre-write vs post-write, 16 profiles; 17/33 frozen-GOODs
  testable all retained in picks; 4/16 profiles tail-swap only, no GOOD touched). Note: 16/33 frozen-GOODs
  no longer served today = job-pool churn since the 2026-07-15 label freeze -> **label sheet is stale, a
  re-freeze is worth considering** (did not affect PASS).
- **#757 spot-check PASS + batch-neutral:** walkthrough 5/10 primary, finance 10/10, marketing 10/10, off=0;
  pre-write == post-write byte-identical.

**Coach visibility B+C - PR #780 HELD (`eli/coach-visibility-bc`, SHA f1fb583).** Per
`docs/research/coach-job-context-lookup-2026-07-26.md` + spec `coach-visibility-BC-build-spec-2026-07-26.md`.

- B: capped (2000, stripHtml) JD on pinned TARGET JOB (`page-context.ts`); INERT until design-lane Piece A
  wires `job_id` (safe dead code).
- C: strict-match name lookup, `career_agent`-gated pre-pass in `index.ts`, new pure module
  `job-name-lookup.ts` (detect/decide/render) + thin `lookupNamedJob` on the user-authed client;
  ask-on-ambiguity, NO fuzzy, NO tool loop. CONTEXT_HONESTY_RULES item 6.
- Verified: SPEC PASS; QA-BREAKER found 2 defects (F1 wrong-row substring collision, F2 single-long-word
  spurious) BOTH FIXED + regression-tested (whole-word company gate; >=2 title tokens for title-only);
  GATE GREEN (1789 tests, typecheck 520, deno check clean). Not flag-gated (no flag-scope auditor).
- **Post-merge REQUIRED (hub):** `supabase functions deploy ai-chat --project-ref ilmqmodklutztuybsvwd`
  - fingerprint (grep DEPLOYED body for `LOOKED-UP JOB (a live job posting the user NAMED`).

## PARKED - do NOT touch

- **Emails: fully parked until Flip 2** (`docs/Handoffs/email-automation-arc.md`; [[outreach-register-arc]]).
- **All scoring formula/weight work** - post-launch re-measure ([[scoring-parked-postlaunch-remeasure]]).
  Library work is DATA not formula; if a batch tempts a scoring change, that's the line.
- **Design lane theater PR = #765** (owns JobGridCard/JobDetailModal/useJobCardActions - STAY OUT). My
  above-ceiling chip stays shelved (branch `eli/above-ceiling-chip`, SHA `a15699b`) until the hub ANNOUNCES
  the theater merge; then rebase on post-theater main + reconcile.

## Resume here (fresh session order - Eli 2026-07-26)

Batch-1 tail DONE+LIVE. B+C = PR #780 HELD (awaits hub batch merge + ai-chat deploy).
**NEXT = BATCH 2 (Finance/accounting, NEW IDs)** - full per-batch protocol above (builder/reviewer split,
concept-grep each new ID vs the 618-ID set, regen `skillIdsGenerated.json`, 4-agent pipeline, HELD PR,
then post-merge reresolve + eval guard + #757 spot-check). Then batches 3-7. Chip (`a15699b`) re-inserts
only after the hub announces the theater (#765) merge. Eval-harness reaches the prompt via
`scripts/lib/ai-chat-prompt-mirror.ts` (thin `export *` re-export of prompt-lib.ts); `prompt-lib.test.ts`
colocated; `test-ai-chat-bakeoff.ts` consumes the mirror.
