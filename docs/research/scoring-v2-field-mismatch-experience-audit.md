---
owner: cv-lane
last_reviewed: 2026-07-24
code_paths:
  - src/lib/scoreJobFit.js
  - src/lib/experienceLevel.js
  - src/components/jobs/ScoreRing.jsx
  - supabase/functions/_shared/track-scoring-constants.ts
---

# scoring_v2 — is the experience axis field-blind? (MEASUREMENT, no formula change)

**Symptom (Eli, observed):** roles from a completely different profession show a "100%
experience match" when the user has the required _years_ but zero years _in that field_.

**Task:** measure whether the experience/years axis is field-blind, whether direction gating
compensates in **both ranking and display**, and propose fixes. **Evidence, not code. All
fixes HELD FOR ELI.**

**Method / fidelity.** Real `src/lib/scoreJobFit.js` with the live digest opts
`{confidenceAware, mustHave, directionBlend}` against a DB snapshot: 16 eval profiles, 75
clearly-cross-profession live jobs (accountant / bookkeeper / tax / auditor / lawyer / legal
counsel / mechanical engineer / clinical), and the fresh post-fix 38-row `email_dry_run_log`
digest. Educations passed as `[]` (mirrors the match-eval harness); this only affects the
seniority ceiling, never the years axis under test.

---

## 1. What the experience / years axis actually compares (VERIFIED — field-blind)

**The years axis compares TOTAL career years to the JD's `req_years_min`. It never looks at
field, family, or domain.**

- `computeYearsAxis(userYears, job)` — **`src/lib/scoreJobFit.js:357-401`** — takes a single
  scalar `userYears` and compares to `req_years_min`/`req_years_max`: `userYears >= reqMin`
  → **score 1.0, status `in_range`** (or 0.7 `above_max` if far over); below → linear
  `max(0.25, 1 - gap*0.2)`.
- `userYears = totalYearsOfExperience(experiences)` — **`src/lib/experienceLevel.js:97-115`**
  — sums the duration of EVERY career-countable experience (`internship`, `full_time`,
  `freelance`, `part_time`, `founder`), **regardless of title, company, family, or domain**.
  There is no family/domain filter anywhere in the sum.
- The user _level_ (`inferExperienceLevel`, `experienceLevel.js:126-132`) that drives the
  seniority ceiling is likewise total-years-based — also field-blind.
- **Grep confirms no field-relevant-years path exists** anywhere in `src`/`supabase`
  (`family.*year` / `relevant.*year` / `field.*year` → zero hits).

So a marketing student with 3 total years scores `years = 1.0 / in_range` against a Mid
**accounting** role that requires 3 years — identical to how it scores a Mid marketing role.
The years axis carries **0.22 of attainability** (`ATTAINABILITY_WEIGHTS`), so this field-blind
1.0 contributes ~0.22 to the displayed number.

**Measured (5 business profiles × 75 cross-field roles = 375 pairs):** the years axis reads
**met (`in_range`/`above_max`) in 238/375 pairs** — i.e. 63% of cross-profession pairings show
a satisfied experience axis built on zero field-relevant experience.

---

## 2. How direction gating enters the score + UI — and whether it compensates

Direction (`function_family` vs the user's `primary_domain`) is computed as `relevance_match`
(**`scoreJobFit.js:596-620`**): `primary` (family ∈ the domain's families) / `adjacent`
(family ∈ `FAMILY_ADJACENCY`, plus the early-career business-widening set) / `unknown` (JD has
no family) / `off` (dropped). It enters the pipeline in exactly **two** places, and **neither
touches the displayed experience axis, attainability, or band**:

1. **Feed membership** — `relevance_match === "off"` drops the job (`selectDigestJobs.js:55`;
   the live feed does the same). This is the ONLY hard field compensation.
2. **Sort only** — `rank_score` applies a soft `×(1 + 0.25)` boost to `primary` roles
   (`scoreJobFit.js:671-687`). Adjacent/unknown get no penalty, just no boost.

**`attainability_score` EXCLUDES `function_family` by design (#393)** — the composite is
skill+years+education+seniority renormalized (`ATTAINABILITY_WEIGHTS`). So for any role that
clears the `off` gate, the displayed number and band are **completely field-blind**.

### Does an off-field role with matching years still display a high experience axis? YES.

The UI breakdown (`src/components/jobs/ScoreRing.jsx:28-34`, `scoreAxes`) is itself mislabeled:

- the **"Experience"** row = `attainability_score` (the whole composite), NOT the years axis;
- the **"Seniority"** row = `fit_score` (the whole legacy composite), NOT the seniority axis.

And the reasoning-strengths string **`"Experience matches"` fires whenever `years_status ===
"in_range"`** (`scoreJobFit.js:698`) — so a cross-profession role literally earns a green
"Experience matches" chip. That is the "100% experience match" the user saw: the years axis is
maxed field-blind, and the card surfaces it as a satisfied experience signal. Direction shows
up only as the feed _section_ and a per-card "on your goal path" tag — never inside the number.

**Verdict on compensation:** direction gating compensates in **ranking only, and only
partially** (drops `off` families, softly boosts `primary`). It does **not** compensate in
**display** at all — the experience axis, attainability, and band are field-blind for every
role that passes the `off` gate.

---

## 3. Empirical probe — business profiles × same-seniority cross-field roles

`relevance | yearsAxis | attain | band | feed-in?` (live opts). "feed-in" = `relevance!=off &&
attain>=0.42`.

```
P10 finance (senior, 11y):
  Bookkeeper Level 3    [Finance]      primary   above_max  0.48 good   FEED-IN ✔ (their field)
  Int'l Tax Manager     [Consulting]   adjacent  above_max  0.42 good   FEED-IN ✔  <- cross-field leak
  Internal Auditor      [Operations]   adjacent  in_range   0.44 good   FEED-IN ✔  <- cross-field leak
  Lawyer                [Legal]        off       in_range   0.46 good   dropped   (gate caught it)
  Mechanical Engineer   [Engineering]  off       in_range   0.41 stretch dropped  (gate caught it)

P01 data/ops (mid, 3y):
  Bookkeeper Level 3    [Finance]      adjacent  in_range   0.54 good   FEED-IN ✔  <- cross-field leak
  Internal Auditor      [Operations]   primary   in_range   0.46 good   FEED-IN ✔
  Int'l Tax Manager     [Consulting]   off       below      0.43 good   dropped

P11 marketing (mid, 3y):
  Bookkeeper / Auditor / Mech Eng      off       in_range   ~0.44      dropped (gate caught all)
```

**Reading.** The years axis is `in_range`/`above_max` field-blind in nearly every pairing
(a finance senior reads `in_range` on Mechanical Engineer; a marketing mid reads `in_range` on
Bookkeeper). The **gate saves the far-field cases** — `Legal_Compliance` and `Engineering` are
`off` for business domains, so Lawyer / Mechanical Engineer are dropped. But **`Finance`,
`Consulting`, `Operations` leak through** as `adjacent` (via each domain's `FAMILY_ADJACENCY`
and the early-career business-widening set), and once through they display field-blind: a Tax
Manager or Internal Auditor shows **band=good** for someone with zero tax/audit experience.

**Aggregate:** of the 375 business×cross-field pairs, **60 pass the feed gate AND have a
satisfied years axis** — visible cross-field leaks, all in Finance/Consulting/Operations.

---

## 4. Digest lens — field-mismatch picks in the live (post-fix) 38-row digest

Scanning the fresh 38-row dry-run for picks whose family is a hard-profession family
(Finance/Legal/Engineering/Consulting/Manufacturing/IT_Security/AI_ML), not the user's own
domain, and `relevance != primary`: **9 flagged picks.**

```
werner.gidon   [cybersecurity] <- "C++ & Python Developer"      [Engineering] adjacent 0.78 STRONG  yrs=in_range skill 83%
burshanadi62   [cybersecurity] <- "Salesforce Developer"        [Engineering] adjacent 0.81 STRONG  yrs=in_range skill 75%
burshanadi62   [cybersecurity] <- "Backend Engineer"            [Engineering] adjacent 0.78 stretch yrs=in_range skill 100%
amischapiro    [product]       <- "C++ & Python Developer"      [Engineering] adjacent 0.78 STRONG  yrs=in_range skill 83%
amischapiro    [product]       <- "Backend Engineer"            [Engineering] adjacent 0.75 stretch yrs=below    skill 100%
rpress13       [data]          <- "Economic Consultant, public" [Consulting]  adjacent 0.70 STRONG  yrs=unspec   skill 100%
dan.sonnenblick[—]             <- "Quality/Regulatory/Tech-writer"[Consulting] adjacent 0.69 STRONG yrs=below    skill 67%
dan.sonnenblick[—]             <- "Finance Operations Analyst"   [Finance]     adjacent 0.63 STRONG  yrs=unspec   skill 100%
```

These are business/analyst students being emailed **software-developer** and cross-profession
roles as **band=strong** matches, with the experience axis satisfied field-blind. They pass
because `product`/`cybersecurity` adjacency includes `Engineering`, and (for the null-domain
user) the family axis goes neutral. The band shows nothing about the field gap.

---

## 5. Findings & candidate fixes (HELD FOR ELI)

**Is the experience axis field-blind?** **Yes, VERIFIED** — it is a scalar total-years vs
`req_years_min` comparison with no field/family/domain input (§1).

**Is direction gating strong enough to compensate in BOTH ranking and display?** **No.**

- Ranking: **partial.** It drops far-field families (`off`) and softly boosts `primary`, which
  catches Legal/Engineering/Manufacturing for business users — but `Finance`/`Consulting`/
  `Operations` (and, via adjacency, `Engineering` for cyber/product users) leak in as
  `adjacent` with no penalty, only no boost.
- Display: **none.** `attainability_score`/`band` exclude family by design, the years axis is
  field-blind, and the UI even labels the composite as "Experience" and fires "Experience
  matches" on a field-blind `in_range`. The displayed number cannot express the field gap.

### Candidate fixes (with risk framing)

1. **Display-only honesty fix (LOW risk — recommended first, targets the exact symptom).**
   (a) Gate the `"Experience matches"` reasoning string (`scoreJobFit.js:698`) on
   `relevance_match === "primary"` (or at least `!== "off"` AND on-family), so a cross-field
   role never claims a satisfied experience match. (b) Fix `scoreAxes` (`ScoreRing.jsx:28-34`)
   to show the **true years axis** (and optionally a "field relevance" row) instead of
   mislabeling `attainability` as "Experience". **Risk to GOOD stretch: ~zero** — no change to
   selection or ranking; it only stops the UI from _claiming experience_ on a cross-field role.
   Directly kills the "100% experience match on a different profession" symptom. Does NOT fix
   the ranking leak.
2. **Field-relevant years for the axis (HIGH risk — the real structural fix, held).** Condition
   `computeYearsAxis` on years accrued in on-family / on-domain experiences, not total. Requires
   per-experience family tagging (experiences have no `function_family` today → needs inference)
   and, critically, **re-penalizes exactly the legitimate-pivot cohort** C3/C4 were parked to
   protect: a marketing→sales or student→first-job pivot has ~0 field-relevant years but is a
   valid GOOD stretch. Would need the 160-label eval + a pivot-aware carve-out before it could
   ship; high chance of sinking GOOD-labeled stretch matches. **Hold.**
3. **Tighten cross-profession adjacency (MEDIUM risk).** Remove the leaks at the gate: e.g.
   `Engineering` (software-dev roles) should not be `adjacent` for a _business/analyst_
   cybersecurity/product seeker, and `Consulting` (tax/clinical) is too broad in the
   early-career widening set. **Risk: moderate** — `FAMILY_ADJACENCY` + the widening set are
   shared across all surfaces and were tuned to fill thin early-career feeds; narrowing them
   re-opens the "thin feed" failure and needs its own feed-coverage check. Scope it per-family,
   not wholesale.

**Bottom line.** The experience axis is genuinely field-blind, and the display makes it worse
by asserting "Experience matches" and labeling the composite "Experience." The lowest-risk,
symptom-killing move is the **display-only honesty fix (1)**; the field-relevant-years rewrite
(2) is the correct structural fix but is entangled with the parked C3/C4 legitimate-pivot
tradeoff and must not ship without the eval. Gate narrowing (3) is a targeted middle option for
the worst leaks (software-dev roles to business seekers).
