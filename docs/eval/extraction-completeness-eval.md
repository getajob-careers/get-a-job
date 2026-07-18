---
title: Extraction-completeness regression eval (Scoring Coverage Arc gate)
status: frozen
owner: eli
frozen: 2026-07-12
---

# Extraction-completeness eval — the gate for every change in the Scoring Coverage Arc

Approved 2026-07-12. Run BEFORE and AFTER every extractor/resolver/library change; put the numbers in the PR body. Two parts:

## Part 1 — the SQL panel (corpus-wide, run against live `jobs`)
```sql
-- headline coverage + zero-core
select round(avg(skill_coverage_ratio)::numeric,3) avg_cov,
       percentile_cont(0.5) within group (order by skill_coverage_ratio) median_cov,
       count(*) filter (where req_skills_core is null or array_length(req_skills_core,1) is null) zero_core,
       count(*) active from jobs where is_active;
-- cut by language / ats / function_family (see the audit report for baselines)
```
Baselines (2026-07-12): avg_cov 0.478, median 0.50, zero_core 1133/6142 (18.4%); he zero_core 42%; Manufacturing cov 0.062.

## Part 2 — the frozen 68-job manual set (deterministic, re-derivable)
Three stratum queries, `order by md5(id::text)` so the set is stable:
- Hebrew/mixed (22): `jd_language in ('he','mixed') and length(description)>300`.
- English tech w/ unmapped (22): `jd_language='en' and function_family in ('Engineering','Data','AI_ML','IT_Security','Product','Solutions_Engineering') and coalesce(array_length(extraction_unmapped_skills,1),0)>=2 and length(description)>300`.
- Non-software clusters (24): Manufacturing_Operations(8)+Legal_Compliance(5)+Support(6)+null-family(5), `length(description)>250`.

Metric per job: R/T (resolved core ÷ true required skills, competent-reader judged). Baselines (median R/T): English-tech 0.38, Hebrew 0.13, non-software 0.00.

## Targets (audit)
skill_coverage_ratio median 0.50 -> 0.80; zero-core 18% -> <5%; Hebrew zero-core 42% -> <15%; Manufacturing cov 0.06 -> 0.5+; manual median R/T 0.38 (EN) -> 0.70+.

## Backlog — cross-provider extractor bake-off (post-launch)
The Phase-1 model bake-off (#571) is **same-API only** (OpenAI: gpt-4o-mini / gpt-5.4-mini / gpt-5.4-nano / gpt-4.1-mini) — the harness reuses the edge fn's OpenAI-shaped `openaiChatCompletion` + `usage` accounting. A cross-provider round is deferred:
- **Candidate first:** Claude Haiku 4.5 via the existing OpenRouter path (`_shared/openrouter-chat.ts`).
- **Scope:** run against the FULL frozen **68-job eval + the SQL panel** above (Part 1 & 2) — NOT the 10/30 sample sets used for the same-API tiebreak.
- **Blocked on harness support:** non-OpenAI JSON-mode handling + provider-specific token/cost accounting (`usage` shape differs) in `scripts/hebrew-extract-bakeoff.ts`.

## v5 pass result + metric note (2026-07-13)
Full corpus re-extracted at schema v5 / gpt-5.4-mini (6,106 jobs, 0 failures). Before→after: avg coverage 0.478→0.223, median 0.50→0.20, zero-core 18.4%→17.2%, Hebrew zero-core 42%→31.5%, Manufacturing 0.062→0.049, must-have 0→32.2%, avg resolved-core/job ~2→3.62.

**`skill_coverage_ratio` is NOT a stable target — its denominator (raw phrases emitted) moves with extractor behavior.** gpt-5.4-mini emits ~3× more raw skills than gpt-4o-mini (avg 4.9→14.9/job), so `resolved/raw` fell even though resolved-core per job rose. The ratio is display-only in the scorer and now honestly reflects the library's coverage gap. **R/T (resolved ÷ true-required, competent-reader judged on the frozen 68-job set) is the primary completeness metric going forward** — it isolates real extraction/resolution quality from raw-emission volume. The banked `req_skills_{core,nice,must_have}_raw` columns are the asset: the library-expansion arc re-resolves them at zero LLM cost.

## R/T judging — v4 → v5 + library-expansion (AI-judged, 2026-07-13)
Frozen set re-derived on the current corpus and **PINNED** at `docs/eval/frozen-68-ids.json` (57 unique jobs; 68 stratum-memberships — Hebrew-Support jobs fall in two strata). The original set was never pinned (a process gap); it is now, so future re-judges are job-identical. Method: 6 parallel competent-reader agents, one strict shared rubric — **R/T = truly-required skills captured by `req_skills_core` ÷ total truly-required (recall)**.

| stratum | n | v4 before | v5 after (median) | mean |
|---|---|---|---|---|
| English-tech | 22 | 0.38 | **0.63** | 0.49 |
| Hebrew | 22 | 0.13 | **0.33** | 0.33 |
| Non-software | 24 | 0.00 | **0.29** | 0.34 |
| overall | 57 | — | 0.40 | 0.41 |

The arc materially lifted R/T in every stratum (English-tech approaches the 0.70 target; Hebrew 2.5×; non-software from zero). This is the honest counterweight to the `skill_coverage_ratio` fall (a denominator artifact of higher raw recall) — R/T, the metric that measures resolution quality, confirms real gains.

**Caveat — both measurements are AI-judged** (consistent method both times, so the *delta* is meaningful, but not an independent human panel). Also strata-level, not job-identical, since the v4 IDs weren't pinned and v4 resolved-skills are overwritten. **The human gate remains the match-quality eval** (does a real user see better Jobs-for-you) — R/T is the extraction-side proxy, now trending right.

## Arc closing verdict — 7-role expansion vs predictions (2026-07-14)
All three cluster PRs merged (#580 HW, #581 Security/IR, #582 Quality/Ops+research). Measured against the plan's predictions — recorded honestly, over-estimates included, so future planning calibrates.

| prediction | predicted | actual | verdict |
|---|---|---|---|
| 7 blind-spot roles mapped | all 7 | **all 7** | ✅ achieved (the primary goal — they had **zero** mappings before) |
| blind-spot jobs made matchable | ~2,175 | **~619 distinct-title** | ⚠️ mechanism delivered; "2,175" was a *summed* over-estimate (title overlap) |
| zero-core reduction | 763 → ~687 (−76) | 779 → **766** (−13) | ❌ missed — the concept-phrase LIKE estimate over-counted; real first-skill gains ~13 |
| R/T on HW-affected jobs | rise | **0.25 → 0.42** (+0.17) | ✅ |
| R/T on Security-affected jobs | rise | **0.44 → 0.58** (+0.14) | ✅ |
| non-software stratum R/T | 0.29 → ~0.38 | **~0.29** (unmoved) | ❌ mis-targeted — the 7 roles are eng/HW/security/quality, whose jobs sit in the *english-tech* stratum, not the support/admin-heavy *non-software* frozen stratum |

**What actually shipped:** all 7 unmapped roles now carry full skill profiles; 21 net-new skill IDs (firmware, signal_processing, exploit_development, vulnerability_analysis, log_analysis, malware_analysis, lean_manufacturing, six_sigma, spc, + the batch-1 set) resolving job phrases at zero LLM cost; R/T up **+0.14–0.17** on the jobs each cluster actually touched.

**Honest shortfalls:** the two *quantitative* secondary predictions (zero-core −76, non-software R/T +0.09) were over-optimistic. The zero-core estimate counted jobs whose concept phrases didn't cleanly resolve to the new IDs; the non-software R/T target mis-mapped which stratum the 7 roles live in. The **primary** goal — closing the role-mapping blind spot — was fully achieved, and the R/T lift on affected jobs is real.

**Process win:** the `library-changes` concept-grep guard (added mid-arc) caught 3 duplicate-concept IDs from batch-1 (model_fine_tuning, llm_agents, software_architecture), prevented ~6 more during 7-role planning (siem_operations, incident_response_forensics, board_design, …), and the R/T re-judge caught the `dsp`→signal_processing precision bug. The correction loop worked.

### Arc-wide R/T (the headline, from the v5 + library-expansion gate)
English-tech **0.38 → 0.63**, Hebrew **0.13 → 0.33**, non-software **0.00 → 0.29**. Extraction-completeness arc: v5/gpt-5.4-mini corpus re-extracted, library 599 → 618, all target roles mapped, R/T up in every stratum. **Arc closed.**
