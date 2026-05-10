#!/usr/bin/env bash
# block-dangerous.sh — block dangerous bash commands via PreToolUse hook.
# Exit 2 = deny the action and show stderr message to Claude.
# Receives Claude Code's hook JSON on stdin.

set -euo pipefail

input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // empty')

[ -z "$cmd" ] && exit 0

# Normalize for case-insensitive SQL matching.
cmd_upper=$(echo "$cmd" | tr '[:lower:]' '[:upper:]')

# rm -rf in any flag order (rm -rf, rm -fr, rm --recursive --force, etc).
if [[ "$cmd" =~ rm[[:space:]]+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|--recursive[[:space:]]+--force|--force[[:space:]]+--recursive) ]]; then
  echo "BLOCKED: 'rm -rf' is destructive and irreversible. Confirm with Eli — and prefer specifying the exact path or using 'rm -i' for interactive deletion." >&2
  exit 2
fi

# Destructive SQL.
if [[ "$cmd_upper" =~ DROP[[:space:]]+TABLE ]] || \
   [[ "$cmd_upper" =~ DROP[[:space:]]+DATABASE ]] || \
   [[ "$cmd_upper" =~ TRUNCATE ]]; then
  echo "BLOCKED: destructive SQL (DROP TABLE / DROP DATABASE / TRUNCATE) detected. These are irreversible against the live DB. Confirm with Eli — and prefer a migration file in supabase/migrations/ for any schema change." >&2
  exit 2
fi

# git push --force or -f.
if [[ "$cmd" =~ git[[:space:]]+push.*(--force|[[:space:]]-f([[:space:]]|$)) ]]; then
  echo "BLOCKED: 'git push --force' overwrites remote history. Confirm with Eli before force-pushing — and never to main." >&2
  exit 2
fi

# --no-verify bypasses pre-commit hooks.
if [[ "$cmd" =~ --no-verify ]]; then
  echo "BLOCKED: '--no-verify' bypasses pre-commit hooks. If a hook is failing, fix the underlying issue rather than skipping it." >&2
  exit 2
fi

# supabase db reset without --local wipes production.
if [[ "$cmd" =~ supabase[[:space:]]+db[[:space:]]+reset ]] && [[ ! "$cmd" =~ --local ]]; then
  echo "BLOCKED: 'supabase db reset' without '--local' wipes the live database. Use '--local' for local resets, or never run this against production." >&2
  exit 2
fi

exit 0
