# Demo Bug List — Full Functional Backlog

Created: 2026-04-27 (Session 14, post-demo audit)

Surfaced by the four-agent demo audit covering all 16 pages + 4 AI agents + edge function dependency map + console-warning sweep + asset audit. Combined with the 4 open bugs in the task tracker (#30, #31, #33, #35).

**Total: 13 real bugs + 2 incomplete features = 15 items, ~11-15 h of focused work.**

The "Needs Supabase token?" column flags items that require an edge function redeploy or DB migration — they can't be applied locally and shipped via git alone.

---

## 🔴 CRITICAL — Blocks a user flow or loses data

### B1. Education fields lost in onboarding (#30 in task tracker)
- **What's broken:** Several education fields (N-O39 → O44) either never collected from the form or dropped before reaching the database.
- **User experience:** User completes onboarding, profile shows blank education fields, downstream features (CV gen, career analysis) read incomplete data.
- **Location:** Onboarding step components (likely `src/components/onboarding/StepEducation.jsx` and the `handleSurveyNext` flow in `src/pages/Onboarding.jsx`)
- **Effort:** 2-3 h (1h to map field-flow form→state→DB; 1-2h to fix)
- **Needs Supabase token:** Maybe — only if a DB column is missing and migration needed. Likely pure frontend.
- **Risk:** Onboarding has subtle coupling; fix may touch multiple step components.

### B2. AddInformation only edits ~10 of ~30+ profile columns (#35 in task tracker)
- **What's broken:** Profile editor surfaces ~1/3 of the columns the database stores. Compounds with B1 — bad data goes in, no path to fix it.
- **User experience:** User wants to update their profile after onboarding, can't find the field, has no recovery path.
- **Location:** `src/pages/AddInformation.jsx`
- **Effort:** 2-3 h (mostly UI: add ~20 form fields grouped to mirror onboarding step structure; reuse onboarding components)
- **Needs Supabase token:** No (pure frontend, columns already exist in DB).

### B3. Onboarding stuck on AI-call failure (no recovery path)
- **What's broken:** Three required onboarding steps (resume parse → tier reveal → task generation) call edge functions with no retry, no skip, no recovery. If any of them errors, the user can't proceed.
- **User experience:** User uploads resume or hits "Continue" → spinner → error toast → stuck. Refresh either resumes or restarts depending on which step.
- **Location:**
  - `src/components/onboarding/StepResumeUpload.jsx:300` (extract-proof-signals)
  - `src/pages/Onboarding.jsx:362` (generate-career-analysis tier reveal)
  - `src/pages/Onboarding.jsx:556` (generate-tasks final step)
- **Effort:** 2-3 h (add retry button + "Skip for now" fallback per step; preserve partial state)
- **Needs Supabase token:** No (pure frontend).

---

## 🟠 HIGH — Visibly broken feature, no full blocker

### B4. Tasks have no `due_date` → Calendar always empty (#31 in task tracker)
- **What's broken:** `generate-tasks` doesn't request `due_date` in its JSON schema; existing rows have NULL. Calendar filters on `due_date` so nothing renders.
- **User experience:** User generates tasks, sees them on the Tasks page, opens Calendar → completely empty even though tasks exist.
- **Location:**
  - `supabase/functions/generate-tasks/index.ts` (prompt change)
  - `src/pages/Tasks.jsx` (insert handler — verify due_date is persisted)
  - DB migration to backfill orphan rows OR display them in a "no due date" bucket
- **Effort:** 1.5-2 h
- **Needs Supabase token:** **Yes** — edge function deploy + likely a backfill migration.

### B5. Silent failure in SkillGapCourses (Home)
- **What's broken:** `.catch()` swallows errors with `console.error` only. No toast, no inline message, button reactivates as if nothing happened.
- **User experience:** User clicks "Get Recommendations" → spinner → returns to button. Repeated clicks = same. Looks broken.
- **Location:** `src/components/dashboard/SkillGapCourses.jsx:20`
- **Effort:** 30 min (add toast + inline error state)
- **Needs Supabase token:** No (pure frontend).

### B6. Silent failure in LearningPaths (CareerRoadmap)
- **What's broken:** Same pattern as B5 — error swallowed.
- **User experience:** Same as B5.
- **Location:** `src/components/roadmap/LearningPaths.jsx:53`
- **Effort:** 30 min (parallel fix with B5; could batch into one commit)
- **Needs Supabase token:** No (pure frontend).

### B7. AI chat fallback message gives no signal
- **What's broken:** When `ai-chat` errors, all 4 AI agents (CareerAgent, CVAgent, InterviewCoach, SkillDevelopmentAdvisor) show the same generic "Sorry, I could not generate a response." No retry button. No detail.
- **User experience:** Looks broken with no obvious next action. User probably abandons the agent rather than retrying.
- **Location:** `src/components/chat/ChatInterface.jsx:488`
- **Effort:** 1-1.5 h (add retry button, distinguish transient vs. permanent errors)
- **Needs Supabase token:** No (pure frontend).

---

## 🟡 MEDIUM — Degraded UX, not visibly broken

### B8. `generate-learning-paths` has no progress UI
- **What's broken:** Button disables but no spinner, no banner. Function takes 10+ seconds.
- **User experience:** Looks frozen. User may click another button or refresh, losing the in-flight request.
- **Location:** `src/components/dashboard/SkillGapCourses.jsx`, `src/components/roadmap/LearningPaths.jsx` (both call `generate-learning-paths`)
- **Effort:** 30 min (add `GeneratingBanner` like other long-running calls already use)
- **Needs Supabase token:** No (pure frontend).

### B9. Onboarding fire-and-forget promise without `.catch()`
- **What's broken:** Auto-save promise uses `.then()` only. Network error → unhandled promise rejection → console warning. Could surface to error monitoring (Sentry) as a high-noise alert if/when monitoring is added.
- **User experience:** Invisible to users 99% of the time; visible as console noise to developers and error monitoring.
- **Location:** `src/pages/Onboarding.jsx:91-93`
- **Effort:** 15 min (add `.catch()`)
- **Needs Supabase token:** No (pure frontend).

### B10. RAPIDAPI_KEY fingerprint logged on every call
- **What's broken:** Diagnostic log meant to be temporary leaks first-8 + last-4 chars of API key to edge logs on every job-suggestions invocation. Low-grade ongoing info disclosure.
- **User experience:** Invisible to users. Visible to anyone with Logflare access.
- **Location:** `supabase/functions/generate-job-suggestions/index.ts:341-345`
- **Effort:** 5 min removal + redeploy (already on the Phase 0 plan)
- **Needs Supabase token:** **Yes** — edge function redeploy.

---

## 🔵 LOW — Cosmetic, but real

### B11. Onboarding `console.warn` fires on happy path
- **What's broken:** `console.warn("Extraction fallback...")` and `console.warn("Proof signal extraction failed (non-fatal)...")` fire even when the fallback path succeeds. Adds noise to error monitoring.
- **User experience:** Invisible to users.
- **Location:** `src/components/onboarding/StepResumeUpload.jsx:309, 321`
- **Effort:** 15 min (downgrade to `console.debug` or remove)
- **Needs Supabase token:** No (pure frontend).

---

## ⚙️ DEPLOY — Code is fixed; just unshipped

### B12. D2 — 6 edge functions committed but not deployed
- **What's broken:** Production still runs the version that leaks raw OpenAI error text to clients on failure. Code is fixed at commit `4411665` but never deployed.
- **User experience:** On any AI call failure, user sees raw upstream errors (e.g. `"rate_limit_exceeded"`, API key fragments) instead of "AI service temporarily unavailable."
- **Location:** Six functions in `supabase/functions/`:
  - `analyze-job-match`
  - `extract-proof-signals`
  - `generate-career-analysis`
  - `generate-job-suggestions`
  - `generate-learning-paths`
  - `generate-tasks`
- **Effort:** 15 min (deploy 6 functions, watch logs)
- **Needs Supabase token:** **Yes** — explicitly a deploy task.

---

## 🐢 PERF — Real but invisible per-session

### B13. extract-proof-signals embeds entire library every call (#33 in task tracker)
- **What's broken:** System prompt re-includes the full signal + skill library on every invocation. ~hundreds of KB of static text per OpenAI call. Function runs once per user at onboarding, so blast radius is small.
- **User experience:** ~5-10 seconds slower onboarding step + higher OpenAI cost per user (~$0.02 vs $0.01 per onboarding).
- **Location:** `supabase/functions/extract-proof-signals/index.ts` (system prompt assembly)
- **Effort:** 1.5-2 h (move libraries to a hash/index reference or compress to top-N most-relevant; verify extraction accuracy doesn't regress)
- **Needs Supabase token:** **Yes** — edge function redeploy.

---

## 📦 INCOMPLETE FEATURES — Working as designed (design is "not built yet")

These are not bugs — the UI is intentionally disabled because the backing feature doesn't exist. Listed here for awareness; either ship them or hide them.

### F1. Tracker URL import disabled button
- **Status:** Disabled button with "Coming soon" label visible in the Add Application flow.
- **Location:** `src/pages/Tracker.jsx:220-228`
- **Effort to ship the feature:** Out of scope to estimate (depends on URL parsing scope: LinkedIn jobs only? Generic OG scraping? ATS-specific parsers?).
- **Effort to hide it:** 5 min (remove the disabled button entirely).
- **Needs Supabase token:** No (pure frontend — for the hide; ship-it would need backend work).

### F2. AddInformation Courses tab
- **Status:** Tab visible, shows "Course Tracking — Coming Soon" banner. Backing `courses` table doesn't exist.
- **Location:** `src/pages/AddInformation.jsx:71` (placeholder comment), `:511` (tab/banner)
- **Effort to ship the feature:** Multi-day (DB schema + CRUD + UI for create/edit/delete + integration with Learning Paths).
- **Effort to hide it:** 5 min (remove the tab from the navigation).
- **Needs Supabase token:** No for hide; yes for ship-it (DB migration).

---

## Summary by priority

| Priority | Count | Effort | Needs token |
|----------|-------|--------|-------------|
| Critical (B1-B3) | 3 | 6-9 h | Maybe (B1 only) |
| High (B4-B7) | 4 | 2.5-3.5 h | B4 only |
| Medium (B8-B10) | 3 | ~50 min | B10 only |
| Low (B11) | 1 | 15 min | No |
| Deploy (B12) | 1 | 15 min | **Yes** |
| Perf (B13) | 1 | 1.5-2 h | **Yes** |
| **Real bugs total** | **13** | **~11-15 h** | **4 need token** |
| Incomplete features (F1, F2) | 2 | 10 min (to hide) | No |

## Items requiring Supabase token to deploy

If the Supabase access token is unavailable, these 4 items are blocked at the deploy step:

- **B4** — Tasks `due_date` (edge function + DB migration)
- **B10** — RAPIDAPI_KEY fingerprint log removal (edge function)
- **B12** — D2 deploy (6 edge functions)
- **B13** — extract-proof-signals library bloat (edge function)

The other 9 real bugs + both incomplete-feature hides can be applied with frontend-only commits — code lands, builds, runs locally, ships via Vercel/Netlify CI without touching Supabase.

## Items NOT in this list (and why)

- **Career Roadmap race condition** — already fixed in commit `ee6583f`.
- **Favicon / manifest / title** — already fixed in commit `8d5a9c1`.
- **Phase 1 fixes from NEXT_SESSION_PLAN.md** — superset of this list (B1-B4 are in both).
- **Tier 1 CV improvements** — feature-quality work, not bug-fixing. Tracked separately in NEXT_SESSION_PLAN.md Phase 2.
- **Skill audit findings (perf, accessibility, code-split)** — not functional bugs. Tracked in SKILLS_AUDIT_FINDINGS.md and NEXT_SESSION_PLAN.md Phase 3.
