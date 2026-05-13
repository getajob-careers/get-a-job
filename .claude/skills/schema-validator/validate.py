#!/usr/bin/env python3
"""Schema validator for the role / skill / mapping libraries.

Reads the TypeScript library files, validates structure + enums +
cross-references + ID uniqueness + cross-copy consistency, and emits
schemas.json (the downstream contract) + errors.json (the report).

Usage:
  python3 validate.py                # strict mode: exit 1 on any error
  python3 validate.py --report-only  # always exit 0 (baseline / dev triage)
  python3 validate.py --strict       # warnings count as errors

Lives at .claude/skills/schema-validator/validate.py.

Read-only by design — never mutates the library files. Surfaces problems;
human fixes the source.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
SKILL_DIR = Path(__file__).resolve().parent

# Canonical location after consolidation. The script falls back to the
# pre-consolidation location (the generate-career-analysis copy) if this
# directory doesn't exist yet — so the validator works both before and
# after the C2 consolidation move.
CANONICAL = REPO_ROOT / "supabase" / "functions" / "_shared" / "libraries"
PRE_CONSOLIDATION_CANONICAL = (
    REPO_ROOT / "supabase" / "functions" / "generate-career-analysis" / "shared" / "libraries"
)

# Every edge function that historically duplicated the libraries. Used for
# the cross-copy check; ignored once consolidation has landed.
DUP_DIRS = [
    REPO_ROOT / "supabase" / "functions" / fn / "shared" / "libraries"
    for fn in [
        "generate-career-analysis",
        "generate-job-suggestions",
        "generate-tasks",
        "extract-proof-signals",
        "generate-tailored-cv",
        "lookup-role-skills",
    ]
]


# ─── Helpers ─────────────────────────────────────────────────────────

ID_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")


def parse_ts_library(path: Path) -> dict:
    """Strip the `export const NAME = ` prefix and `as const;` suffix
    and parse the rest as JSON. Library files are written in
    JSON-compatible TS syntax — quoted keys, no trailing commas, no
    comments — so this works without a TS parser."""
    text = path.read_text()
    # Strip the export prefix (e.g. `export const roleLibrary = `)
    text = re.sub(r"^\s*export\s+const\s+\w+\s*=\s*", "", text, count=1)
    # Strip the `as const;` (with optional whitespace + trailing newline)
    text = re.sub(r"\s*as\s+const\s*;?\s*$", "", text)
    return json.loads(text)


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class Report:
    def __init__(self) -> None:
        self.errors: list[dict] = []
        self.warnings: list[dict] = []

    def error(self, check: str, message: str, **ctx) -> None:
        self.errors.append({"check": check, "message": message, **ctx})

    def warning(self, check: str, message: str, **ctx) -> None:
        self.warnings.append({"check": check, "message": message, **ctx})


# ─── Schemas / required-field declarations ──────────────────────────

ROLE_REQUIRED = [
    "id",
    "standardized_title",
    "role_family",
    "seniority",
    "core_purpose",
    "core_responsibilities",
    "required_skills",
    "preferred_skills",
]
ROLE_OPTIONAL_KNOWN = [
    "alternate_titles", "tools", "technical_depth", "customer_facing_level",
    "revenue_ownership", "strategic_level", "lifecycle_stage",
    "typical_backgrounds", "next_roles", "similar_roles",
    "not_to_confuse_with", "keywords",
    # v2.0 additions (Wk 5 schema unification):
    "secondary_family",            # optional, same enum as role_family. null if no secondary.
    "years_experience_typical",    # e.g. "1-3", "5-8", "10+"
    "market_notes",                # { israel?: string, us?: string, ... } — locale-extensible
]

# Primary vs secondary family criteria (encoded for downstream skills + audits):
#   primary   = main reporting line and core function — the role's "home"
#   secondary = significant skill overlap with another family (≥30% of required_skills
#               typically map to that family's core skills) AND the role regularly
#               does work that crosses into that family's domain.
#               Set to null if the role doesn't meaningfully span two families.
FAMILY_ASSIGNMENT_CRITERIA = {
    "primary": "Main reporting line and core function. Required for every role.",
    "secondary": "Significant skill overlap with another family (~30%+ of required_skills) "
                 "AND regular cross-family work. Null when role is single-family.",
}

# Canonical enums (v2.0). Validator now treats these as authoritative
# regardless of what the library's top-level arrays declare — but if
# the library's declared arrays differ, we flag the divergence as an
# error so the source-of-truth stays single.
CANONICAL_ROLE_FAMILIES = [
    "Support", "Onboarding_Implementation", "Customer_Experience", "Relationship_Growth",
    "Sales", "BD_Partnerships", "Marketing",
    "Product", "Engineering", "Design_UX",
    "Data", "AI_ML",
    "Operations", "RevOps_BizOps", "Finance",
    "HR_People", "Leadership", "Admin_GA",
    "IT_Security", "Solutions_Engineering", "Consulting",
]
CANONICAL_SENIORITY_LEVELS = [
    "Entry", "Entry_Mid", "Mid", "Senior", "Lead_Manager", "Director_Head", "VP_Executive",
]

SKILL_REQUIRED = ["id", "name", "category"]
SKILL_OPTIONAL_KNOWN = [
    "tags", "common_roles", "related_skills", "description",
    "proficiency_levels",
]

MAPPING_REQUIRED = ["role_id", "core_skills"]
MAPPING_OPTIONAL_KNOWN = [
    "research_status", "secondary_skills", "differentiator_skills",
]


# ─── Validators ──────────────────────────────────────────────────────

def validate_role_library(role_lib: dict, report: Report) -> tuple[set[str], list[str], list[str]]:
    """Returns (role_ids, role_families, seniority_levels) for use by
    other validators (skill cross-refs and mapping checks)."""
    role_families = list(role_lib.get("role_families") or [])
    seniority_levels = list(role_lib.get("seniority_levels") or [])

    if not role_families:
        report.error("role_library.top_level", "missing or empty role_families top-level array")
    if not seniority_levels:
        report.error("role_library.top_level", "missing or empty seniority_levels top-level array")

    # The declared top-level enums must match the canonical sets defined
    # above. Single source of truth. Drift here is a structural problem.
    if set(role_families) != set(CANONICAL_ROLE_FAMILIES):
        missing = set(CANONICAL_ROLE_FAMILIES) - set(role_families)
        extra = set(role_families) - set(CANONICAL_ROLE_FAMILIES)
        report.error(
            "role_library.top_level",
            f"declared role_families differs from canonical: missing={sorted(missing)} extra={sorted(extra)}",
        )
    if set(seniority_levels) != set(CANONICAL_SENIORITY_LEVELS):
        missing = set(CANONICAL_SENIORITY_LEVELS) - set(seniority_levels)
        extra = set(seniority_levels) - set(CANONICAL_SENIORITY_LEVELS)
        report.error(
            "role_library.top_level",
            f"declared seniority_levels differs from canonical: missing={sorted(missing)} extra={sorted(extra)}",
        )

    roles = role_lib.get("roles") or []
    role_ids: set[str] = set()
    seen_ids: set[str] = set()

    for idx, role in enumerate(roles):
        role_id = role.get("id", f"<unnamed-at-index-{idx}>")
        ctx = {"role_id": role_id, "index": idx}

        # Required fields
        for field in ROLE_REQUIRED:
            if field not in role:
                report.error("role.required_field", f"role {role_id!r} missing required field {field!r}", **ctx)

        # ID format + uniqueness
        if "id" in role:
            if not isinstance(role["id"], str) or not ID_PATTERN.match(role["id"]):
                report.error("role.id_format", f"role id {role['id']!r} must be lowercase snake_case", **ctx)
            if role["id"] in seen_ids:
                report.error("role.id_unique", f"duplicate role id {role['id']!r}", **ctx)
            else:
                seen_ids.add(role["id"])
                role_ids.add(role["id"])

        # Enum membership
        if role.get("role_family") and role["role_family"] not in role_families:
            report.error(
                "role.role_family_enum",
                f"role {role_id!r} has role_family {role['role_family']!r} not in role_families enum",
                **ctx,
            )
        if role.get("seniority") and role["seniority"] not in seniority_levels:
            report.error(
                "role.seniority_enum",
                f"role {role_id!r} has seniority {role['seniority']!r} not in seniority_levels enum",
                **ctx,
            )

        # secondary_family — optional, but if present must:
        #   (a) be in the role_families enum, AND
        #   (b) differ from the primary role_family.
        if "secondary_family" in role and role["secondary_family"] is not None:
            sf = role["secondary_family"]
            if sf not in role_families:
                report.error("role.secondary_family_enum",
                             f"role {role_id!r} has secondary_family {sf!r} not in role_families enum", **ctx)
            elif sf == role.get("role_family"):
                report.error("role.secondary_family_distinct",
                             f"role {role_id!r} secondary_family {sf!r} duplicates primary role_family", **ctx)

        # market_notes shape — must be an object with locale keys, not a flat string.
        if "market_notes" in role:
            mn = role["market_notes"]
            if not isinstance(mn, dict):
                report.error("role.market_notes_shape",
                             f"role {role_id!r} market_notes must be an object with locale keys (e.g. {{israel: '...', us: '...'}})",
                             **ctx)
            else:
                for locale, note in mn.items():
                    if not isinstance(locale, str) or not isinstance(note, str):
                        report.error("role.market_notes_shape",
                                     f"role {role_id!r} market_notes entry {locale!r} must map a locale string to a note string", **ctx)

        # Type checks for the array fields
        for field in ["alternate_titles", "core_responsibilities", "required_skills",
                      "preferred_skills", "tools", "lifecycle_stage", "typical_backgrounds",
                      "next_roles", "similar_roles", "not_to_confuse_with", "keywords"]:
            if field in role and not isinstance(role[field], list):
                report.error("role.field_type", f"role {role_id!r} field {field!r} must be a list", **ctx)

        # Warn on unknown fields
        for field in role:
            if field not in set(ROLE_REQUIRED) | set(ROLE_OPTIONAL_KNOWN):
                report.warning("role.unknown_field", f"role {role_id!r} has unrecognised field {field!r}", **ctx)

    return role_ids, role_families, seniority_levels


def validate_skill_library(skill_lib: dict, report: Report, role_ids: set[str]) -> tuple[set[str], list[str]]:
    """Returns (skill_ids, observed_skill_categories)."""
    skills = skill_lib.get("skill_library") or []
    skill_ids: set[str] = set()
    categories: set[str] = set()
    seen_ids: set[str] = set()

    for idx, skill in enumerate(skills):
        skill_id = skill.get("id", f"<unnamed-at-index-{idx}>")
        ctx = {"skill_id": skill_id, "index": idx}

        for field in SKILL_REQUIRED:
            if field not in skill:
                report.error("skill.required_field", f"skill {skill_id!r} missing required field {field!r}", **ctx)

        # ID format + uniqueness
        if "id" in skill:
            if not isinstance(skill["id"], str) or not ID_PATTERN.match(skill["id"]):
                report.error("skill.id_format", f"skill id {skill['id']!r} must be lowercase snake_case", **ctx)
            if skill["id"] in seen_ids:
                report.error("skill.id_unique", f"duplicate skill id {skill['id']!r}", **ctx)
            else:
                seen_ids.add(skill["id"])
                skill_ids.add(skill["id"])

        # Track category for the observed-enum emit
        cat = skill.get("category")
        if isinstance(cat, str) and cat:
            categories.add(cat)

        # Type checks
        for field in ["tags", "common_roles", "related_skills"]:
            if field in skill and not isinstance(skill[field], list):
                report.error("skill.field_type", f"skill {skill_id!r} field {field!r} must be a list", **ctx)

        # common_roles cross-ref (special value "all" means all roles)
        for role_ref in skill.get("common_roles", []) or []:
            if role_ref == "all":
                continue
            if isinstance(role_ref, str) and role_ref not in role_ids:
                report.warning(
                    "skill.common_roles_xref",
                    f"skill {skill_id!r} references unknown role_id {role_ref!r} in common_roles",
                    **ctx,
                )

        # Warn on unknown fields
        for field in skill:
            if field not in set(SKILL_REQUIRED) | set(SKILL_OPTIONAL_KNOWN):
                report.warning("skill.unknown_field", f"skill {skill_id!r} has unrecognised field {field!r}", **ctx)

    # related_skills (resolve after all skill_ids collected)
    for skill in skills:
        skill_id = skill.get("id", "<unknown>")
        ctx = {"skill_id": skill_id}
        for ref in skill.get("related_skills", []) or []:
            if isinstance(ref, str) and ref not in skill_ids:
                report.warning(
                    "skill.related_skills_xref",
                    f"skill {skill_id!r} references unknown skill_id {ref!r} in related_skills",
                    **ctx,
                )

    return skill_ids, sorted(categories)


def validate_role_skill_xrefs(role_lib: dict, role_ids: set[str], skill_ids: set[str], report: Report) -> None:
    """After both libraries are parsed, verify roles' required_skills /
    preferred_skills / next_roles all resolve."""
    for role in role_lib.get("roles") or []:
        role_id = role.get("id", "<unknown>")
        ctx = {"role_id": role_id}
        for ref in role.get("required_skills", []) or []:
            if isinstance(ref, str) and ref not in skill_ids:
                report.error("role.required_skills_xref",
                             f"role {role_id!r} required_skills references unknown skill_id {ref!r}", **ctx)
        for ref in role.get("preferred_skills", []) or []:
            if isinstance(ref, str) and ref not in skill_ids:
                report.warning("role.preferred_skills_xref",
                               f"role {role_id!r} preferred_skills references unknown skill_id {ref!r}", **ctx)
        for ref in role.get("next_roles", []) or []:
            if isinstance(ref, str) and ref not in role_ids:
                report.warning("role.next_roles_xref",
                               f"role {role_id!r} next_roles references unknown role_id {ref!r}", **ctx)


def validate_mapping(mapping: dict, role_ids: set[str], skill_ids: set[str], report: Report) -> None:
    entries = mapping.get("role_skill_mapping") or []
    seen_role_ids: set[str] = set()
    for idx, m in enumerate(entries):
        role_id = m.get("role_id", f"<unnamed-at-index-{idx}>")
        ctx = {"role_id": role_id, "index": idx}

        for field in MAPPING_REQUIRED:
            if field not in m:
                report.error("mapping.required_field",
                             f"mapping for {role_id!r} missing required field {field!r}", **ctx)

        if "role_id" in m:
            if m["role_id"] not in role_ids:
                report.error("mapping.role_id_xref",
                             f"mapping references unknown role_id {m['role_id']!r}", **ctx)
            if m["role_id"] in seen_role_ids:
                report.error("mapping.role_id_unique",
                             f"duplicate mapping for role_id {m['role_id']!r}", **ctx)
            else:
                seen_role_ids.add(m["role_id"])

        # Skills in mapping can be either string IDs OR rich
        # {skill_id, required_proficiency} objects. Validate both shapes.
        for field in ["core_skills", "secondary_skills", "differentiator_skills"]:
            for ref in m.get(field, []) or []:
                sid: str | None = None
                if isinstance(ref, str):
                    sid = ref
                elif isinstance(ref, dict):
                    sid = ref.get("skill_id")
                    if not isinstance(sid, str) or not sid:
                        report.error("mapping.skill_shape",
                                     f"mapping for {role_id!r} {field} has entry missing skill_id: {ref!r}", **ctx)
                        continue
                else:
                    report.error("mapping.skill_shape",
                                 f"mapping for {role_id!r} {field} has unrecognised entry type: {type(ref).__name__}", **ctx)
                    continue
                if sid and sid not in skill_ids:
                    report.error(
                        "mapping.skill_xref",
                        f"mapping for {role_id!r} {field} references unknown skill_id {sid!r}",
                        **ctx,
                    )

        for field in m:
            if field not in set(MAPPING_REQUIRED) | set(MAPPING_OPTIONAL_KNOWN):
                report.warning("mapping.unknown_field",
                               f"mapping for {role_id!r} has unrecognised field {field!r}", **ctx)


def validate_cross_copy_consistency(canonical_dir: Path, report: Report) -> None:
    """Compare the SHA256 of every library file in the canonical dir against
    every duplicate copy in the historical edge-function dirs. Skip the
    canonical dir itself if it IS one of the historical copies (pre-
    consolidation state)."""
    canonical_files = sorted(canonical_dir.glob("*.ts"))
    canonical_hashes = {f.name: sha256_file(f) for f in canonical_files}

    for dup_dir in DUP_DIRS:
        if not dup_dir.exists():
            continue
        try:
            same_path = dup_dir.resolve() == canonical_dir.resolve()
        except FileNotFoundError:
            same_path = False
        if same_path:
            continue
        # Only check files that exist in BOTH the canonical dir and this dup dir.
        for fname, canonical_hash in canonical_hashes.items():
            dup_path = dup_dir / fname
            if not dup_path.exists():
                continue
            if sha256_file(dup_path) != canonical_hash:
                report.error(
                    "cross_copy.drift",
                    f"library {fname} in {dup_dir.relative_to(REPO_ROOT)} diverges from canonical",
                    file=fname,
                    dup_dir=str(dup_dir.relative_to(REPO_ROOT)),
                    canonical_dir=str(canonical_dir.relative_to(REPO_ROOT)),
                )


# ─── Main ────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report-only", action="store_true",
                        help="Always exit 0; print errors but don't fail.")
    parser.add_argument("--strict", action="store_true",
                        help="Treat warnings as errors (fail on warnings too).")
    args = parser.parse_args()

    report = Report()

    if CANONICAL.exists():
        canonical_dir = CANONICAL
        canonical_state = "post-consolidation (_shared/libraries/)"
    elif PRE_CONSOLIDATION_CANONICAL.exists():
        canonical_dir = PRE_CONSOLIDATION_CANONICAL
        canonical_state = "pre-consolidation (generate-career-analysis/shared/libraries/)"
    else:
        print("ERROR: no canonical library directory found at either:")
        print(f"  {CANONICAL}")
        print(f"  {PRE_CONSOLIDATION_CANONICAL}")
        return 1

    print(f"Canonical dir: {canonical_dir.relative_to(REPO_ROOT)} [{canonical_state}]")

    # Parse the three core libraries
    try:
        role_lib = parse_ts_library(canonical_dir / "00_role_library.ts")
        skill_lib = parse_ts_library(canonical_dir / "01_skill_library.ts")
        mapping = parse_ts_library(canonical_dir / "04_role_skill_mapping.ts")
    except Exception as e:
        print(f"ERROR: failed to parse library file: {e}")
        return 1

    # Validate
    role_ids, role_families, seniority_levels = validate_role_library(role_lib, report)
    skill_ids, observed_categories = validate_skill_library(skill_lib, report, role_ids)
    validate_role_skill_xrefs(role_lib, role_ids, skill_ids, report)
    validate_mapping(mapping, role_ids, skill_ids, report)
    validate_cross_copy_consistency(canonical_dir, report)

    # Emit schemas.json (the downstream contract)
    schemas = {
        "version": role_lib.get("version", "unknown"),
        "library_last_updated": role_lib.get("last_updated"),
        "generated_at": dt.datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "canonical_dir": str(canonical_dir.relative_to(REPO_ROOT)),
        "enums": {
            "role_families": role_families,
            "seniority_levels": seniority_levels,
            "skill_categories": observed_categories,
        },
        "id_sets": {
            "role_ids": sorted(role_ids),
            "skill_ids": sorted(skill_ids),
        },
        "role_schema": {
            "required_fields": ROLE_REQUIRED,
            "optional_known_fields": ROLE_OPTIONAL_KNOWN,
            "enum_fields": {
                "role_family": "role_families",
                "seniority": "seniority_levels",
            },
            "id_ref_fields": {
                "required_skills": "skill_ids",
                "preferred_skills": "skill_ids",
                "next_roles": "role_ids",
            },
        },
        "skill_schema": {
            "required_fields": SKILL_REQUIRED,
            "optional_known_fields": SKILL_OPTIONAL_KNOWN,
            "enum_fields": {
                "category": "skill_categories",
            },
            "id_ref_fields": {
                "related_skills": "skill_ids",
                "common_roles": "role_ids",  # special value 'all' allowed
            },
        },
        "mapping_schema": {
            "required_fields": MAPPING_REQUIRED,
            "optional_known_fields": MAPPING_OPTIONAL_KNOWN,
            "id_ref_fields": {
                "role_id": "role_ids",
                "core_skills": "skill_ids",
                "secondary_skills": "skill_ids",
                "differentiator_skills": "skill_ids",
            },
        },
        "counts": {
            "roles": len(role_ids),
            "skills": len(skill_ids),
            "mappings": len(mapping.get("role_skill_mapping", [])),
        },
    }

    SKILL_DIR.mkdir(parents=True, exist_ok=True)
    (SKILL_DIR / "schemas.json").write_text(json.dumps(schemas, indent=2, sort_keys=False) + "\n")

    error_report = {
        "generated_at": schemas["generated_at"],
        "canonical_dir": str(canonical_dir.relative_to(REPO_ROOT)),
        "summary": {
            "errors": len(report.errors),
            "warnings": len(report.warnings),
        },
        "errors": report.errors,
        "warnings": report.warnings,
    }
    (SKILL_DIR / "errors.json").write_text(json.dumps(error_report, indent=2, sort_keys=False) + "\n")

    # Console output
    print(f"\nCounts: {schemas['counts']['roles']} roles / {schemas['counts']['skills']} skills / {schemas['counts']['mappings']} mappings")
    print(f"Enums: {len(role_families)} role_families / {len(seniority_levels)} seniority_levels / {len(observed_categories)} skill_categories\n")

    if report.errors:
        print(f"ERRORS ({len(report.errors)}):")
        for e in report.errors[:50]:
            print(f"  [{e['check']}] {e['message']}")
        if len(report.errors) > 50:
            print(f"  …and {len(report.errors) - 50} more (see errors.json)")
        print()

    if report.warnings:
        print(f"WARNINGS ({len(report.warnings)}):")
        for w in report.warnings[:30]:
            print(f"  [{w['check']}] {w['message']}")
        if len(report.warnings) > 30:
            print(f"  …and {len(report.warnings) - 30} more (see errors.json)")
        print()

    if not report.errors and not report.warnings:
        print("All checks passed.")

    # Exit code
    if args.report_only:
        return 0
    has_failures = bool(report.errors) or (args.strict and bool(report.warnings))
    return 1 if has_failures else 0


if __name__ == "__main__":
    sys.exit(main())
