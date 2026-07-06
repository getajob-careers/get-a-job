# Session Handoff — May 11-12, 2026

**Previous session ended:** May 12, 2026
**Next session should:** Read PROJECT_INSTRUCTIONS.md first (updated through PR #48), then this file for context on what just happened.

---

## What was accomplished this session

### Infrastructure installed
- **Claude Code skills:** obra/superpowers, Anthropic official (document-skills + example-skills), ui-ux-pro-max-skill (nextlevelbuilder), Corey Haines marketing-skills — all user scope
- **Context7 MCP:** user scope, HTTP transport, https://mcp.context7.com/mcp — provides live docs for React, Tailwind, shadcn/ui, Supabase, Deno
- **Claude Code hooks:** .claude/settings.json with PostToolUse (Prettier + ESLint auto-run on every edit) and PreToolUse (file protection for migrations/voice-rules/libraries/.env + dangerous command blocking for rm -rf/DROP TABLE/force-push)
- **Langfuse observability:** wired into all 13 OpenAI-calling edge functions via _shared/openai-chat.ts. Fire-and-forget via EdgeRuntime.waitUntil, pure pass-through (if Langfuse fails, OpenAI calls still work). Env vars: LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_BASE_URL in Supabase edge function secrets. Langfuse project: "Get a Job v1", EU region, cloud.langfuse.com. Note: traces have ~10 min display delay in Langfuse dashboard despite v4 ingestion header.
- **Vercel:** deployed from getajob-careers/get-a-job (GitHub org), auto-deploys on push to main. Domain getajob.careers live (Cloudflare DNS). vercel.json SPA rewrite in place. Env vars: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.
- **GitHub org:** getajob-careers created. Repo transferred from isaac613/get-a-job. Both Eli and Isaac are members. Repo is public (free Vercel Hobby plan requirement).
- **Supabase Auth:** URL Configuration updated — Site URL and Redirect URLs include https://getajob.careers and https://www.getajob.careers
- **Resend:** account created, NOT yet wired (waiting for domain DNS verification — can do now that getajob.careers is live on Cloudflare)

### Features shipped (PRs merged to main)
- **PR #41:** Langfuse helper + extract-story-from-text canary
- **PR #42:** Langfuse batch 2a — 5 low-risk functions
- **PR #43:** Langfuse batch 2b — 4 LinkedIn functions
- **PR #44:** Langfuse batch 2c — 3 complex functions (career analysis, tailored CV with sessionId, ai-chat)
- **PR #45:** Daily Action Card — schema (daily_actions table with 8 action types, RLS, indexes, calibration partial index) + generate-daily-action edge function (rule-based ranking + gpt-4o-mini framing, lazy generation on Home load, dismissal backoff calibration)
- **PR #46:** Admin chat log viewer + story browser — 3 RPCs (admin_list_students, admin_chat_messages, admin_stories_browse) + 2 new cards on /admin page
- **PR #47:** vercel.json SPA rewrite fix
- **PR #48:** PROJECT_INSTRUCTIONS.md catch-up through PR #47

### Docs created
- docs/strategy/installation-checklist.md — prioritized tool/MCP/skill/API installation roadmap
- docs/strategy/design-strategy.md — UX principles, sidebar architecture, display philosophy

### Key decisions made
- **Langfuse over Helicone** — Helicone was acquired by Mintlify and signups are disabled. Langfuse is the replacement (open source, EU cloud, free tier 50k observations/month)
- **Raw HTTP to Langfuse ingestion** — not the SDK. The v4 SDK is OTel-based and doesn't work cleanly in Supabase Edge Runtime (Deno). Raw HTTP is zero-dep and the pass-through safety is trivial.
- **Daily Action Card: rule-based ranking + LLM framing** (not LLM ranking). Deterministic, auditable, cheap ($0.0002/call). pick_score column saved for calibration diagnostics.
- **Daily Action Card: lazy generation** on Home load (not pg_cron). Zero cron infra, simple, naturally rate-limited.
- **Reflect action type** kicks off Story Bank capture flow — the reflection IS the story.
- **Sidebar redesign planned:** 5 top-level sections (Home, Career, Applications, LinkedIn, Chat) with expand-on-click sub-pages. Not built yet — scheduled for Week 6 design pass.
- **Landing page concept chosen:** "Anti-ChatGPT" angle with compound effect timeline. Dark mode, new-age design. Prototype built (GetAJobLanding.jsx artifact). No competitor mentions on page. Pilot CTA: "Sign up now and use Get A Job completely free — limited spots available."
- **PostHog chosen** over separate Sentry + Google Analytics — all-in-one for analytics, session replay, feature flags, surveys, error tracking. Not yet installed.

---

## What's next (priority order)

### Immediate (can start now)
1. **Wire Resend SMTP** — domain is live on Cloudflare now, verify domain in Resend dashboard, configure as Supabase Auth custom SMTP. Prevents magic link failures on launch day.
2. **Wk 4 features:** LinkedIn import (schema + zip upload + Connections.csv parser), Connection cross-reference, Internship Finder schema + edge function
3. **Isaac's Wk 3 remaining:** Story Bank Phase 2 (Mon), Daily Action Card UI on Home (Wed), calibration loop (Fri)

### This week
4. **Vercel MCP** in Claude Code (now that Vercel is deployed)
5. **GitHub MCP** in Claude Code
6. Upgrade Supabase to Pro plan ($25/mo for backups)
7. Check/upgrade OpenAI to Tier 2 for rate limits

### Pre-launch (Weeks 5-6)
8. PostHog Cloud EU setup + React instrumentation
9. Sentry free tier
10. Loops welcome email sequence
11. Landing page build (prototype exists as artifact)
12. Onborda first-run tour
13. Design pass — collapsible sidebar + Home dashboard + display principles
14. Privacy policy + Terms + AI disclaimer (Noms)
15. Founders' agreement (Eli 65-70%, Isaac 18%, Sammy 5-8%)

---

## Important context for the next agent

- **Supabase project ref:** ilmqmodklutztuybsvwd
- **Supabase token location:** /tmp/.gaj_supabase_token (may need refresh — use `read -s TOKEN && echo "$TOKEN" > /tmp/.gaj_supabase_token && unset TOKEN`)
- **Deploy pattern:** Edge functions deploy via Supabase Management API or MCP. Frontend auto-deploys via Vercel on push to main.
- **Git remote:** origin = https://github.com/getajob-careers/get-a-job.git (changed from isaac613 today)
- **Claude Code hooks are active:** auto-lint on every edit, file protection on migrations/voice-rules/libraries, dangerous command blocking. These are in .claude/settings.json on main.
- **The ask-don't-tell pattern:** Frame prompts to Claude Code as questions, not commands. Show design before building. Surface decisions for confirmation.
- **Full-CI-before-push:** npm run lint && npm run typecheck && npm run build
- **Langfuse dashboard:** cloud.langfuse.com — traces have ~10 min display delay, this is a known Langfuse Cloud issue, not our code
- **Eli's working style:** Wants everything explained in plain language before approving. Wants real fixes, not workarounds. Product-ready, not pilot-ready quality.
