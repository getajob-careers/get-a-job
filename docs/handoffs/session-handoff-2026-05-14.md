# Session Handoff — May 14, 2026

**Previous session ended:** May 14, 2026 (mid-onboarding-QA)
**Next session should:** Read PROJECT_INSTRUCTIONS.md first, then this file. Then resume at "IN PROGRESS — Batch 2" below.

**Why this handoff exists:** The prior conversation accumulated stale connector context (Notion tool definitions kept appending to messages). Work was unaffected, but a fresh conversation is cleaner. All real state lives in the repo + project files — nothing is lost.

---

## How to work (unchanged — see PROJECT_INSTRUCTIONS.md for full version)

- **Ask-don't-tell with Claude Code.** Frame prompts as questions. Claude Code shows design/decisions before building; Eli confirms.
- **Eli wants plain-language explanations** before approving. Real fixes, not workarounds. Product-ready quality.
- **Code blocks = prompts for Claude Code.** Eli copy-pastes them. Regular text = conversation with Eli.
- **Claude Code does all building/execution.** This Claude (claude.ai) advises strategy, reviews, writes prompts.
- **Surface decisions for confirmation** — don't lock in architecture unilaterally.
- Supabase project ref: `ilmqmodklutztuybsvwd` (separate from GitHub — did not move when repo transferred).
- Git remote: `https://github.com/getajob-careers/get-a-job.git`
- Deploy: edge functions via Supabase Management API / MCP; frontend auto-deploys via Vercel on push to main.
- Full-CI-before-push: `npm run lint && npm run typecheck && npm run build`

---

## COMPLETED THIS SESSION

### Pre-launch security audit + hardening — DONE
Full audit against the documented vibe-coded-app vulnerability patterns (RLS gaps, exposed secrets, exposed service_role, inverted auth, etc.). The major breaches that hit other platforms did NOT affect Get A Job — all 26 tables have RLS, secrets are clean, 18 edge functions verify auth. But 4 critical findings were fixed:

- **C-1 / C-2:** `reset_user_data` and `replace_career_roles` (SECURITY DEFINER functions) were callable by anonymous users with arbitrary `user_id` — anyone could wipe/overwrite any user's data. Fixed: internal `auth.uid() = p_user_id` guard + `REVOKE EXECUTE FROM anon` + `SET search_path`.
- **C-3:** `job_suggestions` INSERT policy was `WITH CHECK (true)` — any authenticated user could inject rows into any other user's feed. Fixed: dropped the always-true policies (service_role bypasses RLS anyway).
- **C-4:** `companies` UPDATE policy let any user edit any manual company. Fixed: added `created_by` column, scoped policy to `auth.uid() = created_by`. Frontend `ChatInterface.jsx` updated to pass `created_by`.
- Migration applied to live DB + verified via exploit tests (a non-admin user can no longer wipe/overwrite/inject; legitimate self-use still works). Security advisor: 25 → 10 findings (remaining 10 are intentional/safe).
- **PRs #21, #22 merged.**

### Auth dashboard settings — DONE
- HIBP (HaveIBeenPwned) leaked-password protection: **enabled**.
- `security_update_password_require_current_password`: **false** (had to be flipped manually in dashboard — Management API wouldn't change it).
- `security_update_password_require_reauthentication`: **true**.
- Password min length: **8**. Password complexity: requires lowercase + uppercase + digit + symbol — **kept strict deliberately** (platform holds sensitive career data; the friction was really a validation bug, now fixed; honest live validation makes strict acceptable).
- Email OTP length: changed **8 → 6** in dashboard (was causing the change-password code input to not fit).

### Change-password feature — DONE (PRs #23, #24, #25, #27)
- Built `PasswordCard.jsx` + Account tab in `AddInformation.jsx`. Uses Supabase reauthentication flow: type new password → `reauthenticate()` emails a 6-digit OTP → enter code → `updateUser({password, nonce})`.
- Bug chase resolved: (1) OTP length 8→6, (2) "requires current password" toggle conflicted with the nonce flow — fixed by flipping the two auth toggles correctly, (3) **the live password validation regex had a `+-=` inside a character class that JS read as an ASCII range matching digits** — so invalid passwords showed all-green. Fixed with an explicit Set of the 32 valid symbol chars.
- **Signup form also hardened (PR #27):** `Login.jsx` signup mode now has live password validation (the checklist) + `minLength` bumped 6→8. Shared `src/lib/passwordPolicy.js` helper extracted so signup + PasswordCard can't drift apart. Branded the signup confirmation email ("Confirm your email — Get A Job") and the reauthentication email.
- Signup flow confirmed correct: `mailer_autoconfirm: false` (email verification required), unverified users can't sign in, `signUp()` does not log the user in.
- 180 tests passing.

### Email infrastructure — DONE
- Resend SMTP wired to Supabase custom SMTP. **DMARC now PASSES** (was failing — fixed by adding `aspf=r; adkim=r` relaxed alignment to the `_dmarc` Cloudflare TXT record; Resend routes through Amazon SES so the MAIL FROM domain doesn't align without relaxed mode).
- Google Postmaster Tools: domain `getajob.careers` verified.
- SPF + DKIM + DMARC all PASS on sent emails.

### Career-analysis-failure bug — INVESTIGATED, fix in progress (see below)

---

## IN PROGRESS — fix being built right now

**The bug:** During onboarding QA, the "Your Roles" page (career analysis step) failed with "Career analysis failed. (An unexpected error occurred.)" — but ONLY on a re-run after resetting onboarding, not on a fresh first run.

**Root cause (confirmed by Claude Code, NOT a regression from the role-library work):**
- `generate-career-analysis` is rate-limited to 5 calls/hour. Eli's repeated reset-and-retest cycles crossed that limit.
- When the rate-limit branch fires, it calls `serviceClient.rpc('log_error', {...}).catch(() => {})`. Supabase's `PostgrestBuilder` has no `.catch` method → throws a `TypeError` → swallowed by the outer try/catch → surfaces as the generic "unexpected error" instead of a proper 429.
- Same broken `.catch()` pattern exists in **two** edge functions: `generate-career-analysis/index.ts:676-681` and `generate-tasks/index.ts:78-83`.
- A normal pilot user doing onboarding once will NOT hit this (1 call, well under 5). It's not a launch blocker for typical users — but it's wrong code and produces a confusing error.

**The fix (approved, Claude Code building as one PR):**
1. Drop the broken `.catch(() => {})` in both edge functions, redeploy both.
2. Migration `20260514_reset_user_data_clears_rate_limits.sql` — adds `DELETE FROM rate_limits WHERE user_id = p_user_id` to `reset_user_data` (preserves all of yesterday's hardening byte-for-byte). Approved. So onboarding-reset test cycles don't burn the hourly quota.
3. `Onboarding.jsx` error handling now distinguishes 429 from 500 and shows a proper "you've hit the limit" message.
4. **Rate limit bumped 5 → 10/hour** for `generate-career-analysis` (`index.ts:26`) — 5 was locking out legitimate users mid-onboarding; 10 still bounds cost (~$210 worst-case across pilot onboarding week) and still catches abuse.

**Next session:** confirm this PR landed, redeployed, and that onboarding career analysis now works on a re-run. Then move to Batch 2.

---

## PENDING — onboarding QA batches (from a full walkthrough test)

Eli did a complete onboarding walkthrough and found a long list. Organized into batches. **Batch 1 was the career-analysis crash (above).** Remaining:

### Batch 2 — onboarding bugs (NOT STARTED — start here next session)
Investigate root causes before fixing; some may share a cause.

1. **"Continue to Experience" button goes to Practicum.** On the Education step, the button labeled "Continue to Experience" navigates to the Practicum step. Either label or routing is wrong (Practicum was inserted into the onboarding sequence — label probably wasn't updated).
2. **Wrong "what happens next" copy on Constraints step.** End of Constraints says the next step runs full career analysis ("classifying your qualification level, identifying Tier 1-3 roles..."). Actual next step is the survey.
3. **Exiting "Your Roles" page reloads to the survey page.** Leaving the career-analysis results page sends the user backward in the flow — shouldn't.
4. **Home page flashes briefly mid-onboarding** before continuing.
5. **Qualification level unstable.** Home dashboard first showed "Not yet determined / bachelors · Business Administration", then after a reload changed to "Junior". Home dashboard appears to read the value before it's written.
6. **CV extraction mislabels employment type.** Volunteering position imported as "part time work"; actual part-time job imported as "full time".
7. **Education step only partially filled from CV.** Field of Study + Degree populated; Institution + Education Level left blank though the info was in the CV.

Priority note: #1, #2, #5, #6, #7 hit every pilot user on first run — those are the real launch blockers. #3, #4 are glitchy but lower-stakes.

### Batch 3 — copy fixes (NOT STARTED)
- Practicum page wording needs a rewrite (Eli flagged it twice as needing fixing).
- Career Direction step description "doesn't explain well."
- The wrong "what happens next" text on Constraints (overlaps with Batch 2 #2).

### Batch 4 — UX improvements (NOT STARTED)
- **"Where do you want to be in 5 years?"** field should have a dropdown/autocomplete of suggested roles as the user types (it already does role-matching — see "Matched: Product Manager" — but no live dropdown).
- **Target Industries** and **Preferred Work Environment** fields should use the clickable-bubble UI that the Skills field already has — selectable suggestions that are NOT required.
- **Constraints step:** work environment field should also use the bubble UI.
- **Remove "salary expectation"** from the Constraints step — the platform does nothing with salary yet (it's a possible future feature; not now).
- **Add "How did you hear about us?"** at the end of the survey, with options: Reichman practicum, WhatsApp, friends (+ any others worth adding).
- Institution field "suggests schools" — Eli found the autocomplete on the institution field weird/unexpected; revisit whether that autocomplete should exist.

---

## EARLIER PENDING WORK (pre-dates the security audit — still not done)

### QA Group 2 — IA + gating (NOT STARTED)
- Merge Job Suggestions into Application Tracker as a "Discover" tab; remove from main nav. (No existing users — no migration concern.)
- CV upload page: add explanation that uploading a CV autofills the profile during "Profile Setup".
- CV upload page: add instructions telling users to download their LinkedIn data export now (takes hours; needed soon). **Eli flagged during the walkthrough that these LinkedIn-data instructions never appeared — still missing.**

### QA Group 3 — new features (NOT STARTED)
- Full onboarding walkthrough/tour using **Onborda** — spotlights all features. LinkedIn Posts/Networking/Comment Coach spotlighted as one group; LinkedIn Optimizer is separate.
- **Weekly reflection space on the Home dashboard** — a space where users type what they did that week; feeds the Story Bank via the existing extraction flow. (Replaces the earlier idea of a passive stats counter card.)

### Job Suggestions generation speed (NOT STARTED — separate from the cache fix already shipped)
- PR #20 fixed *revisit* speed (added `staleTime`, replaced manual cache loading with TanStack `useQuery`). The REAL complaint — slow *initial generation* (the LLM scoring step) — was never addressed.
- A prompt was drafted to investigate end-to-end generation timing and propose options (smaller LLM batches / streaming / `gpt-4o-mini` for initial scoring / parallel batched scoring) with quality-vs-speed tradeoffs. **May or may not have been sent — verify and re-send if needed.**

### LinkedIn soft gate — DONE (PR #19, merged)
- LinkedIn Optimizer works without an archive (has fallback logic). Soft gate implemented: prominent archive-upload prompt + "generate without archive" secondary action + mode indicator on output. No hard lock.

---

## WK 6 (launch week) — NOT STARTED

- Visual redesign: collapsible sidebar (5 top-level sections: Home, Career, Applications, LinkedIn, Chat with expand-on-click sub-pages) + design-token migration on the top 5 most-trafficked components. Playwright baseline as regression check.
- Landing page build — "Anti-ChatGPT" angle with compound-effect timeline, dark mode, new-age design. Prototype exists as a `GetAJobLanding.jsx` artifact from a prior session.
- Story Bank → Career Agent passive mention + Story Bank → LinkedIn Optimizer evidence injection. (Eli classified this as a real feature, wants it before "polish".)
- Final UI polish + mobile responsive checks + faculty briefing materials.

---

## PRE-LAUNCH INFRA — NOT STARTED

- **Account deletion** (full `auth.users` CASCADE delete, not just `reset_user_data`) — flagged as a likely pre-launch requirement for GDPR / Israeli PPL compliance. Needs a design pass. Logged in PROJECT_INSTRUCTIONS future-work.
- PostHog (analytics / session replay / feature flags), Sentry (error tracking), Loops (welcome email sequence).
- Privacy policy + Terms + AI disclaimer (Noms — Eli's wife, lawyer — reviews). Reichman ethics committee notification.
- Founders' agreement (Eli 65-70%, Isaac 18%, Sammy 5-8%).
- Check / upgrade OpenAI to Tier 2 for rate limits.
- Vercel MCP + GitHub MCP in Claude Code.

---

## POST-PILOT BACKLOG (logged in PROJECT_INSTRUCTIONS future-work)

- `company_enrichments` table pattern — proper fix for the C-4 collaborative-editing limitation (company row stays shared; each user owns their own per-company annotations).
- In-app "change password while logged in" page — DONE this session. (Originally backlog; pulled forward and built.)
- Auth surface follow-ups: resend-confirmation-email button (~30 min), custom signup-confirmation landing page (~45 min), post-signup welcome email (~2-3h).

---

## IMPORTANT CONTEXT FOR THE NEXT AGENT

- **Supabase project ref:** `ilmqmodklutztuybsvwd`
- **Supabase token:** `/tmp/.gaj_supabase_token` (may need refresh — `read -s TOKEN && echo "$TOKEN" > /tmp/.gaj_supabase_token && unset TOKEN`)
- **Git remote:** `https://github.com/getajob-careers/get-a-job.git`
- **Latest merged PRs this session:** #21, #22 (security), #23, #24, #25, #27 (password/auth). The career-analysis-fix PR was being built at session end — verify it landed.
- **Role library state:** 170 roles, unified v2.0 schema, research-grounded, consolidated to `supabase/functions/_shared/libraries/`. Schema validator at `.claude/skills/schema-validator/`. Skill library: 389 entries. (All from the prior session — PRs #11–#17.)
- **Test accounts:** `elienglard34@gmail.com` (main, admin) + `elienglard34+demo@gmail.com`. Eli can create more signup-test accounts using Gmail `+alias` addresses (e.g. `elienglard34+signuptest1@gmail.com`) — they're separate Supabase accounts but land in the one real inbox.
- **Claude Code hooks active:** auto-lint on every edit, file protection on migrations/voice-rules/libraries, dangerous-command blocking.
- **Eli's working style:** wants everything explained in plain language before approving; wants real fixes not workarounds; product-ready not pilot-ready quality.
- **Note on the stale-context issue:** the prior conversation had connector tool-definitions (Notion) appending to messages. Disconnecting the connector did not clear it (it was cached in that conversation's context). Starting this fresh conversation resolves it. Not a security issue, not a hack — just stale context. If it recurs, start a new conversation.

---

## RECOMMENDED FIRST ACTIONS NEXT SESSION

1. Confirm the career-analysis-fix PR (the `.catch` fix + rate_limits migration + 429 handling + rate-limit bump to 10/hr) landed, redeployed, and is merged.
2. Test that onboarding career analysis now works on a re-run after a reset.
3. Send the **Batch 2** investigation prompt (the 7 onboarding bugs above — frame as "investigate root causes, report before fixing").
4. Then Batch 3 (copy) and Batch 4 (UX) — these can move fast once Batch 2 is understood.
5. Don't lose the earlier pending work: QA Group 2 (IA/gating), QA Group 3 (Onborda tour + weekly reflection), and the Job Suggestions *generation-speed* investigation.
