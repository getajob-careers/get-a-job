# Session Handoff — May 27-28, 2026

**Previous session ended:** May 28, 2026 (~1pm)
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
- Deploy: edge functions via `npx supabase functions deploy <slug>`; frontend auto-deploys via Vercel on push to main.
- **Edge functions don't auto-deploy on merge** — manual deploy after every backend PR.
- Full-CI-before-push: `npm run lint && npm test -- --run && npm run build`
- **Claude Code auto-merges PRs** on green CI for low-risk changes.

---

## COMPLETED THIS SESSION (May 27-28 — 11 PRs)

### PRs merged (chronological)

| # | What |
|---|------|
| #168 | Landing page — removed "Pilot now open" badge + 5 leftover pricing mentions |
| #169 | Profile placeholder generalization — Israel-specific examples replaced (Heseg→Merit, Sergeant→Team Lead, Nahal→Acme Corp, salary field removed from UI) |
| #170 | Jobs RPC diversification + work_type filter — round-robin across role titles, work_type filter respects user preferences, work_type casing normalized |
| #171 | Practicum → Internship full rename — route, file, sidebar, components, all UI copy. Internship is now its own top-level sidebar item |
| #172 | Lessons doc — branch before committing reminder |
| #173 | Three QA fixes — "How tiers work" → "How tracks work", Story Bank textarea white bg + border, education form validation (field_of_study + start_date required, end_date required unless currently studying) |
| #174 | Migration sync — 2 missing migration files added to repo (replace_career_roles tier→track fix + 3-arg cache-aware overload). Repo-only, no DB changes |
| #175 | Scoring fixes — primary_domain set from career direction (not CV), part_time added to CAREER_COUNTABLE_TYPES, Hybrid includes remote in work_type filter |
| #176 | Debug flag — ?debug=1 on Jobs page logs scoreJobFit breakdown per job in console |
| #177 | Cache-bust empty commit — forced fresh Vercel chunk hashes |
| #178 | **THE BIG FIX** — React Query cache consolidation for experiences + education. Created useExperiencesQuery + useEducationQuery canonical hooks (select("*") always). Fixed Onboarding auto-save closure race. Added skills_canonical recomputation on per-experience save. Restored Eli's skills_canonical (7→45 IDs). |

### Edge functions deployed
- `generate-career-analysis` (primary_domain from career direction + part_time counting)

### Invite codes seeded (live in DB)
| Code | Cohort | Max Uses |
|------|--------|----------|
| GETAJOBPILOT | pilot_whatsapp | 100 |
| TEAMGETAJOB | employee | unlimited |
| VIPGETAJOB | handpicked | unlimited |
| INTERNSHIPGETAJOB | practicum_reichman | unlimited |

### Key bugs found and fixed
- **React Query cache pollution (PR #178)** — ChatInterface's narrow `select("id, title, company")` on experiences poisoned the shared cache key, causing Profile saves to recompute skills_canonical from empty skills_used arrays. Eli's skills dropped from 64→7 canonical IDs, collapsing all Track 1 job scores. 3+ other users affected. Fixed by consolidating to canonical useExperiencesQuery hook with select("*").
- **primary_domain ignoring career direction (PR #175)** — CV extraction set primary_domain to customer_success based on current job (Guardio CSM), ignoring 5-year goal (Product Manager). Affected every transitioning student. Fixed: generate-career-analysis now overrides primary_domain based on five_year_role.
- **Onboarding auto-save closure race (PR #178)** — auto-save fired before experiences loaded, capturing empty arrays. Fixed by adding deps to useEffect.

### Eli's account state
- `practicum_path = 'self_sourced'` (set for testing, revert with: `UPDATE profiles SET practicum_path = NULL WHERE id = '4b243f3a-5035-474e-a89d-aff13fe06cc2'`)
- `primary_domain = 'product_management'` (correct, set by PR #175 fix)
- `skills_canonical` restored to 45 IDs (was clobbered to 7)
- Track 1 Jobs page now shows 21+ results

---

## QA BUGS — Current Status

### Fixed this session
| Bug | PR |
|-----|-----|
| "Pilot now open" badge | #168 |
| Profile Israel-specific placeholders | #169 |
| Roadmap Live Track shows Remote jobs | #170 |
| Roadmap Live Track only shows CSM | #170 |
| "How tiers work" → "How tracks work" | #173 |
| Story Bank textarea blends into background | #173 |
| Education form missing validation | #173 |
| replace_career_roles RPC stale 'tier' column | #174 |
| skills_canonical clobbered by cache pollution | #178 |
| Home skeleton loader stuck | #162 (verified fixed) |
| Keyword match "No exact phrase matches" | #154 (verified — feature removed) |
| CV shrink-to-fit 1-page | #146 (verified working) |
| Seniority mis-tags | Likely fixed (can't reproduce) |

### Still open
| Bug | Severity | Notes |
|-----|----------|-------|
| Greeting barely visible on Home | Cosmetic | Low contrast "GOOD AFTERNOON, ELI" |
| Browse jobs card shows 0 matches on Home | Minor | Home card query issue |
| Tracker Skills tab should auto-fill from JD | Major | Empty with manual add — should show matched/gap skills from job analysis |
| Tracker Networking → no Outreach Coach link | Major | No "Draft outreach" button, no auto-fill company from application |
| Tracker should show apply link | Minor | ats_url exists but not displayed |
| LinkedIn profile preview doesn't look like LinkedIn | Major | "not affiliated" disclaimer, needs realistic mockup |
| Post image upload not in compose form | Minor | PostImageUpload component exists (PR #96) but not wired in |
| CV "Generating your CV..." before user presses button | Minor | Chat message implies generation started when it hasn't |
| Tasks generate duplicates of completed tasks | Major | generate-tasks doesn't check existing/completed tasks |
| About Get A Job links don't look clickable | Cosmetic | Plain text, no link styling |
| Accordion auto-scroll | Major | Opening accordion expands above viewport, user sees nothing |
| Track 1 scoring too loose | Major | Jobs with null req_skills_core get free pass, irrelevant roles sneak in |
| Product Operations Manager search too strict | Minor | pg_trgm threshold too high for long queries |
| Chat streaming — no indicator | Minor | Post-launch (reverted PR #156) |
| Work Arrangement mixes location + employment type | Major | Remote/Hybrid/On-site mixed with Full-time/Part-time/Contract/Internship |

### Not checked (need onboarding to test)
- Skip Tutorial pop-up gets stuck
- Tutorial auto-navigates to Home when leaving tab
- IDF mention in experience type dropdown

### Not checked (need verification)
- CV generic About Me filler
- CV download signed URL exposed
- Role autocomplete on Career Direction inconsistent

---

## NEW TASKS LOGGED THIS SESSION

| Task | Priority | Notes |
|------|----------|-------|
| Internship page redesign | P1 | Full spec in Notion: no gate, one score, browse+filter, pitch guidance + who to contact, Outreach Coach link, separate from kanban pipeline, "Get AI recommendations" button |
| Merge tools into skills + per-experience skills on Profile + Skills Agent tagging | P1 | Remove separate tools_used, one unified Skills field, Skills Advisor chat can tag skills to experiences via SUGGESTED_SKILL_TAG_JSON card |
| Resources page redesign | P2 | Own sidebar tab, card layout, categories, side panel, videos section |
| Accordion auto-scroll | P1 | scrollIntoView on accordion open, global fix |
| Separate Work Arrangement from Employment Type | P1 | Two separate fields on Profile |
| Track 1 scoring too loose | P1 | Null req_skills_core gets free pass, irrelevant roles sneak in |

---

## PLATFORM STATE

### Verified numbers
- 18 edge functions
- 29 tables, all RLS-enabled
- 183 roles, 387 skills, 170 aliases
- 831 companies, ~440 ATS-supported
- ~3,000 jobs (nightly refresh)
- 17 PostHog events
- 4 invite codes seeded (GETAJOBPILOT, TEAMGETAJOB, VIPGETAJOB, INTERNSHIPGETAJOB)

### Costs
| Service | Cost |
|---------|------|
| Supabase Pro | $25 |
| OpenAI | ~$15-30 |
| Cloudflare | ~$1 |
| Everything else | $0 (free tiers) |
| **Total** | **~$41-56/mo** |

---

## TEAM STATUS

- **Eli** — owns all development. Presenting platform to head of practicum soon.
- **Isaac** — reassigned to platform visual redesign + layout polish.
- **Yishai** — QA testing. Comprehensive checklist still pending.
- **Noms** — privacy policy draft. Still waiting on delivery.

---

## IMPORTANT CONTEXT FOR NEXT AGENT

- **Supabase project ref:** `ilmqmodklutztuybsvwd`
- **Git remote:** `https://github.com/getajob-careers/get-a-job.git`
- **PostHog:** EU Cloud, key in Vercel env vars
- **OpenAI:** Eli's personal account, key in Supabase secrets
- **Resend:** API key in Supabase edge function secrets
- **Notion hub:** https://www.notion.so/3658298b80cf811d8adfe28be1afc455
- **CV output is PDF** (pdf-lib), not DOCX
- **Direction 3 design:** warm slate #F4F4F2, coral #F87060, Geist font
- **Internship page** (renamed from Practicum) — own top-level sidebar item, full redesign spec in Notion
- **React Query cache lesson:** NEVER use different select() projections with the same queryKey. Use canonical hooks with select("*"). PR #178 fixed experiences + education. Check projects too if it has the same pattern.
- **Eli's practicum_path = 'self_sourced'** — set for testing, revert when done
- **Invite codes live** — GETAJOBPILOT (100 cap), TEAMGETAJOB, VIPGETAJOB, INTERNSHIPGETAJOB (all unlimited)
- **?debug=1 on Jobs page** — logs scoreJobFit breakdown per job in console
- **Eli's working style:** plain language, real fixes, product-ready quality, ask-don't-tell, always explain decisions, don't assume — investigate first, listen when Eli pushes back (he was right about the Track 1 bug)

---

## RECOMMENDED FIRST ACTIONS NEXT SESSION

1. **Continue QA walkthrough** — several bugs still unchecked (IDF dropdown, CV About Me, role autocomplete). Full list above.
2. **Fix the greeting contrast** and **accordion auto-scroll** — both quick wins.
3. **Check if projects useQuery has the same cache pollution pattern** — experiences and education were fixed in PR #178, projects might need the same treatment.
4. **Revert Eli's practicum_path** if internship testing is done.
5. **Check Noms** on privacy policy.
6. **Brief Isaac** on visual redesign scope.
7. **At session end:** follow DOCUMENTATION.md protocol — update Notion with any changes.
