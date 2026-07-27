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
  ([[audience-any-career-seeker]], Eli 2026-07-27). 0-user on a gap is a sparse-base artifact
  (64 profiles), NOT no-demand.
- **Formatter reflows WHOLE files + strips just-added imports.** For dense JSON/JSX, apply edits via
  Bash python str.replace (bypasses the PostToolUse hook); grep the diff-stat for churn after.
- **No em dashes** in repo artifacts (code/docs/**PR bodies**/**commit messages**) - hyphens. Grep ADDED
  lines AND the PR-body FILE + commit message before commit AND before `gh pr create` (prose is the real
  risk, not the code diff).
- **Shared working tree (design lane shares this checkout):** commit by EXPLICIT PATHSPEC
  (`git commit <path> -m ...`), never bare. Verify PR scope with `git diff --stat origin/main...HEAD`
  (THREE-dot), never `main..HEAD` (local main goes stale). `git fetch` before reasoning about base.
  Per-PR clean branch off `origin/main`; stage ONLY the item's files (tree carries dirty
  `.claude/settings.local.json` + schema-validator JSONs + many untracked docs + `tasks/lessons.md`).
- **Merge ritual:** `gh pr merge <n> --squash` (NO --delete-branch; local-checkout step fails - main is
  checked out in getajob-eval worktree, but REMOTE merge succeeds). Verify `gh pr view <n> --json state`
  =MERGED, then delete remote branch via `gh api -X DELETE repos/getajob-careers/get-a-job/git/refs/heads/<branch>`.
  Run `gh pr create --base main` on its OWN line (compound trips the hook).
- **Protocol (Eli):** docs-only handoff PRs MERGE immediately, no hub wait. Code/data PRs stay HELD
  until the hub has SEEN them, then boundary-merge. Edge-fn deploys get a DEPLOYED-source fingerprint.

## SERVICE-ROLE KEY - unblocked (REST only)

`export SUPABASE_SERVICE_ROLE_KEY=$(supabase projects api-keys --project-ref ilmqmodklutztuybsvwd | grep -i service_role | grep -oE 'eyJ[A-Za-z0-9_.-]+' | head -1)`.
WORKS for PostgREST reads/writes (legacy JWT len 219). NEVER write it to a key file (inline in the env
var; delete any `.bakeoff.env`/`.srk` same turn). "CLI keys fail" caveat is EDGE-FN RUNTIME ONLY
([[service-role-key-runtime-drift]]). `jobs` has NO `company`/`role` column (use `function_family` as the
domain proxy). Supabase MCP `execute_sql` (project ilmqmodklutztuybsvwd) is loaded. `+walkthrough` uid =
`9d1cbc94-3738-46e0-8bc0-7b62eacc2584`.

## SELF-VERIFICATION PIPELINE (per ruled item)

After the build, run IN PARALLEL: 1) SPEC VERIFIER (diff == ruled spec, no creep), 2) QA BREAKER
(adversarial; real harness for data/prompt changes - the b5 reviewer caught a genuine #575 role-side
split the builder missed), 3) FLAG-SCOPE (only if flag-gated), 4) GATEKEEPER (lint/typecheck
net-delta/build/test). Baseline: typecheck ~518 (net delta matters); `.obsidian/` lint RED is gitignored
cruft CI never sees; `scripts/` is outside eslint config.

## GUARD-1 harness (reusable, in `$CLAUDE_JOB_DIR/tmp`)

OLD-vs-NEW resolver RE-SCORE over the live corpus, 16 profiles + walkthrough. Gate = GOOD-BAND
PRESERVATION (0 band drops); membership churn is ADVISORY iff (a) band preserved, (b) correct new
resolution of a genuinely-required skill, (c) displaced by equal-or-stronger ON-DOMAIN job - else STOP
([[scoring-parked-postlaunch-remeasure]], lessons 2026-07-27 P02/P07). Files: `guard1-rescore-b5.ts`
(edit the OLD import), `guard1-b5-diff.mjs`, `reresolve-corpus.ts`. **Regenerate OLD alias snapshot from
`origin/main` before reuse:** `git show origin/main:supabase/functions/_shared/skill-aliases.ts > tmp/aliases-OLD-<x>.ts`.
Run: `deno run --allow-env --allow-read --allow-net --allow-write --sloppy-imports --import-map=scripts/match-eval-imap.json <harness> <old|new> <out>`.

## DONE THIS SESSION (2026-07-27, CV-lane pass 5)

1. **#817 batch-7 aliases MERGED + LIVE** (squash `65621bf`). Full tail done: reresolve **171 written**
   (additive; coverage 0.247->0.248, 0 removals), **extract-job-requirements v33->v34** +
   **generate-career-analysis v121->v122**, both fingerprinted in DEPLOYED source (base44/openshift/vercel
   present). Eval-guard 14/16 + walkthrough byte-identical, 2 improvements. 4 moderate aliases
   (vba/employee relations/vercel/anomaly detection) - **NO off-domain fire** (flagged near-misses
   `experience with vercel` on Infra Eng + `real-time anomaly detection` on dairy operator correctly do
   NOT fire). Rollback = revert `65621bf` + redeploy the 2 fns from v33/v121.

2. **b5 genuine-gap PR #820 HELD, hub-PASSED** (`30b5b69`, branch `eli/skill-b5-cx-mktops`, CI-green).
   MINT `customer_experience_management` (customer_success_skill, 37 discipline-phrase jobs) +
   `marketing_operations` (technical_business_skill, 21 jobs); 14 aliases; `martech` retargeted
   adtech_domain->marketing_operations (the ONLY line-replacement, ruled). ALIASED (not minted) growth
   marketing + customer segmentation onto existing clusters. PR deferred (14 jobs/0 users, at-bar).
   **CX #575 role-side split** (reviewer caught: `customer_experience_manager` role maps
   `customer_journey_management` as core, 04_role_skill_mapping.ts:289) **CLOSED via dual-target CX
   aliases** - RULED by Eli: keep PR as built, mint + dual-target, NO role-graph edit. Reviewer DROPPED
   `cx` + `user segmentation` (drop-on-doubt). Gates: schema-validator baseline-identical, deno check
   clean, typecheck net-0, test+build+edge-boot green (1819). GUARD-1 15/16 + walkthrough byte-identical,
   1 advisory (P07 CS-Manager swap, band preserved).

## RESUME HERE (fresh session FIRST ACT)

1. **MERGE #820 (hub-PASSED) via the ritual**, then its per-batch tail: reresolve `--dry` then `--write`
   (report denominator; inline key, delete any `.bakeoff.env` same turn) -> redeploy
   `extract-job-requirements` + `generate-career-analysis` -> fingerprint DEPLOYED source for a b5 marker
   (`marketing_operations` or `customer_experience_management`) -> eval-guard spot-check (walkthrough
   baseline stable). Harnesses ready in `$CLAUDE_JOB_DIR/tmp` (regenerate OLD snapshot from origin/main
   first). Rollback capture: fns currently v34/v122 (will be v35/v123 after).
2. **#811 loudness re-check.** `ef682e5` (resilient sweep + 2-night loudness gate) merged 14:26 UTC 07-27,
   AFTER the 04:31 UTC nightly - so it first EXECUTES in tonight's cron (01:00 UTC 07-28). Read tomorrow's
   run: confirm the two-night gate stayed QUIET (green run + fresh landing_stats, not >40h stale).
   landing_stats was fresh (1.9h) at handoff time.
3. **Next substantive items (own reviewed batches):** (a) gen-image AI-tool mini-batch from b1
   (midjourney/dall-e/adobe firefly -> generative_ai_creative / ai_design_tools). (b) soc chip cluster +
   solidworks/mechanical-CAD -> extractor/role-expansion horizon (Architect/Mechanical-HW), NOT alias
   work; both filed in `docs/research/role-library-coverage-gap.md` (untracked).

## ELI'S STRUCTURAL DECISION BUNDLE (04_role_skill_mapping - deferred, do NOT touch without ruling)

- `accounts_payable` role-graph wiring.
- **NEW (2026-07-27):** wire `customer_experience_management` into the `customer_experience_manager` role
  mapping (closes the CX split at the role side; the b5 PR closed it at the job side via dual-target
  aliases as an interim). Both are structural role-graph edits held for Eli's dedicated pass.

## QUEUED follow-ups (not blocking)

- companies_il.json `by_ats` header stale ([[companies-il-by-ats-stale]]).
- Workday no-facet searchText widening ([[workday-nofacet-searchtext-widening]]).

## PARKED - do NOT touch

- Emails (until Flip 2 [[outreach-register-arc]]). All scoring formula/weight work (post-launch
  re-measure [[scoring-parked-postlaunch-remeasure]]) - library work is DATA not formula.
- Design lane theater PR #765; above-ceiling chip shelved (`eli/above-ceiling-chip`) until hub announces
  the theater merge, then rebase.
