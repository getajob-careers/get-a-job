# Session Handoff — May 17, 2026

**Previous session ended:** May 17, 2026
**Next session should:** Read PROJECT_INSTRUCTIONS.md first, then this file for context on what just happened.

---

## How to work (unchanged — see PROJECT_INSTRUCTIONS.md)

- **Ask-don't-tell with Claude Code.** Frame prompts as questions. Claude Code shows design/decisions before building; Eli confirms.
- **Eli wants plain-language explanations** before approving. Real fixes, not workarounds. Product-ready quality.
- **Code blocks = prompts for Claude Code.** Eli copy-pastes them. Regular text = conversation with Eli.
- **Claude Code does all building/execution.** This Claude (claude.ai) advises strategy, reviews, writes prompts.
- **Surface decisions for confirmation** — don't lock in architecture unilaterally.
- Supabase project ref: `ilmqmodklutztuybsvwd`
- Git remote: `https://github.com/getajob-careers/get-a-job.git`
- Deploy: edge functions via Supabase CLI or Management API; frontend auto-deploys via Vercel on push to main.
- Full-CI-before-push: `npm run lint && npm run typecheck && npm run build`

---

## COMPLETED THIS SESSION (May 14-17)

### PRs merged (chronological)
| # | What |
|---|------|
| #28 | Career analysis rate-limit fix (.catch → try/catch, rate limit 5→10/hr, 429 handling, reset clears rate_limits) |
| #29 | CV extraction fixes — institution autofill, education level normalization, degree type dropdown, experience type validation (title-keyword overrides), dead RESUME_SCHEMA deleted |
| #30 | Education table Phase B cutover — multi-entry education, proper student detection via is_current, full AddInformation Education tab with CRUD, all 7 edge functions updated |
| #31 | FK hotfix — education.user_id FK changed from auth.users to profiles.id (fixed PostgREST nested embed), Home.jsx fail-open guard |
| #32 | 5 onboarding bugs — "Continue to Experience"→"Continue to Practicum" label, Constraints copy fix, onboarding_step 7→8 regression, Home render gate, qualification level self-heal spinner |
| #33 | Layout chrome gate — sidebar hidden until profile confirms onboarding_complete |
| #34 | Practicum faculty-assigned empty state copy fix |
| #35 | 7 onboarding UX improvements — LinkedIn data export instructions on CV upload page, role autocomplete dropdown on 5-year goal, industry bubbles (12 presets matching companies.industry), work environment bubbles (6 presets matching AddInformation), work arrangement bubbles (4 presets), salary expectation removed from Constraints, "How did you hear about us?" survey question with referral_source column |
| #36 | PostHog foundation — SDK + PostHogProvider + identify + pageview auto-capture + error capture + session replay (maskAllInputs) |
| #37 | PostHog named events — 11 events (signup_completed, onboarding_started/step_completed/completed, cv_uploaded, career_analysis_refreshed, job_match_checked, application_tracked, practicum_company_added/status_changed, chat_message_sent) |
| #38 | Active Jobs DB agency=false filter + Israeli jobs confirmed working on Pro tier |

### Migrations applied (not all in PRs)
- `20260514_education_table_phase_a.sql` — education table created, backfilled from flat profile columns (9 rows: 5 primary + 4 secondary)
- `20260514_education_fk_to_profiles.sql` — FK changed from auth.users to profiles
- `20260514_reset_user_data_clears_education.sql` — RPC updated
- `20260517_profiles_referral_source.sql` — referral_source column added

### Infrastructure changes
- **OpenAI billing** switched from Isaac's account to Eli's personal account. New API key saved to Supabase secrets via secure script. Auto-recharge: $10 trigger → $50 restore, $100/month cap.
- **PostHog Cloud EU** set up — project "Get A Job", API key `phc_nryTknnBG3edsD7JMSpBuDb99SwaWifypnh9RruM56Ti`, env vars in Vercel (VITE_POSTHOG_KEY + VITE_POSTHOG_HOST). Events confirmed arriving in Live Events view.
- **Active Jobs DB** upgraded to Pro tier ($45/month) on RapidAPI. Israeli jobs confirmed: 20 results for "Product Manager" + "Israel", 18 unique companies, all from real ATS sources (Comeet, Greenhouse, Lever, SmartRecruiters, Workday). agency=false filter deployed.
- **LinkedIn Job Search API** accidentally subscribed ($45) then cancelled. Refund requested via RapidAPI support. **NEVER use this API — it's a LinkedIn scraper, legally risky.**

### Key decisions made
- **Payment model:** 7-day free trial starting on signup → hard paywall at $12/month. No free tier. Binary: trialing/active = full access, everything else = locked out.
- **Pilot gate:** Shared invite code for signup. Hard cap at 100 users. Waitlist email capture ("This looks cool — let me know when it's open") for overflow.
- **Education refactor:** Flat profile columns → proper `education` table with multi-entry support. Phase C (drop flat columns) deferred until stable.
- **PostHog over Sentry:** All-in-one analytics + session replay + error tracking. No separate Sentry needed for pilot.
- **Session replay masking:** maskAllInputs: true, autocapture: false, production-only, identified_only.

---

## WHAT'S LEFT BEFORE LAUNCH

### Launch blockers (can't launch without these)
1. **Privacy policy + ToS + AI disclaimer** — Noms is drafting. Eli sent her the brief. Once delivered, add /privacy, /terms pages + consent checkbox on signup. Add PostHog as data processor. (~2h for pages once draft arrives)
2. **Landing page** — where WhatsApp links point. Prototype exists (GetAJobLanding.jsx artifact from earlier session). "Start your 7-day free trial." Pilot invite code input. (~6-8h)
3. **Stripe integration + paywall** — Isaac's scope. Brief sent (isaac-launch-brief.md + isaac-brief-update.md in project files). Checkout, webhooks, subscription status, paywall screen, trial countdown, billing page. (~12-15h)
4. **Pilot token gate + 100-user cap + waitlist** — Isaac's scope. Shared invite code, hard cap, email capture. (~3-5h)
5. **Account deletion (full CASCADE)** — Isaac's scope. Israeli PPL compliance. (~2-3h)

### Should ship (significantly better experience)
6. **Sidebar redesign** — 5 top-level sections (Home, Career, Applications, LinkedIn, Chat), collapsible, expand-on-click sub-pages. Design in docs/strategy/design-strategy.md. (~4-6h)
7. **Merge Job Suggestions into Tracker** — "Discover" tab on Application Tracker, remove from main nav. (~3h)
8. **Onborda first-run tour** — spotlight features after onboarding. (~4-5h)
9. **Welcome email** — Isaac's scope. Via Resend. (~2-3h)
10. **Mobile responsive check + fixes** — students open WhatsApp link on phone. (~3-4h)
11. **Career Direction description rewrite** — "aspiration vector" is jargon. (~30m)
12. **Privacy policy pages in app** — once Noms delivers draft. (~2h)

### Nice to have (ship if time allows)
13. Story Bank → Career Agent passive mention (~2h)
14. Story Bank → LinkedIn evidence injection (~2h)
15. Weekly reflection space on Home (~3h)
16. Job Suggestions generation speed optimization (~3-4h)
17. Phase C — drop flat education columns (~10m)
18. OpenAI error logging rollout to all functions (~2h)
19. Structured output for CV extraction (~3h)

---

## ISAAC'S SCOPE (brief already sent)

Isaac has two documents:
- `/mnt/user-data/outputs/isaac-launch-brief.md` — full brief with 6 original tasks
- `/mnt/user-data/outputs/isaac-brief-update.md` — addendum with pilot token, waitlist, trial timing updates

His tasks:
1. Account deletion (2-3h)
2. Stripe integration (6-8h)
3. Paywall screen (2h)
4. Trial countdown banner (1h)
5. Billing page (2h)
6. Welcome email (2-3h)
7. Pilot token gate (1-2h)
8. 100-user cap + waitlist (2-3h)
9. Stripe billing email config (30m)

Key decisions for Isaac:
- Trial starts on signup, not onboarding completion
- Pilot invite code is shared (one code for all users, e.g. "GETAJOB100" — Eli to confirm exact code)
- Hard cap at 100 users checked via `SELECT count(*) FROM profiles`
- Waitlist is just email capture, no auth required
- Stripe billing emails turned on (trial ending reminder, payment receipts, etc.)

---

## BUGS / ISSUES STILL OPEN

### Qualification level 30-second flash (partially fixed)
- PR #32 added self-heal spinner ("Analysing your profile...") so users see a loading state instead of "Not yet determined"
- Root cause: race condition where Home mounts before onboarding's analysis persist completes. The persist succeeds but takes ~200ms after navigation to Home fires.
- Long-term fix (not built): gate `handleFinalise` on the analysis persist completing before navigating to Home. Low priority since the spinner is an acceptable UX.

### Uncommitted files in Claude Code working tree
Two files remain uncommitted across sessions:
- `supabase/functions/ai-chat/index.ts` — OpenAI error logging added during the quota debugging session (log_error RPC on 502). Worth committing as a small PR.
- `NEXT_SESSION_PLAN.md` — Claude Code's internal planning file. Can be .gitignored or deleted.

---

## PLATFORM COSTS (current monthly)

| Service | Cost | Notes |
|---------|------|-------|
| OpenAI | ~$15-30 | $50 loaded, auto-recharge $100/mo cap |
| Supabase Pro | $25 | Fixed |
| Active Jobs DB Pro | $45 | RapidAPI, Israeli job data |
| Cloudflare | ~$1 | Domain annual amortized |
| Vercel | $0 | Free Hobby plan |
| Resend | $0 | Free tier |
| Langfuse | $0 | Free tier |
| PostHog | $0 | Free tier |
| **Total** | **~$86-116/mo** | |

---

## IMPORTANT CONTEXT FOR THE NEXT AGENT

- **Supabase project ref:** `ilmqmodklutztuybsvwd`
- **Supabase token:** `/tmp/.gaj_supabase_token` (may need refresh)
- **Git remote:** `https://github.com/getajob-careers/get-a-job.git`
- **PostHog:** EU Cloud, project "Get A Job", key in Vercel env vars
- **Active Jobs DB:** Pro tier on RapidAPI, agency=false filter deployed
- **OpenAI:** Eli's personal account, key in Supabase secrets
- **Education table:** Phase A + B complete. Flat columns still exist on profiles (Phase C deferred). New `education` table is source of truth.
- **Claude Code hooks active:** auto-lint on every edit, file protection on migrations/voice-rules/libraries, dangerous-command blocking
- **Eli's working style:** wants everything explained in plain language before approving; wants real fixes not workarounds; product-ready not pilot-ready quality; ask-don't-tell pattern; don't suggest breaks or stopping
- **Test accounts:** elienglard34@gmail.com (main, admin) + various +smoketest aliases
- **Privacy policy draft exists** at `/mnt/project/privacy-policy-draft.md` — Noms is reviewing/finalizing

---

## RECOMMENDED FIRST ACTIONS NEXT SESSION

1. Check if Eli tested the Israeli job suggestions on the live site — confirm they're showing up for users
2. Ask Eli what he wants to work on — landing page is the biggest remaining item on his plate
3. Check Isaac's progress on Stripe / account deletion / pilot gate
4. Check if Noms delivered the privacy policy draft
5. The two uncommitted files (ai-chat error logging + NEXT_SESSION_PLAN.md) should be cleaned up
