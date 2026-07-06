# Session Handoff — May 25-26, 2026

**Previous session ended:** May 26, 2026 (~11:00am)
**Next session should:** Read this file first, then check Notion Task Board + QA Tracker for current state.

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
- **Edge functions don't auto-deploy on merge** — manual `supabase functions deploy <slug>` after every backend PR.
- Full-CI-before-push: `npm run lint && npm test -- --run && npm run build`
- **Claude Code auto-merges PRs** — monitors CI, merges on green, deploys relevant edge functions. Saved in memory.

---

## COMPLETED THIS SESSION (May 25-26 — 30+ PRs, biggest session ever)

### PRs merged (chronological)

| # | What |
|---|------|
| #123 | Interview Coach — full career roadmap data (was only getting titles) |
| #124 | Skill humanization — 5 render sites display Title Case |
| #125 | CV education — Reichman duplicate prompt fix + learning-paths/analyze-job-match migrated to education table |
| #126 | 27 broken preset skill aliases fixed + 10 new library entries (595 skills total) |
| #127 | Skill autocomplete dropdown on StepSkills + Profile |
| #128 | replace_career_roles RPC tier→track column hotfix |
| #129 | Institution guard fix — word-boundary matching for multi-entry education |
| #130 | Backfill script --dry-run + --filter=null-skills flags |
| #131 | Unified CV template (merged Polished + ATS into one) |
| #132 | About Me dynamic prompt — grounded vs sparse paths + ban list |
| #133 | headerAlign crash hotfix after template merge |
| #134 | Track button fix — removed non-existent job_id column from insert |
| #135 | Experience editor — added missing skills_used + tools_used inputs to both surfaces |
| #136 | Per-experience/education/project skill tagging (StepRoleSkills batched screen) |
| #137 | Chip bank + role suggestions + accordion on StepRoleSkills |
| #138 | Survey step fix — step index shift from PR #136 |
| #139 | Lessons.md — step-renumbering needs full grep sweep |
| #140 | OnboardingShell step labels alignment |
| #141 | CV quality fixes — field_of_study in output schema, anti-fabrication tightened, verb ban, 1-page enforcement |
| #142 | 1-page guarantee + keyword regression fix (A+B+C trim + revert) |
| #143 | CV visual redesign — Direction A tracked-caps with dark banner header |
| #144 | Style selector removed + keyword UX clarified |
| #145 | PDF renderer — replaced DOCX with pdf-lib (cream background, Direction A) |
| #146 | Shrink-to-fit PDF + languages separator + verb-ban backstop |
| #147 | CV download URL — hide signed token from UI |
| #148 | CV banner design — dark #2C3E50 header, full section rendering |
| #149 | Section tracking 2→1pt + fuzzy keyword matching + prompt loosening |
| #150 | Cache consolidation — 4 duplicate profile caches → 1 canonical useProfileQuery + invalidateAfterCareerAnalysis helper |
| #151 | Skeleton loaders for 5 priority pages (Home, Tracker, Roadmap, Profile, Practicum) |
| #152 | Chat agent prompt refresh — shared "How to converse" block + per-agent improvements |

### Production actions
- 173 jobs re-extracted (null skills at confidence ≥0.7, 100% success rate)
- Edge functions deployed: ai-chat, generate-tailored-cv, generate-learning-paths, analyze-job-match
- Eli's duplicate education rows cleaned up (4→2)
- Eli's field_of_study updated to "Business Administration - Digital Innovation"

### Key architectural changes
- **CV output is now PDF** (pdf-lib), not DOCX. Cream background, dark banner header, shrink-to-fit 1-page guarantee. DOCX renderer kept in tree but unwired.
- **Skills are contextual** — tagged per experience/education/project via StepRoleSkills. skills_canonical is a computed union of all sources.
- **595 skills, 690+ aliases** in the library. Autocomplete on all skill inputs.
- **Cache consolidated** — single useProfileQuery hook, invalidateAfterCareerAnalysis helper for 10-key invalidation set.
- **Skeleton loaders** on Home, Tracker, Roadmap, Profile, Practicum.
- **Agent prompts refreshed** — "working session" conversational behavior, proactive insights, show-don't-explain, anti-filler ban list.

---

## WHAT'S NEXT (priority order)

### P0 — Launch Blockers (Eli's scope, taken from Isaac)

1. **Stripe integration + paywall** (~12-15h)
   - $12/month subscription after 7-day free trial
   - Checkout flow, webhook handler, subscription status
   - Trial countdown banner
   - Billing page (manage subscription, view invoices)
   - Paywall screen when trial expires

2. **Pilot invite code gate + 100-user cap** (~3-5h)
   - Shared invite code on signup form (e.g., "GETAJOB100")
   - Hard cap at 100 users via `SELECT count(*) FROM profiles`
   - Code stops working after cap hit

3. **Waitlist email capture** (~2-3h)
   - Email + timestamp capture for overflow after cap
   - No auth required — anonymous insert
   - Simple landing page state when cap is reached

4. **Welcome email** (~2-3h)
   - Via Resend after signup confirmation
   - Brief, branded, points to onboarding

5. **Privacy policy + ToS pages** (blocked on Noms)
   - Draft exists at `/mnt/project/privacy-policy-draft.md`
   - Add /privacy, /terms routes + consent checkbox on signup
   - Add PostHog as data processor

### P1 — Should Ship Before Launch

6. **CV section header underline** — change from text underline to full-width thin line below (Option A). Prompt ready: "Change the CV PDF section header underline from text-decoration underline to a full-width thin line drawn below the header text with a small gap (6px). Color #2C3E50, 1.5px thick, spans the full content width. Update build-pdf.ts. Deploy generate-tailored-cv after merge."

7. **Auto-trigger career analysis on profile save** — when skills/education/experience/career direction change, fire career analysis in background. Cache invalidation helper already built (PR #150).

8. **Mobile responsive check** — students open WhatsApp links on phones. Full pass needed across all pages.

9. **Projects + Certifications as experience types** — add "Project" and "Course/Certification" to experience type options. Same skills tagging, same CV rendering. No schema change needed.

10. **CV content quality pass** (multiple items):
    - About Me still generating 2 sentences despite 3-4 sentence rule
    - Bullets feel skill-heavy ("Used X and Y to do Z" pattern)
    - Keyword matching still showing "No exact phrase matches" despite fuzzy PR #149
    - Consider banning "Used X to do Y" pattern, encourage achievement-driven bullets

### P2 — Nice to Have

11. **Track button "Added" state persistence** — should check applications table on mount
12. **Skill inference layer** — wire related_skills into scoreJobFit at 0.5 weight
13. **Tutorial/example videos** — Eli records himself using the platform, added to Resources
14. **Tooltips** across the platform
15. **Optimistic rendering** — Tracker status toggle, archive, Story create
16. **Load More button** — hide when no more results on Jobs page
17. **Combine chat agents** — single smart agent that shifts modes based on context

### Isaac's Scope (reassigned)
- **Platform visual redesign + layout polish** — Direction 3 tokens, responsive layout, sidebar polish, component consistency across all pages

---

## TEAM STATUS

- **Eli** — taking over Stripe, pilot gate, waitlist, welcome email (formerly Isaac's). Owns all launch blockers.
- **Isaac** — reassigned to platform visual redesign + layout polish. Discuss tomorrow.
- **Yishai** — QA testing. Comprehensive checklist pending.
- **Noms** — privacy policy draft. Still waiting on delivery.

---

## OPEN BUGS (QA Tracker)

| Bug | Severity | Status |
|-----|----------|--------|
| CV About Me still 2 sentences despite loosened rule | Minor | Open |
| CV bullets skill-heavy ("Used X to do Z" pattern) | Minor | Open |
| Keyword match "No exact phrase matches" despite fuzzy PR #149 | Major | Open |
| Seniority mis-tags ~9-12 jobs | Minor | Open |
| JD raw HTML displayed in Tracker | Major | Open |
| Tasks generate duplicates of completed tasks | Open | Open |

---

## PLATFORM COSTS (current monthly)

| Service | Cost | Notes |
|---------|------|-------|
| Supabase Pro | $25 | Fixed |
| OpenAI | ~$15-30 | Auto-recharge $100/mo cap |
| Cloudflare | ~$1 | Domain annual amortized |
| Vercel | $0 | Free Hobby plan |
| Resend | $0 | Free tier |
| Langfuse | $0 | Free tier |
| PostHog | $0 | Free tier |
| **Total** | **~$41-56/mo** | Active Jobs DB cancelled ($45→$0) |

---

## IMPORTANT CONTEXT FOR NEXT AGENT

- **Supabase project ref:** `ilmqmodklutztuybsvwd`
- **Git remote:** `https://github.com/getajob-careers/get-a-job.git`
- **PostHog:** EU Cloud, project "Get A Job", key in Vercel env vars
- **OpenAI:** Eli's personal account, key in Supabase secrets
- **Notion hub:** https://www.notion.so/3658298b80cf811d8adfe28be1afc455
- **DOCUMENTATION.md** in repo — doc update protocol for Claude Code sessions
- **CV output is PDF** (pdf-lib) — not DOCX. build-pdf.ts is the renderer. DOCX (build.ts) kept but unwired.
- **Direction 3 design:** warm slate #F4F4F2, coral #F87060, Geist font (platform). CV uses dark slate #2C3E50 + cream #F9F5EC (separate design language).
- **Skills architecture:** 595 skills, 690+ aliases, per-experience tagging, skills_canonical = union of all sources, autocomplete on all inputs
- **Cache:** single useProfileQuery hook, invalidateAfterCareerAnalysis helper, 5min staleTime
- **Agent prompts:** refreshed with "How to converse" shared block, tested and confirmed working
- **Skeleton loaders:** live on Home, Tracker, Roadmap, Profile, Practicum
- **Claude Code auto-merges:** monitors CI → merges on green → deploys edge functions. Saved in memory.
- **Eli's working style:** plain language, real fixes, product-ready quality, ask-don't-tell, always explain decisions before confirming, don't suggest breaks
- **Test accounts:** `elienglard34@gmail.com` (main, admin) + `+test` aliases

---

## RECOMMENDED FIRST ACTIONS NEXT SESSION

1. **Start with the pilot gate** — smallest launch blocker, highest immediate impact. Invite code on signup, 100-user cap.
2. **Then waitlist + welcome email** — both small, both needed before sharing the WhatsApp link.
3. **Then Stripe** — biggest build, most critical for revenue. Wire checkout, webhooks, paywall, billing page.
4. **Check Noms** on privacy policy.
5. **Brief Isaac** on the visual redesign scope — share the design-strategy.md + Direction 3 tokens.
6. **CV underline fix** — one-liner prompt ready to paste (see P1 #6 above).
