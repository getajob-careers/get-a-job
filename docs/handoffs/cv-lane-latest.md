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
  Bash python str.replace (bypasses the PostToolUse hook); grep the diff-stat for churn after. (Hit again
  pass-6 on skillResolver.test.js: an Edit triggered a whole-file reflow +166/-39; reset + python
  str.replace brought it to a clean +13.)
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
var; delete any `.bakeoff.env`/`.srk` same turn - deleted 2 stale `.srk` files at pass-6 start).
"CLI keys fail" caveat is EDGE-FN RUNTIME ONLY ([[service-role-key-runtime-drift]]). `jobs` has NO
`company`/`role` column (use `function_family` as the domain proxy). Supabase MCP `execute_sql` (project
ilmqmodklutztuybsvwd) is loaded - use `unnest`+`~` for substring search inside raw skill arrays
(PostgREST `cs.{x}` only matches EXACT array elements). `+walkthrough` uid =
`9d1cbc94-3738-46e0-8bc0-7b62eacc2584`.

## SELF-VERIFICATION PIPELINE (per ruled item)

After the build, run IN PARALLEL: 1) SPEC VERIFIER (diff == ruled spec, no creep), 2) QA BREAKER
(adversarial; real harness for data/prompt changes - the b5 reviewer caught a genuine #575 role-side
split the builder missed; the gen-image reviewer independently confirmed target-ID + flagged the same
`stable diffusion` dual-sense risk the builder did), 3) FLAG-SCOPE (only if flag-gated), 4) GATEKEEPER
(lint/typecheck net-delta/build/test). Baseline: typecheck ~518 (net delta matters); `.obsidian/` lint
RED is gitignored cruft CI never sees; `scripts/` is outside eslint config.

## GUARD-1 harness (reusable, in `$CLAUDE_JOB_DIR/tmp`)

OLD-vs-NEW resolver RE-SCORE over the live corpus, 16 profiles + walkthrough. Gate = GOOD-BAND
PRESERVATION (0 band drops); membership churn is ADVISORY iff (a) band preserved, (b) correct new
resolution of a genuinely-required skill, (c) displaced by equal-or-stronger ON-DOMAIN job - else STOP
([[scoring-parked-postlaunch-remeasure]], lessons 2026-07-27 P02/P07). The mechanical `guard1-*-diff.mjs`
prints "GATE FAIL" on ANY strong drop-out (coarse); apply the a/b/c refinement by hand. Files:
`guard1-rescore-b5.ts` / `guard1-rescore-genimage.ts` (edit the OLD import line), `guard1-*-diff.mjs`,
`scripts/reresolve-corpus.ts`. **Regenerate OLD alias snapshot from `origin/main` before reuse:**
`git show origin/main:supabase/functions/_shared/skill-aliases.ts > tmp/aliases-OLD-<x>.ts`.
Run: `deno run --allow-env --allow-read --allow-net --allow-write --sloppy-imports --import-map=scripts/match-eval-imap.json <harness> <old|new> <out>`.
(rescore is ~2min/side - run old and new in SEPARATE Bash calls, not one compound, or the 2min tool
timeout kills the second.)

## DONE THIS SESSION (2026-07-27, CV-lane pass 6)

1. **b5 PR #820 MERGED + LIVE + full tail** (squash `152a05a`). reresolve **59 written** (denominator
   5192 active v5; coverage 0.248->0.249, 0 removals), **extract-job-requirements v34->v35** +
   **generate-career-analysis v122->v123**, both fingerprinted in DEPLOYED source (CX x5, marketing_ops
   x6 each). Live Ns: `customer_experience_management` **33 distinct jobs**, `marketing_operations`
   **14 distinct jobs** (below the PR's 37/21 pre-merge phrase counts = corpus turnover + phrase-vs-alias,
   not a miss). GUARD-1 15/16 identical, 1 ADVISORY P07 (a `strong` "Customer Success Manager" displaced
   by another `strong` "Customer Success Manager" - same title/band/domain; band preserved, on-domain =
   PASS under a/b/c, matches the pre-merge hub ruling). Rollback = revert `152a05a` + redeploy from v34/v122.

2. **gen-image alias mini-batch PR #827 MERGED + LIVE + light tail** (squash `b106afe`). 5 aliases
   (midjourney / dall-e / dall.e / dalle / adobe firefly) -> **existing** `generative_ai_creative` (0 mint;
   target ID already names these tools verbatim, live-mapped in 04_role_skill_mapping). Job-side evidence
   100% creative-domain (Design_UX Brand designer + Marketing Creative Strategist; 0 engineering hits).
   Independent reviewer PASS. `stable diffusion` DROPPED (dual-sense creative-vs-ML-model + out of ruled
   scope). reresolve **1 written** (the Brand designer), coverage 0.249 unchanged. GUARD-1 **16/16
   identical, 0 GOOD-band drops**, walkthrough byte-identical. **LIGHT tail (hub-scoped):** only
   **extract-job-requirements v35->v36** redeployed + fingerprinted (midjourney/dall-e/adobe firefly alias
   keys present in DEPLOYED source). Rollback = revert `b106afe` + redeploy extract-job-requirements v35.
   **PARITY NOTE:** generate-career-analysis was intentionally NOT redeployed (still v123, b5 map, no
   gen-image aliases). Harmless: the corpus is already re-resolved consistently via reresolve --write;
   the only gap is live PROFILE-side resolution of a user typing a gen-image tool in career-analysis
   (0 current users). One deploy closes parity if wanted next session.

## EMAIL LAUNCH ARC (2026-07-27) - 3 HELD PRs, MANUAL-DISPATCH-PER-SEND

Step-0 dry-run REDONE under strict evidence (prior session's 20:41/20:44Z rows were
FABRICATED - future-dated vs 17:19Z DB clock; logged CRITICAL in lessons.md). Fresh
dry-run VERIFIED: digest 38 rows + reengagement 22 rows, all inside the run window.

Three HELD PRs, all awaiting hub line-by-line + merge:

- **#830** (`eli/email-exclude-test-accts`, `39939f0`) - exclude 2 QA accts
  (cwsctstest002, pod1cws) via narrow shared `INTERNAL_EMAIL_RE` patterns. After merge:
  redeploy `send-reengagement-email` (+ `send-job-digest`) so the deployed fn carries
  the fix, then re-run reengagement dry-run to confirm 22->20.
- **#831** (`eli/email-launch-schedule`) - digest daily 06:00 UTC schedule ON and now
  carries a `real_send` boolean input so a manual dispatch can opt into a real send
  (gate: `github.event_name == 'schedule' || inputs.real_send`). Reengagement has NO
  schedule - it fires ONLY by manual workflow_dispatch with `real_send=true` (the
  one-shot `30 5 28 7 *` launch cron was REMOVED). `EMAIL_REAL_SEND` env -> `dry_run:!realSend`;
  both still additionally gated by the edge-fn `EMAIL_SEND_ENABLED` secret (unset = dry-run/log only).
- **#834** (`eli/email-redesign-announcement`, DEPLOYED v1) - NEW redesign-announcement
  email to onboarded users (39 audience; disjoint from reengagement 22, overlap 0).
  workflow_dispatch-only, real_send input, verify_jwt=true pinned. Copy HELD for Eli's
  approval (subject "Get A Job has a whole new look"; names Home/job browsing/CV bank/
  Coach; CTA getajob.careers). Fn deployed + DEPLOYED-source verified. True
  function-dry-run (email_dry_run_log rows) needs the workflow on main (local invoke
  401s - runtime key = GH Actions secret only), so it runs after merge.

**ARMING (Eli's step, NOT the agent's):** every send is a MANUAL dispatch. Eli reads
that send's dry-run rows in `email_dry_run_log` FIRST, then - only when he decides to go
live - runs `supabase secrets set EMAIL_SEND_ENABLED=true --project-ref ilmqmodklutztuybsvwd`
and dispatches the specific workflow with `real_send=true`. There is NO scheduled reengagement
send and no automatic morning fire; nothing leaves the building without Eli's explicit dispatch.

## NEXT (email arc)

1. **Per-send manual dispatch.** Each email (digest, reengagement, announcement) is a
   SEPARATE manual `gh workflow run ... -f real_send=true`, AFTER Eli reads that send's
   dry-run rows in `email_dry_run_log` and arms `EMAIL_SEND_ENABLED`. Reengagement is no
   longer scheduled; the digest cron only real-sends once `EMAIL_SEND_ENABLED` is set. The
   agent verifies dry-run rows and reports; it never arms the gate or passes `real_send=true`.
2. **Redesign announcement (#834)** - only AFTER Eli approves the copy AND #834 merges:
   `gh workflow run send-redesign-announcement.yml -f real_send=true` (or without the flag
   for one more dry-run first). Redeploy the fn post-#830 to inherit the test-acct exclusion.

## RESUME HERE (other lanes)

1. **#811 loudness gate first-execution read.** `ef682e5` (resilient sweep + 2-night loudness gate, in
   `scripts/refresh-jobs.ts`, workflow `refresh-jobs.yml`, cron `0 1 UTC` but DRIFTS to ~04:00) merged
   14:26 UTC 07-27, AFTER the last run (04:31 UTC 07-27, sha 4663728). First EXECUTES ~01:00-04:30 UTC
   07-28. The gate is **self-announcing** (a firing gate reds/warns its own run) - read
   `gh run list --workflow=refresh-jobs.yml --limit 3`: confirm the latest scheduled run is green and the
   two-night gate stayed QUIET (fresh landing_stats, not >40h stale). If it FIRED or the run FAILED,
   STOP and escalate with logs (Eli hub ruling: no scheduled poll, it announces itself).

2. **Post-launch data-work queue (design-side launch was in progress at pass-6 close; lane resumes here):**
   (a) gen-image FOLLOW-UP - close generate-career-analysis parity if wanted (one redeploy) + revisit
   `stable diffusion` only if the corpus gains ML-eng JDs. (b) soc chip cluster + solidworks/mechanical-CAD
   -> extractor/role-expansion horizon (Architect/Mechanical-HW), NOT alias work; filed in
   `docs/research/role-library-coverage-gap.md` (untracked). (c) deferred-PR gap + soc-evidence work
   (hub said do NOT open these at pass-6 close - they are the next session's material).

## ELI'S STRUCTURAL DECISION BUNDLE (04_role_skill_mapping - deferred, do NOT touch without ruling)

- `accounts_payable` role-graph wiring.
- wire `customer_experience_management` into the `customer_experience_manager` role mapping (closes the
  CX split at the role side; the b5 PR closed it at the job side via dual-target aliases as an interim).
  Both are structural role-graph edits held for Eli's dedicated pass.

## QUEUED follow-ups (not blocking)

- companies_il.json `by_ats` header stale ([[companies-il-by-ats-stale]]).
- Workday no-facet searchText widening ([[workday-nofacet-searchtext-widening]]).

## PARKED - do NOT touch

- Emails (until Flip 2 [[outreach-register-arc]]). All scoring formula/weight work (post-launch
  re-measure [[scoring-parked-postlaunch-remeasure]]) - library work is DATA not formula.
- Design lane theater PR #765; above-ceiling chip shelved (`eli/above-ceiling-chip`) until hub announces
  the theater merge, then rebase.
