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
- **Audience = ANY career seeker** now, not just business students (CLAUDE.md line is stale
  beachhead framing). Never gate role/skill/coverage scope on "business students"
  ([[audience-any-career-seeker]], Eli 2026-07-27).
- **Formatter reflows WHOLE files + strips just-added imports.** Add an import in the SAME edit as its
  first usage; after any Edit to a dense file, check `git diff --stat` for churn
  ([[formatter-strips-just-added-imports]]).
- **No em dashes** in repo artifacts (code/docs/**PR bodies**/**commit messages**) - hyphens. Grep ADDED
  lines (`^\+`) before commit AND before opening a PR - AND grep the PR-body FILE + commit message
  (prose is the real em-dash risk, not the code diff; a fresh 2026-07-27 lesson).
- **Shared working tree (design lane shares this checkout):** commit by EXPLICIT PATHSPEC
  (`git commit <path> -m ...`), never bare `git commit`. Verify PR scope with
  `git diff --stat origin/main...HEAD` (THREE-dot), never `main..HEAD` (local main goes stale). `git
fetch` before reasoning about base. Per-PR clean branch off `origin/main`; stage ONLY the item's files
  (tree carries dirty `.claude/settings.local.json` + schema-validator JSONs + many untracked docs +
  `tasks/lessons.md` + `docs/research/role-library-coverage-gap.md`).
- **Merge ritual:** `gh pr merge <n> --squash` (NO --delete-branch; the local-checkout step fails because
  main is checked out in getajob-eval worktree, but the REMOTE merge succeeds). Verify
  `gh pr view <n> --json state`=MERGED, then delete remote branch via
  `gh api -X DELETE repos/getajob-careers/get-a-job/git/refs/heads/<branch>` (push hook blocks
  `git push --delete`). Run `gh pr create --base main` on its OWN line (compound trips the hook).
- **Protocol (Eli):** docs-only handoff PRs MERGE immediately, no hub wait. Code/data PRs stay HELD
  until the hub has SEEN them, then boundary-merge. Edge-fn deploys get a DEPLOYED-source fingerprint.

## SERVICE-ROLE KEY - unblocked (REST only)

`export SUPABASE_SERVICE_ROLE_KEY=$(supabase projects api-keys --project-ref ilmqmodklutztuybsvwd | grep -i service_role | grep -oE 'eyJ[A-Za-z0-9_.-]+' | head -1)`.
WORKS for PostgREST reads/writes (legacy JWT len 219). NEVER write it to a key file. The "CLI keys
fail" caveat is EDGE-FN RUNTIME ONLY ([[service-role-key-runtime-drift]]). `jobs` has NO `role` column
(use `function_family` as the domain proxy). Supabase MCP `execute_sql` (project ilmqmodklutztuybsvwd)
is loaded. `+walkthrough` uid = `9d1cbc94-3738-46e0-8bc0-7b62eacc2584`.

## SELF-VERIFICATION PIPELINE (MANDATORY per ruled item)

After the build, spawn fresh-context general-purpose agents IN PARALLEL: 1) SPEC VERIFIER (diff == ruled
spec, no creep), 2) QA BREAKER (adversarial; real harness for data/prompt changes), 3) FLAG-SCOPE (only
if flag-gated), 4) GATEKEEPER (lint/typecheck net-delta/build/test). Baseline: typecheck ~518 (net delta
matters); `.obsidian/` lint RED is gitignored cruft CI never sees; `scripts/` is outside eslint config.

## DONE THIS SESSION (2026-07-27, pass 4) - items 1+2 LIVE, item 3 HELD-gated

1. **#811 cron resilient sweep MERGED + LIVE** (squash `ef682e5`). No edge deploy (GH Actions script;
   tonight's run picks it up). **DEFERRED CHECK:** after the next nightly run, confirm the two-night
   LOUDNESS gate did NOT fire spuriously (green run + fresh landing_stats, not >40h stale).

2. **Coach CV-Revise-pointer rule DONE + LIVE** (PR #813 squash `364a422`; **ai-chat deployed v117**,
   fingerprint-verified: rule marker `REVISE ONE SECTION OF AN EXISTING CV` + fallback
   `IF THE USER DOESN'T SEE THE REVISE BUTTON` + presets in the live bundle). Rule lives in
   `career_agent` branch of `assembleSystemPrompt` (prompt-lib.ts). On a section-revise ask against an
   EXISTING generated CV, the coach points to the inline "Revise" button (Summary + Experience bullets
   only; flag-on/nextDesign) instead of emitting a whole-CV regen card. Hub ruled BOTH questions:
   career_agent is the right surface (confirmed); flag fallback clause ADDED (`d5204e7`) - honest in
   both flag states. **NOTE (Eli): `cv-helper` + `application_cv_success_agent` are UNWIRED dead code
   (zero frontend refs); the in-Studio chat is `edit-cv`, NOT ai-chat. Do NOT re-wire cv-helper.**
   Rollback = revert `364a422` + redeploy ai-chat from v116.

3. **Batch 7 skill aliases HELD-gated (PR #817, `2807ea3`, branch `eli/skill-batch7-modernweb-hris`).**
   24 additive aliases, 0 new IDs, single-file `_shared/skill-aliases.ts`. Builder proposed / independent
   reviewer drop-on-doubt. Reviewer DROPS: clean architecture, telemetry (HW-lane over-fire),
   talent management, sdks. **solidworks mint DEFERRED** to the Mechanical/HW role-expansion cluster
   (filed to `docs/research/role-library-coverage-gap.md` - UNTRACKED local doc - as demand evidence).
   GATES ALL PASS: GUARD-1 5510 jobs, 128 changed, 137 ADDs, **0 REMOVALS**; ambiguity sweep no
   wrong-domain fires (compensation HR-only, vba finance-only). EVAL GUARD walkthrough 3/10 + finance
   10/10 + marketing 10/10 top-10 BYTE-IDENTICAL OLD->NEW, off=0. Gatekeeper net-0 typecheck, build+test
   PASS. schema-validator baseline-parity, deno check clean. Reviewer flags for Eli's eye (kept):
   vba->excel_advanced_finance (finance-flavored), employee relations->hr_business_partnering (borderline),
   vercel->frontend_development (deploy platform), anomaly detection->machine_learning (~6 security + 1
   FinOps borderline fires; retarget time_series_analysis if too broad).
   **PER-BATCH TAIL after hub merges #817:** `scripts/reresolve-corpus.ts --dry` then `--write`
   (137 additive resolutions / 128 jobs; inline the key, delete any `.bakeoff.env` same turn), then
   redeploy `extract-job-requirements` + `generate-career-analysis` + fingerprint DEPLOYED source, then
   eval-guard spot-check. Harnesses reusable in `$CLAUDE_JOB_DIR/tmp`: `guard1-batch7.ts`,
   `build-eval-corpus.ts`, `skill-aliases-OLD.ts` (regenerate OLD snapshot from origin/main before reuse).

## RESUME HERE (fresh session order)

1. **If #817 merged:** run the Batch-7 per-batch tail (reresolve --write + redeploy 2 fns + fingerprint +
   eval guard). Else it stays HELD for hub.
2. **b5 GENUINE-GAP mini-batch (NEXT substantive item, needs NEW IDs).** Own reviewed batch, concept-grep
   zero-dup + full 4-agent pipeline + GUARD-1 + eval guard. Gaps (do NOT force-alias onto existing IDs):
   **customer experience (n=29, biggest)**, marketing operations, growth marketing, public relations,
   customer segmentation. Per gap emit a MINT-vs-SKIP recommendation with evidence (like the finance-risk
   SKIP ruling: 13 jobs / 0 users = below the bar). New IDs -> edit `01_skill_library.ts` +
   `node scripts/regen-skill-ids.mjs` (regen `src/lib/skillIdsGenerated.json`) + `common_roles:[]` on new
   entries. `library-changes` skill checklist applies (concept-grep every ID).
3. **Gen-image AI-tool mini-batch** (from b1): midjourney/dall-e/adobe firefly -> generative_ai_creative /
   ai_design_tools. Own reviewed batch.
4. **soc chip cluster + solidworks/mechanical-CAD** -> extractor/role-expansion horizon (Architect /
   Mechanical-HW), NOT alias work. Both filed in role-library-coverage-gap.md (untracked - consider a
   dedicated docs-commit for that doc; it has a pre-existing frontmatter em-dash to fix then).

### QUEUED follow-ups (not blocking)

- **accounts_payable role-graph wiring** = Eli's structural-decision bundle (04_role_skill_mapping).
- companies_il.json `by_ats` header stale ([[companies-il-by-ats-stale]]).

## PARKED - do NOT touch

- Emails (until Flip 2 [[outreach-register-arc]]). All scoring formula/weight work (post-launch
  re-measure [[scoring-parked-postlaunch-remeasure]]) - library work is DATA not formula.
- Design lane theater PR #765; above-ceiling chip shelved (`eli/above-ceiling-chip` `a15699b`) until hub
  announces the theater merge, then rebase.
