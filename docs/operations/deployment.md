---
title: Deployment
status: living
owner: shared
last_reviewed: 2026-06-24
code_paths:
  - vercel.json
  - supabase/functions
  - supabase/migrations
  - .github/workflows
---

# Deployment

How each part of the system ships. There are three independent surfaces — the frontend, the edge functions, and the database — and they deploy in different ways.

## Frontend (the web app)

The React app deploys to **Vercel**, automatically, when changes land on `main`. A merge triggers a build and deploy; there's nothing to run by hand.

- A deploy takes a few minutes — if you merge and immediately check the live site, you may be looking at the old build. Hard-refresh after the deploy completes.
- The build must be green (`npm run build`) — CI enforces this before merge.

## Edge functions (the AI layer)

Edge functions deploy **individually and manually** to Supabase:

```bash
supabase functions deploy <name> --project-ref ilmqmodklutztuybsvwd
```

Important: edge functions are **not validated by the frontend build or the tests.** Deno's bundler is stricter — most notably, an unescaped backtick inside a prompt's template string passes lint, typecheck, build, and tests but fails the deploy. Always deploy and confirm an edge-function change actually went out; consider a local `deno check` first. See [AI & edge functions](../engineering/ai-and-edge-functions.md).

## Database (schema & migrations)

Schema changes live as SQL migration files in `supabase/migrations/`, each with a docstring explaining its intent, RLS policies, and indexes. They're applied to the Supabase project. Treat migrations as forward-only and reviewed — the database is shared and live.

## Background jobs

Some work runs on a schedule via GitHub Actions (`.github/workflows/`) — most importantly the **nightly job refresh** that rebuilds the live-jobs database from company career systems, and a nightly pre-compute for the daily action. These are cron-driven and visible in the Actions tab.

## A safe-deploy checklist

1. `npm run lint && npm run typecheck && npm run build && npm test` — all green.
2. Merge to `main` → frontend auto-deploys.
3. If you changed an edge function, deploy it explicitly and confirm.
4. If you changed schema, apply the migration.
5. Verify on the live site (hard-refresh) — the [runbooks](runbooks.md) cover what to check when something looks off.
