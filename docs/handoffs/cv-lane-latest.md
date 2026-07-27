# CV lane - latest handoff (resume point)

Overwrite-on-update (standing rule). **After any context clear, read THIS +
`tasks/lessons.md` first.** ~150-line resume point, not a log.

## Standing protocol (session hygiene - Eli)

- **Name canary.** Begin EVERY reply to Eli with "Eli, ...". When it stops, Eli says
  **"canary"** -> overwrite THIS file + tell him to `/clear`.
- **Statusline** shows context % (green<60, yellow 60-79, red>=80). **Offer a handoff at ~80%.**
- **Reports end with a compact ledger** (PR - SHA - state - claims - evidence - open qs).
- **NEVER delete rows** without an explicit Eli ruling; mark eras by `created_at`
  ([[never-delete-rows-without-ruling]]).
- **Formatter reflows WHOLE files + strips just-added imports.** Add an import in the SAME edit as its
  first usage; after any Edit to a dense file, check `git diff --stat` for churn
  ([[formatter-strips-just-added-imports]]).
- **No em dashes** in repo artifacts (code/docs/PR bodies) - hyphens. Grep ADDED lines (`^\+`) before
  commit AND before opening a PR.
- **Shared working tree (design lane shares this checkout):** commit by EXPLICIT PATHSPEC
  (`git commit <path> -m ...`), never bare `git commit` - a sibling terminal's staged files get swept
  otherwise. Verify PR scope with `git diff --stat origin/main...HEAD` (THREE-dot / merge-base), never
  `main..HEAD` (local main goes stale the moment the other lane pushes). `git fetch` before reasoning
  about base. Per-PR clean branch off `origin/main`; stage ONLY the item's files (tree carries dirty
  `.claude/settings.local.json` + schema-validator JSONs + many untracked docs + `tasks/lessons.md`).
- **Merge ritual gotcha:** `gh pr merge --squash --delete-branch` fails the local-checkout step (main
  checked out in getajob-eval worktree) but the REMOTE merge succeeds. Merge with `gh pr merge <n>
--squash` (no --delete-branch), verify `gh pr view <n> --json state`=MERGED, delete remote branch via
  `gh api -X DELETE repos/getajob-careers/get-a-job/git/refs/heads/<branch>` (push hook blocks
  `git push --delete`). `--base main` in a compound command trips the block-main-push hook - run the PR
  create on its own line.
- **Protocol (Eli 2026-07-26/27):** docs-only handoff PRs MERGE immediately, no hub wait. Code PRs stay
  HELD until the hub has SEEN them, then boundary-merge (the #807 pre-auth covered already-verified PRs
  only; do not self-merge a freshly-built batch). Edge-fn deploys get fingerprint reports.

## SERVICE-ROLE KEY - unblocked (REST only)

`export SUPABASE_SERVICE_ROLE_KEY=$(supabase projects api-keys --project-ref ilmqmodklutztuybsvwd | grep -i service_role | grep -oE 'eyJ[A-Za-z0-9_.-]+' | head -1)`.
WORKS for PostgREST reads/writes (legacy JWT len 219). NEVER write it to a key file. The "CLI keys
fail" caveat is EDGE-FN RUNTIME ONLY ([[service-role-key-runtime-drift]]). `jobs.id` is UUID ->
PostgREST `id=in.(...)` works with full UUIDs, `id=like.` fails. `+walkthrough` uid =
`9d1cbc94-3738-46e0-8bc0-7b62eacc2584`. Supabase MCP `execute_sql` (project ilmqmodklutztuybsvwd) is
loaded and clean for SQL. Education table = `education` (singular).

## SELF-VERIFICATION PIPELINE (MANDATORY per ruled item)

After the build, spawn fresh-context general-purpose agents IN PARALLEL: 1) SPEC VERIFIER (diff == ruled
spec, no creep), 2) QA BREAKER (adversarial; real harness for data/prompt changes - build OWN harness,
don't trust tmp files), 3) FLAG-SCOPE (only if flag-gated), 4) GATEKEEPER (agent: lint/typecheck
net-delta/build/test). Baseline: typecheck ~518 (net delta matters); `.obsidian/` lint RED is gitignored
cruft CI never sees; `scripts/` is outside eslint config. Any fail/doubt -> fix or drop + log.

## CURRENT ARC - Skill-library expansion ([[skill-library-expansion-arc]])

Runs NOW in full. Finish item -> next; code PRs HELD until hub sees them; boundary-merge in batch.
**Additive/alias-only = single-file edit to `_shared/skill-aliases.ts`** (single source). NEW IDs ->
edit `01_skill_library.ts` + regen `src/lib/skillIdsGenerated.json` (`node scripts/regen-skill-ids.mjs`)

- CONCEPT-grep every ID (library-changes skill). Per-batch: concept-grep-first (mature library ->
  alias-heavy, 0 new IDs since b1); builder agent proposes -> independent reviewer agent validates
  concept-correctness (drop-on-doubt) -> 4-agent pipeline. **GUARD 1 = whole-corpus OLD-vs-NEW resolver
  RE-SCORE** (import resolveSkill from `git show origin/main:...skill-aliases.ts` vs worktree; diff every
  job's resolved set): additive batches must show 0 removals; removals need the blast-radius split. **EVAL
  GUARD (band preservation): walkthrough 3/10, finance 10/10, marketing 10/10, off=0** via
  `scripts/walkthrough-diag-next.ts rankscore <snap>` (corpus hardcoded to `$CLAUDE_JOB_DIR/tmp/
walkthrough-corpus.json`; profile snaps in tmp are static+reusable; overwrite corpus with a fresh
  active-IL fetch). Membership churn is ADVISORY iff band-preserved + correct-resolution + equal/stronger
  displacer (P02). **STANDING RULE - alias REMOVALS:** full whole-corpus blast-radius (every job shedding
  the skill) + classify correct-fix vs coverage-loss BEFORE `--write`.

Per-batch tail after hub boundary-merge: `scripts/reresolve-corpus.ts --dry` then `--write` (inline key)

- redeploy `extract-job-requirements` + `generate-career-analysis` (`supabase functions deploy <slug>
--project-ref ilmqmodklutztuybsvwd`) + FINGERPRINT the DEPLOYED source (fetch via MCP get_edge_function,
  grep the bundle - it escapes quotes as `\"`) + eval guard + #757 spot-check.

## DONE THIS SESSION (2026-07-27, pass 3) - all LIVE

**3 alias PRs MERGED + LIVE** (main tip `255a30d`): #803 soc plain-narrow (dropped ambiguous bare
`soc`/`SoC`/`SOC`; 12 jobs shed soc_design = 8 SecOps correct-fix + 4 chip accepted-loss; chip cluster
-> role-expansion horizon, `docs/research/role-library-coverage-gap.md`), #805 batch-5 Marketing/CX
(31 aliases, 0 new IDs), #807 batch-6 Office/presentation (18 aliases, 0 new IDs). Full pipeline PASS on
each. **Combined tail EXECUTED:** fns deployed **extract-job-requirements v33 + generate-career-analysis
v121** (fingerprint-verified: bare soc absent, meta ads + vlookup present); reresolve `--write` **276
rows, 0 err** (denom 5772); coverage 0.245->**0.248**, zero_core 685->671, avg_resolved_core 4.16->4.20.
EVAL GUARD **PASS**: finance 10/10, marketing 10/10, **walkthrough re-baselined 4->3/10** (Eli ruling;
traced to the CORRECT alias `"market analysis"->market_research` #805, honest attainability drop, alias
KEPT - see [[skill-library-expansion-arc]]).

**P0 CRON INCIDENT - investigated + remediated + fixed:** nightly refresh looked like it "missed 2 runs"
but actually RAN GREEN every night; the soft-delete sweep AND landing_stats BOTH hit the 2-min Postgres
`statement_timeout` on 07-26/27 (jobs-table lock contention on big Workday upserts), caught by non-fatal
try/catch, silently skipped. Corpus inflated (595 stale rows), landing_stats frozen at 07-25. NOT a
missed cron, NOT the PAT (uses SUPABASE_* secrets, authenticated fine). **CATCH-UP done** (batched
soft-delete, 595 deactivated, landing_stats -> 5510 roles / 611 companies; 416 were NVIDIA/PANW whose
upserts timed out - self-heal on next successful upsert, which sets is_active=true). **DURABLE FIX PR
#811 HELD** (`eli/refresh-jobs-resilient-sweep`, `c75dd92`): batched sweep + 57014 retry + two-night
LOUDNESS gate (::error:: + exit 1 when a run fails the tail while landing_stats already >40h stale).
Typecheck net-0. No edge deploy (Actions picks up next night). Hub verifies before merge.

**Rollback:** revert #803+#805+#807 = redeploy fns from `3ff3dbf` (v32/v120). Cron fix = revert `c75dd92`.

## RESUME HERE (fresh session order)

1. **Coach CV-Revise-pointer rule (Yishai finding, Eli-ruled, NEXT).** Add a prompt-lib rule to ai-chat's
   CV-context behavior: when the user asks the coach/CV chat to revise/improve/rewrite a SPECIFIC section
   of an EXISTING CV, the coach must POINT them to that section's Revise button (name it, say where it
   appears) instead of silently generating a new CV or a generic answer. Same contract style as the #770
   rules (find those in the ai-chat prompt). Edge deploy `ai-chat` + fingerprint after merge. HELD for hub.
2. **Batch 7 = Modern web / cloud / no-code / HRIS-ATS aliases.** Concept-grep-first, builder/reviewer +
   4-agent pipeline, GUARD 1 additive re-score, HELD.
3. **b5 GENUINE-GAP mini-batch** (own reviewed batch, needs new IDs - concept-grep zero-dup + full
   pipeline): **customer experience (n=29, biggest)**, marketing operations, growth marketing, public
   relations, customer segmentation. Do NOT force-alias onto existing IDs.
4. **Gen-image AI-tool mini-batch** (from b1): midjourney/dall-e/adobe firefly -> generative_ai_creative
   / ai_design_tools. Own reviewed batch.
5. **soc chip cluster** -> extractor/role-expansion (Architect/Mechanical-HW horizon), NOT alias work.

### QUEUED follow-ups (not blocking)

- **accounts_payable role-graph wiring** = Eli's structural-decision bundle (04_role_skill_mapping).
- Re-file/bookkeeping report items: `69a69eec` AP-Bookkeeper compound-phrase gap; `567b1cdf` stale-v1
  re-extract (PARKED).
- companies_il.json `by_ats` header stale ([[companies-il-by-ats-stale]]).

## PARKED - do NOT touch

- Emails (until Flip 2 [[outreach-register-arc]]). All scoring formula/weight work (post-launch
  re-measure [[scoring-parked-postlaunch-remeasure]]) - library work is DATA not formula.
- Design lane theater PR #765 (JobGridCard/JobDetailModal/useJobCardActions). Above-ceiling chip shelved
  (`eli/above-ceiling-chip` `a15699b`) until hub announces the theater merge, then rebase.
