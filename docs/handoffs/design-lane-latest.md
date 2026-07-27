# Design lane - resume point

**After any context clear, read THIS + tasks/lessons.md first. Never reconstruct
from scratch. Verify every PR/prod claim against `gh` / the live DB before trusting it
(handoffs go stale the instant something merges; other lanes are active).**

## Standing protocols (verbatim)

- **Canary:** begin every reply to Eli with "Eli, ...". When the name stops appearing Eli says **"canary"**, and on that word: overwrite THIS file with a fresh resume point and tell him to `/clear`.
- **Statusline:** context-usage % shows first. Proactively offer a handoff at ~80%.
- **Ledger reports:** end every report with a compact ledger (PR, SHA, state, claims to verify, evidence pointers, open questions).
- **Evidence discipline (investigation-rules):** every claim tagged VERIFIED / INFERRED / REPORTED with its evidence line. Absolutes only on VERIFIED. Premises from humans (incl. Eli, prior agents, handoffs) are REPORTED until independently confirmed. This arc caught two REPORTED-then-wrong numbers this way (Teva 49, EY 37).
- **Delegate:** fan-out digging to `general-purpose` swarm agents (evidence rule per agent); searches -> `explorer`; gate runs -> `gatekeeper`; sweeps -> `sweeper`. Keep coordinator context lean; agents write to scratchpad + return tight summaries.
- **Merge ritual gotcha:** `gh pr merge --delete-branch` FAILS here (local `main` in sibling `getajob-eval` worktree). Merge WITHOUT `--delete-branch`, confirm `state:MERGED` via `gh pr view --json state,mergedAt,mergeCommit` (there is NO `merged` json field - use `state`), then delete the remote ref via `gh api -X DELETE repos/getajob-careers/get-a-job/git/refs/heads/<branch>` (its OWN command; the `block-main-push` hook trips on any command carrying both `push` and `main` tokens - split them). `block-dangerous.sh` blocks `git push --force*`.
- **check:em-dash before every push** (`npm run check:em-dash`; scopes to source, not .md).
- **Formatter churn:** the PostToolUse hook reflows whole files on Edit/Write. For minimal-diff appends to existing files, append via Bash (`cat scratchpad/x >> file`) which bypasses the hook. Add an import in the SAME edit as its usage (the hook strips a momentarily-unused import; passes build+lint, crashes at runtime).
- **Self-verification pipeline (replaces per-PR human review):** after build+commit+PUSH (never before - shared-tree race), spawn IN PARALLEL fresh-context general-purpose verifiers that read via `git diff origin/main...BRANCH` / `git show BRANCH:file` (NEVER checkout/stash): Spec Verifier + QA-Breaker (+ Flag-Scope Auditor when gating claimed). PR gains a VERIFICATION block. Commit by explicit PATHSPEC; diff PR scope with `origin/main...HEAD` (three-dot).

## Identity / owned paths

DESIGN lane, repurposed 2026-07-27 to the **JOBS SUPPLY GROWTH** arc (was the redesign/reveal lane - that work is DONE + live, see git). This arc owns the **sourcing pipeline**: `scripts/refresh-jobs.ts`, `scripts/lib/ats-fetchers.ts`, `scripts/lib/normalize.ts`, the registry `supabase/functions/_shared/libraries/companies_il.json` (Eli's approval gate - propose, never auto-mutate), and `.github/workflows/refresh-jobs.yml`. **STAY OFF (CV lane, mid-email-arc):** `JobsSearchTab`, `JobCard`, `scoreJobFit`, `UnifiedJobsFeed`, `ai-chat/*`, `_shared/libraries/*` skill/role graphs, and ALL email code.

## >>> CURRENT (2026-07-27, JOBS SUPPLY GROWTH arc - execution in flight) <<<

### Honest baseline (VERIFIED live, project ilmqmodklutztuybsvwd)

5,510 active jobs (100% IL); 5,112 non-agency, 398 agency; 1,523 remote-FLAGGED (but the
flag is ~89% comeet false-positive noise - honest remote ~0.7%, Lever 5). The STALE_DAYS=2
sweep is HEALTHY; the corpus problem is INFLOW + WRITE-PATH, not the sweep. Source mix +
full findings: `docs/research/supply-growth/` (00-consolidated.md + lever1-6 + anchors + the appendix).

### Shipped this arc

- **#832 MERGED** (`fb91702`) - the 6-lever investigation docs.
- **#833 MERGED** (`64123aa`) - **P1**: per-company upsert wrapped in the sweep's `withTimeoutRetry` (57014 retry) + UPSERT_BATCH_SIZE 200->100 + CONCURRENCY_LIMIT 20->16 + refresh job `timeout-minutes` 18->25. Root cause was Postgres statement_timeout (57014) on the UPSERT under lock contention, NOT Workday fetch. **VALIDATED 2026-07-27** (run 30307505812): NVIDIA 261 + Palo Alto Networks 143 = **404 active** (was 0). Self-heal confirmed.
- **#836** (docs appendix: P0 VERIFIED, P2 verdicts, Teva+488 audit, $3-test draft) - check state with `gh pr view 836`.
- **#838 MERGED** (`03c5597`) - **EY fix**: `SUCCESSFACTORS_TIMEOUT_MS = 90_000` at the `fetchSuccessFactors` AbortController only (DEFAULT_TIMEOUT_MS 25s unchanged) + backfill-extraction `timeout-minutes` 8->14. **VALIDATED 2026-07-27** (run 30307505812): EY ingested **63 IL / 7268 total** in 44.08s fetch (under the new 90s ceiling; the old 25s was killing it). EY active rows = **63 exact** (nowhere near the 185 pre-dark inactive count). Durable follow-up still open: stream / server-side IL filter for SF (98 MB for 63 IL = 0.9% yield); memory fine (193 MB) so not urgent.
- **#840 MERGED** (`85cd1aa`) - docs-only: synced the refresh-jobs.yml HEADER comment (job timeout 18->25, extraction 8->14) to match reality post-#833/#838.

### Rulings locked (do not re-litigate)

- Sequence P0->P5 APPROVED. P0 done. P3 IL-egress infra DEFERRED pending the $3-test decision. P5 remote-honesty HELD by Eli (CV lane mid-email-arc - do NOT touch its consumers or coordinate). P4 backlog harvest NOT in the executed scope.
- **P0 VERIFIED:** geo-block CONFIRMED - US GHA egress (Azure) is blocked by IAI/Bezeq/HOT gateways (IAI 247/488-byte challenge, Bezeq timeout, HOT 302); all 200+data from an IL residential IP. ExpressVPN/Shift4 genuinely dead (~0 IL). The ~488 estimate (IAI 452 + Bezeq 31 + HOT 5) is a LIVE-FEED count (audited, no Teva defect); IAI 452 VERIFIED live and dominates.
- **$3 test (drafted, NOT run):** Eli buys a Webshare IL DATACENTER proxy (~$2.99), curls the 3 endpoints through it. Confirms/refutes whether a datacenter IL IP works (only a residential IL IP is proven). Exact commands in 00-consolidated.md appendix. No spend/accounts by Claude.

### >>> DONE 2026-07-27: EY merged + dispatched + validated. No open action in the queue. <<<

All five handoff steps executed and verified (manual dispatch run **30307505812**, workflow_dispatch
on main, success 21:35:37Z -> 21:42:51Z):

1. **#838 merged** via ritual (`03c5597`, `state:MERGED` 21:35:16Z, ref deleted separately).
2. **Header-comment cleanup** shipped as its own follow-up **#840** (`85cd1aa`, merged via ritual,
   ref deleted). Did NOT fold into #838 (already merged by then). Vercel check was a deployment
   rate-limit `fail` (external infra, non-blocking for a comment-only change); `Test+build` passed.
3. **Dispatched at 21:35Z** - both conditions met (before 00:15Z; no run in flight).
4. **Run report (verbatim):**
   - Refresh step (Stage 1 ingest) wall-clock = **156s (~2m36s)**; extraction 199s; Hebrew 45s. All
     well under the 25min job / 14min extraction ceilings.
   - EY health row: `EY (Ernst & Young)  successfactors  63 IL / 7268 total (44081ms)`. The 90s SF
     timeout worked (44s fetch < 90s; the old 25s default was aborting it).
   - Per-ATS health: `successfactors 2/8 failed (25%)` - the 2 are Qualitest (Content-Type text/html,
     not XML) + Teva (HTTP 404 on `careers.teva/sitemal.xml`), BOTH pre-existing broken endpoints,
     unrelated to #838. Note both URLs read `sitemal.xml` (looks like a registry typo - possible
     future cleanup, NOT touched this session).
   - **Loudness/failure gate: did NOT fire.** `EXIT 0: 2% failure rate within 20% global threshold;
no ATS family >=5 companies over 50%.`
   - `select count(*) from jobs where is_active and company_name ilike '%EY%';` = **110** - but that
     loose substring also catches UVeye(14)/Honeybook(10)/Eyesatop(8)/Akeyless(7)/Honeycomb(4)/
     BeyondTrust(4). **EY-exact active = 63** (`company_name = 'EY (Ernst & Young)'`). Success: 63,
     materially above zero, nowhere near 185.
5. **#833 validated same run:** NVIDIA 261 + Palo Alto Networks 143 = **404 active** (was 0). Neither
   is zero -> no escalation. Self-heal confirmed.
   - Corpus: total active IL jobs now **6142** (baseline was 5,510).

**Durable follow-up (still NOT built, needs no ruling to scope but is not urgent):** stream /
server-side IL filter for SuccessFactors - 98 MB downloaded for 63 EY IL rows = 0.9% yield, feed
growing. Memory is fine (193 MB peak) so deferred. Would be the next natural supply-growth PR.

### Deferred / not-built (need an Eli ruling to start)

- L6 continuous-sourcing standing mechanism: proposal only (lever6 doc) - trickle + decay-defense. Not built.
- P3 IL egress, P4 backlog (R1 Track B 6 supported-rail cos), P5 remote-flag honesty: see rulings above.

### Autonomy contract

Full autonomy within the approved queue; decide, log here, keep moving. HELD FOR ELI: schema, anything irreversible outside the approved queue, registry mutations (propose only), and the EY 63-vs-37 ruling. `settings.local.json` allow-list is unstaged, never commit.
