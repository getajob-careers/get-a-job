# C4 role-tier spike - findings (measurement only, no build)

Gates Component 4 (negative signals / "underleveled matches"), which needs an IC / lead /
manager tier for a job and for the user's target. Question: derive it **deterministically (A)**
from title + `function_family`, or add it to **extraction (B)**? All numbers below are measured.

## Corpus facts (5,748 live IL active jobs)

- The extractor **already** emits a `function_family = "Leadership"` value and `req_seniority`
  bands `Lead_Manager` / `Director_Head`. These are **high-precision, low-recall** for manager
  tier: the IC-trap "*Manager" set gets 0% Leadership / 2% mgmt-seniority (good), but even
  **clear** people-managers land in Leadership-family OR a mgmt-seniority band only **39%** of
  the time. So the corpus fields alone are NOT a reliable tier signal - but they're a useful
  high-precision corroborator.
- The IC-trap is large: **57% of all "Manager" titles** are IC-track disciplines (Product /
  Program / Project / Account / Brand / Campaign / Customer Success / Marketing Manager). A
  naive keyword rule would mislabel all of them manager and fire the underleveled penalty
  backwards. The exception list is the crux of classifier A.
- Title-keyword coverage: manager-kw 17% / lead-kw 7.5% / IC-kw 44% / **no keyword 34%**.

## Classifier A (deterministic) vs hand-labels - random trap-weighted 96-title sample

Rule order: lead markers (Staff/Principal/Lead) → org-leadership (Head/VP/Director/C-suite) →
"*Manager" disambiguated by an IC-discipline exception list, else Leadership-family / mgmt-band,
else default people-manager → IC keywords → else abstain (null).

| metric                                            | result                 |
| ------------------------------------------------- | ---------------------- |
| 3-way accuracy (ic/lead/manager)                  | **95%** (91/96)        |
| binary manager-vs-not (the axis the penalty uses) | **95%**                |
| recall on real managers (never miss a manager)    | **100%** (0/12 missed) |
| unclassified on this keyword-rich sample          | 0                      |

**All 5 errors are one crisp cluster: ambiguous "X Operations / Office / Quality Manager"**
(Revenue Operations Manager, Sales Operations Manager, Business Operations Manager, Office
Manager, Operations Quality Manager) - IC-owns-a-process vs leads-a-small-team. A defaults them
to manager; I labeled them IC. This is the **only** failure mode on classifiable titles, and I
flagged every one as borderline while labeling (annotator uncertainty, not pure classifier
error). The dangerous direction: an IC ops role wrongly called manager → could over-fire the
"over-leveled" penalty for an IC-target user. **Frequency: ~6% of non-manager titles**, entirely
in this nameable cluster.

## Override-reproduction test (the 5 human overrides + 13 seniority BADs)

**P10 target tier** (the reference the penalty compares against) - the user's target is a _path_,
not a point: `target_job_titles` classify as IC (Senior Accountant, Internal Auditor, Forensic
Accountant) + manager (Accounting Manager, Financial Reporting Manager, AP Manager). Taking the
**MAX tier across the target set = manager** (matching the human's "manager target" mental model
anchored on the 5-year Assistant-Controller aim). **This is a C4 design decision the spike
surfaces: the target tier must be the aspirational MAX, not the nearest step.**

- **4 of 5 P10 overrides reproduced:** Senior FP&A Analyst / Financial Business Analyst / FP&A
  Analyst / Financial & Business Analyst all classify **ic**, below the manager target →
  underleveled fires → reproduces the human STRETCH override. "Senior Finance Manager" classifies
  **manager** (on-tier) → correctly stays GOOD. The 5th ("FP&A Business Partner") **abstains**
  (no keyword) → conservative miss, not a misfire.
- **13 seniority BADs:** mostly OVER-leveled by seniority **band** (Senior/Director role shown to
  a junior) - the existing band axis (`above_ceiling`) is the primary catch; the tier signal adds
  the tier-direction (Head/Director → manager, analysts/consultants → ic). Band + tier together
  reproduce them. **So the tier signal's incremental value is the ~5 IC-vs-manager overrides**,
  complementing (not replacing) the seniority band for the 13.

## Known failure modes of A (choosing "cheap and ~95% right" with eyes open)

1. **Ambiguous ops/office/quality "Manager" → false manager. ~6% of non-manager titles**, one
   cluster. Mitigation: route this cluster to **abstain** (not manager) - the penalty is
   negative, so abstaining is the safe side; near-eliminates the dangerous FP for a small hit to
   manager-recall on genuine ops-managers.
2. **Keyword-less leadership titles mislabel/abstain.** "Assistant Controller" → ic (wrong;
   Controller is finance leadership), "FP&A Business Partner" → null. Mitigation: a small
   exec/finance-leadership lexicon (Controller, Comptroller, Partner, Principal-of-firm).
3. **~34% of the full corpus has no manager/IC keyword → abstain.** Safe by construction: the
   underleveled signal is a demotion, so abstaining = not penalizing = conservative. The signal
   fires only on the ~66% classifiable.
4. **Exception-list drift** - new IC-track "*Manager" disciplines need list maintenance. Low
   frequency; the disciplines are stable.

## Recommendation: **A (deterministic)**, with mitigation #1 baked in

A is **~95% right on the ~66% classifiable, abstains safely on the rest, never misses a real
manager, and reproduces 4/5 overrides**. Its one real error is a single nameable cluster we route
to abstain. **B (extraction addition)** would push to ~98%+ and remove abstains, but costs an
extraction-schema change + a ~6k-job corpus re-extract + ongoing LLM spend + a deploy/re-extract
cycle - not justified for a **negative** penalty signal where abstaining is already the safe
default. Revisit B only if a second labeling round shows the ambiguous cluster or the abstain
tail materially hurts C4.

**Play Perfect (Monetization Manager) stays pinned** as the joint test: its lone-generic half is
already crushed by shipped C1+2a (92%→48%); its under-leveled half (Mid gaming role vs a Senior
target) is what C4's band+tier signal must catch. Note A tiers "Monetization Manager" as manager
(no IC-exception match) - a candidate exception to add, or leave to the seniority band.

_Spike only. No code shipped. Classifier A + hand-labels + the reproduction run live in the
session scratch; this doc is the durable record for the C4 build._
