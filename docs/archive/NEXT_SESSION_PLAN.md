# Next Session Plan — Pre-Demo Stabilization + Tier 1 CV

Last updated: 2026-04-27 (end of Session 14)

This plan was synthesized from research across CV-generation skills (claude-resume-kit, varunr89/resume-tailoring-skill, Reactive Resume), job-search frameworks (Proficiently, Aakash Gupta's Job Search OS, santifer/career-ops), the SKILLS_AUDIT_FINDINGS.md punch list, and the remaining pending bugs in the task tracker.

The principle: **stabilize what exists, then improve the headline feature, then defer everything net-new until after the demo.**

---

## Phase 0 — Security hygiene (~30 min)

Non-optional. Zero risk. Do first.

| # | Action | Notes |
|---|--------|-------|
| 0.1 | Rotate Supabase PAT | Leaked twice in chat scrollback during Session 14. |
| 0.2 | Rotate RapidAPI key | Leaked once in chat during Active Jobs DB migration. |
| 0.3 | Delete `/tmp/.gaj_*_token` files | After rotation, remove the disk-cached copies. |
| 0.4 | Drop fingerprint diagnostic `console.log` | Leftover from sanitizer saga; identify and remove. |

**Risks:** Cron / integrations / edge functions may break if they hold the old key.
**Mitigation:** Rotate one credential at a time. After each rotation, redeploy any function reading the secret, then smoke-test (one job-suggestions call after RapidAPI; one admin/edge-function call after Supabase PAT).

---

## Phase 1 — Demo-path bug fixes (~3-4 h)

Reasoning: every demo starts with onboarding and ends with the tracker / calendar view. If those break, nothing else matters.

### 1a. Deploy D2 — committed but not deployed (0 effort, ~15 min watching logs)

Six edge functions have been committed (`4411665`) with generic OpenAI error messages instead of leaking upstream details. Code currently sits on disk doing nothing for users.

Functions: `analyze-job-match`, `extract-proof-signals`, `generate-career-analysis`, `generate-job-suggestions`, `generate-learning-paths`, `generate-tasks`.

- **Risk:** Batch deploy of 6 functions = blast radius if one is broken.
- **Mitigation:** Deploy sequentially, check logs after each (~12 min total). Server-side `console.error` is already in the commit so debug visibility is preserved.

### 1b. Fix #30 (N-O39→O44: education fields lost or never collected)

Onboarding-path bug. If user can't complete a clean profile, every downstream feature reads from poisoned data.

- **Risk:** Onboarding has ~6 steps and ~30 fields with subtle coupling; fix may touch many components.
- **Mitigation:** Map the field flow end-to-end (form → state → `handleSurveyNext` → DB columns) before changing anything. Tightly scope: fix only the lost fields; do not refactor adjacent code.

### 1c. Fix #35 (N-X4: AddInformation only edits ~10 of ~30+ profile columns)

User can't update most of their profile post-onboarding. Compounds with #30 — bad data goes in, can't be fixed.

- **Risk:** Adding 20+ form fields = lots of UI surface; may push UX to be unwieldy.
- **Mitigation:** Group fields by section (mirror onboarding step structure). Don't reinvent — copy the input components from the onboarding steps.

### 1d. Fix #31 (N-K2/K6: tasks have no due_date → never reach calendar)

Calendar is a visible demo feature. If empty, demo loses a slide.

- **Risk:** Existing rows have NULL `due_date` → fix-forward leaves orphans.
- **Mitigation:** Migration to backfill orphans (`created_at + 7 days`) OR display them in a "no due date" bucket. Also fix `generate-tasks` prompt to require `due_date` in JSON schema and enforce on insert.

---

## Phase 2 — CV quality: Tier 1 prompt improvements (~2-3 h)

Reasoning: CV gen is the headline feature. Tier 1 is pure-prompt, single-file. Risk is in model behavior, not code structure. Do this AFTER Phase 1 because the source data the prompt reads must be complete first.

**File touched:** `supabase/functions/generate-tailored-cv/index.ts` only. No DB migrations, no frontend changes, no new deps.

The four changes (full spec in chat history; condensed here):

1. **Anti-fabrication guard** — module-level `NO_FABRICATION` constant naming source-field allow-list (`experiences.responsibilities[]`, `projects.description`, `certifications`) and forbid list (no invented metrics / employers / titles / dates / tools / degrees). Interpolated into system prompt; one sentence in JSON-schema instruction.
2. **AI-fingerprint banned vocabulary** — module-level `BANNED_VOCAB` constant with ~50–80 strings (banned adjectives, verbs, phrases). Interpolated as a system-prompt rule with explicit "banned vocab wins" precedence over JD echo.
3. **XYZ formula with early-career escape** — "Accomplished [X] as measured by [Y] by doing [Z]" preferred. Hard escape: "If source data has no measurable metric, write a clear non-XYZ bullet. Do NOT invent metrics."
4. **ATS keyword integration** — strengthen existing `extractJDKeywords` first-step call: structured `{critical, nice_to_have}` output, hard-skills only, cap critical at 8–12 / total at 25. In main prompt: critical keywords MUST appear in BOTH Skills section AND ≥1 bullet, **if and only if supported by source data**.

**Order in prompt matters:** anti-fabrication first (highest priority), banned vocab + ATS second, XYZ last with escape clause embedded.

### Risks

- **XYZ pressure → fabrication** (highest risk). The escape clause helps but models often ignore conditional escapes. **Mitigation:** Anti-fabrication rule comes FIRST in prompt order; XYZ rule embeds "metric must appear in source data" as a hard constraint INSIDE the XYZ block, not just as a separate escape clause.
- **No regression test exists.** **Mitigation:** Pick 3 representative profile + JD pairs, save current outputs as baseline, generate against new prompt, manually diff. ~30 min of eyeballing. Roll back via git if any output regresses.
- **Banned vocab vs. JD-keyword echo conflict.** **Mitigation:** Explicit precedence in prompt ("banned vocab wins; substitute with neutral verb").
- **Banned-word false positives in proper nouns** (e.g. "Spearhead" as a product name). Low probability for early-career CS users. Accept.
- **Output-length growth** as model substitutes single banned verbs with longer paraphrases. **Mitigation:** Spot-check DOCX rendering on 1 long-bullet sample.
- **Prompt-length attention degradation** — total system prompt grows ~80–120 lines / ~1500–2000 tokens. **Mitigation:** Order matters; put highest-priority rules first.
- **Token cost.** Negligible (~$0.0002 / generation). Already on gpt-4o-mini for the main call.
- **Rollback** — trivial — single-file revert via git. Edge function redeploy ~20s.

### Pre-deploy checklist

1. Re-read full current `systemPrompt` in `index.ts` for contradictions with new rules ("infer accomplishments" / "make it impressive" type).
2. Re-read `extractJDKeywords` to confirm output shape and downstream consumers (likely inline-only).
3. Generate 3 baseline CVs against current prompt.
4. Apply changes; deploy; immediately re-generate same 3.
5. Diff outputs. Watch for: dropped sections, weirdly short bullets, fabricated numbers, banned-word leakage.

---

## Phase 3 — Performance + verification (~2-3 h)

Polish that the demo audience subliminally notices, plus a guardrail against repeating the F1 false-positive mistake.

### 3a. C1 (FK indexes audit + migration)

- **Risk:** `CREATE INDEX` locks the table. **Mitigation:** `CREATE INDEX CONCURRENTLY` for all of them; accept slower migration.
- **Risk:** Adding indexes blanket-style hurts write performance. **Mitigation:** Audit query patterns first (which FKs are used in `WHERE` / `JOIN`). Skip FKs that only appear in `DELETE CASCADE` chains.

### 3b. A1 (code-split routes with `React.lazy`)

- **Risk:** Lazy chunks add a flash on first nav. **Mitigation:** Keep current loading skeleton as Suspense fallback.
- **Risk:** Build may break if dynamic imports hit top-level singletons. **Mitigation:** Split only the heaviest routes first (CV gen, dashboard); verify build, then expand.
- **Risk:** Mobile / slow connections feel slower per nav. **Mitigation:** Don't split auth or short-loop pages.

### 3c. I1 (verification rule in CLAUDE.md)

Tied to F1 false positive (Session 14): I claimed two functions lacked `response_format` when they had it. Add a short concrete rule:

> Before claiming a function lacks a feature, grep the file end-to-end for that feature's presence.

- **Risk:** CLAUDE.md gets bloated and ignored over time. **Mitigation:** Keep it ≤3 lines; replace existing rules where overlapping.

---

## Phase 4 — Post-demo: compound-value features

**Do these AFTER demo, not before.** Each is multi-hour net-new work with new tables / new UI / new endpoints. Ranked by leverage.

| # | Feature | Source | Est. | Why it matters |
|---|---------|--------|------|----------------|
| 4.1 | **Daily briefing aggregator** | Aakash | 3-4 h | Replaces "open dashboard, scan widgets" with one push. Pure read aggregation over `applications`, `career_roles`, `tasks`, fresh `job_suggestions`. |
| 4.2 | **Story bank** | santifer | 4-5 h | One-time edge function extracts 5–10 STAR stories from `experiences` + `projects` → new `user_stories` table → Interview Coach pulls from it. Compound value across all interview prep sessions. |
| 4.3 | **Post-interview debrief** | Aakash | 3 h | Form on tracker when status = `interview_completed`, new `interview_debriefs` table, feeds Interview Coach. Compounds across interviews. |
| 4.4 | **Per-job artifact bundle** | Proficiently | 2 h | Extend `applications` schema with `tailored_cv_url`, `tailored_cl_url`, `jd_keywords_json`, `fit_breakdown_json`. Formalizes what we partly do. |
| 4.5 | **Archetype routing for CV gen** | santifer | 2 h | First-step classifier (PM / SWE / data / design) → archetype-specific prompt fragments. Could fold into Tier 1 CV if Phase 2 goes smoothly. |
| 4.6 | **Integrity cron** | santifer | 2 h | `pg_cron` job: dedup tracker rows, flag stale apps. Prevents the bug class fixed manually in TR1 / TR2 / TR8. |

---

## Explicitly skipping / deferring

- **J2 (Playwright smoke test framework)** — installing Python + Playwright pre-demo is yak-shaving. Build after demo when iterative.
- **#33 (N-X3: extract-proof-signals library bloat)** — function runs once per user at onboarding. Low blast radius. Defer.
- **ATS auto-fill** (Proficiently) — wrong product shape for IL early-career market.
- **Telegram bot, insider question DB, outreach/referral, company research** — pre-PMF cost without product proof.
- **Tier 2/3 CV improvements** (structured JSON contract, post-gen validator, character budgets) — only if Tier 1 succeeds and there's spare time.

---

## Total time estimate

| Phase | Time |
|-------|------|
| 0. Security | 30 min |
| 1. Demo-path bugs + D2 deploy | 3-4 h |
| 2. Tier 1 CV | 2-3 h |
| 3. Perf + verification | 2-3 h |
| **Pre-demo total** | **8-11 h** |
| 4. Post-demo features | separate sessions, 2-5 h each |

---

## Single biggest risk in this plan

That Phase 1 is underestimated because #30 and #35 may have hidden surface area not yet audited.

**Mitigation:** First action of Phase 1 is a 20-min read-through of the onboarding flow + AddInformation component to right-size the actual fix scope before committing to the timeline. If either turns out to be 3+ h alone, re-discuss whether Phase 2 (CV) or Phase 3 (perf) gets dropped.

---

## Carried-over context from Session 14

- D2 is committed (`4411665`) but **not deployed**.
- Pending bugs in tracker: #30, #31, #33, #35.
- 15 active Claude Code skills installed at `~/.claude/skills/`.
- Job API is now Active Jobs DB (IL) + JSearch (global fallback). LinkedIn API removed.
- `MODEL = 'gpt-4o'` for `extract-proof-signals` (latency upgrade); `generate-tailored-cv` also on gpt-4o.
- All other edge functions on `gpt-4o-mini`.
- See `SESSION_14_SUMMARY.md` for the full session log.
- See `SKILLS_AUDIT_FINDINGS.md` for the audit punch list this plan is sequenced from.
- See `CLAUDE_AI_BRIEF.md` for the parallel-collaboration brief.

---

## Resume tomorrow with

> "Read NEXT_SESSION_PLAN.md and start Phase 0."
