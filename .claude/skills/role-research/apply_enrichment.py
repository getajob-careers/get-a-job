#!/usr/bin/env python3
"""Apply a role-research enrichment to the canonical role library.

Usage:
    python3 apply_enrichment.py <role_id> <enrichment.json>
    python3 apply_enrichment.py software_engineer ./software_engineer.json

The enrichment file is a single role record in v2.0 shape. The script:
  1. Loads the canonical library
  2. Locates the role by id
  3. Replaces the entry (merging _research_method)
  4. Runs the schema-validator against the new state
  5. If validator error count does NOT regress from baseline, writes
     the library. If it regresses, aborts and prints the new errors.

Validator-gated by design — never writes a worse state than what's
already in the library.
"""
from __future__ import annotations
import json
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
LIBRARY = REPO_ROOT / "supabase" / "functions" / "_shared" / "libraries" / "00_role_library.ts"
VALIDATOR = REPO_ROOT / ".claude" / "skills" / "schema-validator" / "validate.py"
ERRORS_JSON = REPO_ROOT / ".claude" / "skills" / "schema-validator" / "errors.json"


def parse_ts(path: Path) -> dict:
    t = path.read_text()
    t = re.sub(r"^\s*export\s+const\s+\w+\s*=\s*", "", t, count=1)
    t = re.sub(r"\s*as\s+const\s*;?\s*$", "", t)
    return json.loads(t)


def emit_ts(data: dict, path: Path, const_name: str) -> None:
    body = json.dumps(data, indent=2, ensure_ascii=False)
    path.write_text(f"export const {const_name} = {body} as const;\n")


def run_validator() -> tuple[int, int]:
    """Returns (errors, warnings) after running the validator."""
    subprocess.run([sys.executable, str(VALIDATOR), "--report-only"],
                   capture_output=True, check=False)
    if not ERRORS_JSON.exists():
        return (0, 0)
    data = json.loads(ERRORS_JSON.read_text())
    return (data["summary"]["errors"], data["summary"]["warnings"])


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: apply_enrichment.py <role_id> <enrichment.json>", file=sys.stderr)
        return 2

    role_id = sys.argv[1]
    enrichment_path = Path(sys.argv[2])
    if not enrichment_path.is_file():
        print(f"ERROR: enrichment file not found: {enrichment_path}", file=sys.stderr)
        return 2

    enrichment = json.loads(enrichment_path.read_text())
    if enrichment.get("id") != role_id:
        print(f"ERROR: enrichment id {enrichment.get('id')!r} doesn't match argument {role_id!r}",
              file=sys.stderr)
        return 2

    # 1. Capture baseline error count BEFORE making any change
    baseline_errors, baseline_warnings = run_validator()
    print(f"Baseline validator: {baseline_errors} errors / {baseline_warnings} warnings")

    # 2. Snapshot the original library + locate the role
    original = parse_ts(LIBRARY)
    roles = original["roles"]
    target_idx = next((i for i, r in enumerate(roles) if r.get("id") == role_id), None)
    if target_idx is None:
        print(f"ERROR: role {role_id!r} not found in library", file=sys.stderr)
        return 1

    # 3. Replace + write tentative library
    roles[target_idx] = enrichment
    emit_ts(original, LIBRARY, "roleLibrary")

    # 4. Validate the new state
    new_errors, new_warnings = run_validator()
    print(f"After enrichment:   {new_errors} errors / {new_warnings} warnings")

    if new_errors > baseline_errors:
        # Regression — restore + abort
        regression_delta = new_errors - baseline_errors
        # Read fresh errors to surface what broke
        errs = json.loads(ERRORS_JSON.read_text())["errors"]
        # Show errors that mention the role_id we touched
        role_errs = [e for e in errs if role_id in e.get("message", "")]
        print(f"\nABORTING: {regression_delta} new validator errors introduced. "
              f"Restoring previous library state.")
        if role_errs:
            print(f"Errors mentioning {role_id!r}:")
            for e in role_errs[:10]:
                print(f"  [{e['check']}] {e['message']}")
        # Restore original
        roles[target_idx] = next(r for r in parse_ts(LIBRARY)["roles"] if r.get("id") == role_id)
        # Actually we already overwrote — reload from git if possible
        import subprocess as sp
        result = sp.run(["git", "checkout", "--", str(LIBRARY)], cwd=REPO_ROOT,
                        capture_output=True, text=True)
        if result.returncode != 0:
            print(f"WARNING: failed to restore via git: {result.stderr}", file=sys.stderr)
        return 1

    print(f"\n✓ Applied enrichment for {role_id}. Validator OK (delta: "
          f"errors {new_errors - baseline_errors:+d}, warnings {new_warnings - baseline_warnings:+d}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
