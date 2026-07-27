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
- **#833 MERGED** (`64123aa`) - **P1**: per-company upsert wrapped in the sweep's `withTimeoutRetry` (57014 retry) + UPSERT_BATCH_SIZE 200->100 + CONCURRENCY_LIMIT 20->16 + refresh job `timeout-minutes` 18->25. Gate green, Spec+QA verifiers PASS. **VALIDATE after the next nightly:** `select count(*) from jobs where is_active and company_name in ('NVIDIA','Palo Alto Networks')` should return ~412 (was 0), and `upsert_error` count drops in the GHA run summary. Root cause was Postgres statement_timeout (57014) on the UPSERT under lock contention, NOT Workday fetch.
- **#836** (docs appendix: P0 VERIFIED, P2 verdicts, Teva+488 audit, $3-test draft) - check state with `gh pr view 836`.

### Rulings locked (do not re-litigate)

- Sequence P0->P5 APPROVED. P0 done. P3 IL-egress infra DEFERRED pending the $3-test decision. P5 remote-honesty HELD by Eli (CV lane mid-email-arc - do NOT touch its consumers or coordinate). P4 backlog harvest NOT in the executed scope.
- **P0 VERIFIED:** geo-block CONFIRMED - US GHA egress (Azure) is blocked by IAI/Bezeq/HOT gateways (IAI 247/488-byte challenge, Bezeq timeout, HOT 302); all 200+data from an IL residential IP. ExpressVPN/Shift4 genuinely dead (~0 IL). The ~488 estimate (IAI 452 + Bezeq 31 + HOT 5) is a LIVE-FEED count (audited, no Teva defect); IAI 452 VERIFIED live and dominates.
- **$3 test (drafted, NOT run):** Eli buys a Webshare IL DATACENTER proxy (~$2.99), curls the 3 endpoints through it. Confirms/refutes whether a datacenter IL IP works (only a residential IL IP is proven). Exact commands in 00-consolidated.md appendix. No spend/accounts by Claude.

### >>> ACTIVE / BLOCKED ON ELI: EY SuccessFactors recovery <<<

Eli revoked the EY hold (wants EY live) AND the "don't touch nightly path" line **for the
SuccessFactors fetcher ONLY**. New order was: merge #833 (DONE) -> measure -> build EY fix (held) -> dispatch after auth.

**STOPPED at the measurement gate (Eli's rule: stop if IL count != 37).** Measured EY live
(IL IP, temp scratch, no DB writes): feed **97.7 MB** (grew from 68MB), fetch+download **27.5s**
(exceeds the 25s DEFAULT_TIMEOUT_MS -> aborts -> 0 jobs), parse 4.9s, peak RSS **193 MB** (NOT a
memory concern), total items 7,265, **IL items via production `classifyLocation` = 63** (59 Tel
Aviv, 2 Jerusalem, 2 Haifa - all legit; the "37" was a stale re-probe undercount). **Reported +
holding for Eli's ruling on 63-vs-37 before building.**

**EY fix spec (build when Eli rules):**

- Add a `SUCCESSFACTORS_TIMEOUT_MS` const in `scripts/lib/ats-fetchers.ts`, use it ONLY at the AbortController timer at `fetchSuccessFactors` line ~1039 (currently `DEFAULT_TIMEOUT_MS`). Size from the 27.5s measurement WITH REAL MARGIN (feed is growing) - propose ~90s. Do NOT change `DEFAULT_TIMEOUT_MS` (line 20 = 25_000); do NOT touch other fetchers. 7 boards use `fetchSuccessFactors` - keep blast radius there.
- SAME PR: raise the **extraction** step `timeout-minutes` 8->14 in `.github/workflows/refresh-jobs.yml` (line ~107, the "Backfill extraction" step - pays for extracting the recovered+EY jobs). NOTE reconciliation to flag to Eli: his message said "raise the refresh step budget 8->14, job cap stays 18," but VERIFIED structure = the refresh/fetch step has NO per-step budget (bounded by the job cap, which #833 already raised 18->25); the only `:8` is the extraction step. So: raise extraction 8->14, KEEP job cap 25 (do NOT revert to 18 - that would undo #833's fetch headroom). Confirm with Eli.
- Memory is fine (193MB) so streaming is NOT urgent; PROPOSE a streamed/server-side-IL-filter version as a SEPARATE held PR (98MB downloaded for 63 IL = 0.9% yield, feed growing) - do not build it now.
- Gate green + both verifiers, then HOLD with the measurement numbers in the PR body.
- **Step 4 (after Eli authorizes the merge):** go live by manual dispatch, NOT the cron. Two conditions: do NOT dispatch past 00:15Z, and confirm no other refresh run is in flight first (`gh run list --workflow=refresh-jobs.yml`). If either fails, skip - let the 01:00Z cron carry it, say so. Then report: refresh step duration, per-ATS health rows, whether the loudness gate fired, and verbatim `select count(*) from jobs where is_active and company_name ilike '%EY%';` - **success = ~63** (NOT 37; the table holds 185 pre-dark inactive EY rows, so anything near 185 is suspicious, not success).

### Deferred / not-built (need an Eli ruling to start)

- L6 continuous-sourcing standing mechanism: proposal only (lever6 doc) - trickle + decay-defense. Not built.
- P3 IL egress, P4 backlog (R1 Track B 6 supported-rail cos), P5 remote-flag honesty: see rulings above.

### Autonomy contract

Full autonomy within the approved queue; decide, log here, keep moving. HELD FOR ELI: schema, anything irreversible outside the approved queue, registry mutations (propose only), and the EY 63-vs-37 ruling. `settings.local.json` allow-list is unstaged, never commit.
