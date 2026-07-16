# Session handoff — 2026-07-16

## Where we are: scoring-formula redesign, Component 1 shipped (flag-off)

The match-quality eval gate is closed (160 human labels, `docs/eval/match-eval-labels.md`,
GOOD 33 / STRETCH 76 / BAD 51) and the redesign is executing one component per held PR,
in the approved order from the design doc (`docs/eval/scoring-formula-design.md`, held PR #594):

1. **confidence-aware ranking** — DONE. #595 (fit-based) merged, then its live check
   FAILED (identical badges, only order changed); re-targeted onto attainability in
   #597 (held). See the incident + canonical-score rule below.
2. must-have weighting — NEXT (acts on attainability_score, per the canonical rule)
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
- **#592** — CV Studio contracts spec (S1–S8 + Option-A write-through build spec; edit-history
  table is a blocking prerequisite for coach write tools)

## Other open threads (not this lane)

- CV Studio Option-A build (write-through + undo + shared write layer + coach writes) — spec'd in #592, not built.
- CV generation speed plan (streaming flag-gated, then prompt caching) — approved, build after CV fix PRs land.

## Next action when the Component-2 lane opens

must-have weighting: separate `req_skills_core` (must-have) from `req_skills_nice` in the
skill axis so matching a nice-to-have counts less than matching a must-have. Same pattern:
`eli/scoring-c2-musthave-weighting`, flag-gated default off (reuse the `flags.js` pattern,
or a new `?scoring_musthave=1`), harness re-run + GOOD-recall guardrail, held PR.
