
Get A Job (getajob.careers). Supabase ref `ilmqmodklutztuybsvwd`, repo `getajob-careers/get-a-job`, local `/Users/elienglard/getajob`.

---

## SHIPPED + VERIFIED THIS SESSION

### PR #417 — Skill-coverage honesty gate (Phase 0) — MERGED, DEPLOYED, DORMANT
- Squashed to main (commit `ad91fca`), branch deleted, both edge functions deployed (`extract-job-requirements`, `generate-career-analysis`), Vercel green.
- Fixes the fake-high score bug (developer profile scored 92% for "Analytical Chemist"). Root cause was domain-coverage gap, not a scoring bug: out-of-domain skills get extracted but fail to map to the small library, so the scorer intersects against generic leftovers.
- Adds `skill_coverage_ratio` (resolved/total extracted skills) to `jobs` + `career_roles`. Both backfilled. Verified distribution: 5,694 jobs scored, 1,833 (32.2%) flagged <0.4, clean split (avg 0.677 above / 0.179 below; in-domain tech 0.681 vs out-of-domain 0.184).
- **OFF by default.** Activates only with `?coverage_gate=1` (and `?coverage_threshold=` to tune live).
- **TODO when you want it live:** turn on `?coverage_gate=1`, eyeball that out-of-domain roles show "limited data" and real tech roles still score, then a tiny follow-up flips it default. Start at 0.4, tune down toward 0.35 if it suppresses too many real tech roles.

### PR #418 — Cookie consent banner + PostHog early-init — MERGED, ACTIVATED, VERIFIED
- Squashed to main (commit `2456c26`), branch deleted, Vercel green.
- **ACTIVATED:** `VITE_POSTHOG_EARLY_INIT=true` set in Vercel production + redeployed (you did this manually; env vars are not accessible to CC or the Vercel connector).
- **VERIFIED WITH REAL DATA:** confirmed an anonymous pageview (path `/`, no user_id, anonymous distinct_id) landed in PostHog from the incognito test at 16:06 UTC. Top-of-funnel blindness is fixed going forward. Banner looked fine in incognito.
- Conservative/compliant build: nothing fires before Accept, Decline genuinely blocks, equal-weight buttons (no dark pattern), 12-month consent expiry, analytics-only single-purpose copy, fail-safe. Uses `--rd-*` design tokens.
- **Caveats:** not retroactive (past ~795 visitors only countable via Cloudflare); only captures *consenting* visitors (so PostHog anon numbers run below Cloudflare's raw count, expected). Extension confirmed to load NO analytics, so Chrome Web Store review is unaffected.
- **Legal:** you researched it, built the conservative version, made the call. Noms did not formally review. Worth keeping a note of the research/decision/date as a consent record. The same consent question still gates lifecycle marketing emails.

---

## THE BIG ANALYTICS FINDING (the spine of the day)

**PostHog was blind to ~98% of top-of-funnel traffic.** It only initialized inside the authenticated app, so it never fired for logged-out visitors. PostHog showed ~9 landing views in two weeks; **Cloudflare showed ~795 unique visitors in 9 days (June 17-25), growing 50→155/day.** PR #418 fixes this going forward.

**The real funnel (reconciled across authoritative sources):**
- ~795 visitors (Cloudflare) → 45 signups (~5-6%) → 33 onboarded → 27 completed → 24 activated (generated a CV).
- Biggest absolute leak is visitor→signup (~750 don't sign up). Could not see WHY until PostHog fix (now live).

**Source-of-truth map (important, keep using this):**
- Cloudflare = real traffic / top-of-funnel (server-side, sees everyone). NOT PostHog for traffic.
- PostHog = logged-in behavior (reliable) + now anonymous consenting visitors going forward.
- Supabase = accounts / signups (complete, accurate).
- Langfuse + function_metrics = AI cost / calls.

**AdminLaunch has 3 known bugs** (still unfixed): (1) `is_internal_user` misses Noms (90bcf097), (2) cost-card "active users" counts crons/system jobs, (3) funnel tiles count from `profiles` not `auth.users`, so it HIDES pre-onboarding signups (shows 33, real is 45). **Needs a fix to count from auth.users.** Deferred.

**Onboarding drop-off:** mostly pre-launch friend-testers hitting since-fixed bugs (e.g. sammyshai97 = friend, mobile CV-upload bug now fixed — NOT current). Real recent post-launch drop-offs: danibronstein (got several steps then stalled), Tayla (mobile→desktop device-switch), Tzvi Feifel (1-second bounce, Agentic Israel partner who hasn't really tried the product), Reichman student daniel.basiktashtash. The genuinely-recent drop pattern: people complete the cv step then stall at the transition out of it. **Lesson repeated all day: separate pre-launch tester contamination from real post-launch drop-off before concluding.** (Launch was June 7, NOT June 26. June 26 = open signup/Google OAuth.)

---

## PARKED — WAITING ON YOU (no urgency)

### Hebrew → ESCO eval: GO (provisional) — needs your 30-min review
- The eval cleared the load-bearing risk: **Hebrew→ESCO mapping works.** Zero mistranslations across 90 real phrases (incl. trade slang, Israeli-specific terms), zero garbage mappings, 91% recall, ~$7 to map the whole unmapped table.
- **The asterisk:** strict precision 58%, "usable precision" (incl. broader proxies) 100%. The 42% proxy bucket is the question — fine for AI grounding, maybe too loose for scoring.
- Weak domains (ESCO genuinely lacks Israeli concepts): finance/insurance, bare sales nouns. Fix = a small local extension layer for the ~15-20% ESCO doesn't cover. Not a NO-GO, a known addition.
- **YOUR TASK:** review `human_review_for_eli.csv` (90 rows, frequency-sorted, on branch `eval/hebrew-esco-mapping` at `scripts/eval/esco-hebrew/`). Focus on the 30 "acceptable-proxy" rows: mark each "ok for scoring" or "too loose" in the `eli_verdict` column. The top ~30 rows matter most (highest-frequency skills). Open in a spreadsheet locally or view on GitHub on that branch.
- **Decision your review produces:** proxies tight enough → unambiguous GO to Phase 1. Proxies too loose → still GO, but Phase 1 builds the extension layer first. Either way you proceed.
- After your review, ask Claude to draft the Phase 1 prompt (load ESCO into Postgres + LLM-crosswalk the 195 roles / 422 skills to ESCO URIs, read-only/additive). Phases 2-3 (re-point extraction needs pgvector; rewire scoring has the silent-zero risk) come later, gated.
- **Bonus idea worth keeping:** ESCO as an AI knowledge base, not just a scorer. Once loaded in Postgres, the coach / CV gen / career analysis can query it for grounded answers ("what does an X actually require"). Largely free byproduct of the migration.

### Coach capability question (queued, not started)
- The on-page coach is the most-SAMPLED feature (~30 users) but least sticky (most use once). CV gen is fewer users but deep repeat. Open question: **is the coach as capable as the other agents** (model? context/grounding? data access?). Worth a read-only CC investigation comparing the coach's model + context vs CV gen (Claude Sonnet) etc. The coach is the feature most people meet, so getting it strong is high-leverage. ESCO-as-knowledge-base would directly help it.

### Lifecycle emails (parked on Noms consent ruling)
- Abandoned-onboarding nudge + personalized job-fit emails. Gated on Noms confirming marketing-email consent (Israeli anti-spam, consent-first). Reuse existing send-reengagement / Resend pattern.

### Smaller deferred items
- AdminLaunch fix (count from auth.users, exclude the 9 internal incl Noms, fix cost-card).
- CV title mislabel bug (generate-tailored-cv renders all experiences' title+company identically).
- LinkedIn outreach generator quality (needs failure-mode diagnosis first).

---

## YISHAI HANDOFF (done)
- Built a complete handoff doc for Yishai's QA + Base44 design AI: product, features, **verified live design tokens** (the `--rd-*` system — warm cream `#FAF6F0`, coral `#EF5A41` CTA-only, teal success, golden stats, Rokkitt slab-serif headings, rounded pills + 18px cards; codebase mid-migration off legacy shadcn grayscale), screens, architecture, extension. At `/mnt/user-data/outputs/getajob-complete-handoff.md`. Note: design tokens are canonical but live site is mid-migration, design to the tokens.

---

## PERSONAL (your job search)
- **Shira Rubinoff message (ready to send):** a contact via your mom, offered her network for help. You're looking for a **junior PM role, AI-ish, Israel or remote.** Message drafted and tightened (graduating now / available, Guardio product-insight story, built an AI product, AI-savvy, already connected on LinkedIn). Lead with the Guardio billing-insight that changed company policy + having shipped Get A Job.
- **CV review:** the "Junior Product Manager" CV is well-aimed. **Main fix before her intros flow: accuracy pass on the numbers** — the CV cites stale/understated figures (says ~800 companies / 18 functions / 3,000 jobs; real is ~908 companies / 27 functions / ~4,100 active jobs / ~40 tables). You hold your product to anti-fabrication; hold the CV to it too. Also update degree to graduating, and "OpenAI" → "OpenAI + Claude" (you route to both). Worth doing before leaning on Shira's network, since stale numbers reflect on her too.

---

## STANDING RULES (unchanged)
- Verify CC self-reports against live Supabase/PostHog before any merge. Never trust displayed outputs alone.
- HOLD-FOR-REVIEW on all PRs. Squash-merge then delete branch as separate steps.
- Edge functions need manual deploy after merge (`supabase functions deploy <name> --project-ref ilmqmodklutztuybsvwd`).
- No em dashes anywhere. Short, dense answers.
- Env vars (Vercel) are yours alone to set — not accessible to CC or connectors.
- Production-critical paths (auth, scoring, analytics init): opt-in flag + verify before default (PR #156 lesson). Watch the silent-zero failure mode on the ESCO scoring cutover.

---

## IMMEDIATE NEXT ACTION
Nothing urgent. When you next sit down: either (a) the 30-min Hebrew CSV review to unblock ESCO Phase 1, (b) turn on the coverage gate (`?coverage_gate=1`) and verify, or (c) the coach investigation. Send the Shira message whenever; do the CV accuracy pass before her intros start.
