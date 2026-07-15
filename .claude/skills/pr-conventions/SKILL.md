---
name: pr-conventions
description: Follow getajob's PR and git discipline. Use whenever committing, opening a PR, merging, or touching a protected/registry file - held-for-review by default, squash-merge then delete branch as separate steps, no em dashes, initial-load browser test for state-lifecycle frontend changes.
---

# pr-conventions

getajob's git, PR, and merge discipline. Follow it for any change that lands in the repo.

## Branch and land

- **Never push to `main`.** Work on `eli/<topic>` (or `isaac/<topic>` / `feature/<topic>`); open a PR against `main`.
- **Hold PRs for Eli's review by default** (open as draft or with a `[HOLD]` title). Do not self-merge feature work unless Eli explicitly approved it.
- **Merge = three separate steps, in order:** (1) `gh pr merge <n> --squash`; (2) confirm merged (`gh pr view <n> --json state,mergeCommit`); (3) delete the branch. Squash-merge keeps `main` linear; delete the branch on origin, then the local copy.
- On approval, always confirm the merge commit is actually on `origin/main` before reporting done.

## Hook gotchas (these block the whole Bash call, so nothing in it runs)

- **`block-main-push`** trips on any command containing both `push` and `main` - even a harmless `git fetch origin main` or `git checkout origin/main` in the SAME command as a branch delete. **Split them:** run the branch delete alone (no `main` token), then the fetch/checkout separately.
- **`block-dangerous`** blocks `rm -rf` and `git push --force*`. Do not force-push (add a new commit instead; squash-merge collapses it). For cleanup use explicit paths / `rm -f <file>`, not `rm -rf`.
- **`protect-files`** blocks the Edit/Write tools on `supabase/functions/_shared/libraries/*`, `voice-rules.ts`, migrations, `.env*`, and `package-lock.json`.

## Protected / registry files

- `supabase/functions/_shared/libraries/*` (e.g. `companies_il.json`, `00_role_library.ts`) are hook-protected. **Schema/structural** changes need cross-review by the other dev. **Data-row** changes (registry entries, tokens, tags) may merge on Eli's review alone WITH live-validation evidence and a clean `schema-validator` run (amended 2026-06-12).
- Because the Edit tool is blocked there, apply an authorized data-row change via a scripted write (node text-surgery, formatting preserved for a minimal diff), and **disclose the authorized protect-files bypass in the PR body.** Only after Eli's explicit go for that change.
- Never auto-mutate a canonical source-of-truth file without that authorization.

## Every-PR checks

- **Three-dot diff scope:** confirm `git diff --stat origin/main...HEAD` contains only the files the task intended (e.g. "json + ledger only"). Stage exactly those; keep pre-existing dirty files (`.claude/settings.local.json`, tool artifacts) out.
- **No em dashes** in any repo artifact (docs, PR bodies, code comments). Use hyphens. Grep your additions before committing.
- **Gates green** before holding: whatever the task needs - `npm run build`, `npm test`, `schema-validator`, the edge-function bundle + `deno check` CI, staleness checks.
- **Gates green means CI green on the PR, not local runs.** Local `npm test`/`npm run build` passing is necessary but not sufficient - CI runs steps a local pass never sees (mirror staleness checks before `npm ci`, edge-fn bundle/`deno check`) and can die before it reaches the tests. Always confirm the PR's actual CI conclusion. Lesson: `main` CI was dead from #582 to #588 (Jul 14-15), failing fast at the mirror staleness gate, while every merge's local gates were green.
- End commit messages with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## The #546 lesson (state-lifecycle frontend changes)

If a change touches which-effect-writes-what-when (effects that seed or reset component state on an id/param change), **drive the real page on initial/cold load in a browser before merge**, not just unit tests. #546 passed unit tests and typecheck but hard-broke /CVAgent on cold load with a warm react-query cache, silently. Use the `run` / webapp-testing path to load the affected page first.

## Precedence

Eli's explicit prompt > CLAUDE.md > this skill. This skill fills in the how when neither has spoken; a direct instruction always wins.
