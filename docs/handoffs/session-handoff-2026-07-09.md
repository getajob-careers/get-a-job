# Session handoff - 2026-07-09

The largest session to date, spanning 2026-07-08 through 07-09 midday. Roughly twenty PRs merged
(the #527 to #548 range), three migrations applied, and a string of function deploys, all
fingerprint-verified live. The through-line was making the flagship (CV generation) excellent while
the platform kept shipping around it: the Sammy onboarding bug was root-caused and fixed, a month-old
silent edge-function outage was found and backfilled, two platform audits ran (external SEO shipped,
internal P1s fixed or queued), and the sourcing registry crossed ~1170 companies. Everything below
carries enough state to resume cold.

---

## Merged on main (07-08 to 07-09)

CV Excellence Arc (the flagship thread, see its own section):

- **#541** P0 - observability + immutable `generated_cv_data` snapshot.
- **#543** S1 - frontend progress skeleton + truthful phase labels.
- **#544** P1 - retention floor (restore LLM-dropped stored bullets).
- **#546** P1.1 PR-1 - retention floor moved POST anti-fab + frontend model-seed fix.
- **#547** revert of #546's frontend only (the /CVAgent outage, see below).
- **#548** corrected re-ship - single-writer `useSeededCvModel` hook + first-render regression test.

Onboarding / Sammy:

- **#528** CV-upload resiliency - breadcrumbs (`log_onboarding_event`), 30s timeouts, honest
  parse-failed handoff.
- **#529** `database.types.ts` regen for `onboarding_events` + the RPC.
- **#532** enable CV-upload resiliency by default (the flag is now ON in prod).

Landing / misc frontend:

- **#531** wire the Hero stats to `landing_stats` (Yishai), drop the hardcoded literals.
- **#533** landing sweep (LandingV2Preview confirmed the LIVE homepage, not a dev preview; its
  "Coming soon" extension tile is intentionally kept - do not re-flag).

Sourcing / registry:

- **#527** Comeet harvest r2 - 32 keepers, +215 live IL roles.
- **#530** Comeet registry dedupe - dropped 6 stale/duplicate rows (1168 -> 1162).
- **#534** Comeet `apply_url` fix + 207-row backfill (careers-root to position-specific hosted page).
- **#536** Comeet r2 backlog keepers - Sensi.AI + SysAid (1162 -> 1164).

Reliability / infra:

- **#538** `extract-proof-signals` boot-crash fix (dead ~1 month, see below).
- **#539 / #540** proof-signals backfill scripts (PDF via unpdf, then DOCX via mammoth).
- **#542** `deno bundle` boot-check CI for `supabase/functions/`.
- **#545** alias-map drift + duplicate-key fix + role-mirror regeneration + CI staleness guard.

External SEO audit fixes: **SHIPPED** to main (the crawl / metadata / structured-data items from the
audit are live; internal-audit outcomes are in their own section).

**Registry on main: ~1170 companies.**

---

## Migrations applied (live)

- **`onboarding_events`** (`20260708_onboarding_events.sql`) - the Sammy breadcrumb table, written by
  the `log_onboarding_event` SECURITY DEFINER RPC. Note: still nearly empty (~8 rows) as of the audit;
  wiring is live but the funnel is only just starting to emit.
- **`landing_stats`** (`20260708_create_landing_stats.sql`) - single-row Hero counter cache, RLS
  SELECT-only for anon/authenticated, service-role writes only, seeded 5700/525.
- **`generated_cv_data`** (CV Arc P0, #541) - immutable per-generation snapshot for observability.

---

## Deployed / fingerprint-verified

All deploys bundled from local and fingerprint-verified live per the working rules.

- **`generate-tailored-cv` v148 -> v149 -> v150** across P0 / P1 / P1.1.
- **`refine-cv` v28** (P0/P1 reconcile logic).
- **`ai-chat` v103**.
- **`extract-proof-signals`** redeployed with the boot-crash fix (OPTIONS now 200, was 503).
- **`send-welcome-email` v13**.

---

## CV Excellence Arc (flagship - highest-value thread)

Making CV generation excellent. Root cause of every content failure: `generate-tailored-cv` Pass-2
lets an LLM author the whole document from scratch, so it drops real profile bullets (Get a Job 5->2)
and fabricates ("team of five volunteers"). Proven on a 6-CV eval set from Eli's 07-08 dogfooding.
The product is LIVE with real users (pilots launched June 2026), so this is treated at live-user
severity, not as pre-launch prep. Tailored generation has just seen little real usage so far (0 of
55 real users have run it yet), so today the exposure is low-volume rather than low-severity - any
real user can run it now, and the practicum cohort will drive volume into tailoring.

**Binding product principle (Eli): AI advises, user decides.** All stored bullets appear by default;
AI may LABEL "weakest for this role" but never drops, rewrites facts, or adds content. Anti-fab is
absolute.

**Phase 1 design doc (approved):** `docs/research/cv-excellence-arc-phase1.md` - source map, pipeline
and guard map, gap matrix, prevalence, eval set, fix design, cited external research
(assembly-not-full-authoring is the category standard).

**Shipped and LIVE-VERIFIED by Eli:**

- **P0 (#541)** - `generated_cv_data` migration live; gtc v148, refine v28 fingerprinted. One
  behavioral check still pending: the next real generation must write `generated_cv_data` and fire
  `cv_generated` (0 gens since deploy).
- **S1 (#543)** - frontend skeleton + honest phase labels (build + coach blank waits; tailor left
  as-is per honest-UI; full consistency rides P7).
- **P1 (#544)** - retention floor: `bulletCoveredBy` reword-aware coverage restores stored bullets
  the LLM dropped; flagged `deprioritized_bullets` for the future P6 advisory UI. Eval: Get a Job
  2->5/5, Guardio 5->7/7, Combat 2->3/3. Does NOT remove fabricated ADDED bullets (that is P2).
- **P1.1 (#546 PR-1)** - P1's floor was DEFECTIVE (ran before anti-fab, which then stripped bullets;
  Eli's live gen showed 2/5 despite v149). PR-1 moved `applyRetentionFloor` to run POST anti-fab as
  the final word + a HARD RULE prompt (never inject JD proper nouns into past-role bullets).
  Backend **gtc v150** verified good (Eli 09:03, 5/5).

**The /CVAgent outage (contained, resolved):** #546's FRONTEND hard-broke /CVAgent - permanent
spinner on initial load, silent (PostHog 0 exceptions), blast radius Eli-only so far (only Eli had
exercised /CVAgent). Cause: two
effects both keyed on `selectedCvId` wrote `model`; on a warm react-query cache the chat-reset ran
after the seed and nulled `model`, never re-seeding. **Reverted frontend-only via #547** (gtc stayed);
prod restored 09:51 UTC. **Corrected re-ship = #548** (fa816e5, Vercel prod green 10:28 UTC): a
single-writer `useSeededCvModel` hook makes the two-effect clobber structurally impossible, plus
deep-link re-resolve (per-param ref) + auto-select on tailor completion + a first-render regression
test (proven fail-on-broken, pass-on-fixed).

**Eli's live-verify order for #548:** (1) hard refresh /CVAgent loads; (2) fresh tailored gen 5/5;
(3) Studio auto-selects the new row on completion (no manual nav).

**PR-2 in flight (builds AFTER Eli's #548 live confirm):**

- (a) em-dash chokepoint = a shared scrub in `cv-enforce-invariants` invoked by gtc/refine/edit +
  `CV_VOICE_RULES` in refine/edit.
- (b) the RENDERER's honors-separator em dash.
- (c) the review-banner copy em dash.
- (d) NEW retention bug from PDF review - Nahal renders 2 bullets vs 3 stored with nothing
  deprioritized. `bulletCoveredBy` (>=50% significant-token overlap) likely let ONE emitted bullet
  cover TWO stored bullets, so the floor restored neither. The retention invariant is PER-BULLET
  representation, so coverage must be a 1:1 matching (each stored bullet needs its own distinct
  emitted representation; one emitted bullet satisfies at most one stored bullet). Fix in
  `applyRetentionFloor` / `bulletCoveredBy`.

**Roadmap P2 to P7 (each PR regression-gated on the 6-CV eval set, held-PR pattern):** P2 anti-fab
(spelled-out numbers in `QUANT_TOKEN_RE` + per-bullet provenance; decide arm-vs-supersede for
`cv_reconcile_verify` / `cv_antifab_attribution` here) -> P3 no gap-disclaimers -> P4
bullets/responsibilities unification + Profile bullets editor -> **P5 rearchitecture: assembly +
constrained per-section AI** (makes drop/fabrication structurally impossible) -> P6 advisory
bullet-toggle UI -> P7 streaming + caching + Haiku. Deprioritized tail: D1 em-dash chokepoint lift,
D2 needsCompany park visibility, D3 A3 save-guard.

---

## Sammy onboarding arc - RESOLVED

The month-old blocker (a signed-up user stuck at `onboarding_step` 0 on CV upload) was root-caused and
fixed. The upload leg silently emptied the form on parse failure with no telemetry. Fixes shipped:
`log_onboarding_event` breadcrumbs (#528) + `onboarding_events` table, 30s AbortController timeouts, an
honest parse-failed handoff, and the resiliency flag flipped ON by default (#532). Note: Sammy's
account (`9f47d5e7`) is also one of the proof-signals no-resume-file users below, consistent with the
upload never landing a file.

---

## extract-proof-signals outage - RESOLVED + backfilled

The function was boot-dead HTTP 503 on every request from **2026-06-10 to 2026-07-08** - a duplicate
`const body` from PR #283 was a module-load SyntaxError, invisible to `npm run typecheck` (which only
covers `src/`). On the onboarding resume-parse path it failed silently (wrapped in a non-fatal catch),
so every resume upload got empty `proof_signals` / `primary_domain` / `adjacent_fields`.

- **#538** fixed it (deployed live, OPTIONS 200).
- **#539 (PDF) + #540 (DOCX)** backfilled: **24 of 29** outage-window profiles recovered (17 external
  - 3 internal written; a DOCX-vs-PDF-only-extractor snag caught and fixed with mammoth `{ buffer }`).
- **Remaining:** 5 file-missing users need re-upload (4 external + 1 internal). Held for a small
  re-engagement email until CV quality + backfill fully settle.

---

## Platform audits (two ran this session)

- **External SEO audit:** fixes **SHIPPED** to main (live).
- **Internal platform health audit** (5-agent fan-out, every P0/P1 re-verified against ground truth):
  - No P0. Security posture solid (all 37 tables RLS-enabled, no anon write, one unpinned
    `search_path` P2).
  - **P1 fixed this session:** the alias-map drift + duplicate-key bug (#545); the extract-proof-signals
    outage + backfill (#538 / #539 / #540); the edge-function static-check gap (#542).
  - **P1 queued:** nightly `refresh-jobs` cron ran partial/near-zero ~9 nights (6/29 to 7/7), no
    run-history table and no failure alarm - the pipeline that keeps Browse Jobs fresh is unobservable
    (a `cron_runs` table + a staleness alert is the fix). Latency tails on core CV/analysis flows brush
    the 60s edge wall (generate-career-analysis max 100s / p99 84s).
  - **P1 (data):** 9 authenticated-but-no-profile users are onboarding-step-0 bounces (not a bug; flow
    self-heals on return); funnel telemetry is deferred to the AdminLaunch count-from-`auth.users` work.
  - **P2 hygiene:** function_metrics ghosts (6 names), 4 uninstrumented functions, dead-code candidates,
    perf-advisor lints, divergent company sources (`public.companies` vs `companies_il.json`).

---

## Registry / sourcing

- **Dedupe (#530):** 1168 -> 1162; drops recorded in `docs/sourcing/comeet-harvest-ledger.md`.
- **apply_url fix (#534):** the fetcher preferred `url_active_page`, which for custom-site tenants is
  the bare careers root shared across every opening (all Guardio jobs -> `guard.io/careers`). Now
  prefers the position-specific comeet-hosted page when active is a shared root; 207 existing rows
  backfilled via MCP `apply_migration`. Comeet-only signature (no other ATS affected).
- **r2 keepers (#536):** the pre-#527 backlog (18 of 26 already HAVEs); +2 net-new (Sensi.AI, SysAid).
- **Registry ~1170 companies on main.**

---

## Alias-map drift + Deno bundle CI

- **#542** added `.github/workflows/edge-functions.yml` running `deno bundle --no-check
--node-modules-dir=none` on every function. Bundling mirrors the edge runtime (SWC), so a clean
  bundle means the function boots; it catches the #283 duplicate-const class while ignoring the ~26
  runtime-inert type errors that a full `deno check` would red-fail on. Proven against beda4db.
- **#545** fixed the alias-map drift P1 + the one real duplicate-key data bug: `00_role_library.ts`
  `junior_software_engineer.alternate_titles` was declared twice (8 aliases silently dropped ~1 month,
  zero users affected). Regenerated the drifted client mirrors from the canonical 195-role lib
  (`roleLookup.js` 159 -> 195 with the 36 missing AI/ML, legal, compliance roles restored;
  `roleSkillsGenerated.json` 185 -> 195), added the missing `scripts/regen-role-lookup.mjs` generator,
  and a `ci.yml` staleness check so the mirrors cannot silently drift again.

---

## Phase-two roadmap (post CV quality)

The next platform arc is **jobs push + match emails** (surface matched roles to users proactively).
It is explicitly **gated on CV quality + scoring honesty** - do not start until the CV Excellence Arc
lands its structural fix (P5) and the scoring-coverage story is honest. Enthusiasm without those two
foundations just pushes users into a flow that degrades their output.

---

## OPEN threads

- **CV Arc PR-2** - in flight, builds after Eli's #548 live confirm (em-dash chokepoint + the Nahal
  1:1-coverage retention bug).
- **CV Arc P2 next** - anti-fab: the "team of five" fabricated-content class (spelled-out numbers +
  per-bullet provenance).
- **Coach `resolveApp` false-negative** - a DriveNets duplicate proposal; the resolver misses an
  existing application and re-proposes.
- **Tracker-toast "View in Studio" link** - needs wiring/fix.
- **4-user re-upload email** - the proof-signals file-missing users; held until CV quality settles.
- **A5 bake-off** - HELD until P5 scoping (P5 may supersede its insertion point).
- **9 dual-ATS pass** - the same-domain-across-two-ATS registry entries (atera, biocatch, deloitte,
  discountbank, doorloop, incredibuild, oligo, sentra, zim); awaiting Eli's scoped prompt.
- **Browser-agent queue** - Netanya + 2 Hebrew Comeet passes (CAPTCHA-blocked) + token recaptures for
  Browsi / Sightful / LawGeex.
- **21 edge-function type errors -> blocking `deno check` lane** - queued as the immediate next task
  after this handoff (clear the 21 runtime-inert errors, then layer a blocking `deno check` onto the
  bundle boot-check).
- **Cron observability P1** - `cron_runs` table + staleness alert for the nightly `refresh-jobs`.
- **Eli's coach session** - to enrich his own Get A Job bullets (dogfooding the coach into the loop).

---

## Working rules (unchanged) + one new lesson

- **Verify, do not trust** CC self-reports. Eli / Claude.ai verify via the Supabase MCP.
- **Proportional review.**
- **Everything held for Eli's approval.**
- **No em dashes** in repo artifacts.
- **Deploys** bundle from local + fingerprint-verify live after.
- **Squash-merge, confirm merged, delete the branch as separate steps.**
- **NEW lesson (from the #546 /CVAgent regression):** state-lifecycle frontend changes (effects that
  seed or reset component state on an id/param change) need an **initial-load browser test before
  merge**. #546 passed unit tests and typecheck but hard-broke the page on cold load with a warm cache,
  silently. If a change touches which-effect-writes-what-when, drive the real page on first load, not
  just the tests. Logged in `tasks/lessons.md` (2026-07-09).

---

## State pointers

- **On main:** everything above is merged; the CV Arc is live through P1.1 (#548).
- **Highest-value open thread:** the CV Excellence Arc (PR-2 in flight, then P2 anti-fab, then the P5
  rearchitecture that makes drop/fabrication structurally impossible).
- **Held / awaiting:** CV Arc PR-2 (after #548 live confirm); the 4-user re-upload email; the 9
  dual-ATS pass and browser-agent queue (awaiting prompts).
- **Deployed-inert flags (OFF):** `cv_reconcile_verify`, `cv_antifab_attribution`, `gtc_author_from_app`
  (A5), `cv_enforce_v2`, Hebrew routing. Arm-vs-supersede decisions ride inside P2 / P5 / P7.
- **CI now guards:** frontend build + tests + role-mirror staleness (ci.yml); edge-function boot via
  `deno bundle` (edge-functions.yml). A blocking `deno check` lane is queued.
- **Registry:** ~1170 companies on main.
