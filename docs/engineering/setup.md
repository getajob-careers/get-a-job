---
title: Setup
status: living
owner: shared
last_reviewed: 2026-06-24
code_paths:
  - package.json
  - README.md
  - vite.config.js
---

# Setup

Get the app running locally.

## Prerequisites

- **Node.js** (v22 is what the team runs).
- A `.env.local` file with the Supabase keys (ask Eli or Isaac — it's gitignored and never committed).

## Install and run

```bash
npm install
npm run dev          # Vite dev server (default http://localhost:5173)
```

The first dev start after a dependency change is slow — Vite re-optimizes its bundle once; it's fast afterward.

## The scripts you'll use

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint (CI runs this — keep it clean) |
| `npm run typecheck` | TypeScript type-checking (JS with checkJs) |
| `npm test` | Vitest (unit + integration) |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run docs:check` | Flag documentation that's gone stale (see [the docs guide](../meta/documentation-guide.md)) |

CI runs lint, typecheck, build, and tests on every PR. Run them locally before pushing — `npm run lint && npm run typecheck && npm run build && npm test` matches CI.

## Environment

The frontend needs two values in `.env.local`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Optional: `VITE_LOGODEV_TOKEN` (a free logo.dev key) upgrades company-logo quality on job cards; the app works fine without it.

Secrets used by AI features (the language-model keys, etc.) live in Supabase, not in the frontend — see [AI & edge functions](ai-and-edge-functions.md).

## A note on the captcha

Sign-in is protected by a Cloudflare Turnstile captcha. If local sign-in fails with a captcha error, `localhost` may need to be added to the Turnstile widget's allowed hostnames in Cloudflare. For reviewing UI without logging in, the app has DEV-only preview routes under `/_preview/*` that render pages with fixture data.

## Where to go next

- [Architecture](architecture.md) — how the pieces connect.
- [Frontend](frontend.md) — pages, components, data-fetching patterns.
- [The team workflow](../team/workflow.md) — branches, PRs, reviews.
