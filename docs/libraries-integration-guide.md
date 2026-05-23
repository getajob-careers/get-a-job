GET A JOB — Full Library & Integration Guide for Developer

AGENT PROMPTS — functions/agent-prompts/ (4 files, ~57 KB total)
career_agent_system_prompt.md (12 KB) — Career Agent, tiered role recommendations + goal alignment
application_cv_success_agent_system_prompt.md (16 KB) — CV tailoring + application tasks
interview_coach_system_prompt.md (15 KB) — Interview Coach agent
skill_development_agent_system_prompt.md (14 KB) — Skill Development Advisor
⚠️ None of these are wired yet. Edge functions currently use inline system prompts. To load them:
Deno.readTextFile(new URL("../agent-prompts/<file>.md", import.meta.url))

CORE DOMAIN LIBRARIES — functions/data/ (source of truth)
00_role_library.json (382 KB)
→ 142 roles | Root key: roles
→ Each role: id, standardized_title, alternate_titles, role_family, seniority, core_purpose, core_responsibilities, required_skills
01_skill_library.json (286 KB)
→ 397 skills | Root key: skill_library
→ Each skill: id, name, category, tags, common_roles, related_skills
02_proof_signal_library.json (227 KB)
→ 598 proof signals | Root key: proof_signal_library
→ Each signal: id, description, tags, maps_to_skills, strength_level
04_role_skill_mapping.json (122 KB)
→ 142 mappings (1 per role) | Root key: role_skill_mapping
→ Each mapping: role_id, core_skills, secondary_skills, differentiator_skills
⚠️ Some entries use flat arrays (core_skills: ["id"]), others use nested objects (skills: {core: [{skill_id: "..."}]}). Parsers must handle both.
15_skill_transfer_map.json (862 KB)
→ 1,707 transfer pairs | Root key: transfers
→ Each: s (source role), t (target role), score, type (natural/stretch/pivot), gap_d, sen_gap, shared, gaps

HOW THEY CONNECT (relational graph)
04_role_skill_mapping.role_id ↔ 00_role_library.roles[].id
04_role_skill_mapping.*_skills[] ↔ 01_skill_library.skill_library[].id
02_proof_signal_library.maps_to_skills[] ↔ 01_skill_library.skill_library[].id
15_skill_transfer_map.transfers[].s and .t ↔ 00_role_library.roles[].id
15_skill_transfer_map.transfers[].shared[] and .gaps[] ↔ 01_skill_library.skill_library[].id
Flow: CV Upload → proof signals extracted → matched to skills via proof_signal_library → scored against target role via role_skill_mapping → fit score + tier assignment

LOGIC LIBRARIES (decision rules)
03_skill_strength_logic.json (1 KB) — Scoring: strong=1.0, medium=0.6, weak=0.3, missing=0.0
05_fit_scoring_logic.json (1.2 KB) — Weights: core 60%, secondary 30%, differentiator 10%
06_track_logic.json (0.4 KB) — Track 1/2/3 definitions
07_onboarding_input_mapping.json (4.6 KB) — Maps onboarding inputs to profile fields
08_proof_signal_extraction_logic.json (13 KB) — 18 rule sets for extracting proof signals from CV text
09_goal_alignment_logic.json (6.9 KB) — Scores role alignment with user's 5-year goal
010_agent_decision_logic.json (5.8 KB) — Final tier assignment combining readiness + goal alignment
011_task_generation_logic.json (5.5 KB) — Stage-aware personalized task generation
012_course_recommendation_logic.json (5.3 KB) — When to recommend courses vs projects vs both
013_job_search_stage_logic.json (6.1 KB) — Detects which of 7 job search stages user is in
Market context:
14_location_context_israel.json (12 KB) — Israel market norms (CV format, military service, hiring cycles, salary). Loaded conditionally when profile.location is Israel.

EDGE FUNCTION → LIBRARY MAP (what loads what)
generate-career-analysis.ts → loads 00, 04, 05, 06, 09, 010 | Agent prompt: career_agent (not wired yet)
generateTailoredCV.ts → loads 00, 01, 02, 04 (scoped per-role now) | Agent prompt: application_cv_success (not wired yet)
generate-tasks.ts → loads 00, 04, 011, 012, 013 | No agent prompt
generateApplicationTasks.ts → loads nothing (template-based) | No agent prompt

NOT YET WIRED TO ANY EDGE FUNCTION

03_skill_strength_logic.json
07_onboarding_input_mapping.json
08_proof_signal_extraction_logic.json
14_location_context_israel.json
15_skill_transfer_map.json
All 4 agent prompt markdown files


5 CRITICAL INTEGRATION NOTES

LIBRARY SCOPING IS REQUIRED — Never dump full library JSON into a system prompt. Do deterministic lookups for the target role's data only. The generateTailoredCV refactor shows the pattern.
MAPPING SCHEMA INCONSISTENCY — 04_role_skill_mapping has two formats: flat arrays (core_skills: ["skill_id"]) and nested objects (skills: {core: [{skill_id: "..."}]}). All parsers must handle both.
SKILL ID NAMING DRIFT — Some IDs are sector-scoped (e.g., excel_advanced_finance), others generic (sql). Always verify all referenced skill IDs exist in 01_skill_library.json before merging.
FILE SIZE LIMITS — 15_skill_transfer_map.json is 862 KB, close to the Supabase edge function 2MB limit. Consider lazy-loading or DB-backed storage if multiple functions need it.
AGENT PROMPTS NOT WIRED — The 4 markdown system prompts exist but aren't loaded by any edge function yet. Load with: Deno.readTextFile(new URL("../agent-prompts/<file>.md", import.meta.url))


REMAINING TECHNICAL TASKS

Wire 4 agent system prompts into 4 chat agents in the UI
Test all 3 edge functions end-to-end with a real CV
Build the CV extraction prompt (LLM reads uploaded CV → structured proof signals)
Merge agent-prompts branch into main
End-to-end QA with a test user