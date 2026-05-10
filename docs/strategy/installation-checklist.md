# Get A Job — Installation & Implementation Checklist

**Generated:** 2026-05-08
**Source:** Full strategy session + deep research survey
**Purpose:** Single prioritized list of everything to install, wire, or set up before and after launch

---

## THIS WEEK (May 8-15) — Foundation

### Infrastructure (do first, highest leverage)

- [ ] **Wire Helicone as OpenAI base URL** — change base_url to https://oai.helicone.ai/v1 + add Helicone-Auth header across all 15 edge functions. Gives you instant cost tracking, latency monitoring, and 20-30% savings from prompt caching. Free 100k req/mo. ONE LINE CHANGE per function.

- [ ] **Wire Resend SMTP into Supabase Auth** — replaces Supabase's 2-emails-per-hour default. Without this, magic links WILL fail on launch day when 80 people sign up. Free 3k emails/mo.

- [ ] **Apply to Coursera Affiliate via Impact** — takes 3-7 days for approval. Apply now so it's ready when you need it. Free to join, 15-45% commission.

### MCP Servers (install in Claude Code)

- [x] **Context7 MCP** — fetches latest docs for React, Tailwind, shadcn/ui, Supabase, Deno. Reduces hallucinated APIs. Free. _(installed 2026-05-10, user scope, HTTP transport)_
- [ ] **Supabase MCP** — add to Claude Code for direct DB access during coding sessions.
- [ ] **GitHub MCP** — PR creation, issue search, repo management. Use read-only mode initially.
- [ ] **Vercel MCP** — install when you set up Vercel (next week).
- [ ] **PostHog MCP** — install after PostHog Cloud setup.
- [ ] **Sentry MCP** — install after Sentry setup.
- [ ] **Playwright MCP** — install before Week 6 design/QA work.

### Claude Code Skills

- [x] **obra/superpowers** — multi-agent dev workflow with TDD, code review, subagent execution. 40k+ stars. Highest-leverage single skill. _(installed 2026-05-10 from `obra/superpowers-marketplace`)_
- [x] **Anthropic official skills** — frontend-design, docx, pdf, webapp-testing, skill-creator, claude-api. _(installed 2026-05-10 — `document-skills` + `example-skills` from `anthropics/skills`)_
- [x] **ui-ux-pro-max-skill** — 50+ styles, 161 color palettes, 57 font pairings, 99 UX guidelines. _(installed 2026-05-10 from `nextlevelbuilder/ui-ux-pro-max-skill`)_
- [x] **Corey Haines marketing skills** — 32 skills including /copywriting, /page-cro, /email-sequence, /seo-audit. Critical for landing page. _(installed 2026-05-10 from `coreyhaines31/marketingskills` — install slug is `marketing-skills`, marketplace alias is `marketingskills`)_

### Claude Code Hooks

- [ ] **PostToolUse: auto-format + lint + typecheck** — Prettier, ESLint, tsc after every file edit.
- [ ] **PreToolUse: protect critical files** — blocks edits to migrations, voice-rules, shared libraries, .env without confirmation.
- [ ] **PreToolUse: block dangerous commands** — blocks rm -rf, DROP TABLE, git push --force, --no-verify.
- [ ] **Use alexanderop/claude-code-builder** — /create-hook generates hooks interactively.

---

## PRE-LAUNCH (May 15 - June 14) — Polish & Monitoring

### Analytics & Monitoring

- [ ] **PostHog Cloud (EU region)** — product analytics, session replay, feature flags, surveys, error tracking. Free 1M events/mo.
- [ ] **PostHog feature flags** — safe rollouts, A/B testing voice rules from edge functions.
- [ ] **PostHog session replay** — watch real pilot users navigate.
- [ ] **PostHog surveys** — NPS at week 4 and week 12.
- [ ] **Sentry (free tier)** — React error boundaries + edge function error tracking with source maps.

### Email & Communication

- [ ] **Loops (lifecycle email)** — 5-email pilot welcome sequence. Free for 1,000 contacts.

### Landing Page & Onboarding

- [ ] **Build landing page at getajob.careers** — use frontend-design + ui-ux-pro-max + marketing skills in Claude Code.
- [ ] **Onborda (React tour library)** — guided first-run flow for upload-to-roadmap. MIT, free.
- [ ] **Privacy policy + Terms + AI disclaimer** — have Noms draft. Consent checkbox at signup.

### Testing

- [ ] **Playwright smoke tests** — critical paths in GitHub Actions on every PR.
- [ ] **Claude in Chrome QA** — already connected. Full onboarding walkthrough.
- [ ] **End-to-end test with realistic Reichman student profile.**

### Design Pass (Week 6)

- [ ] **Collapsible sidebar** — 5 sections, expand-on-click sub-pages.
- [ ] **Home dashboard as mission control** — daily action card, contextual nudges.
- [ ] **Apply display principles** — output over input, cards, inline actions, visible progress.

### Data & APIs

- [ ] **Adzuna API** — free dev tier, 16 countries, salary data.
- [ ] **Lightcast Open Skills** — 33k+ skills taxonomy. Apply for access.
- [ ] **O*NET Web Services API** — free, 923 occupational titles.

### Founder / Legal

- [ ] **Founders' agreement** — Eli 65-70%, Isaac 18%, Sammy 5-8%, option pool 5-10%. 4-year vest, 1-year cliff.
- [ ] **Israeli Ltd. entity** — 3-5K NIS setup.
- [ ] **Supabase Pro plan** — $25/mo for daily backups.
- [ ] **OpenAI Tier 2** — check rate limits at platform.openai.com.

---

## POST-LAUNCH (June 16+) — Optimize & Scale

### Add based on pilot data

- [ ] **Firecrawl MCP** — for Internship Finder company research.
- [ ] **Braintrust** — voice rule regression tests.
- [ ] **Figma MCP** — if you bring a designer.
- [ ] **Canny (free)** — public feature-request board for pilot users.
- [ ] **claude-mem skill** — session memory compression. 74k stars.

### Build internally

- [ ] **Internal skills for each chat agent** — portable, testable prompt engineering.
- [ ] **Internal skills for voice rule systems** — versioned, testable.
- [ ] **Consider open-sourcing STAR capture skill** — zero competition, marketing for getajob.careers.

### Revenue optimization

- [ ] **Udemy + DataCamp affiliate programs.**
- [ ] **Salary intelligence table** — GotFriends + Ethosia + Levels.fyi + Adzuna + user-submitted data.
- [ ] **Israeli job board partnerships** — AllJobs, Drushim, GotFriends at 1,000+ users.

### Architecture at scale

- [ ] **1,000 users:** Add queuing for CV gen and career analysis.
- [ ] **5,000 users:** Re-evaluate PostHog flags vs LaunchDarkly. Re-evaluate CV parser.
- [ ] **10,000 users:** Dedicated serverless + queue management. Consider OpenAI fine-tuning.

---

## SKIPPED (and why)

| Tool | Why |
|------|-----|
| LaunchDarkly | PostHog flags sufficient |
| LangSmith | Only for LangChain users |
| Crunchbase Pro | Use Wikipedia + Firecrawl + GPT-4o |
| ZoomInfo | $15k+/yr, way too expensive |
| Datadog / New Relic | PostHog + Sentry covers it |
| Ghostty | Current terminal works fine |
| Stop-Slop skill | Our voice rules are better |
| Remotion | No video generation need |
| OpenClaw | Already on Claude Code |
| Task Manager AI MCP | ROADMAP.md is the source of truth |
| Managed Agents | $0.08/hr, vendor lock-in, overkill at 80 users |
| Webflow / Framer | Claude Code builds the landing page faster |
| Userpilot / Appcues | Onborda is free |
| Customer.io | Loops free tier covers 80 users |
| Affinda | GPT-4o-mini parser is $5/mo at pilot |
| Tavily | Firecrawl covers the use cases |
| Memory MCP | CLAUDE.md + auto-memory is sufficient |
