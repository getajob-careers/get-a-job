#!/usr/bin/env bash
# protect-files.sh — block edits to protected files via PreToolUse hook.
# Exit 2 = deny the action and show stderr message to Claude.
# Receives Claude Code's hook JSON on stdin.

set -euo pipefail

input=$(cat)
file=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# No file path (shouldn't happen for Edit|Write|MultiEdit) — let it through.
[ -z "$file" ] && exit 0

# Migrations are append-only — never edit an existing migration file.
if [[ "$file" == *"/supabase/migrations/"* ]]; then
  echo "BLOCKED: $file is in supabase/migrations/. Migrations are append-only — create a new dated migration file (YYYYMMDD_<slug>.sql) instead of editing an existing one." >&2
  exit 2
fi

# Voice rules — source of truth across every generation surface.
if [[ "$file" == *"/supabase/functions/_shared/voice-rules.ts" ]]; then
  echo "BLOCKED: $file is the source-of-truth for CV/LinkedIn/Posts/Comments/Outreach voice rules. Confirm with Eli before editing — changes affect every generation surface." >&2
  exit 2
fi

# Domain libraries — per CLAUDE.md, edits require cross-review by the other dev.
# Match both _shared/libraries/ and per-function shared/libraries/ patterns.
if [[ "$file" == *"/supabase/functions/_shared/libraries/"* ]] || \
   [[ "$file" == *"/supabase/functions/"*"/shared/libraries/"* ]]; then
  echo "BLOCKED: $file is a domain library (role/skill/proof-signal). Per CLAUDE.md, edits here require cross-review by the other dev. Confirm before proceeding." >&2
  exit 2
fi

# Env files — never auto-edit, never commit.
basename_file=$(basename "$file")
if [[ "$basename_file" =~ ^\.env($|\..+) ]]; then
  echo "BLOCKED: $file is an env file. Edit manually in your editor — never via Claude — and never commit." >&2
  exit 2
fi

# package-lock.json — managed by npm.
if [[ "$basename_file" == "package-lock.json" ]]; then
  echo "BLOCKED: package-lock.json is managed by npm. Use 'npm install <pkg>' to change dependencies." >&2
  exit 2
fi

exit 0
