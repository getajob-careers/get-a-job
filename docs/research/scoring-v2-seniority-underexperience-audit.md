---
owner: cv-lane
last_reviewed: 2026-07-24
code_paths:
  - src/lib/scoreJobFit.js
  - supabase/functions/_shared/track-scoring-constants.ts
  - src/lib/experienceLevel.js
  - src/lib/selectDigestJobs.js
  - supabase/functions/_shared/libraries/00_role_library.ts
---

# scoring_v2 — how it handles required seniority / years / under-experience (MEASUREMENT)

**Task:** audit, empirically, how the live scoring_v2 stack down-weights a user who is
under-experienced for a role's required seniority/years. **This doc is evidence, not code.**

> **RESOLUTION (2026-07-24, Eli-ruled): fix #1 shipped.** Eli approved the isolated
> vocab-reconciliation fix (candidate fix 1 below, §4) — adding `Lead_Manager: 4`,
> `Director_Head: 5`, `VP_Executive: 6` to `SENIORITY_RANK`, and NOTHING else. Gated on the
> 160-label eval (`scripts/_tmp_seniority_eval.ts`): **GOOD band movement 0/33** (only 2 total
> tuples moved, both _downward corrections_ on non-GOOD labels — a STRETCH "Team Lead"
> strong→stretch and a BAD "SOX Consultant" good→stretch, identical under legacy and
> scoring_v2 opts; legacy pass reproduced all 160 pinned bands). Fixes 2 and 3 remain HELD
> (entangled with the parked C3/C4 GOOD-label tradeoff). The over-qualification asymmetry is
> PARKED post-launch.

**Method / fidelity.** All numbers are the REAL client scorer (`src/lib/scoreJobFit.js`)
run with the live digest opts `{confidenceAware:true, mustHave:true, directionBlend:true}`
(`src/lib/selectDigestJobs.js:24`), against a DB snapshot of the 38 job-digest
`email_dry_run_log` rows (190 picks), their 38 users' profile+experience+education, and the
107 referenced jobs. **Disconfirming check passed:** re-scoring all 190 picks reproduces the
stored `email_dry_run_log` scores with **mean |Δ| = 0.0000** — the snapshot IS the live
scorer. Reproduce: `npx tsx scripts/_tmp_seniority_probe.ts` (temp probe; snapshot in the job
tmp dir). One caveat: the snapshot drops experience `responsibilities` text, so a handful of
military/intern _type_ re-inferences (`reinferType`) may differ from live at the margin; the
level buckets are unaffected in practice (they key off dates + stored type + student flag).

---

## 1. Which axes read required seniority / years, and what confidence shrink does (VERIFIED)

### Seniority axis — reads `job.req_seniority`

`computeSeniorityAxis(userLevel, job)` — **`src/lib/scoreJobFit.js:444-470`**. Reads
`job.req_seniority`, ranks it via `SENIORITY_RANK` (`track-scoring-constants.ts:30-42`),
compares to the user's stage ceiling/floor (`STAGE_T1_CEILING`/`STAGE_T1_FLOOR`,
`track-scoring-constants.ts:48-70`). Outputs:

| condition                   | axis score | match label         |
| --------------------------- | ---------- | ------------------- |
| `req_seniority` null        | 0.5        | `unspecified`       |
| rank not in map (`?? null`) | **0.5**    | **`unknown_value`** |
| rank > user ceiling         | 0.25       | `above_ceiling`     |
| rank < user floor           | 0.25       | `below_floor`       |
| rank == ceiling             | 0.85       | `stretch`           |
| in range                    | 1.0        | `in_range`          |

Ceilings: `early=1` (Entry+Entry_Mid), `mid=3`, `senior=6`. User level from
`inferExperienceLevel` (`experienceLevel.js:126-132`): early_career = current student OR <3y
career-countable; mid 3–8y; senior ≥8y.

### Years axis — reads `job.req_years_min` / `req_years_max`

`computeYearsAxis(userYears, job)` — **`src/lib/scoreJobFit.js:357-401`**. null min → 0.5
`unspecified`; in range → 1.0; > max+2 → 0.7 `above_max`; below min → linear
`max(0.25, 1 - gap*0.2)`.

### How much these axes actually move the number

- **fit_score** weights (`scoreJobFit.js:57-63`): seniority **0.10**, years **0.20**.
- **attainability_score** — the for-you feed + digest number
  (`ATTAINABILITY_WEIGHTS`, `track-scoring-constants.ts:264-269`): skill **0.55**,
  years **0.22**, education **0.115**, **seniority 0.115**.
  Max seniority swing on attainability = (1.0−0.25)×0.115 = **0.086**. A student who is
  maximally over-ceiling loses ~0.086 — recoverable by a strong skill axis (0.55 weight).

### Two hard backstops layered on top of the weak axis

1. **track routing** (`scoreJobFit.js:559-565`): `above_ceiling` → hard `track_3`;
   mid-career `stretch` → track_3/track_2. **Track only — does NOT touch
   attainability_score/rank_score/band.**
2. **band cap** (`scoreJobFit.js:664-669`): `above_ceiling` can never be `strong`/`good`,
   forced to `stretch`. **Only fires for `above_ceiling`** — NOT for `unknown_value` and
   NOT for `below_floor`.
3. **years cap** `applyYearsCap` (`track-scoring-constants.ts:302-312`): gap≥3 → track_3,
   gap==2 → track_1→track_2. **Track only.** Does not touch attainability/band.

**Crucial for the digest:** the digest selects on `attainability_score >= 0.42`
(`selectDigestJobs.js:31,56`), sorted by `rank_score`. It does **not** consult `track` or
`band`. So the two strongest seniority backstops (track routing, band cap) are **invisible to
the digest's include/rank decision** — only the 0.086-max attainability dock counts.

### What confidence shrink (C1) does with these axes — measured, and it surprised me

C1 (`scoreJobFit.js:636-642`) computes `match_confidence` (`matchConfidence`,
`scoreJobFit.js:192-220`) from skill evidence only (core count, distinctive matches,
coverage, extraction) — **it does not read seniority/years at all** — then shrinks the whole
composite toward 0.5: `attain = 0.5 + (attain − 0.5) * conf`.

- INFERRED (from the algebra): for a sub-0.5 composite, shrink pulls UP toward 0.5, so it
  could _mask_ under-qualification.
- **VERIFIED (measured on the 45 above-ceiling picks): the opposite happens in practice.**
  C1 **lowered 44/45** and raised 0. Reason: the flagged picks nearly all have skill%≈100 on
  thin requirement lists, so their raw composite is _above_ 0.5 and shrink pulls them _down_.
  **C1 mildly mitigates over-reach picks; it is not the culprit.** (The masking risk is real
  only where raw < 0.5, which did not occur among these picks.)

---

## 2. Empirical probe — 5 early-career profiles × senior postings, and the reverse

Digest population by `inferExperienceLevel`: **20 early_career / 9 mid_career / 9 senior_career**.

### 2a. Early-career profiles × senior postings

`attainability / seniority_match / band`, live digest opts. Columns are 3 `Senior` + 1
`Lead_Manager` + 1 `Director_Head` posting from the digest corpus.

```
                    Category Mgr    Sr Influencer   Sr Growth Mkt   Bookkeeping      Director
                    [Senior]        [Senior]        [Senior]        Team Lead        of FP&A
                                                                    [Lead_Manager]   [Director_Head]
Zachary Brown  (E)  0.32 aboveCeil  0.36 aboveCeil  0.37 aboveCeil  0.58 UNKNOWN     0.33 UNKNOWN
                    stretch         stretch         stretch         STRONG           stretch
Adiburshan     (E)  0.37 stretch    0.38 stretch    0.39 stretch    0.60 STRONG      0.33 stretch
Gidon Werner   (E)  0.42 stretch    0.34 stretch    0.49 stretch    0.58 STRONG      0.43 good
Nevo Liani     (E)  0.28 stretch    0.34 stretch    0.34 stretch    0.58 STRONG      0.33 stretch
Matthew Jordan (E)  0.31 stretch    0.34 stretch    0.47 stretch    0.58 STRONG      0.33 stretch
```

**Reading:** the recognized `Senior` roles are correctly caught (`above_ceiling`, axis 0.25,
band forced to `stretch`). But the `Lead_Manager` "Bookkeeping Team Lead" — a role _more_
senior than Senior, `req_years_min = 7` — scores **0.58 band=strong** for every early-career
student, because `Lead_Manager` is not in `SENIORITY_RANK` → `unknown_value` → neutral 0.5,
**no penalty, no band cap.** A management role outscores every Senior IC role for a student.
The Director_Head only stays low because its skills also miss (skill%=0); when a
Lead/Director role's thin skills happen to match, nothing holds it back.

Full-axis detail, Zachary Brown (early_career, domain=sales, 6 skills):

```
"Bookkeeping Team Lead" [Lead_Manager] core=1 yrsMin=7
   attain=0.58 band=STRONG  skill%=100  yearsStatus=below  senMatch=unknown_value(0.5)
"Senior Growth Marketing Manager" [Senior] core=6 yrsMin=3
   attain=0.37 band=stretch skill%=0    yearsStatus=in_range senMatch=above_ceiling(0.25)
```

### 2b. Reverse — senior/mid profiles × junior (Entry_Mid) postings

```
                    QC Analyst   C++/Python   Salesforce   Chip Design  Flight Test
                    [Entry_Mid]  [Entry_Mid]  [Entry_Mid]  [Entry_Mid]  [Entry_Mid]
Michael Sobol  (S)  0.56 belowFl 0.37 belowFl 0.37 belowFl 0.50 belowFl 0.57 belowFl
                    STRONG       stretch      stretch      good         STRONG
Leah Levy      (S)  0.60 STRONG  0.49 good    0.45 good    0.50 good    0.62 STRONG
Sofiya K.      (S)  0.52 good    0.37 stretch 0.37 stretch 0.50 good    0.55 STRONG
Benjamin F.    (M)  0.64 STRONG  0.43 good    0.53 good    0.57 STRONG  0.62 STRONG
Michelle Z.    (M)  0.64 STRONG  0.48 good    0.53 good    0.54 good    0.64 STRONG
```

**Reading:** for senior_career users the `below_floor` branch DOES fire (axis 0.25), but
because there is **no band cap on `below_floor`**, junior QA/test roles still surface as
band=**strong** (Michael/Leah "Flight Test & QA" ≈ 0.57–0.62). For mid_career users the floor
is 0 (`STAGE_T1_FLOOR.mid = 0`, deliberate "honest step-down"), so junior roles are full
`in_range`/strong. Over-qualification is under-penalized too — symmetric to under-experience —
but it is the lower-stakes direction and off the digest's early-career critical path.

---

## 3. Digest lens — every pick where the job's seniority is clearly above the user's level

Across the 190 live digest picks (38 users × 5):

- **52 picks** are for a Senior-or-above role (true rank ≥ 3).
- **45 picks are above the recipient's ceiling**, spread across **20 of 38 recipients (53%)**.
  - **36** are recognized `Senior`/`Mid`-over-ceiling → correctly `above_ceiling`, **all 36
    band-capped to `stretch`**. They still enter the digest (attainability ≥ 0.42, several at
    0.70–0.80) and rank near the top, but they are honestly labelled `stretch`.
  - **9** are the `Lead_Manager`/`Director_Head` blind-spot → **8 land in band=strong, 1 in
    good.** These are the unambiguous defect.

The 9 BLIND picks (management-tier roles shown as strong/good matches to students):

```
tsizzleblock   (early)  "מנהל.ת תורנ.ית דוכן איילון רמת גן"          Lead_Manager  0.70 strong
hassan.dalia   (early)  "Group Product Manager – Product Growth"       Lead_Manager  0.68 strong
hassan.dalia   (early)  "Group Product Manager, Product Solutions"     Lead_Manager  0.65 strong
zucker.michelle(mid)    "Group Product Manager – Product Growth"       Lead_Manager  0.81 strong
idodagan1414   (early)  "קצינ/ת בטיחות בתעבורה- קריית שדה התעופה"     Lead_Manager  0.72 strong
ybarshain      (early)  "Group Product Manager – Product Growth"       Lead_Manager  0.68 strong
ybarshain      (early)  "Group Product Manager, Product Solutions"     Lead_Manager  0.65 strong
adar123cohen   (early)  "Group Product Manager – Product Growth"       Lead_Manager  0.68 strong
danzfine       (mid)    "מנהל.ת תחום שיווק מכר סלולר פרטי"            Lead_Manager  0.48 good
```

Note "Group Product Manager" (a people-management PM tier) reaching band=**strong** for
multiple early-career students, while those same students' `Senior Product Manager` picks are
correctly held at `stretch`. **The scorer ranks the more-senior role higher than the
less-senior one — inverted.**

---

## 4. Findings & candidate fixes (HELD FOR ELI — evidence only)

### Does the current formula adequately down-weight under-experience?

**Partially, and with one outright hole.**

- **VERIFIED — root defect (data↔code vocab drift).** The extraction vocabulary
  `seniority_levels` = `[Entry, Entry_Mid, Mid, Senior, Lead_Manager, Director_Head,
VP_Executive]` (`00_role_library.ts:32-40`; `extract-job-requirements/index.ts:111,605`
  clamps to exactly these). But `SENIORITY_RANK`
  (`track-scoring-constants.ts:30-42`) keys on `Lead`, `Manager`, `Director`, `VP`
  **separately** — the combined `Lead_Manager`/`Director_Head`/`VP_Executive` strings are
  absent. So the **three most-senior tiers always resolve to `unknown_value` → neutral 0.5**:
  no under-experience penalty, no band cap, no track_3 routing. Live corpus exposure:
  **621 active non-agency jobs** (`Lead_Manager` 444 + `Director_Head` 166 + `VP_Executive`
  11); 9 already leaked into the current digest as strong/good picks. Only `Entry` /
  `Entry_Mid` / `Mid` / `Senior` are scored at all.

- **VERIFIED — structural weakness (weak axis).** Even when the tier IS recognized, seniority
  moves attainability by at most 0.086 (0.115 weight × 0.75 swing), so a strong-skill match on
  a `Senior` role clears the 0.42 digest bar easily (36/36 above-ceiling picks did, several at
  0.70–0.80). The band cap keeps them honest (`stretch`) in the UI, **but the digest ignores
  band** and selects/ranks on attainability, so above-ceiling roles still populate and top the
  email. The two strong seniority backstops (band cap, track routing) never reach the digest.

- **VERIFIED — asymmetry.** `above_ceiling` gets a band cap; `below_floor` and `unknown_value`
  do not. So an over-senior IC `Senior` role is capped to `stretch`, but a genuinely more
  senior `Lead_Manager` role can be `strong`, and a junior role for a senior user can be
  `strong`. The cap protects the wrong cases hardest.

- **INFERRED — C1 is not the problem** (measured §1): confidence shrink lowered 44/45 flagged
  picks; it does not mask under-experience for these skill-heavy thin-req matches.

### Candidate fixes (with risk to GOOD-labelled stretch matches)

Context: C3/C4 were parked because seniority penalties hit ~30% of GOOD labels. So the bar is:
fix the hole without re-penalizing legitimate stretch GOODs.

1. **Vocab reconciliation only (lowest risk, highest value).** Add `Lead_Manager`,
   `Director_Head`, `VP_Executive` to `SENIORITY_RANK` (e.g. 4/5/6) so the three top tiers
   stop hitting the neutral branch and start flowing through the existing `above_ceiling`
   path. **Risk to GOOD stretch: ~zero.** This only _adds_ penalties to roles that are
   unambiguously above any student's ceiling (management tiers) — it cannot demote an
   in-range/`Senior` GOOD, because those are already ranked. It is a data-alignment fix, not
   a threshold change. This is the one change that closes the actual leak. (Schema-validator
   clean + this is a constants edit, not a library-row edit.) **Recommend as the isolated
   first move.** Would falsify "safe" if a re-score of the 160-label eval set moved any GOOD
   label's band down — must run that before shipping.

2. **Let the digest respect the band cap (medium risk, contained).** Have `selectDigestJobs`
   drop or de-rank `above_ceiling`/`below_floor` picks (or require band ≥ good), so the
   backstops that already exist actually bite in the email. **Risk to GOOD stretch: moderate**
   — this is exactly the ~30%-of-GOODs surface, because many labelled-GOOD stretch matches ARE
   above-ceiling (e.g. ofriraichel's Senior "Product Data Analyst" at 0.80). Would need the
   label set re-run to size the GOOD loss before committing; likely wants a softer form (keep
   but rank below in-range) rather than a hard drop.

3. **Strengthen the seniority axis / add a band cap to `unknown_value`+`below_floor`
   (higher risk).** Raise `ATTAINABILITY_WEIGHTS.seniority`, or extend the band cap to all
   out-of-range matches. **Risk to GOOD stretch: high** — this is the C3/C4 lever that already
   over-penalized GOODs; not recommended without the fuller re-tune, and strictly after fix 1
   removes the confound (today the eval can't cleanly measure seniority because the top tiers
   are silently neutral).

**Bottom line:** the digest's under-experience handling has one clear, low-risk hole worth
closing now (fix 1 — the `Lead_Manager`/`Director_Head`/`VP_Executive` vocab drift, live in
621 jobs and 9 current digest picks), and one structural weakness (band/track backstops are
invisible to the digest) that is genuinely entangled with the parked C3/C4 GOOD-label
tradeoff and should not be touched without the eval re-run.
