Handoff — End of 2026-05-20 Session
Status: Get A Job is live at getajob.careers. Today closed multiple launch blockers and shipped real bugs.

What shipped today (PRs in order)
#What#75Landing page (full design — Fraunces serif, warm cream palette, 12 sub-components, schema.org, mobile breakpoints, auth-aware, both signed-in and waitlist states)#76Job Suggestions seniority filter — RPC + frontend wire-up across JobSuggestions.jsx + CareerRoadmap.jsx. Filter applies to both tier mode and keyword mode.#77Seniority classification fix in scripts/lib/normalize.ts — title wins for senior+, years refines entry/mid. Backfill ran live on 3,071 cached jobs.#78Docs PR — marked Resend SMTP as already wired (it was; earlier audit was wrong).#79Cloudflare Turnstile CAPTCHA wired into signup form in Login.jsx via @marsidev/react-turnstile.(post-merge)Routing change — / now serves Landing for all visitors, auth-aware. No redirect; logged-in users see "See your dashboard" CTA.
Total PRs merged today: 6. All lint clean, all tests pass (305-348 tests depending on PR).

Production state (verified live)

Supabase Auth: custom SMTP active via smtp.resend.com, sender noreply@getajob.careers, DMARC passing
CAPTCHA: Turnstile enabled in Supabase dashboard, widget mounted in signup form, signup requires captchaToken
Job cache: 3,071 jobs, all reclassified with new seniority logic (PR #77 backfill)
Skill match rate: 77% (was 19% pre-PR #61)
All 29 tables RLS-enabled, anon role gets 0 rows on every query, verified live


What's still blocking WhatsApp launch (Isaac's scope)
BlockerOwnerStatus✅ Custom SMTPEliDone✅ CAPTCHAEliDone (PR #79)❌ Invite-code gate on signupIsaacOpen❌ 100-user cap enforcement (SECURITY DEFINER RPC)IsaacOpen❌ Waitlist table + anon INSERTIsaacOpen❌ Stripe + paywallIsaacOpen❌ Welcome emailIsaacOpen❌ Privacy policy + ToS pagesEli / NomsBlocked on Noms
Eli's launch blockers are essentially closed. Remaining work is Isaac's scope (Stripe + pilot gate) and waiting on Noms for privacy policy.

Threat model — verified safe
Comprehensive audit ran this session. Key findings:

OpenAI cost from attackers: $0 reachable. Every LLM-calling edge function has internal auth.getUser() check that 401s anon before any model call.
Data leakage: $0 reachable. All 29 tables RLS-enabled with no anon policies. Verified live with simulated anon queries.
Email flood risk: low. Resend Pro = 3K/day, ~125/hr sustained. Was incorrectly flagged as a risk in an earlier audit when Claude Code didn't have dashboard visibility.
Bot signup flood: throttled by Turnstile now. Was a real risk pre-PR #79.

The remaining risks (auth.users pollution via rotating-IP attacks, sender reputation) are bounded by CAPTCHA + per-IP rate limits.

What Eli wants to work on next session
User stated focus: "bugs, UX design for tutorial and platform, inspos I've had"
Three buckets to dig into when the next session opens:
1. Bug list

Tracker layout (#6 from Isaac's live-test list) — pending Isaac's screenshot. Pre-existing typecheck errors in Tracker.jsx may be the same root cause.
Any new bugs Yishai (QA) finds — he was told to wait for comprehensive checklist after recent bug-fix wave. Bugs are now fixed; can send him the testing checklist.
The minor outliers from PR #77 (~9-12 jobs where "Senior Year Internship" type titles get mis-tagged) — separate PR, low priority

2. UX design — tutorial and platform

Tutorial polish — OnboardingTutorial.jsx carousel (6 slides) replaced "Your Roles" reveal but hasn't had a full design pass
Sidebar redesign — 5 top-level sections (Home, Career, Applications, LinkedIn, Chat) collapsible. Design exists in docs/strategy/design-strategy.md. Not built.
Platform consistency — landing page intentionally diverges from dashboard tokens (warm cream + Fraunces vs greys + Geist). Some shared components will need a mapping plan if Eli wants to bring landing aesthetics into the app.
Career Direction step — "aspiration vector" is jargon; copy rewrite pending
Mobile responsive check — students open WhatsApp links on phones; full pass not done yet

3. Inspos / design directions Eli has been collecting

Eli mentioned Dribbble inspos this session: Amie (warm cream landing), Solix (techy dashboard depth), banking dashboards, e-learning UI (Skillora), HR/Crextio, mobile banking onboarding flows
Landing page already used some of these. Dashboard hasn't.
Worth opening as a structured brainstorm: which inspos map to which parts of the platform


How Eli works (preserved from previous handoffs)

Ask-don't-tell with Claude Code. Frame prompts as questions, surface design before building, get confirmation.
Plain language, real fixes (not workarounds), product-ready quality
Code blocks = prompts for Claude Code. Regular text = conversation with Eli.
Claude (this surface) advises strategy, reviews, writes prompts. Claude Code executes.
Surface decisions for confirmation — don't lock in architecture unilaterally
Edge functions don't auto-deploy on merge — manual supabase functions deploy <slug> after every backend PR
Eli wants Claude Code to share its own judgment, not just execute (push back, surface weak spots)
Keep prompts concise — Eli pushed back on over-engineered prompts this session


Critical project context

Supabase project ref: ilmqmodklutztuybsvwd
Supabase token: /tmp/.gaj_supabase_token (may need refresh)
Git remote: https://github.com/getajob-careers/get-a-job.git
Frontend: Vercel auto-deploys from main
PostHog: EU Cloud, key in Vercel env vars
OpenAI: Eli's personal account, key in Supabase secrets
Notion hub: https://www.notion.so/3658298b80cf811d8adfe28be1afc455 — Product Overview, Architecture, Task Board, QA Tracker, Analytics
DOCUMENTATION.md in repo — doc update protocol for Claude Code sessions


Verified production numbers (audited 2026-05-19)

18 edge functions
29 tables, all RLS-enabled
183 roles in role library
387 unique skill IDs
170 skill alias map entries
831 companies in registry, ~440 with supported ATS
~3,000 jobs cached (refreshed nightly)
17 PostHog events
22 FKs from auth.users (20 CASCADE, 2 SET NULL)


Two newish things Eli was talking about late in session

Tracker — default sort by tier + filter controls. Eli mentioned this and said "add to Notion build later." Should be added to the Task Board as P2 / Post-launch.
Avi (Eli's friend, software developer) is now consulting on scalable backend. This was the closing context of the session. Worth knowing if Avi-recommended architectural changes start landing in PRs.


Recommended opening moves for next session

Ask Eli which bucket he wants to start with — bugs, tutorial UX, sidebar redesign, or inspos
If bugs: get Isaac's screenshot for Tracker layout, send Yishai the QA checklist
If tutorial UX: review src/components/onboarding/OnboardingTutorial.jsx and the 6 slides — see what's there before designing fresh
If sidebar/platform UX: pull docs/strategy/design-strategy.md to ground in existing design intent
If inspos: ask Eli to share/describe them — they likely live as screenshots somewhere

Don't open with "what should we do?" Eli prefers being offered concrete options.