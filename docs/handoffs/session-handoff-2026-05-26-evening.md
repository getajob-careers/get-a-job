# Session Handoff — May 26, 2026 (Evening)

**Previous session ended:** May 26, 2026 (~11pm)
**Next session should:** Read this file first, then check Notion Task Board + QA Tracker for current state.

---

## How to work (unchanged — see PROJECT_INSTRUCTIONS.md)

- **Ask-don't-tell with Claude Code.** Frame prompts as questions. Claude Code shows design/decisions before building; Eli confirms.
- **Eli wants plain-language explanations** before approving. Real fixes, not workarounds. Product-ready quality.
- **Code blocks = prompts for Claude Code.** Eli copy-pastes them. Regular text = conversation with Eli.
- **Claude Code does all building/execution.** This Claude (claude.ai) advises strategy, reviews, writes prompts.
- **Surface decisions for confirmation** — don't lock in architecture unilaterally.
- **Always explain before approving** — don't rubber-stamp Claude Code's defaults.
- Supabase project ref: `ilmqmodklutztuybsvwd`
- Git remote: `https://github.com/getajob-careers/get-a-job.git`
- Deploy: edge functions via `npx supabase functions deploy <slug>` (Claude Code learned this works); frontend auto-deploys via Vercel on push to main.
- **Edge functions don't auto-deploy on merge** — manual deploy after every backend PR.
- Full-CI-before-push: `npm run lint && npm test -- --run && npm run build`
- **Claude Code auto-merges PRs** on green CI for low-risk changes. High-risk changes (auth, chat, routing) wait for Eli's approval.

---

## COMPLETED THIS SESSION (May 26 — 11 PRs, massive session)

### PRs merged (chronological)

| # | What |
|---|------|
| #154 | CV fixes — grounded path restored via req_snapshot + achievement-first bullet rule + keyword stat removal |
| #158 | Retry budget hardening — 4 edge functions upgraded to 3 retries + exponential backoff + Retry-After honoring |
| #159 | Career analysis change-detection — function_cache table, hash profile inputs, skip if unchanged within 7-day TTL. 40s → 50ms on repeat |
| #160 | Fire-and-forget onboarding tasks — background generation + fallback tasks + regen banner. 20s saved on onboarding |
| #161 | Background daily action — GH Actions cron at 04:00 UTC (6-7am Israel). Home card loads instantly from DB |
| #162 | Bundle speed — lazy chunks (18 routes), Home waterfall fix, chunk-error handler, DB query timeout (Option C, 30s). 922KB → 380KB gzip (-59%) |
| #163 | Resume upload parallel — Promise.all ai-chat + extract-proof-signals. 20s → 10s |
| #164 | Pilot invite code gate — invite_codes table, waitlist_signups table, redeem_invite_code RPC (SECURITY DEFINER), 4 cohort types, inline waitlist in Login.jsx |
| #165 | Welcome + waitlist transactional emails — Resend REST API, fire-and-forget from Onboarding.jsx + Login.jsx |
| #166 | Pricing removal — stripped all $12/month, trial, subscription mentions from platform |
| #167 | Israel copy generalization — universal framing in prompts, generic placeholders, universal awards. 22 files, 5 edge functions redeployed |

### Also attempted but reverted
| #156 | Chat streaming — SSE from ai-chat. Broke: chat duplicates (stale closure), Home skeleton stuck (Supabase auth 504), CV gen 500 (OpenAI rate-limit starvation). Reverted in #157. Root causes logged in tasks/lessons.md |

### Infrastructure installed
- **claude-memory-skill** — Claude Code now logs code mistakes + patterns for future reference
- **RESEND_API_KEY** added to Supabase edge function secrets
- **function_cache table** — generic per-(user, function) cache fingerprint table, reusable for any cached feature

---

## LAUNCH BLOCKER STATUS

| Blocker | Status |
|---------|--------|
| Pilot invite code gate + 100-user cap | ✅ Shipped (PR #164) |
| Waitlist email capture | ✅ Shipped (PR #164) |
| Welcome email | ✅ Shipped (PR #165) |
| Waitlist confirmation email | ✅ Shipped (PR #165) |
| Remove pricing/subscription mentions | ✅ Shipped (PR #166) |
| Generalize Israel-specific copy | ✅ Shipped (PR #167) |
| Stripe + paywall | ⏳ Deferred — pilot is free |
| Privacy policy + ToS pages | ⏸️ Blocked on Noms |

**Invite codes NOT yet seeded.** Eli needs to create codes via SQL when ready to launch. Example pattern in migration comments. 4 cohort types: practicum_reichman, pilot_whatsapp, employee, handpicked.

---

## QA BUG AUDIT (done at end of session)

Claude Code audited 34 bugs against the codebase:
- **8 HIGH CONFIDENCE FIXED** — direct code change maps to bug
- **13 INFERRED FIXED** — code looks right but behavior not verified. Re-verification pass queued but not started.
- **2 RED FLAGS** — RPC tier→track divergent state (live DB ≠ repo), Tasks duplicate race condition
- **5 CONFIRMED STILL OPEN:**
  1. Roadmap Live Track shows Remote jobs (no filter in RPC)
  2. "How tiers work" still says "tiers" (partial rename miss)
  3. AI chat no streaming indicator (reverted #156)
  4. Story Bank textarea blends into background (no border/contrast)
  5. Practicum company list generation (DB seed issue)
- **5 UNSURE** — need prod testing or UX judgment

**Next action:** Run the re-verification pass on the 15 uncertain bugs (13 inferred + 2 red flags), THEN fix the 5 confirmed open.

---

## STILL QUEUED (not started)

### Speed improvements
- **Chat streaming retry** — biggest remaining UX win. Design ready (streamRef + phase pattern), lessons logged, retry budget hardened. Ship as opt-in (?stream=1) first.
- **CV shortcut** — direct Generate CV chip, skip chat exchange when application selected

### Pilot prep
- Seed invite codes when ready to launch
- Test end-to-end: signup with code → email confirm → onboarding → welcome email
- Test waitlist flow: invalid code → waitlist → confirmation email
- Privacy policy + ToS pages (blocked on Noms)
- Mobile responsive check

### Team coordination
- Brief Isaac on his scope (frontend bugs, cosmetics, documentation, redesigns, NotebookLM brain)
- Send Yishai QA testing checklist
- Check Noms on privacy policy

---

## KEY LESSONS FROM TODAY

1. **PR #156 streaming revert:** Never ship changes to production-critical paths (auth, chat, rendering) without testing on a feature branch with opt-in flag first. Three specific code bugs: stale closure variable (streamLocalId not nulled after finalization), Supabase auth 504 during deploy window, OpenAI rate-limit starvation from concurrent streaming fan-out.

2. **Claude Code "tiredness":** Claude Code tried to stop multiple times claiming attention degradation. Pushed back — it admitted it was pattern-matching to human team practices, not hitting real limits. Don't let it stop when there's work to do.

3. **Don't rubber-stamp defaults:** Always think through each decision. The re-onboarding force:true catch (tasks caching) and the Onboarding eager/lazy discussion were examples where questioning the default led to better decisions.

4. **Scalability over quick wins:** function_cache as a generic table (Option C) instead of profiles columns (Option A) was the right long-term call.

5. **Memory skill installed:** Claude Code now has claude-memory-skill for persistent code-mistake learning.

---

## PLATFORM COSTS (updated)

| Service | Cost | Notes |
|---------|------|-------|
| Supabase Pro | $25 | Fixed |
| OpenAI | ~$15-30 (current) / ~$100-320 (100 users) | Caching helps |
| Cloudflare | ~$1 | Domain annual amortized |
| Vercel | $0 | Free Hobby plan |
| Resend | $0 | Free tier |
| Langfuse | $0 | Free tier |
| PostHog | $0 | Free tier |
| **Total (current)** | **~$41-56/mo** | |
| **Total (100 users est.)** | **~$130-350/mo** | Depends on activity |

Cost optimization tasks logged in Notion: model downgrades, cheaper providers (Groq), OpenAI Batch API for async tasks.

---

## IMPORTANT CONTEXT FOR NEXT AGENT

- **Supabase project ref:** `ilmqmodklutztuybsvwd`
- **Git remote:** `https://github.com/getajob-careers/get-a-job.git`
- **PostHog:** EU Cloud, project "Get A Job", key in Vercel env vars
- **OpenAI:** Eli's personal account, key in Supabase secrets
- **Resend:** API key in Supabase edge function secrets (RESEND_API_KEY)
- **Notion hub:** https://www.notion.so/3658298b80cf811d8adfe28be1afc455
- **DOCUMENTATION.md** in repo — doc update protocol for Claude Code sessions
- **CV output is PDF** (pdf-lib) — not DOCX
- **Direction 3 design:** warm slate #F4F4F2, coral #F87060, Geist font
- **Bundle:** 380KB gzip main, 18 lazy routes, Onboarding stays eager
- **function_cache table:** generic cache fingerprint for any edge function (career-analysis uses it, tasks decided NOT to)
- **Invite codes:** table exists, RPC exists, frontend wired. Codes NOT seeded yet.
- **Streaming:** reverted. Retry planned with opt-in flag, streamRef+phase fix, and stress test.
- **Daily action cron:** 04:00 UTC via GH Actions. First run tomorrow.
- **Pilot is FREE** — no pricing, no trial, no Stripe. Pricing TBD based on pilot feedback.
- **4 cohort types:** practicum_reichman, pilot_whatsapp, employee, handpicked
- **Eli's working style:** plain language, real fixes, product-ready quality, ask-don't-tell, always explain decisions, don't suggest breaks or stopping, don't rubber-stamp Claude Code defaults
- **Test accounts:** `elienglard34@gmail.com` (main, admin) + `+test` aliases

---

## RECOMMENDED FIRST ACTIONS NEXT SESSION

1. **Run the QA re-verification pass** on 15 uncertain bugs (Claude Code was about to do this when session ended)
2. **Fix the 5 confirmed open bugs** — #2 (tiers→tracks) and #4 (story bank textarea) are quick cosmetic fixes
3. **Chat streaming retry** — fresh session, re-read lessons.md, opt-in flag, careful testing
4. **CV shortcut** — direct Generate chip
5. **Seed invite codes** when ready to test the pilot signup flow
6. **Check with Noms** on privacy policy
7. **Brief Isaac** on visual redesign scope
8. **Update Notion** at session end per DOCUMENTATION.md protocol
