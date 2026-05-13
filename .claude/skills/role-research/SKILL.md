---
name: role-research
description: Research-grade enrichment for roles in the role library. Use when extending a role's content with grounded responsibilities, career progression, and Israeli market context. Validator-gated; auto-applies to the canonical library when validation passes. Works one role at a time (proof-of-concept) or a batch of roles in one family (production runs).
---

# Role research

Enriches roles in `supabase/functions/_shared/libraries/00_role_library.ts` with research-grounded content. Output is auto-applied to the canonical library after passing the schema-validator. This is the foundation career map for the platform — used by `generate-career-analysis`, `generate-job-suggestions`, `generate-tasks`, `generate-tailored-cv`, `extract-proof-signals`, and `lookup-role-skills`.

## Per-role workflow

For each role:

1. **Read the current entry** from the canonical library.
2. **Research** the role in the Israeli tech context. Multi-source web search (Calcalist / CTech / Globes / Times of Israel / LinkedIn / Built In / Glassdoor IL / levels.fyi Israel) plus model knowledge. 2-3 targeted queries per role; batch queries across multiple roles in the same family.
3. **Fill the six dimensions** (per Eli's spec):
   - **What the role does day-to-day in Israeli tech** → `core_responsibilities` (4-6 bullets, concrete actions a person in this role does)
   - **Required vs nice-to-haves** → `required_skills` (must-have) and `preferred_skills` (nice-to-have); both lists of canonical skill IDs from the skill library
   - **Vertical progression (next step up)** → `next_roles` (role IDs from the library)
   - **Lateral moves** → `similar_roles` (role IDs from the library, often a different role family)
   - **Skill transferability** → derived from the union of skills in `required_skills` + `preferred_skills` across roles; not a stored field
   - **Israeli market context** → `market_notes.israel` (1-3 paragraphs: typical hiring stage, common backgrounds, salary range, who hires for it, anything locale-specific)
4. **Tag the research method** → `_research_method` field at the role level: `"web_search"` (≥1 web search executed) or `"knowledge"` (training-only).
5. **Identify missing skills** → any skill ID you'd want to reference that doesn't exist in the canonical skill library: append to `missing_skills_backlog.json` with the role context. The skill-research follow-up reads this.
6. **Validate** via `python3 .claude/skills/schema-validator/validate.py`. The validator must NOT regress from the pre-research baseline.
7. **Apply** via `python3 .claude/skills/role-research/apply_enrichment.py <role_id> <enrichment.json>`. The script:
   - Loads the canonical library
   - Replaces the named role's record with the enriched version (preserves field order, merges where partial)
   - Runs the validator against the new state
   - If validation passes → writes the library; if it fails → aborts with the validator diff

## Schema v2.0 output shape

Every enrichment must be valid v2.0:

```json
{
  "id": "software_engineer",
  "standardized_title": "Software Engineer",
  "alternate_titles": ["Backend Engineer", "Full-Stack Engineer"],
  "role_family": "Engineering",
  "secondary_family": null,
  "seniority": "Mid",
  "core_purpose": "...",
  "core_responsibilities": ["...", "...", "..."],
  "required_skills": ["..."],
  "preferred_skills": ["..."],
  "tools": ["..."],
  "years_experience_typical": "3-5",
  "next_roles": ["senior_software_engineer", "tech_lead"],
  "similar_roles": ["devops_engineer", "sre_engineer"],
  "market_notes": {
    "israel": "..."
  },
  "_research_method": "web_search"
}
```

Required fields per the schema-validator baseline: `id`, `standardized_title`, `role_family`, `seniority`, `core_purpose`, `core_responsibilities`, `required_skills`, `preferred_skills`.

## Primary vs secondary family criteria

Same criteria as `schema-validator/validate.py` — see that skill for the definitive copy. Quick reference:

- **`role_family`** (primary, required) — main reporting line and core function.
- **`secondary_family`** (optional, null when single-family) — ≥30% of `required_skills` overlap with another family's core skills AND the role regularly does work crossing into that family.

Examples:
- Product Marketing Manager → primary `Marketing`, secondary `Product`
- Customer Success Operations Lead → primary `Customer_Experience`, secondary `RevOps_BizOps`
- Pure Software Engineer → primary `Engineering`, secondary `null`

## Batch mode

For family-level batches (e.g. all `Engineering` roles), run multiple per-role enrichments in sequence using shared research queries where possible ("Israeli engineering roles career path", "engineering compensation Israel by seniority"). Apply each role's enrichment via `apply_enrichment.py` independently so a single bad role doesn't break the batch.

After each batch:
1. Run the schema-validator end-to-end (`python3 .claude/skills/schema-validator/validate.py`).
2. Confirm the error count does not regress from the baseline (60 errors at v2.0 schema-cleanup landing).
3. Open the batch PR; auto-promote happens at apply time, not at PR time.

## Missing skills backlog

`.claude/skills/role-research/missing_skills_backlog.json` accumulates:

```json
{
  "missing_skills": [
    {
      "proposed_id": "incident_response_engineering",
      "proposed_name": "Incident Response Engineering",
      "proposed_category": "operational_skill",
      "first_seen_in_role": "sre_engineer",
      "context": "Pages, on-call rotations, post-mortems"
    }
  ]
}
```

The skill-research follow-up reads this as its priority list. Do NOT add missing skills directly to the skill library from within role-research.

## Content rules (apply to every role)

1. **No salary information in `market_notes`.** Salary is a separate, future platform surface — not part of the role-library content contract. Mentioning typical ranges, bands, equity ratios, etc. is out of scope.

2. **Diverse company examples across sectors.** When naming Israeli companies in `market_notes.israel`, span the actual ecosystem mix:
   - Cybersecurity (Wiz, Check Point, CyberArk, SentinelOne, Cato Networks, Cybereason, Armis, Snyk, Orca Security)
   - SaaS / B2B (monday.com, Wix, JFrog, Fiverr, Gong, HiBob, AppsFlyer, Cloudinary)
   - AI / ML (AI21 Labs, Aidoc, Run:ai, Hailo)
   - FinTech / InsurTech (Lemonade, Payoneer, eToro, Forter, Tipalti, Melio)
   - Adapt the mix to where the role actually exists — name 4-6 employers spanning at least 2 sectors. Cyber is the single biggest engineering employer in Israel; don't underweight it.

3. **`required_skills` vs `preferred_skills` is a judgment call per role.** Default rule: if the role genuinely cannot be done without the skill, it's required. If it makes the candidate stronger but isn't a baseline gate, it's preferred. Watch for these traps:
   - Full-stack ≠ baseline for "Software Engineer" — most Israeli SWE roles are backend-leaning with frontend as nice-to-have. Don't list both `backend_development` AND `frontend_development` as required for a generic Software Engineer.
   - Leadership-adjacent skills (mentoring, technical leadership) shift from preferred at Mid → required at Senior and above.
   - Tool-specific skills (e.g. `figma_mastery` for a Product Designer) ARE required when the tool is universal in the industry. Otherwise preferred.

## Don't

- Don't fabricate metrics or company names not grounded in research or your knowledge.
- Don't include salary or comp data (see rule 1 above).
- Don't auto-mutate the skill library or the role-skill mapping from this skill.
- Don't write to `_drafts/` or `drafts/` — the canonical library is the working target; validator is the gate.
- Don't promote a role whose enrichment fails the validator. Fix the data first.
