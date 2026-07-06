# Session Handoff — May 20-21, 2026

**Previous session ended:** May 21, 2026 (~2:30am)
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

---

## COMPLETED THIS SESSION (May 20-21 — 19 PRs)

### Full UX redesign — Direction 3 applied to every page

| PR | What |
|---|---|
| #80 | Sidebar restructure — 5 collapsible sections (Home, Career, Activity, LinkedIn, Chat, Profile). Route renames: CareerRoadmap→Roadmap, JobSuggestions→Jobs, LinkedinOptimizer→Linkedin, AddInformation→Profile |
| #81 | Home redesign — bento card layout with action-driven CTAs + Direction 3 tokens + Landing token update + AgentIntro headers on all 4 chat pages |
| #82 | Login/Signup redesign — two-column split, URL-driven mode (?mode=signup/signin/forgot), tier-quadrant SVG illustration, Direction 3 tokens |
| #83 | Login copy tighten — removed Israel-specific mentions, eliminated redundant copy between subtitle and bullets |
| #84 | 6 onboarding bug fixes — skip tutorial race, education validation, tier order, IDF label, aspiration vector jargon, employment status XOR |
| #85 | Onboarding visual redesign — Direction 3 tokens, icon cards for enums, simplified progress bar, tutorial visual refresh |
| #86 | Email confirmation redirect — emailRedirectTo to /Onboarding, Landing.jsx redirects authenticated users to /Home |
| #87 | Onboarding polish — blue info banner, autocomplete regex fix (trailing \b), 36 new skill chips (72→108), 8 new industries (12→20) |
| #88 | Tutorial tier cards + auto-nav race fix (root cause in Onboarding.jsx TOKEN_REFRESHED) + LinkedIn export CTA on tutorial + banner copy + SkillTagInput restyle |
| #89 | Landing page accessible for logged-in users — / redirects, /Landing always renders. "About Get A Job" links in sidebar footer, Settings, onboarding header |
| #90 | Career Roadmap redesign — unified tierConfig.js (single source of truth), Direction 3 tokens, WhyTab reorder, RoleCard restyle, merged Goal Alignment into Reasoning, dead uncategorized UI removed |
| #91 | CAPTCHA fix — Turnstile wired into signin + forgot (Supabase enforces globally, PR #79 only did signup) |
| #92 | Jobs page redesign — Direction 3 tokens, shared tierConfig import, Tier 3 seniority filter bypass (growth roles show all levels), seniority indicator chip, gray for <50% match, keyword default for new users |
| #93 | Activity section — sidebar Pipeline→Activity rename, Direction 3 for Calendar/Tasks/Practicum, user-set due dates, mobile vertical accordion for Practicum, 3-step start-here card, Home "About" link |
| #94 | Tracker redesign — Direction 3 tokens, shared TIER_CONFIG, restyled status filters + Add-Application dialog |
| #95 | LinkedIn Direction 3 visual pass — all 13 sub-components, amber callouts→.li-banner-warning, import button branded |
| #96 | LinkedIn profile mockup + feed-card preview + image upload — ProfilePreview (toggle Current/Optimized, coral accent on changes), PostPreview rewritten as feed card, PostImageUpload + storage bucket + migration |
| #97 | Chat pages redesign — chatStyles.js, AgentIntro auto-collapse after 2 visits, immediate-send prompt chips, "Context:" unified, app-specific prompts for InterviewCoach, introMessage for CareerAgent + InterviewCoach, action cards consolidated |
| #98 | Profile redesign + Story Bank extraction — D3 tokens, URL-driven tabs, Languages moved to Profile tab, skills_used restored, /StoryBank page with list/filter/create/edit/delete, sidebar + Home + DailyAction updated |

### Key architectural changes

- **Sidebar:** 6 sections (Home, Career [Roadmap/Jobs/Resources/Story Bank], Activity [Tracker/Calendar/Tasks/Practicum], LinkedIn, Chat [4 agents], Profile) + Settings via avatar
- **Direction 3 color scheme:** warm slate #F4F4F2 background, coral #F87060 accent, Geist font throughout. Applied to every page.
- **tierConfig.js:** single source of truth for tier colors/labels/taglines — imported by Roadmap, Jobs, Tracker, RoleCard, TierQuadrantGrid, OnboardingTutorial
- **Story Bank:** extracted from Profile to its own /StoryBank page under Career. Supports create/edit/delete, filter by experience-linked vs general stories
- **LinkedIn previews:** generic social-profile mockup (ProfilePreview) + feed-card post preview (PostPreview) with image upload. No LinkedIn brand colors/logos — Direction 3 tokens only
- **CAPTCHA:** Turnstile now covers signup + signin + forgot password (Supabase enforces globally)
- **Auth redirect:** / redirects logged-in users to /Home; /Landing always renders for everyone

---

## WHAT'S LEFT

### Open bugs (QA Tracker) — 20 total

**Previously tracked (4):**
| Bug | Severity |
|---|---|
| Weird wording on landing page (2 entries) | Cosmetic |
| Tasks generate duplicates of completed tasks | Open |
| Seniority mis-tags ~9-12 jobs | Minor |
| JD raw HTML displayed in Tracker | Major |

**New from Eli's final QA walkthrough (16):**
| Bug | Page | Severity |
|---|---|---|
| Story Bank modal still violet, text area unclear | Story Bank | Cosmetic |
| "Pilot now open — 100 invites" badge vibe-coded | Home | Cosmetic |
| "Good morning" greeting barely visible | Home | Cosmetic |
| "About Get A Job" doesn't look clickable | Home | Cosmetic |
| Browse jobs card shows 0 matches | Home | Minor |
| Roadmap left card plain, right only shows CSM | Roadmap | Minor |
| Job scoring weird findings (Isaac) | Jobs | Major |
| Tier 2 tab 1-2s switch delay | Jobs | Minor |
| Resources page needs full redo | Resources | Major |
| Tracker Skills tab should auto-fill from JD | Tracker | Major |
| Tracker Networking → LinkedIn linkage unclear | Tracker | Minor |
| Tracker should show apply link | Tracker | Minor |
| LinkedIn "not affiliated" contradiction | LinkedIn | Cosmetic |
| Post image upload location unclear | LinkedIn | Minor |
| Profile shows "Reichman Israel" | Profile | Cosmetic |
| Edit button on Profile doesn't work | Profile | Major |

### Remaining tasks (Task Board — Not Started)

**Isaac's scope (launch blockers):**
- Stripe integration + paywall ($12/month)
- Pilot token gate + 100-user cap
- Waitlist email capture
- Welcome email
- Privacy policy + ToS pages (blocked on Noms)

**Eli's scope:**
- Mobile responsive check — full pass across all pages
- Story Bank → Career Agent mention (~2h, P2)
- Story Bank → LinkedIn evidence injection (~2h, P2)
- Story usage tracking — write-back when stories used in CV/LinkedIn (P2, post-pilot)
- Weekly reflection space on Home (~3h, P2)
- Onborda first-run tour (P2)
- Onboarding tasks category in Tasks tab (P2)
- CV generation quality revamp
- Practicum company preference filters
- Push notifications for new job matches
- Platform help bot — in-app assistant
- Autonomous job scout — notify users of new matching jobs

### QA bugs marked "Fixed — needs testing" (Yishai)

17 bugs across onboarding, tutorial, LinkedIn, roadmap, practicum — all marked with PR numbers, assigned to Yishai for verification.

---

## IMPORTANT CONTEXT FOR NEXT AGENT

- **Supabase project ref:** `ilmqmodklutztuybsvwd`
- **Supabase token:** `/tmp/.gaj_supabase_token` (may need refresh)
- **Git remote:** `https://github.com/getajob-careers/get-a-job.git`
- **PostHog:** EU Cloud, project "Get A Job", key in Vercel env vars
- **OpenAI:** Eli's personal account, key in Supabase secrets
- **Notion hub:** https://www.notion.so/3658298b80cf811d8adfe28be1afc455
- **DOCUMENTATION.md** in repo — doc update protocol for Claude Code sessions
- **Direction 3 color scheme:** warm slate #F4F4F2, coral #F87060, Geist font. Every page now uses this.
- **tierConfig.js:** src/lib/tierConfig.js — single source of truth for tier colors/labels/taglines
- **Sidebar sections:** Home, Career (Roadmap/Jobs/Resources/Story Bank), Activity (Tracker/Calendar/Tasks/Practicum), LinkedIn, Chat (4 agents), Profile. Settings via avatar.
- **Story Bank:** now at /StoryBank (own page under Career), no longer embedded in Profile
- **Eli's working style:** plain language, real fixes, product-ready quality, ask-don't-tell, always explain decisions before confirming, don't suggest breaks
- **Test accounts:** `elienglard34@gmail.com` (main, admin) + `+test` aliases

---

## RECOMMENDED FIRST ACTIONS NEXT SESSION

1. **Have Eli test the full flow** — signup → onboarding → tutorial → Home → each feature page. Screenshots of anything that looks off.
2. **Check Isaac's progress** on Stripe, pilot gate, waitlist, welcome email
3. **Check Noms** on privacy policy
4. **Send Yishai the testing checklist** — 17 bugs marked "Fixed — needs testing" need verification
5. **Fix the 4 remaining open bugs** — JD raw HTML is the most impactful
6. **Mobile responsive check** — students open WhatsApp links on phones, full pass needed
7. **At session end:** follow DOCUMENTATION.md protocol
