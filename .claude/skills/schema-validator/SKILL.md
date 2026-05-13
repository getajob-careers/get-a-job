---
name: schema-validator
description: Validates the role_library / skill_library / role_skill_mapping files for schema, enums, cross-references, ID uniqueness, and cross-copy consistency. Emits schemas.json (enums + ID sets + schema shapes) for downstream skills like role-research and skill-research to consume. Use when (a) the libraries have just been edited, (b) you're about to draft new roles or skills, or (c) you suspect drift between the 6 edge-function copies of the libraries.
---

# Schema validator

Validates the domain libraries that drive career analysis, job suggestions, task generation, CV tailoring, and proof-signal extraction across the edge functions.

## What it does

1. **Locates the canonical library set.** Default: `supabase/functions/_shared/libraries/`. Fallback for the pre-consolidation state: `supabase/functions/generate-career-analysis/shared/libraries/`. The script auto-detects which path exists.
2. **Parses each TypeScript library file** by stripping `export const NAME = ` and trailing `as const;`, then `json.loads`. Library files are written in JSON-compatible TS syntax (quoted keys, no trailing commas, no comments) so this works without a TS parser.
3. **Runs the validation checks** (see below).
4. **Cross-copy consistency** (when running against `_shared/libraries/`, this is a no-op since there's only one copy; in the pre-consolidation state it compares SHA256 of every duplicate copy in each edge function's `shared/libraries/` dir against the canonical set).
5. **Emits `.claude/skills/schema-validator/schemas.json`** with the enums, ID sets, and schema shapes that downstream skills depend on.
6. **Emits `.claude/skills/schema-validator/errors.json`** listing every check failure plus its severity. Errors fail the script (exit 1); warnings don't.

## Checks

- **Required fields present** on each role / skill / mapping entry
- **Field types correct** (e.g. `alternate_titles` is `string[]`, `id` is `string`, `market_notes` is `{locale: string}`)
- **Enum membership** (`role_family` ∈ `role_families`, `secondary_family` ∈ `role_families` and ≠ primary, `seniority` ∈ `seniority_levels`)
- **Canonical enum match** — the library's declared `role_families` / `seniority_levels` must equal the validator's canonical set (single source of truth; the validator is the source). 21 families, 7 seniority levels.
- **Cross-references resolve** (skill IDs in roles exist; role IDs in `next_roles` exist; mapping role_ids and skill_ids all exist; mapping skills can be string IDs or `{skill_id, required_proficiency}` objects — both validated)
- **ID uniqueness** within each library
- **ID format** (snake_case, lowercase, alphanumeric + underscore)
- **`market_notes` shape** — object with locale-string keys mapping to note-string values, never a flat string
- **Cross-copy consistency** (skipped post-consolidation; relevant only before the move)

## Primary vs secondary family — criteria

Encoded in `FAMILY_ASSIGNMENT_CRITERIA` in `validate.py`. Downstream skills (role-research) read this when proposing role entries:

- **`role_family`** (required) — main reporting line and core function. The role's "home."
- **`secondary_family`** (optional, null when single-family) — significant skill overlap with another family (typically ≥30% of `required_skills` map to that family's core skills) AND the role regularly does work that crosses into that family's domain.

Examples:
- A Product Marketing Manager: `role_family: "Marketing"`, `secondary_family: "Product"` — reports into Marketing, but skill overlap with Product is substantial and the work routinely crosses (positioning, launches, PMM-PM rituals).
- A Customer Success Operations Lead: `role_family: "Customer_Experience"`, `secondary_family: "RevOps_BizOps"` — sits in CS but does heavy systems/automation work.
- A pure Backend Engineer: `role_family: "Engineering"`, `secondary_family: null`.

Don't set `secondary_family` just because a role touches another team occasionally. The bar is "this role would be partially miscategorised if only one family applied to it."

## Usage

```bash
# Strict: fail on any error
python3 .claude/skills/schema-validator/validate.py

# Permissive: emit errors as warnings, always exit 0 (for first-run baseline / dev triage)
python3 .claude/skills/schema-validator/validate.py --report-only

# Fail on warnings too (downstream skills should set this when they read schemas.json)
python3 .claude/skills/schema-validator/validate.py --strict
```

## Output

- `.claude/skills/schema-validator/schemas.json` — canonical enums + ID sets + schema shapes. Downstream skills read this path.
- `.claude/skills/schema-validator/errors.json` — every check failure plus severity (`error` / `warning`) and a human-readable message.

## Don't auto-mutate the libraries

This skill is **read-only by design**. If validation surfaces structural issues (e.g. a typo in a skill category, a dangling skill_id reference), the fix is a human-reviewed edit to the library file. The validator points at the problem; it does not patch the file. This is the "AI emits to drafts, human promotes" pattern — the libraries are canonical content and the validator only reports.

## First-run baseline

The first time this runs against the current libraries, expect warnings:
- Skill `category` field has 38 distinct values; some are likely near-duplicates that should consolidate (e.g. `technical_skill` vs `technical` vs `core_skill`). The validator records the observed set as the enum; consolidation is a follow-up curation task.
- Some cross-references may be broken from accumulated drift.

Treat first-run output as a baseline. Fix the obvious typos, accept the rest, then keep the validator green going forward.
