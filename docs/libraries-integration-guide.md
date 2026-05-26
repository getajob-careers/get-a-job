# Domain and Logic Libraries Integration Guide

Detailed guide to the static domain data, business logic rules, and tone systems that drive the Get A Job career platform.

---

## Core Core Domain Libraries

These libraries act as the static, standardized source of truth for career taxonomy, skills categorization, and proof mappings. They live under `supabase/functions/_shared/libraries/` as TypeScript modules (`.ts` files containing typed ES module exports), plus `companies_il.json`.

| File | Size | Purpose |
|------|------|---------|
| `00_role_library.ts` | 568 KB | Standard registry of **183 career roles** (Junior/Mid/Senior) with canonical titles, alternate titles, standardized role family groupings, and required core responsibilities. |
| `01_skill_library.ts` | 445 KB | Directory of **387 skill IDs** complete with standardized names, categories, tags, and mapping links back to common roles. |
| `02_proof_signal_library.ts`| 249 KB | Standard maps linking **proof signals** (e.g., specific achievements, metrics, tool usage) to library skill IDs, defining extraction strength weights. |
| `04_role_skill_mapping.ts` | 142 KB | Explicit mappings defining the exact core, secondary, and differentiator skills required for all 183 roles. |
| `15_skill_transfer_map.ts` | 956 KB | Direct maps defining **1,707 transfer pairs** which evaluate pivot ease (natural, stretch, pivot) between source and target roles. |
| `companies_il.json` | 392 KB | Standard seed of **831 Israeli tech companies** labeled with ATS integrations (Greenhouse, Workday, Lever, etc.) driving direct-ATS job scrapes. |

---

## Logic and Decision Libraries

These modules encode the procedural algorithms, weights, and scoring rules for job suitability matching, task planning, and cohort placement.

| File | Size | Purpose |
|------|------|---------|
| `03_skill_strength_logic.ts` | 1.1 KB | Computes skill strength weights based on proof evidence (Strong = 1.0, Medium = 0.6, Weak = 0.3, Missing = 0.0). |
| `05_fit_scoring_logic.ts` | 1.2 KB | Job fit algorithm weighting core skills at 60%, secondary skills at 30%, and differentiators at 10%. |
| `06_track_logic.ts` | 0.4 KB | Defines computed match threshold cutoffs for Track 1, Track 2, and Track 3 placement. |
| `07_onboarding_input_mapping.ts`| 4.9 KB | Normalizes custom wizard inputs to standard profile settings and database column schemas. |
| `08_proof_signal_extraction_logic.ts`| 14 KB | 18 rulesets for parsing raw CV texts to identify genuine proof signals. |
| `09_goal_alignment_logic.ts` | 7.2 KB | Multi-level algorithms matching and scoring career goals against user's stated 5-year visions. |
| `010_agent_decision_logic.ts`| 6.2 KB | Dynamic matrix evaluating both readiness scores and goal alignments to assign final tracks. |
| `011_task_generation_logic.ts` | 5.9 KB | Generates weekly tasks lists based on current job search stages. |
| `012_course_recommendation_logic.ts`| 5.6 KB | Evaluates skill gap severity to trigger appropriate project assignments, course recommendations, or both. |
| `013_job_search_stage_logic.ts` | 6.4 KB | Computes which of the 7 job search milestones a user has completed to tailor action planner recommendations. |
| `14_location_context_israel.ts` | 13 KB | Stores Israel-specific market norms (military service alignments, standard salary metrics, and local tech hubs). |

---

## Core Tone and Voice Rules

These live under `supabase/functions/_shared/voice-rules.ts`. They represent absolute prompts grounding the tone, structures, and vocabularies of generated materials.

| Constant | Scope | Core Rule |
|----------|-------|-----------|
| `CV_VOICE_RULES` | Tailored CVs | Active verbs, metrics-driven outcomes, strictly no generic fluff adjectives. |
| `LINKEDIN_VOICE_RULES`| Profile Copy | Headline/Summary copy optimizing for concrete accomplishments, suppressing standard corporate jargon. |
| `POST_VOICE_RULES` | LinkedIn Posts | Suppresses common opening clickbaits ("Excited to share", "Thrilled to announce"). Emphasizes lessons learned. |
| `COMMENT_VOICE_RULES`| LinkedIn Comments| Direct, professional, 50–150 word Israeli style commentaries expressing genuine technical substance. |
| `OUTREACH_VOICE_RULES`| Networking Messages| Strict character limit guides (≤200 char notes), suppresses standard clichés ("I hope this finds you well"). |

---

## Integration Relational Graph

```
[02_proof_signal_library] ──(maps proof signals)──> [01_skill_library]
                                                            ▲
                                                     (specifies skills)
                                                            │
[00_role_library] <──(links roles)──> [04_role_skill_mapping]
        │
 (pivot matching)
        ▼
[15_skill_transfer_map]
```

### Critical Flow
1. **Resume Upload**: `extract-proof-signals` extracts metric structures.
2. **Skill Resolution**: Extracted matches are resolved against `_shared/skill-aliases.ts` to standard skill IDs in `01_skill_library`.
3. **Scoring**: `generate-career-analysis` matches resolved skills vs `04_role_skill_mapping` and processes through `05_fit_scoring_logic` and `09_goal_alignment_logic`.
4. **Track Assignment**: Final tracks (`track_1`/`track_2`/`track_3`) are computed via `010_agent_decision_logic`, saving outputs to the `career_roles` table.