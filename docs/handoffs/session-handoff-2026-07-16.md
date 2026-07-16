# Session handoff — 2026-07-16

## Where we are: scoring-formula redesign, Component 1 shipped (flag-off)

The match-quality eval gate is closed (160 human labels, `docs/eval/match-eval-labels.md`,
GOOD 33 / STRETCH 76 / BAD 51) and the redesign is executing one component per held PR,
in the approved order from the design doc (`docs/eval/scoring-formula-design.md`, held PR #594):

1. **confidence-aware ranking** — DONE. #595 (fit-based) merged, then its live check
   FAILED (identical badges, only order changed); re-targeted onto attainability in
   #597 (held). See the incident + canonical-score rule below.
2. must-have weighting — NEXT (acts on attainability_score, per the canonical rule).
   **ELEVATED design question (Eli, from the C1 live check) — C2's design doc MUST resolve
   it before any build:** pure attainability_score EXCLUDES function_family by design, and
   #597 made attainability the _sort_ key unconditionally (flag or not) — so it dropped the
   direction signal the old fit_score sort carried (family at 10%). relevance_match only
   GATES membership (off-direction dropped; primary/adjacent/unknown kept) and is a
   _tiebreaker_ only, so within the kept set an off-direction attainable job outranks an
   on-direction GOOD. Eli's live flag-on top-5 showed this: Marketing Analyst 84 > SDR 82 >
   CSM 80 > Helfy PM 77 (PM = the GOOD, on-direction, sunk). The UI promises TWO axes
   ("qualified now" = attainability + "moves you toward" = direction), but the sort now
   honors only one.
   - Must-have weighting alone will NOT fix this (it sharpens the skill axis magnitude, not
     direction). C2's doc must decide whether the for-you ranking needs a DIRECTION-AWARE
     BLEND, grounded in the 160 labels.
   - Options to evaluate against the labels (do GOODs skew more on-direction than BADs? that
     is the signal): (a) tier-first sort [primary>adjacent>unknown] then attainability — but
     that is the pre-#585 order that caused "75% after 21%", so too strong alone;
     (b) fold a direction bonus back into the blended score (attainability + w*goal_alignment,
     or *(1+w*on_direction)), tune w on the labels; (c) surface both numbers in the UI and
     sort by the blend (matches the two-axis promise). Harness first, held PR, flag-gated.
   - **Flag-default decision (deferred):** keep ?scoring_confidence opt-in for now; flip
     default-on as part of C2 so the confidence + direction fix ship as ONE validated re-rank
     (Claude's rec; Eli may flip earlier since flag-on can't worsen the already-live direction gap).
3. hard gates
4. negative signals ("underleveled matches" band+role-tier both directions; also
   single-generic-skill inflation + flat-tie, both confirmed named signals)
5. embeddings — last, only if headroom

**Rules for every component (Eli, standing):** own held PR; flag-gated, default OFF;
harness re-run with per-component attribution + the GOOD-recall guardrail reported on
each; nothing ships to the live scorer until Eli reviews the harness results.

## INCIDENT + canonical-score rule (2026-07-16) — read this before Component 2

**The score the product renders on `/Career` is `attainability_score`, not `fit_score`.**
The unified card badge shows `attainPct` (attainability), the picks/stretch bands are
built on it. #595 shrank `fit_score`, which the feed only **sorted** on — so the live
check showed identical badges with just the order changed. Root cause: the feed sorted
one score and displayed another.

**Canonical-score rule (Eli, Option A):** `attainability_score` is the canonical for-you
score — **sort == display == bands**, all on attainability. `fit_score` is the Search-tab
number only. **Components 1–5 ALL act on `attainability_score`.** Recorded in the design
doc §7 (#594 branch) + here.

**Measurement lesson:** harness metrics must be computed on the quantity the product
actually renders. The v1 harness measured `fit_score` (and even sorted by attainability
via a stale line) — neither matched the live badge. The harness now sorts by + reports
`attainability_score`. Logged in `tasks/lessons.md`.

**Re-target = #597 (held, `eli/scoring-c1-attain-retarget`).** Same flag/default-off.
Harness on attainability (pinned 160, off→on): calibration GOOD 0.80/STRETCH 0.70/BAD 0.60;
separation off 82.7/70.2/72.0 → on 76.5/64.3/62.1 (fixes BAD>STRETCH inversion, GOOD/BAD
gap 10.7→14.4pt); BAD-in-top-5 29→20; GOOD-recall 21→24 preserved; ELI badge de-tie 6→10
distinct (now on the DISPLAYED number). fit-vs-attain divergence mean 2.8 / max 6 → labels
unaffected. Live re-check: `https://getajob.careers/Career?scoring_confidence=1` — badges
should de-tie this time.

## Component 1 v1 — what shipped (#595, merged to main `339cb55`, live via Vercel `dpl_4ovpnBTaHo9b1qjTDV2VfszqSHH1`) — SUPERSEDED by #597's re-target

- `src/lib/scoreJobFit.js`: new exported `matchConfidence(skill, job, conf)` → [0,1] from
  requirement **thinness** (core-skill count), match **distinctiveness** (generic vs
  distinctive, curated `GENERIC_SKILLS` set), **coverage** (`skill_coverage_ratio`, which
  was computed in Phase 0 but never folded into the math), and graded **extraction_confidence**.
  Composite is shrunk toward a neutral prior: `fit = 0.5 + (fit - 0.5) * confidence`.
- `src/lib/flags.js`: `scoringConfidenceEnabled()` reads `?scoring_confidence=1`, **default OFF**.
- Wired at all 3 call sites (`UnifiedJobsFeed.jsx`, `JobsSearchTab.jsx`, `JobMatchChecker.jsx`).
- `src/test/scoreConfidence.test.js`: confidence ordering + **flag-off byte-identity** + flag-on de-confidence.
- **Frontend-only** — no edge function imports scoreJobFit (the three edge-fn references are
  comments only), so ships via Vercel, no `supabase functions deploy` needed.
- **Live is byte-identical with the flag off** (proven by the byte-identity test + the
  `else if (conf < 0.4)` legacy path still runs when the flag is off).

### Harness results (pinned 160 re-scored offline with the real `matchConfidence`, flag on vs off)

- **Calibration (headline): mean confidence GOOD 0.79 / STRETCH 0.73 / BAD 0.56** — confidence cleanly stratifies match quality.
- Score separation GOOD vs BAD mean: **84/72 → 78/62** (gap 12 → 16 pts).
- ELI 87% tie cluster: **7 rows → 10/10 distinct scores**.
- Within-pinned-10: BAD-in-top-5 24 → 21, top-3 14 → 12; **GOOD-recall guardrail 18 → 21** (preserved).
- **Caveat:** the pinned set is only each profile's top-10, so BAD-in-top-5 _understates_
  the real win (rank-11+ high-confidence jobs displacing low-confidence BADs is invisible
  offline). The full reduction needs a live full-candidate harness re-run.
- **Measurement method** (reusable for components 2-5): snapshot the pinned (user, job)
  confidence inputs via one MCP SQL query (SQL does the join + skill intersect), re-score
  offline in a vitest importing the real `matchConfidence`. Avoids moving 17KB of SQL through MCP.

## Live full-candidate check (Eli's account)

- URL: **`https://getajob.careers/Career?scoring_confidence=1`** (put the param on `/Career`
  directly — `/Jobs` redirects and may drop the query string).
- Baseline first without the param, then with, same profile, and diff the top ~10.
- Expect: the BADs riding a single generic skill (the 87% ELI cluster) drop; higher-confidence
  jobs (several distinctive core-skill matches, real coverage) surface from rank 11+.
- If it looks right → enable the flag by default (flip `scoringConfidenceEnabled` default or
  remove the gate) in a small follow-up, THEN start Component 2. If not → tune constants
  against the labels (not by eye) and re-run the harness.

## Held PRs awaiting Eli

- **#594** — scoring-formula design doc (the plan for all 5 components)
- **#598** — Component 2 design doc — **APPROVED 2026-07-16** (rulings below); now the build spec
- **#592** — CV Studio contracts spec (S1–S8 + Option-A write-through build spec; edit-history
  table is a blocking prerequisite for coach write tools)

## Other open threads (not this lane)

- CV Studio Option-A build (write-through + undo + shared write layer + coach writes) — spec'd in #592, not built.
- CV generation speed plan (streaming flag-gated, then prompt caching) — approved, build after CV fix PRs land.

## Component 2 — KICKOFF STATE (2026-07-16, #598 approved, ready to build)

Design = **PR #598** (`docs/eval/scoring-c2-musthave-direction-design.md`, branch
`eli/scoring-c2-musthave-direction`). Read it first — it carries the measured label evidence.
C2 solves TWO things (elevated from the original must-have-only line): **2a must-have weighting**

- **2b direction-aware sort** (attainability alone is direction-blind; that's the live gap).

**Eli's rulings (2026-07-16):**

1. **UI = Option B (two-number card).** `attainability_score` stays PURE "qualified now";
   direction is its own visible axis on the card; sort by the transparent blend. Honors the
   two-axis promise the role card already makes. Reversible — **math ships first**, UI second, so
   if the rendered card disappoints we retune without unwinding the ranking.
2. **Flag = combined `?scoring_v2`.** Fold C1's confidence-aware shrink in as **component one**,
   so users eventually get ONE validated re-rank (C1 + 2a + 2b behind a single flag). Keep the
   old `?scoring_confidence` working or alias it to `?scoring_v2` during transition — mechanics
   my call. Default OFF until Eli's live check passes.
3. **2a formula approved as designed.** Build order stands.

**Build order (each its own held PR; harness re-run + GOOD-recall guardrail between each):**

- **2a — must-have weighting (do first).** Reshape `computeSkillAxis` in `src/lib/scoreJobFit.js`:
  asymmetric core penalty (a 1-of-1 core match must be ≪ 1.0; missing a core hurts more than a
  matched nice helps) + distinctive>generic (reuse C1's `GENERIC_SKILLS`). Acts INSIDE
  `attainability_score` → sort==display==bands invariant preserved for free. Branch
  `eli/scoring-c2a-musthave` off main.
- **2b — direction-aware blend (second).** `rank_score = attainability_score × (1 + w·on_direction)`
  (`on_direction = relevance_match==="primary"`), `w` tuned on the labels. NOT pure tier-first
  (that was the pre-#585 "75% shown below 21%" failure). Ranking-math + harness land BEFORE the
  Option-B UI bytes so `w` is validated first. Then the two-number card.
- Wire the `?scoring_v2` flag across the 3 call sites (`UnifiedJobsFeed.jsx`, `JobsSearchTab.jsx`,
  `JobMatchChecker.jsx`); keep flag-off byte-identical (test it, like C1's byte-identity test).

**MANDATORY harness check (§5 of #598):** run 2a alone / C1 alone / 2a+C1 together — confirm 2a is
**not double-counting** C1's thinness+distinctiveness shrink. Decide the split from the numbers.

**Harness = `scripts/match-eval-harness.ts`** (exists) over the pinned set
(`docs/eval/match-eval-pinned.json`) vs the 160 labels (`docs/eval/match-eval-labels.md`). Sort by +
report the **rendered** number (`attainability_score` for 2a; `rank_score` for 2b) — the
2026-07-16 lesson. Metrics: BAD-in-top-5 (in-snapshot targets: 7 off-direction BADs in a top-5;
42 single-generic-signature rows), GOOD/BAD + STRETCH/BAD separation, BAD-above-GOOD inversions
(baseline **21**, of which 7 involve an off-direction BAD → 2b's direct target), GOOD-recall
guardrail (3 non-primary GOODs are at risk from 2b; a strong single-distinctive-core GOOD from 2a).

**Reusable direction-analysis method (this session):** the pinned (user, job) tuples were joined to
LIVE `jobs.function_family` / `profiles.primary_domain` / `req_skills_core` via one MCP SQL query
(a VALUES tuple list joined to `jobs`+`profiles`, with `relevance_match` computed in-DB from the
`DOMAIN_TO_FAMILIES`/`FAMILY_ADJACENCY`/business-widening maps). That reconstruction reproduced the
21-inversion baseline exactly → trustworthy. Formalize it into the harness for 2a/2b. Measured
findings that justify both levers: 91% of GOODs on-direction; adjacent = 5% GOOD / 57% BAD;
must-have additive within primary (matched_core 0→62% BAD / 3+→12% BAD/41% GOOD).

**Eli's post-merge ritual:** same two-URL live check after each merge — baseline (no flag) vs
`https://getajob.careers/Career?scoring_v2=1`, diff the top ~10. Nothing ships default-on until it
passes. See [[scoring-c2-musthave-direction]] in memory.
