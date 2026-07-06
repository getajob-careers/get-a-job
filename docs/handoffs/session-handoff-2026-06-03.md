# Session Handoff — 2026-06-03

Repo: `getajob-careers/get-a-job` · Supabase ref `ilmqmodklutztuybsvwd` (region `ap-southeast-1`)
Operating loop unchanged: Claude.ai = reviewer/architect, Claude Code = builder, no auto-merge; verify branch → Eli merges → CC squash-merges + deploys.

---

## 1. Isaac track-display bug — DIAGNOSED, fix pending (most recent thread)

**Symptom:** Isaac's Career Roadmap shows no Track 2; Jobs page shows Track 1 as having no roles.

**Verdict: NOT a data bug. It's a stale frontend build in his browser.**

Evidence gathered (all via Supabase MCP, read-only):
- Active account = `b16b7ad7-dfe8-44ff-8ebf-13eedb1ecdd3` (isaacseligcoding@gmail.com). In the DB it has **all three tracks**: Track 1 = 3 SWE roles, Track 2 = 5 (BI Analyst, Ops Analyst, Data Scientist, SEO, L&D), Track 3 = 3 (Tech Lead, Eng Mgr, Director).
- All 11 roles written in **one batch at 07:35:54 UTC (10:35:54 IDT)**, single distinct write time, unchanged since. Isaac refreshed ~10:40 IDT — **4 min after** the data was correct.
- RLS on `career_roles` is the clean own-row pattern (`auth.uid() = user_id`), no track conditions → returns all rows.
- `Roadmap.jsx` (lines 129–131) and `Jobs.jsx` (lines 104–108) both read `r.track` **directly** off the stored column ("P8: no client-side re-tracking"). No transform. Track values system-wide are clean `track_1/2/3` (len 7), no malformed/uncategorized values.
- Job cache healthy: 3,685 jobs / 2,969 active / 1,526 eng titles / fresh today. Not a cache-gap issue.
- Stale demo accounts (ignore): `42d8133f` = isaacselig+demo@gmail.com (all 5 roles track_2, last login May 18); `294d7fca` = isaacselig@gmail.com (March).

**Conclusion:** data + RLS + current code all correct; a hard refresh didn't fix it → his browser is running a **stale JS bundle** (a hard refresh does NOT unregister a service worker). Old bundle predates the P8 "read track directly" change and re-derives tracks client-side, dropping them.

**NEXT STEP (Isaac, ~30 sec):** open getajob.careers in an **incognito window**, log in, check Roadmap.
- Tracks appear → his browser is pinned to old bundle → DevTools → Application → Service Workers → **Unregister** + **Clear site data** + reload.
- Tracks still missing → **production is behind `main`** (P8 not deployed) → verify the latest build is live in Vercel / redeploy.
- Also: DevTools → Network → reload → `career_roles` request. URL should be `user_id=eq.b16b7ad7…`; response should list all 11 rows incl. the 5 `track_2`. Response has them but UI hides them = confirms it's the build, not data.

**Durable fix (separate small PR, so a real pilot user can't hit this):**
- `careerRoles` query should self-heal: `refetchOnWindowFocus: true` or `refetchOnMount: "always"` (role changes are rare but high-impact).
- Latent bug: Jobs and Roadmap share queryKey `["careerRoles", userId]` but with **different select shapes** (Jobs: `title, track, readiness_score`; Roadmap: `*`) — whichever refetches last overwrites the other's shape. Unify into one shared hook (mirror the `useProfileQuery` consolidation).
- Same family as the known "profile edits don't propagate" cache-invalidation bug. `invalidateAfterCareerAnalysis` (in `src/lib/invalidateAfterCareerAnalysis.js`) already invalidates the key correctly, but only in the tab that triggered the regen — hence the cross-session staleness.

---

## 2. CV title/company mislabel bug — PR #234, verified PASS, awaiting merge+deploy confirmation

Root cause confirmed: `generate-tailored-cv` reconcile step keyed LLM output → DB experiences by **date string** (fragile) + an operator-precedence bug making every end-date render "present" → collapsed multiple experiences onto one title.

PR #234 (`eli/fix-cv-title-mislabel`) — **option (b)** implemented + verified on branch by me:
- New pure module `supabase/functions/generate-tailored-cv/reconcile.ts` with `fillFromSource()` — server drives from its **authoritative experience list by integer index**; output length = sources length (no experience can vanish); two-pass first-wins + positional fallback for out-of-range indices (logs, never drops); title/company/dates always from DB; `formatExperienceDates` fixes the precedence bug; empty bullets → responsibilities fallback. LLM emits `{index, bullets}` only.
- Per-bucket org field correct: professional→`company`, military→`unit`, volunteering/leadership→`organization`.
- Deleted: `matchSource`, `sanitizeTitle`, `BUCKET_FALLBACK`, `VERB_PREFIX`, the precedence line (0 refs remain).
- 12 tests incl. the two regression cases (identical-"Present"-dates collapse; precedence) + the server-driven invariant. 629/629 green, lint/build clean, typecheck at 400 baseline.

**NEXT STEP:** merge prompt was issued to CC. It must: (1) squash-merge #234, (2) **manually deploy** `supabase functions deploy generate-tailored-cv --project-ref ilmqmodklutztuybsvwd` (edge fns do NOT auto-deploy), (3) post-deploy regen a CV on the isaacseligcoding profile (5 experiences) and confirm each renders its own correct title. **Not yet confirmed done** — check CC.

---

## 3. AI output-quality deep dive — COMPLETE

Doc: **https://www.notion.so/3738298b80cf812790c8d161575b87bb** ("AI Output Quality — Platform Deep Dive"). All 15 LLM surfaces scored across Batches 1–4, plus 5 cross-cutting themes, a prioritized roadmap, and an eval-harness design.

5 themes: (1) LLM↔server authority split predicts reliability; (2) dominant lever differs per surface (no blanket fix); (3) **H1 deliverable-first is systemic** — every generator emits the deliverable as the first/only key with no reasoning step, baked into the `json_object` "OUTPUT shape" convention; uniform fix = a leading reasoning field; (4) context gaps explain the flagged complaints (story bank = thin input; tasks = no dedup memory); (5) model choice doesn't track importance — **ai-chat (the surface users talk to) runs on gpt-4o-mini** = biggest perceived-quality lever.

Healthy surfaces: career-analysis, daily-action, proof-signals, internship-profile, company-matching, learning-paths (they constrain the LLM / validate against source / validate URLs). Weak: CV (just fixed), story bank, tasks, outreach. Bright spot: `generate-linkedin-content` joins experiences by uuid — the exact pattern CV's fix adopted.

**Prioritized roadmap (in the doc):**
- **Tier 0 (ship now, correctness):** CV title fix (= PR #234, in flight); **tasks dedup-context** (feed recent/active/completed tasks + "make these different" — fixes the "originality" complaint; no dedup input exists today).
- **Tier 1 (eval-gated):** ai-chat → gpt-4o (gate on cost — highest-volume surface); outreach leading-reasoning-field A/B.
- **Tier 2:** systemic leading-reasoning-field pass (post, profile content, comment, job-match) after the A/B proves it; story-bank resourcing (grounding context + reframe parse→extract-and-ground + reasoning field + gpt-4o).
- **Tier 3:** job-match reasoning-first (+gpt-4o); comment relevance-gate-first; career-analysis skill-credit evidence.
- **Eval harness:** 8–15 frozen real inputs per surface + per-surface rubric + 2 scoring layers (programmatic groundedness/substring checks + LLM-as-judge) logged to Langfuse Scores; guardrail regression suite (anti-fabrication) pre-deploy. Build MVP for the 4–5 roadmap surfaces.

**Outreach A/B (pending Eli):** CC wrote `scripts/ab-outreach-reasoning.ts` (2 fixtures). Needs `OPENAI_API_KEY=sk-… npx tsx scripts/ab-outreach-reasoning.ts` run locally; paste stdout back. Not yet run. Seeds the eval harness.

19 Notion Task Board cards covering the full pre-launch backlog were created (data source `ddf6e32b-f852-4070-b586-0ddb68a411a8`).

---

## 4. Redesign rollout — COMPLETE except Landing

All page-restyle PRs through Settings (#233) merged + deployed (rd-token design system). **Landing page (3O) is the last one, deferred** — when built, the "3N Settings shipped" tracker marker folds into that PR. Rollout is done after Landing.

---

## 5. Legal docs — drafted, not yet wired

`privacy-policy.md` + `terms-of-service.md` delivered (prior session, in outputs). Key correction applied: Supabase region = **Singapore ap-southeast-1** (not US). Processors documented: PostHog (EU), Langfuse (region unverified), Cloudflare Turnstile.

**Open for Eli + Noms:** GDPR scope decision (EU analytics + open user base), legal entity name/address, Langfuse region, DPAs, consent banner. **Pending wiring:** `/privacy` + `/terms` routes + signup consent checkbox.

---

## Key IDs
- Supabase project: `ilmqmodklutztuybsvwd` (ap-southeast-1)
- Isaac active acct: `b16b7ad7-dfe8-44ff-8ebf-13eedb1ecdd3` (isaacseligcoding@gmail.com)
- Deep-dive doc: `3738298b80cf812790c8d161575b87bb`
- Notion hub: `3658298b80cf811d8adfe28be1afc455` · Task Board ds `ddf6e32b-f852-4070-b586-0ddb68a411a8` · QA Tracker ds `9ef45172-1a84-45aa-8797-c8a6f820329b`

## Immediate next actions
1. Isaac: incognito test → service worker unregister **or** verify prod has P8 deployed.
2. Confirm CC merged #234 **and** ran the edge-function deploy + regen check.
3. (Optional) build the careerRoles self-heal + shared-hook PR.
4. Tasks dedup-context (Tier 0 #2).
5. Run the outreach A/B locally; then decide Tier 1/2 via the eval harness.
6. Landing page redesign (3O) to close the rollout.
