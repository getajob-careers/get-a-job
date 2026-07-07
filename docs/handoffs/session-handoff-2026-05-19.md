# Session Handoff — May 19, 2026

**Previous session ended:** May 19, 2026 (evening)
**Next session should:** Read this file first, then DOCUMENTATION.md for the doc update protocol.

---

## How to work (unchanged — see PROJECT_INSTRUCTIONS.md)

- **Ask-don't-tell with Claude Code.** Frame prompts as questions. Claude Code shows design/decisions before building; Eli confirms.
- **Eli wants plain-language explanations** before approving. Real fixes, not workarounds. Product-ready quality.
- **Code blocks = prompts for Claude Code.** Eli copy-pastes them. Regular text = conversation with Eli.
- **Claude Code does all building/execution.** This Claude (claude.ai) advises strategy, reviews, writes prompts.
- **Surface decisions for confirmation** — don't lock in architecture unilaterally.
- Supabase project ref: `ilmqmodklutztuybsvwd`
- Git remote: `https://github.com/getajob-careers/get-a-job.git`
- Deploy: edge functions via Supabase CLI; frontend auto-deploys via Vercel on push to main.
- **Edge functions don't auto-deploy on merge** — run `supabase functions deploy <slug>` after every backend PR.
- Full-CI-before-push: `npm run lint && npm run typecheck && npm run build`

---

## COMPLETED THIS SESSION (May 19 — full day)

### Morning session (PRs #60-61 — the big ones)

**PR #60 (D2) — Qualification logic fix**
- `inferQualificationLevel` now filters to `full_time` + `freelance` only. Internship-only → Junior.
- No-roles empty-state branches by qualification level.
- Edge function deployed: `generate-career-analysis`

**PR #61 (D3) — Skill propagation fix (THE session-defining PR)**
- Root cause: 97% of user skills were invisible to the scorer. "Excel" → "excel" didn't match "excel_advanced_finance".
- Built two-layer fix:
  - Layer 1: 170-entry alias map in `_shared/skill-aliases.ts` (deterministic, covers all preset chips)
  - Layer 2: LLM semantic credits — GPT-4o proposes additional skill IDs, server validates against library
- Dry-run results: 19% → 77% match rate (Layer 1 alone). Layer 2 catches remainder.
- Edge function deployed: `generate-career-analysis`

### Afternoon session (PRs #62-69 — bugs + features)

**PR #62 (D4) — Honors/Awards autocomplete**
- Was showing programming skills in honors field. Now shows Dean's List, Cum Laude, Heseg Scholarship, etc.
- Coursework + projects fields switched to free text (no misleading suggestions).

**PR #63 — Tutorial FinalisingPanel overlap**
- Two cards were rendering simultaneously on final onboarding step. Dropped redundant FinalisingPanel. -17 lines.

**PR #64 — Employment status XOR rule**
- Have a job + Unemployed now mutually exclusive. Student + Freelancing can stack with anything.

**PR #65 — Tutorial slide-1 grid → bullets**
- Replaced 2x2 quadrant grid with text bullets. Grid kept in Career Roadmap for future redesign.

**PR #66 (PR-C) — Settings page + account deletion**
- New /Settings page: Account (password change), Onboarding (reset), Danger zone (full delete)
- Avatar icon in sidebar footer → /Settings (no nav entry)
- PasswordCard moved from AddInformation → Settings
- Reset Onboarding moved from Home → Settings
- Account deletion: type "delete my account" (case-insensitive) → edge function → storage cleanup → auth.admin.deleteUser → CASCADEs across 20 FK tables
- `account_deletions` audit table (email + timestamp)
- Edge function deployed: `delete-account`

**PR #67 — Settings routing fix**
- pages.config.js registration + avatar link wiring

**PR #68 — Case-insensitive delete confirmation**

**PR #69 (PR-B) — Practicum bundle**
- Drag-and-drop kanban via @hello-pangea/dnd (6 columns, optimistic updates)
- "Add my own company" modal (name, domain, industry, notes → companies + company_targets)
- Unified faculty-assigned + self-sourced into one page with source badges
- Outreach Coach link from drawer → /LinkedinOptimizer?tab=networking&prefillCompany=X&prefillRole=Y
- OutreachComposer reads prefill params, pre-fills target (still gates on goal selection)

**PR #70 — CLAUDE.md corrections**
- 183 roles / 387 skills / 16 library files (was stale: 170/180/13)
- refresh-jobs.yml header updated: 831 registry / ~440 ATS-supported
- JSearch references cleaned up

### Documentation + coordination (non-PR work)

- **Google Drive** folder created: Get A Job/ with Product, Tasks, Launch, Analytics, Meeting Notes subfolders
- **Notion hub** created: https://www.notion.so/3658298b80cf811d8adfe28be1afc455
  - Product Overview page
  - Architecture Overview (full, verified against codebase — 29 tables, 18 functions, 387 skills, 183 roles, 170 aliases, ~3k jobs, 17 PostHog events)
  - Analytics & Dashboard Links
  - Task Board database (20 tasks, 3 views: table, board by status, board by owner)
  - QA Tracker database (9 bugs, board by status view)
- **Architecture doc audit** — Claude Code verified every claim. 6 corrections applied.
- **DOCUMENTATION.md** created — doc update protocol for Claude Code sessions (triggers, verification commands, format). Ready to add to repo.

---

## CURRENT STATE OF THE PLATFORM

### Verified numbers (audited May 19)
- **18** edge functions
- **29** tables, all RLS-enabled
- **183** roles in role library
- **387** skills in skill library
- **170** entries in skill alias map
- **831** companies in registry
- **~3,000** jobs (refreshed nightly)
- **17** PostHog events
- **22** FKs from auth.users (20 CASCADE, 2 SET NULL)

### Edge functions deployed today
- `generate-career-analysis` (D2 + D3 changes)
- `delete-account` (new, PR-C)

---

## WHAT'S LEFT BEFORE LAUNCH

### Launch blockers (can't launch without)
| Task | Owner | Status |
|------|-------|--------|
| Landing page | Isaac | Check progress |
| Stripe + paywall | Isaac | Check progress |
| Pilot token gate + 100-user cap | Isaac | Check progress |
| Waitlist email capture | Isaac | Check progress |
| Welcome email | Isaac | Check progress |
| Privacy policy + ToS pages | Eli | Blocked on Noms |

### Should ship (deferred to design pass)
| Task | Owner | Notes |
|------|-------|-------|
| Sidebar redesign | Eli | 5 groups, collapsible. Design approved. |
| Mobile responsive check | Eli | Students open WhatsApp on phone |
| LinkedIn banner color | Eli | Amber → softer tone |
| Tracker styling | Eli | Blocked on Isaac's screenshots |
| Career Direction description | Eli | "Aspiration vector" is jargon |
| Merge Job Suggestions into Tracker | Eli | "Discover" tab |

### Bugs still open
| Bug | Status |
|-----|--------|
| Tracker styling rough | Blocked — waiting on Isaac's screenshots |
| LinkedIn banner amber color | Deferred to design pass |

### Nice to have
- Career Roadmap visualization redesign (scatter plot)
- Practicum company preference filters (sector/stage)
- Story Bank → Career Agent + LinkedIn evidence injection
- Weekly reflection space on Home
- Onborda first-run tour
- Job Suggestions generation speed

---

## TEAM STATUS

- **Isaac** — owns landing page, Stripe, pilot gate, waitlist, welcome email. Check his progress.
- **Yishai** — QA testing. Eli told him to wait for comprehensive checklist after bugs fixed. Bugs are now fixed (5/6). Send checklist.
- **Noms** — privacy policy draft. Eli waiting on delivery.
- **Notion hub** shared with team. Task Board + QA Tracker are the coordination tools.

---

## IMPORTANT CONTEXT FOR NEXT AGENT

- **Supabase project ref:** `ilmqmodklutztuybsvwd`
- **Supabase token:** `/tmp/.gaj_supabase_token` (may need refresh — `supabase login` from terminal)
- **Git remote:** `https://github.com/getajob-careers/get-a-job.git`
- **PostHog:** EU Cloud, project "Get A Job", key in Vercel env vars
- **OpenAI:** Eli's personal account, key in Supabase secrets
- **Edge function deploy:** manual via `supabase functions deploy <slug>` after every backend PR merge
- **Notion hub:** https://www.notion.so/3658298b80cf811d8adfe28be1afc455 (Eli updates via Claude.ai)
- **DOCUMENTATION.md:** doc update protocol — read at session start, flag updates at session end
- **Eli's working style:** plain language, real fixes, product-ready quality, ask-don't-tell, don't suggest breaks
- **Test accounts:** `elienglard34@gmail.com` (main, admin) + `+test` aliases. Isaac: `isaacseligcoding@gmail.com`
- **Today's PR sequence:** #60 (D2), #61 (D3), #62 (D4), #63-65 (bugs), #66 (PR-C settings), #67-68 (fixes), #69 (PR-B practicum), #70 (CLAUDE.md corrections)

---

## RECOMMENDED FIRST ACTIONS NEXT SESSION

1. **Add DOCUMENTATION.md to repo** as a PR (file ready at /mnt/user-data/outputs/DOCUMENTATION.md)
2. **Check Isaac's progress** on Stripe, landing page, pilot gate
3. **Send Yishai testing checklist** — bugs are fixed, platform is ready for QA
4. **Check Noms** on privacy policy
5. **Start sidebar redesign** if time allows (biggest remaining UX item)
6. **At session end:** follow DOCUMENTATION.md protocol — flag what changed, verify counts, ask Eli to update Notion
