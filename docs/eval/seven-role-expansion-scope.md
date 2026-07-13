---
title: Seven-role full-mapping expansion — scope (planning artifact)
status: ACCEPTED as the arc's next major item (after the AI+SWE mapping PR + 68-job R/T judging)
owner: eli
generated: 2026-07-13 (proposed-ID list re-grepped against the 609-ID library, per the library-changes skill)
---

# Seven-role full-mapping expansion — scope

Seven roles in `00_role_library.ts` have **no entry** in `04_role_skill_mapping.ts`, so the scorer can't skill-match any job that resolves to them. Surfaced by the batch-1 RCA-thin-role check (adding one skill would have created misleading 1-skill entries). This batch gives each a complete, role-research-grounded profile — and folds in the Security/HW skills deferred from the AI+SWE mapping PR.

## Blind-spot sizing (live non-agency jobs matching each role title, pg_trgm ≥ 0.3, 2026-07-13)

| role                             | live jobs  |
| -------------------------------- | ---------- |
| `hardware_engineer`              | **696**    |
| `process_engineer`               | 559        |
| `devsecops_engineer`             | 550        |
| `security_researcher`            | 151        |
| `research_scientist`             | 102        |
| `manufacturing_quality_engineer` | 60         |
| `incident_response_engineer`     | 57         |
| **total (some title overlap)**   | **~2,175** |

~2,175 job-matches to unmappable roles — `hardware_engineer` alone is 696. High-value.

## Proposed profiles (609-ID library + deferred new IDs; role-research-grounded at build)

| role                             | core (proposed)                                                                                             | genuinely NEW IDs needed (re-grepped)                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `hardware_engineer`              | `embedded_systems`✅, `os_internals`, `robotics`, `pcb_design`✅, `signal_processing`*                      | circuit_design, firmware, signal_processing                   |
| `process_engineer`               | `root_cause_analysis`, `statistical_analysis`, `process_improvement`✅, quality-control                     | lean_manufacturing, six_sigma, spc                            |
| `devsecops_engineer`             | `ci_cd`, `threat_modeling`, `cloud_platforms_devops`, `containerization`, `code_quality`                    | (all existing)                                                |
| `security_researcher`            | `security_research`, `vulnerability_research`✅, `reverse_engineering`✅, `threat_modeling`, `os_internals` | vulnerability_analysis, exploit_development, malware_analysis |
| `research_scientist`             | `data_science`, `machine_learning`, `statistical_analysis`, `model_training_finetuning`                     | (all existing)                                                |
| `manufacturing_quality_engineer` | `root_cause_analysis`, quality-control, SPC, inspection                                                     | six_sigma, spc (shared w/ process)                            |
| `incident_response_engineer`     | `threat_modeling`, `security_research`, `root_cause_analysis`, `os_internals`, SIEM                         | siem, digital_forensics, log_analysis                         |

✅ = already in the library (do NOT re-mint). *`signal_processing` still new.

## Key insight — this is TWO things, not one

1. **Skill-ID expansion** — genuinely-new cluster IDs only: `circuit_design`, `firmware`, `signal_processing` (HW); `lean_manufacturing`, `six_sigma`, `spc` (ops/quality); `vulnerability_analysis`, `exploit_development`, `malware_analysis` (security); `siem`, `digital_forensics`, `log_analysis` (IR). **Every one re-grepped against names+descriptions first** (this scope's own list already shed 4 that existed — `embedded_systems`, `pcb_design`, `process_improvement`, `reverse_engineering`).
2. **Deferred skills land here**: `security_research`, `threat_modeling`, `robotics`, `os_internals` get their real role homes.
3. **Role mappings** — full core/secondary/differentiator for all 7, matching each role's entry shape (the mapping file has both object-with-proficiency and plain-string shapes).

## Sequencing

Runs **after** the AI+SWE mapping PR and the 68-job R/T judging. Per-cluster held PRs (HW, Security, Quality/Ops), each through the `library-changes` skill. Re-resolve after each merge to lift the blind-spot jobs.
