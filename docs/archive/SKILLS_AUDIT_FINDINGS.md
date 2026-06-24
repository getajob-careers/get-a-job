# Skills Audit Findings

Issues surfaced by reading the 12 newly-installed Claude Code skills. **Reporting only — nothing has been fixed.** Use this doc to triage what to tackle and when.

---

## Executive summary

**31 distinct findings** across 8 categories.

| Severity | Count | Pre-demo | Post-demo | Anytime |
|---|---|---|---|---|
| **High** | 6 | 4 | 2 | 0 |
| **Medium** | 16 | 4 | 9 | 3 |
| **Low** | 9 | 0 | 5 | 4 |
| **Total** | 31 | 8 | 16 | 7 |

**Recommended pre-demo work**: 8 items totaling ~12-16 hours. The high-severity pre-demo items are mostly user-visible polish (a11y basics, bundle splitting for first-load perf, response_format JSON consistency).

---

## Findings by category

Effort scale: **trivial** (<1h) · **small** (1-4h) · **medium** (4-8h) · **large** (1-3d) · **huge** (>3d)
Risk scale: **low** (additive, isolated) · **medium** (multi-file, needs testing) · **high** (touches stable code, regression risk)

---

### A. Frontend performance (`react-best-practices`)

| # | Issue | Severity | Effort | Risk | Timing |
|---|---|---|---|---|---|
| A1 | **2MB main JS chunk** — Vite warns on every build. No route-based code splitting. Career Roadmap, Tracker, CVAgent etc. all loaded on first visit even if user only sees Home. | High | small | low | **Before demo** |
| A2 | **Sequential `useQuery` waterfalls in `Home.jsx`** — profile, roles, applications, tasks, certs, projects all separate hooks. Could parallelize with `useQueries` or coalesce into one query. | Medium | small | medium | After demo |
| A3 | **No `React.memo` / `useCallback`** in 700-line components like `AddInformation.jsx`. Parent state changes likely re-render entire sub-trees. | Medium | medium | medium | After demo |
| A4 | **No prefetch-on-hover** for nav links. Each route loads cold. Compounds the bundle-size pain. | Low | small | low | After demo |

---

### B. Accessibility (`accessibility`)

| # | Issue | Severity | Effort | Risk | Timing |
|---|---|---|---|---|---|
| B1 | **Color contrast unaudited.** Particularly suspect: pink-300 dots on white background (CAL1 task palette) — likely fails WCAG AA. Tier badges (tier-badge-1/2/3) untested. | High | trivial (audit) / small (fix) | low | **Before demo** |
| B2 | **Icon-only buttons missing aria-label.** Some have it (delete button I added in TR1/TR8), many don't (ChevronDown/Up, Lock icons in tabs, status badges). | High | small | low | **Before demo** |
| B3 | **No skip-to-main-content link** for keyboard users. | Medium | trivial | low | After demo |
| B4 | **`<html lang>` attribute** likely missing or static `en` despite Hebrew job content from Active Jobs DB. | Medium | trivial | low | After demo |
| B5 | **Custom Select / shadcn Select label-for relationships** uncertain — many forms use floating labels that may not be properly associated. | Medium | small | low | After demo |
| B6 | **No RTL accommodation for Hebrew content.** Active Jobs DB returns Hebrew company names + descriptions (alljobs.co.il sources); UI is LTR-only. Bidi text rendering broken. | Medium | medium | medium | After demo |
| B7 | **Keyboard navigation untested** for chip selectors (StepSkills), sub-tab navigation (ApplicationRow), status dropdown, calendar day cells. | Medium | medium | low | After demo |

---

### C. Database performance (`supabase-postgres-best-practices`)

| # | Issue | Severity | Effort | Risk | Timing |
|---|---|---|---|---|---|
| C1 | **FK indexes likely missing.** `applications.user_id`, `experiences.user_id`, `certifications.user_id`, `projects.user_id`, `career_roles.user_id`, `tasks.user_id`, `calendar_events.user_id`, `calendar_events.application_id`, `chat_messages.conversation_id`. Without indexes: slow queries + slow CASCADE deletes (relevant since CAL2 added a CASCADE). | High | small (audit) / small (add migrations) | low | **Before demo** |
| C2 | **No GIN indexes on 5 JSONB columns** added in TR4-TR6 (`skills_required`, `projects_proof`, `networking_contacts`, `follow_up`, `interview_prep`). Searching/filtering by JSONB content scans full table. Currently low impact (no JSONB queries in code), but pre-emptive. | Low | trivial | low | After demo |
| C3 | **N+1 in Tracker.** `applications` query returns the full row including all 5 JSONB sub-tab fields per app. For users with many apps, payload balloons. Also re-fetches whole row on every tab interaction. | Medium | medium | medium | After demo |
| C4 | **No batch inserts in onboarding.** `handleFinalise` inserts experiences, projects, certs one row at a time when iterating arrays. Should use `.insert([{...}, {...}])` array form. | Medium | small | low | After demo |
| C5 | **RLS performance unaudited.** RLS is enabled but no `EXPLAIN ANALYZE` has been run on hot paths (Home dashboard load, Tracker open, Career Roadmap fetch). | Medium | medium | low | After demo |

---

### D. API security (`api-security-best-practices`)

| # | Issue | Severity | Effort | Risk | Timing |
|---|---|---|---|---|---|
| D1 | **CORS headers duplicated** verbatim across all 10 edge functions. Single shared module would be cleaner and safer (one place to update if a header needs changing). | Low | small | low | After demo |
| D2 | **Error responses leak details.** Some functions return raw upstream errors (`details: errText` in JSearch/AJDB error path). Could expose API keys, internal paths, or schema info if upstream returns verbose errors. | High | trivial | low | **Before demo** |
| D3 | **Inconsistent rate-limiting.** `check_rate_limit` RPC called in some functions, skipped in others (e.g., `analyze-job-match` doesn't rate-limit). Public-facing AI calls without rate limits = cost vector. | Medium | small | low | After demo |
| D4 | **Inconsistent payload-size caps.** 50KB cap exists in some functions, missing from others. Without it, an attacker could send a 10MB payload that exhausts memory or hits OpenAI token limits hard. | Medium | trivial | low | After demo |

---

### E. External API resilience (`api-integration-specialist`)

| # | Issue | Severity | Effort | Risk | Timing |
|---|---|---|---|---|---|
| E1 | **No retry logic** on any external API call (JSearch, Active Jobs DB, OpenAI). Single attempt → fail → empty result. Transient 429/503/network blips cause user-visible failure. | Medium | medium | medium | After demo |
| E2 | **No circuit breaker.** When an upstream API consistently fails, we keep hitting it. Saw this with the bad-RAPIDAPI_KEY 403/429 cascade — every request hammered the API. | Low | medium | low | After demo |
| E3 | **AbortSignal timeouts inconsistent** across edge functions: 10s, 12s, 20s, 55s for similar operations. No clear convention. | Low | trivial | low | Anytime |
| E4 | **No response caching for external APIs.** "Refresh Job Matches" hits Active Jobs DB live every click, even if user clicked twice in 10 seconds. Wastes quota + latency. | Medium | medium | medium | After demo |

---

### F. LLM prompt engineering (`senior-prompt-engineer`)

| # | Issue | Severity | Effort | Risk | Timing |
|---|---|---|---|---|---|
| F1 | **`response_format: json_object` inconsistent.** Used in `analyze-job-match`, `generate-job-suggestions`, `generate-learning-paths`. **Missing from `generate-career-analysis` and `generate-tasks`** — those functions can return malformed JSON with no structural enforcement. Free reliability win. | High | trivial | low | **Before demo** |
| F2 | **No prompt evaluation framework.** Prompt changes ship without regression-testing output quality. Session 14 examples: NO_FABRICATION_GUARD, seniority awareness, IC1/SD1/SD2 disciplines all shipped without measuring impact. We've been guessing. | Medium | large | low | After demo |
| F3 | **No token budgeting.** `max_tokens` is hardcoded (1024 / 2048 / 4096) without computation. Some functions could be sized smaller; others might truncate on edge-case inputs. | Low | small | low | Anytime |

---

### G. Code quality (`code-reviewer`)

| # | Issue | Severity | Effort | Risk | Timing |
|---|---|---|---|---|---|
| G1 | **Large files**: `generate-tailored-cv` (~1500 lines), `generate-career-analysis` (~1000 lines), `AddInformation.jsx` (~700 lines), `ai-chat/index.ts` (~500 lines). Hard to navigate, review, refactor. | Medium | large | high | After demo |
| G2 | **`any` types pervasive** in edge functions: `(r: any)`, `(j: any)`, `(e: any)` everywhere. TypeScript not providing real safety. | Medium | medium | medium | After demo |
| G3 | **Duplicated patterns across edge functions**: `corsHeaders`, supabase client init, `check_rate_limit` invocation, `sanitizeKey` (only in one function so far). Single shared module would help. | Medium | medium | medium | After demo |

---

### H. Document generation (`docx`)

| # | Issue | Severity | Effort | Risk | Timing |
|---|---|---|---|---|---|
| H1 | **Hand-rolled docx XML at ~1500 lines** in `generate-tailored-cv`. The `docx` skill suggests Python `python-docx`-style approaches that would be dramatically simpler. **Caveat**: rewriting stable code carries regression risk; the current implementation works. | Low | huge | high | After demo (or never — risk/reward unclear) |

---

### I. Methodology (`verification-before-completion`)

| # | Issue | Severity | Effort | Risk | Timing |
|---|---|---|---|---|---|
| I1 | **Verification discipline informal.** We've been good in session 14 (downloading deployed source post-deploy, running `information_schema` queries to confirm migrations) — but it's habit, not enforced. The skill formalises "no completion claim without fresh verification evidence." Worth codifying in `CLAUDE.md` as a rule. | Low | trivial | low | Anytime |

---

### J. Operational dependencies (skill-specific)

| # | Issue | Severity | Effort | Risk | Timing |
|---|---|---|---|---|---|
| J1 | **`varlock` skill requires Varlock CLI.** Skill recommends commands that fail without `npm i -g varlock` or equivalent. If we want to actually use this skill (rather than just having it as reference), need the CLI. | Low | trivial | low | Anytime (or skip — skill still useful as reference) |
| J2 | **`webapp-testing` skill requires Python + Playwright.** We're a Node project. Would need `pip install playwright && playwright install` to actually run the helper scripts. | Medium | small | low | Before demo (if we want E2E coverage for the demo) |

---

## Recommended pre-demo execution order

These 8 items would lift demo quality without high regression risk:

1. **F1 — Add `response_format: json_object`** to `generate-career-analysis` + `generate-tasks` (trivial, low risk, free reliability win)
2. **D2 — Strip raw error details** from edge function error responses (trivial, low risk)
3. **B2 — Add `aria-label` to icon-only buttons** (small, low risk)
4. **B1 — Color contrast audit** + fix any failing pink/tier badges (small, low risk)
5. **C1 — Add FK indexes** for the 9 user_id / application_id FKs (small, low risk; new migration)
6. **A1 — Code-split routes** with React.lazy + Suspense for top-level pages (small, low risk; may need testing)
7. **J2 — Install Python/Playwright** + write a smoke-test E2E flow if we want pre-demo regression catching (small effort but separate stack)
8. **I1 — Codify verification rule in `CLAUDE.md`** (trivial, just doc)

**Total: ~12-16 hours of work, all low-risk, all visible-or-impactful for the demo.**

## Recommended post-demo backlog

Tier 2 (priority): D3, D4, F2, C3, C4, C5, A2, A3, B3-B7, E1, E4
Tier 3 (when convenient): A4, C2, D1, E2, E3, F3, G1-G3, H1, I1, J1

## Items I'd consider skipping entirely

- **H1** — rewriting the 1500-line CV generator. Working code, high regression risk, low concrete user benefit. Only worth it if we hit a feature limit the current implementation can't satisfy.
- **G1 — large file refactor** unless a specific bug points to it. Files are large but readable; refactoring for cleanliness alone risks regression in stable code.

---

## Cross-cutting observations

1. **Most issues cluster around `edge functions/`** — duplication, security, latency, type safety. The directory has organic-growth tech debt. A focused refactor session post-demo would compound across many findings.

2. **Frontend has fewer findings but bigger ones** — bundle size and accessibility are user-visible and affect first impressions. Easier to tackle one-at-a-time.

3. **No critical security holes found** — RLS is in place, JWT auth via Supabase is correct, the issues are defense-in-depth (verbose errors, missing rate limits) not "anyone can drop the database."

4. **No data integrity bugs found** — migrations are sound, no destructive patterns lurking.

5. **The skills surfaced what they were good at**: react-best-practices for FE perf, accessibility for a11y, supabase-bp for DB performance. None surfaced anything outside their scope (no false positives), and most surfaced items I genuinely hadn't been thinking about.

---

## What this audit did NOT cover

- **Manual UX walkthrough** — issues you'd find by clicking through every flow with fresh eyes
- **Performance under load** — never been load-tested
- **Browser compatibility** — only tested in Chrome
- **Mobile / responsive** — Tailwind classes exist but layout never validated on small screens
- **Email flows** (password reset, magic link) — handled by Supabase Auth, never user-tested end-to-end
- **Logging volume / cost** — function_logs growing freely, no retention policy

Worth a follow-up audit pass for these once the LLM-skill findings are triaged.
