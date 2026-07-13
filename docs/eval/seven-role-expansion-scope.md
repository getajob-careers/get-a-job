---
title: Seven-role full-mapping expansion — PLAN (planning artifact; not built)
status: PLANNED, held for Eli. Arc's next major item (after this eval PR).
owner: eli
generated: 2026-07-13 (all proposed IDs concept-grepped against the 609-ID library per the library-changes skill)
---

# Seven-role full-mapping expansion — plan

Seven roles in `00_role_library.ts` have **no** `04_role_skill_mapping.ts` entry, so the scorer can't skill-match any job resolving to them. This batch gives each a complete profile and mints only the genuinely-new domain skills, folding in the Security/HW skills deferred from the AI+SWE mapping (#578).

## Blind-spot sizing (live non-agency jobs, pg_trgm ≥ 0.3, 2026-07-13)

`hardware_engineer` 696 · `process_engineer` 559 · `devsecops_engineer` 550 · `security_researcher` 151 · `research_scientist` 102 · `manufacturing_quality_engineer` 60 · `incident_response_engineer` 57 — **~2,175 job-matches** to unmappable roles.

## New-ID set — concept-grepped (the guard shed ~6 would-be dups)

**Reuse EXISTING (do NOT mint):** `embedded_systems`, `pcb_design`, `board_design`, `verilog`, `rf_engineering`, `matlab`, `process_improvement`, `reverse_engineering`, `siem_operations`, `incident_response_forensics`, `security_monitoring_detection`, `splunk_platform`, `threat_analysis_investigation`, `vulnerability_research`, plus the batch-1 IDs (`security_research`, `threat_modeling`, `robotics`, `os_internals`, `root_cause_analysis`, `code_quality`, `data_science`).

**Genuinely NEW (CLEAN on concept-grep):** `firmware`, `signal_processing`, `lean_manufacturing`, `six_sigma`, `spc`, `vulnerability_analysis`, `exploit_development`, `log_analysis`.

**Two borderline calls for review (before minting):**

- `circuit_design` — overlaps existing `board_design` + `pcb_design`. Mint (analog/schematic ≠ PCB layout) or alias→`board_design`?
- `malware_analysis` — overlaps existing `threat_analysis_investigation` + `reverse_engineering`. Mint (malware-specific) or reuse `threat_analysis_investigation`?

## Proposed role profiles (existing + genuinely-new; role-research-grounded at build)

| role                             | core                                                                                             | secondary                                                                      | differentiator                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------- |
| `hardware_engineer`              | embedded_systems, os_internals, board_design, **firmware**                                       | robotics, rf_engineering, verilog, python_development                          | pcb_design, **signal_processing**, matlab |
| `process_engineer`               | root_cause_analysis, process_improvement, statistical_analysis, **lean_manufacturing**           | **six_sigma**, **spc**, data_analysis                                          | automation_scripting                      |
| `devsecops_engineer`             | ci_cd, cloud_platforms_devops, containerization, threat_modeling                                 | os_internals, code_quality, git_version_control, security_monitoring_detection | security_research, **log_analysis**       |
| `security_researcher`            | security_research, vulnerability_research, reverse_engineering, threat_modeling                  | os_internals, **exploit_development**, threat_analysis_investigation           | **vulnerability_analysis**                |
| `research_scientist`             | data_science, machine_learning, statistical_analysis, deep_learning                              | model_training_finetuning, python_data, applied_ai_research                    | experimentation_ab_testing                |
| `manufacturing_quality_engineer` | root_cause_analysis, **spc**, **six_sigma**, process_improvement                                 | statistical_analysis, **lean_manufacturing**, data_analysis                    | quality_control_inspection                |
| `incident_response_engineer`     | incident_response_forensics, threat_modeling, security_monitoring_detection, root_cause_analysis | siem_operations, **log_analysis**, os_internals                                | threat_analysis_investigation             |

## Predicted movement (to be judged against)

Corpus scan of unmapped phrases in the concept space: **497 jobs** carry HW/security/quality unmapped phrases (346 HW / 216 security / 256 quality), of which **~76 are currently zero-core**.

- **zero-core: 763 → ~687** (−76 first-skill gains; conservative floor).
- **resolved-core/job: +~0.1** across the ~497 affected jobs.
- **R/T:** non-software **0.29 → ~0.38**; HW/security English-tech jobs rise as specialized skills resolve → overall R/T **+0.03–0.05**.
- **Blind spot:** ~2,175 role-match jobs become skill-matchable.

## Build / review sequence (3 per-cluster held PRs)

1. **HW cluster** — mint `firmware`, `signal_processing` (+ `circuit_design` if approved); map `hardware_engineer` (+ `robotics`/`os_internals` homes).
2. **Security/IR cluster** — mint `exploit_development`, `vulnerability_analysis`, `log_analysis` (+ `malware_analysis` if approved); map `security_researcher`, `devsecops_engineer`, `incident_response_engineer` (+ `security_research`/`threat_modeling` homes).
3. **Quality/Ops + research** — mint `lean_manufacturing`, `six_sigma`, `spc`; map `process_engineer`, `manufacturing_quality_engineer`, `research_scientist`.

Each PR: concept-grep (library-changes skill) → mint IDs → propose-only alias batch → role mappings (shape-matched) → schema-validator no-regression → merge → re-resolve `--dry`→verify→`--write` → **R/T re-judge on the affected strata vs the predictions above**.
