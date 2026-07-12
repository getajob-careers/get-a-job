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
