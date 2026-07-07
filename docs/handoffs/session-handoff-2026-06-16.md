# Session handoff — 2026-06-16

Continuation of the long pair-programming session (Eli + Claude.ai as architect/verifier over Claude Code in two terminals). Live pilot. Supabase ref `ilmqmodklutztuybsvwd`, repo `/Users/elienglard/getajob`.

Standing rules in force: independently verify CC claims against live DB before merge; never paste the service-role key into CC chat (pull inline so it never prints); no em dashes; surface decisions before locking; investigate-before-build; library edits get before/after verification now that Isaac cross-review is waived.

---

## DONE AND CLOSED THIS SESSION

**Extraction regression (PR #328) — fixed, proven in real CI, backfilled. CLOSED.**
Root cause: commit 8ed7cb2 (PR #308, 06-12) added per-ATS `process.exit(1)` failure isolation; combined with `refresh-jobs.yml` Stage 2 `if: success()`, any ATS family >50% failure killed the whole job and skipped extraction for ALL jobs ingested that night. Trip wire was `iai` (Israel Aerospace Industries), a single-company family returning HTML not JSON = 1/1 = 100% every night. Clean cutover 06-12→06-13; 354 jobs unextracted across all sources (not Amazon-specific). Fix: Stage 2 `if: success()` → `if: always()`; `PER_ATS_MIN_SAMPLE=5` so singletons can't false-trip. Proven via real `workflow_dispatch` run 27576433281 — green, Stage 2 executed, **426 extracted / errored=0**, and that run doubled as the backfill (all 354 cleared). Merged to main (squash 674a279). IAI broken-fetcher filed as a card in ROADMAP.md. Lesson appended (`if: success()`-as-silent-outage).
Residual note (logged, no action): Stage 2 `timeout-minutes: 8` is the next ceiling if extraction ever backs up for days; steady-state nightlies run ~60-90s, ample headroom.

**Skill recovery Tier 1 (PR #327) — merged, verified.**
Library expansion from the curation worklist. 4 NEW canonical IDs (`insurance_domain`, `collections_management`, `field_sales`, `underwriting`) + 78 aliases in `skill-aliases.ts`. `field_sales` added as NEW (not aliased to `outbound_prospecting`) — Eli's call: field/territory sales is a distinct profile from digital outbound and matters for the GTM audience. Dropped 1 alias post-spot-check (ליווי עסקאות → account_management, ambiguous in EY tax context). 15-row spot-check: 13 clean, 2 yellow resolved. Live zero-core IL jobs 1,444 → 1,141 (−303), verified against the table. 3 edge functions redeployed (extract-job-requirements, generate-career-analysis, generate-tailored-cv) so new jobs pick up aliases.

**Skill recovery Tier 2 — absorbed by the regression backfill.** The 354 never-extracted were the same jobs as the #328 backfill. Post-backfill: **never-extracted = 0, confirmed.**

**Freshness / fetch-coverage — investigated, CLOSED as non-problems.** 2-day `last_seen_at` sweep, zero stale-but-active. CC's earlier "31% false-deactivation / per-company fetch gap" RETRACTED as measurement error (bare external_id check couldn't tell IL from Chicago/Illinois). Corrected location-aware re-probe: **0.0% genuine false-deactivation (0/75)** — the "still-live" jobs were all Chicago/Illinois false-positives correctly purged by #309's IL-classification. Optional `STALE_DAYS` 2→4 bump = harmless, no measurable effect, fold in whenever or skip.

**Post-backfill corpus state (verified live):** 4,288 active IL jobs. Zero-core 845 (down from 1,141, −26%). Of the 845: 0 never-extracted, 480 recoverable-by-aliasing (the long tail we deliberately stopped chasing), **365 genuinely thin** (extracted, nothing in the JD to capture) = Tier 3 scope.

---

## TWO PRs OPEN, HELD FOR REVIEW (both approved by Claude.ai, waiting on Eli's live steps)

**PR #329 — flip unified Jobs feed to default.**
One-line gate inversion in `Jobs.jsx`: `unifiedListEnabled = !flagParam.includes("legacy_track_tabs")`. Unified becomes default at `/jobs`; `?flag=legacy_track_tabs` is the instant rollback (legacy path left intact, removable later). Tests 922/922, build+lint green. Diff is just the gate + comments (formatter churn stripped).
**STATUS: DO NOT MERGE YET.** The live eyeball surfaced real issues (see below). Holding until the feed-quality fix lands.

**PR #330 — centralized agent profile-write capability (ADD-ONLY).**
Supersedes the standalone story-capture fix (#390). Two capabilities, nothing else: add-story → `stories`, add-skill-to-experience → `experiences.skills`. Explicitly OUT: new experiences, education/goal edits, ANY edit or delete. Data-model answer confirmed: `experiences.skills` (text[]) is the column `generate-career-analysis` reads, so added skills flow into matching (not cosmetic). v1 = skill+experience pairs only; orphan skills dropped, agent asks which experience. No auto re-score. Both surfaces (ChatInterface + CoachThread) render confirm cards via centralized `coachActionHandlers`; every conversational agent prompt emits both blocks; fails loud. Live-DB verification on Eli's account passed (add-skill 27→28→cleanup, ownership-guard failure path, add-story persist+delete). Tests 932, build+lint green.
**STATUS: approved, NOT merged.** Deploy coupling is critical — see Next Actions.

---

## THE LIVE-EYEBALL FINDING (the active thread)

Eli loaded the unified feed live (`getajob.careers/jobs?flag=jobs_unified_list=1&debug=1`). Three issues, all real:

1. **Stale header copy.** Feed still says "Live roles, scored against your tracks" / "Filtered to your career-roadmap tracks" — that's the OLD track model. Needs copy describing what the feed actually does (relevance-gated best-fit).

2. **Missing filters.** Redesign spec had filters (seniority, work type, location, recency). Rendered page has only a search box. Confirm whether they shipped in #325 or were never built.

3. **The real one — weak-tail problem.** Eli's feed: ~13 roles, top is 77% (good), then falls to 53/47/39%, ~9 of 13 are low-fit, ALL Product. Showing mostly-weak cards under "Our picks for you" feels like barrel-scraping.

**Diagnosis:** NOT a scoring bug (scores are honest) and NOT a raw-volume problem (4,288 jobs is plenty). It's **gate-too-narrow-for-early-career on a thin sub-segment.** The IL corpus has few entry/mid roles in any single family, and the gate keeps only the user's exact primary domain. Secondary drag: thin-skill jobs (the 365) score low on the 55%-skill-weighted attainability.

**Decision reached (Eli agreed): options 1+2 together.**
- **Option 2 (supply fix):** for EARLY-CAREER users only, widen the gate to let ADJACENT business families through (Sales, Ops, BD, CS, Marketing), not just exact primary domain — using the existing FAMILY_ADJACENCY map. Keep the tight gate for mid/senior (an experienced PM doesn't want Sales surfaced). MUST still exclude truly-off-domain (warehouse/logistics, hardware/electrical engineering, manufacturing) — do not recreate the warehouse-logistics noise problem we fixed.
- **Option 1 (framing fix):** section the feed — "Our picks for you" = strong+good up top; a labeled "Worth a stretch / broaden" section = stretch+reach below; surface the band (strong/good/stretch/reach) ON each card, not just raw %.

Rejected option 3 (remove the gate entirely) — data shows it brings back off-domain noise at the top.

**A read-only investigate-first prompt for options 1+2 was just sent to CC.** It asks CC to: confirm how the gate + adjacency map are wired, propose the early-career-conditioned widening with an explicit exclude list, quantify before/after feed size for elienglard34 (proving the new roles are adjacent business not warehouse/hardware), and propose the sectioning + band-on-card. Eli approves the widening logic AND exclude list before any build.

**Claude.ai's review gate for that proposal:** (a) the exclude list — prove the new roles filling the feed are Sales/Ops/BD/CS/Marketing, NOT logistics/hardware; (b) the widening is conditioned on user_level (early-career only).

---

## BAND CALIBRATION — validated, holds, no change

Post-backfill distribution re-run (elienglard34 / ofriraichel / rpress13) against enriched data. Strong-share 6.1% / 12.8% / 6.1% — all well under the 25% recalibration trigger. Ofri (the swing case) rose 9.3%→12.8% but stayed under. Bands `strong≥0.55 / good≥0.42 / stretch≥0.28` HOLD. Feeds are honestly stretch-heavy (Eli ~80% stretch+reach) because the IL market has more senior/mid than entry roles for these profiles — that's the truth, not miscalibration, and it's exactly what options 1+2 address by widening supply and reframing the tail.

---

## NEXT ACTIONS (in order)

1. **Feed-quality fix (the live thread).** Await CC's options-1+2 proposal → Eli + Claude.ai review the widening logic + exclude list → build → re-eyeball the feed → THEN merge #329 to flip the default. The header-copy and filters issues fold into this.

2. **Agent PR #330 — merge + deploy in strict order, then test.** Deploy coupling is real: **merge frontend FIRST (Vercel deploys handlers), confirm live, THEN** `supabase functions deploy ai-chat --project-ref ilmqmodklutztuybsvwd`. Never deploy the function before the merge is live (would re-create the silent-drop). After both live, run ONE real end-to-end test on Eli's account through the deployed dock agent: state a real skill tied to a real experience → confirm card shows exact write → Add → verify it persists to `experiences.skills`; same for add-story → Story Bank. Do merge+deploy+test in one sitting, not piecemeal.

3. **Tier 3 (365 thin jobs)** — bounded, DEFERRED. Extractor prompt rework + model decision (gpt-4o-mini hedges). Low ceiling ("nothing in the JD to capture"). Decide scope after the feed fix; measure whether thin jobs actually hurt the live feed before paying for it.

4. **Reengagement email** — unblocks once the feed is live and good. Three open calls: thin-profile floor behavior, run `match-internship-companies` for the 3 real practicum users (Adi Burshan, Ido Dagan, Ofri Raichelson) first, dry-run all ~27 emails before send. Remove all pricing/trial copy (not current). Don't name model SKUs to the business-student audience. `job_suggestions` table is empty/orphaned; `career_roles` populated for all onboarded.

---

## FILED / PARKED CARDS

- IAI fetcher repair (returns HTML/404, drops ~475 IL listings when down) — ROADMAP.md, separate.
- Thin-JD skill-match clamp (#394) — 1-skill JDs give ~100% match to anyone.
- Director_Head taxonomy drift — non-canonical `req_seniority` values score neutral 0.5 instead of penalized.
- AGENT-switch dock render gap — smaller, separate from the story-capture fix (which #330 closes).
- Agent model upgrade (gpt-4o-mini → better, eval-gated) — for output quality; confirmed NOT blocking the wiring fixes.
- The 480 recoverable-by-aliasing zero-core jobs — deliberately NOT chased (low ROI long tail; Tier 3 handles the rest better).
- `STALE_DAYS` 2→4 — optional, no measurable effect, fold in whenever.
- Landing page redesign — Eli wants it to match the LIVE app (not the mockups), pricing REMOVED. Blocked on: it's Isaac's surface (clear the lane first) + Claude.ai can't see the auth-walled live app (needs screenshots or CC building from live components). A slide-deck-with-arrows mockup was produced but Eli wants it to match live + no pricing.
- Skill-bot-as-teaching-bot — parked v2 product direction (teach + test users to close skill gaps; builds on `skill_gaps` + `generate-learning-paths`). Validate pilot demand for in-platform gap-closing before building; it's a new product, not a feature.
- Broader agent profile-edit scope (new experiences, goal editing, edits/deletes) — open product question Eli is thinking through. v1 (#330) is adds-only leaf-fields; the centralized module is built to extend when/if he decides.

---

## RECURRING LESSON (session through-line)

Nearly every "matching is bad" symptom traced to SIGNAL SILENTLY DROPPED somewhere: family at 10% weight, skills lost at canonical mapping, seniority under-weighted, extraction silently gated off for 3 days, jobs lost to fetch-classification. Pattern: believe the trace over the snapshot; clustered anomalies are usually systematic-and-explainable, not random-broken; verify against live DB, never trust CC reports alone. Today's feed-quality finding is the next instance: the scores are honest, but a narrow gate on thin supply + showing the weak tail as "picks" made an honest system feel bad — a framing/supply problem, not a scoring one.
