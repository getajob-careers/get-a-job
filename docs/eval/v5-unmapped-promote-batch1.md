---
title: Library-expansion batch 1 — v5 unmapped-phrase promotion proposal
status: PROPOSE-ONLY (Eli review; class-G discipline stands)
generated_from: jobs.extraction_unmapped_skills, active + schema_version=5, non-agency, 2026-07-13
---

# Library-expansion batch 1 — propose-only

Top unmapped phrases from the **fresh v5 raw data** (per-job `extraction_unmapped_skills`, corpus-wide, `job_count ≥ 8`). Triaged against the live 599-ID library. Nothing is auto-written — this is for review. Class-G discipline: aliases only map to an **existing** ID when unambiguous; a missed map beats a wrong one.

## A. Alias batch → EXISTING IDs (propose; class-G safe)

The resolver misses these only because the surface form isn't in the alias map. Each maps to a verified existing ID. This is PR-A-style propose-only alias work — **zero new IDs, zero class-G risk**.

| phrase (freq)                                                                                                       | → existing ID                                                   |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| linux environments (28)                                                                                             | `linux_administration`                                          |
| containerized environments (26)                                                                                     | `containerization`                                              |
| python programming (31)                                                                                             | `python_development`                                            |
| excellent/strong communication skills (91+66), written communication (28), written and verbal communication (34+27) | `communication`                                                 |
| strong analytical skills (39), analytical and problem-solving skills (44), analytical mindset (37)                  | `analytical_thinking`                                           |
| source control management (28)                                                                                      | `git_version_control`                                           |
| cross-functional coordination (62), cross-functional teams (33)                                                     | `cross_functional_collaboration`                                |
| stakeholder communication (41)                                                                                      | `stakeholder_management`                                        |
| mentoring engineers (37), mentorship (30)                                                                           | `mentoring`                                                     |
| root cause analysis / root-cause analysis (68+26)                                                                   | `technical_troubleshooting` _(review — RCA ⊇ troubleshooting?)_ |

## B. New IDs — HW / Architect / Systems + core-SWE + AI cluster (per audit)

No existing ID covers these; all are genuine, high-frequency technical skills. Each needs a full grounded library entry (id, name, category, description, proficiency_levels) authored via the `role-research` skill.

| proposed id             | phrases (freq)                                                                     | cluster   |
| ----------------------- | ---------------------------------------------------------------------------------- | --------- |
| `software_architecture` | software architecture (38), architectural decisions (31), technical direction (23) | Architect |
| `os_internals`          | os internals (25)                                                                  | Systems   |
| `security_research`     | security research (42)                                                             | Security  |
| `threat_modeling`       | threat modeling (25)                                                               | Security  |
| `data_science`          | data science (29)                                                                  | AI/Data   |
| `embeddings`            | embeddings (27)                                                                    | AI/ML     |
| `model_fine_tuning`     | fine-tuning (25)                                                                   | AI/ML     |
| `llm_agents`            | agents (23), tool use (23)                                                         | AI/ML     |
| `robotics`              | robotics (27)                                                                      | HW        |
| `code_quality`          | coding standards (33), clean code (23), maintainability (25)                       | SWE-craft |

## C. High-frequency soft-skill GAP — your philosophy call

The library has **no** interpersonal/teamwork ID, yet these are the two most-frequent unmapped phrases corpus-wide. Either add IDs or keep treating them as filler — I won't guess.

| phrase               | freq | note                                                                     |
| -------------------- | ---- | ------------------------------------------------------------------------ |
| interpersonal skills | 238  | + excellent/good interpersonal (55+30), interpersonal communication (52) |
| teamwork             | 187  | + cross-functional/collaboration variants                                |
| service orientation  | 97   | + high service orientation (51) — maps to customer_service?              |

## D. Filler — do NOT promote (traits, not skills)

ownership, performance, responsibility, accuracy, initiative, proactive, creativity, detail-oriented, self-motivated, independence, priority, meeting deadlines, personal responsibility, best practices, execution, planning, multitasking, working under pressure. (Per the prompt's own anti-filler rule; a false skill is worse than a missed one.)

## E. Domain — FAST-FOLLOW (non-software; deferred per Eli)

inventory control (35), retail experience (35), shift work/management (35+31), preventive maintenance (32), bank reconciliations (24), food safety procedures (23), internal controls (33), physical work (51), quality control (47).

## Plan

1. **This PR (batch 1):** section A aliases + section B new IDs (grounded), schema-validator clean, then the cheap **re-resolve pass** (no LLM — re-run the resolver over `req_skills_*_raw`, rewrite `req_skills_core/nice/must_have` + coverage). Report movement: zero-core %, resolved/job, coverage.
2. Section C: your call before I touch it.
3. Section E: fast-follow batch.
