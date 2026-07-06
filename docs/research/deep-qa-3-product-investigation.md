# Deep QA Pass 3 — Full Product Investigation

**Investigation only. No code changed. Recommendations are ranked; decisions are Eli's.**
Synthesized 2026-07-05 from three ground-truth passes (all queries/LOC shown in the part files):

- Part 1 — Inventory: [`deep-qa-3-inventory.md`](./deep-qa-3-inventory.md)
- Part 2 — Scrubbed usage: [`deep-qa-3-usage.md`](./deep-qa-3-usage.md)
- Part 3 — Redundancy: [`deep-qa-3-redundancy.md`](./deep-qa-3-redundancy.md)

---

> **⚠️ CORRECTION — 2026-07-06 (Arc 0 PR#5).** The **"no event instrumentation"** premise
> this report is built on is **false**. PostHog client instrumentation shipped in **PR #412**
> (`cv_generated`, `resume_uploaded`, `signup_completed` for OAuth, `$pageview` autocapture on
> `history_change`) and is **verified ingesting live** (2026-07-06): the PostHog events schema
> shows `$pageview`, `signup_completed`, `cv_generated`, `resume_uploaded`,
> `career_analysis_refreshed`, `application_tracked`, `chat_message_sent`, and the full
> onboarding funnel all receiving data. The report reached its false negative by checking the
> **Postgres table list** for an `events` table — but PostHog is a client→SaaS pipe, not a DB
> table. **Consequences:** (1) **Cheap Win #5 ("instrument events") is already done.** (2) The
> blanket _"this whole report is LOW-CONFIDENCE because we have no click data"_ caveat is
> **void** — the click data exists. The genuinely LOW-CONFIDENCE constraint is now just small-n,
> not blindness. (3) The real next move is a **read-only PostHog analysis addendum** (queued):
> pull real funnel/event counts for every surface the IA spec makes a call on — especially the
> satellites, where _undiscoverable-vs-unwanted_ is finally answerable from clicks instead of
> routing inference. Counts elsewhere in this report (**53 real users, 32 edge functions**) are
> correct as written. Individual verdicts below are left **as-is but flagged** — upgrading them
> is the addendum's job, not this correction's.

---

## The honesty caveat, up front

**Real users: 53** (the "~38" was stale from mid-June; ~35 completed onboarding = the realistic active denominator). **There is no event instrumentation** (no PostHog/events table) — so "abandoned" is inferred from routing + row counts, never from clicks. _[CORRECTED 2026-07-06 — this is false; PostHog instrumentation is live and ingesting. See the correction banner above.]_ **At n≈35, almost every per-feature verdict is LOW-CONFIDENCE** and is marked so below. This report tells you where to _look_ and what to _stop paying for_; it cannot, at this n, tell you what users would love if they found it. **The single highest-leverage move in the whole report is to fix that** (Cheap Win #5).

---

## PART 4 — VERDICT TABLE

Verdicts: **CORE** (the loop lives here) · **KEEP** (earns its complexity) · **COMBINE** (fold into X) · **PARK** (hide entry points, keep code) · **KILL** (delete) · **FIX-DISCOVERY** (works, nobody can find it).

| Surface                                                                                          | Verdict                 | One-line case                                                                                                        | Conf.       |
| ------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------- |
| Onboarding                                                                                       | **CORE**                | The funnel; 35/53 complete it and it fires career-analysis — the whole spine starts here                             | Med         |
| Career (roadmap + absorbed tracker)                                                              | **CORE**                | Career-analysis is the **healthiest real demand** — 35 users, 23 _chose_ to refresh                                  | Med         |
| CV generation (chat/tracker/checklist → `generate-tailored-cv`)                                  | **CORE**                | The **top chosen, paid** feature: 23–25 users, **~80% of real-user cost**                                            | Med         |
| Coach / AI-chat (`ai-chat`)                                                                      | **CORE**                | Connective tissue: onboarding reality-check + the CV-gen trigger; 38 users touch it                                  | Med         |
| CV Studio (`/CVAgent`, `refine-cv`+`render-cv`+`edit-cv`)                                        | **COMBINE → CV engine** | It's the edit-after-generate surface but runs a **second CV engine + second renderer**; low standalone use           | Low         |
| The two chat clients (`ChatInterface.jsx` vs `CoachThread` stack)                                | **COMBINE → one coach** | Same `ai-chat` backend, streamed/rendered/retried **twice** (1,452 LOC + a whole parallel stack)                     | High (code) |
| Profile                                                                                          | **KEEP**                | 1,383 LOC but it's the data source everything else reads                                                             | High        |
| Tasks (`generate-tasks`)                                                                         | **PARK**                | 35 reached, **5 completed by 3 users** — auto-generated, ignored. Stop: 1 edge fn + prompt upkeep                    | Low         |
| Daily Action (`generate-daily-action` + cron)                                                    | **KILL (as built)**     | 50 users, **0 completions / 723 pending rows** — 100% auto noise. Stop: 1 fn + 1 cron + a dead table growing nightly | Med         |
| Story Bank (`extract-story-from-text`, `stories`)                                                | **PARK**                | ~0 real use, **delisted from nav** = undiscoverable; but it feeds CV bullets, so keep code                           | Low         |
| LinkedIn suite (6 edge fns: posts/outreach/comment/optimize/import/…)                            | **PARK**                | ~0 real use, undiscoverable. **Biggest satellite maintenance tax** — 6 deployed fns for a feature nobody reaches     | Low→Med     |
| Internships (`match-internship-companies` + 2 fns, gated)                                        | **PARK until pilot**    | Premature — gated to 7 practicum users; the pilot is **Aug–Nov 2026**. Revisit then                                  | Med         |
| Learning paths (`generate-learning-paths`)                                                       | **PARK**                | ~0 use, premature for a pre-application student base                                                                 | Low         |
| Job match / suggestions                                                                          | **FIX-DISCOVERY**       | Real loop value (see-a-job → fit) but undiscoverable; `job_suggestions` table is empty                               | Low         |
| Tracker (standalone `Tracker.jsx`)                                                               | **KILL**                | Already redirect-only → Career; the file is mounted only by the preview harness                                      | High        |
| Legacy edge fns (`generateApplicationTasks`, `generateTailoredCV`, `generate-application-tasks`) | **KILL**                | Remote-only camelCase duplicates, **no caller anywhere**                                                             | High        |
| `send-reengagement` (+ `campaign_sends`)                                                         | **KILL**                | 564 LOC, **not deployed, no caller**; its only table is orphaned (36 rows)                                           | High        |
| `send-waitlist-email` + `waitlist_signups`                                                       | **KILL**                | Table empty (0 rows); waitlist era is over                                                                           | High        |
| Empty tables (`calendar_events`, `cv_templates`, `job_suggestions`) + rollback backup            | **KILL**                | 0 rows, no reader                                                                                                    | High        |
| Eval tables (`bakeoff_results`, `refine_rebake_results`, `jd_unmapped_skill_counts`)             | **KEEP (out of app)**   | Legit eval telemetry, read by scripts only — just don't confuse with product tables                                  | High        |
| Chrome extension (2nd `ai-chat` client, `extract-jd-basics`/`lookup-role-skills`)                | **KEEP (own arc)**      | Distinct distribution bet; note it doubles the coach-client surface                                                  | Low         |

**Maintenance cost we stop paying if PARK/KILL land:** ~**8 deployable edge functions** retired or dormant (3 legacy + send-reengagement + send-waitlist + daily-action + learning-paths + the LinkedIn suite parked), **~5 dead tables** dropped, the **nightly daily-action cron** stopped (it writes 700+ ignored rows and burns LLM spend), and — from the usage pass — a chunk of the **63% of edge-fn cost that isn't real-user** ($36.94 of $58.46 over the window) that was team/test/**cron** spend.

---

## TOP 5 CHEAP WINS (use what exists; days, not weeks)

1. **Fix the track-assignment drift bug.** `scoreApplication.js` uses a **0.80** relaxed-T1 alignment gate; `generate-career-analysis` hardcodes **0.70**; T3 uses post-penalty `fit` on one path, pre-penalty `rawSkillFit` on another. _The same user + same job gets a different track depending on which surface renders it._ Reconcile the constants (one shared value) — correctness, not cleanup. **[Confirmed bug]**
2. **Delete the pure dead weight.** 3 camelCase legacy edge fns + `send-reengagement` + `send-waitlist-email` + the 4 empty tables + `campaign_sends` + the rollback backup + `Tracker.jsx`/`ConversationSelector.jsx`. Zero callers, zero risk, immediate clarity.
3. **Kill Daily Action as built.** 0 completions across 50 users, 723 pending rows, a nightly cron that writes noise + spends on LLM. Stop the cron, hide the surface. (Keep the _idea_ for when there's a loop to nudge toward.)
4. **Collapse the skill-alias resolver triplication** into the already-canonical `resolveSkillAliases` (`_shared/skill-aliases.ts`); delete the inline copy in `extract-job-requirements` and reconcile `skillResolver.js`.
5. ~~**Instrument events (PostHog or an `events` table).**~~ **✅ ALREADY DONE (PR #412, verified live 2026-07-06 — see correction banner).** The click data this cheap win asked for already exists in PostHog. The remaining work is not to instrument but to **analyze** the collected data (queued read-only addendum); that analysis, not routing inference, is now the cheapest way to turn the LOW-CONFIDENCE verdicts below into confident ones.

## TOP 5 STRUCTURAL MOVES (weeks; reshape the platform)

1. **Unify the CV engine.** One generate → refine → render → edit chokepoint (fold `refine-cv`/`render-cv`/`edit-cv` + `generate-tailored-cv` behind one path; add the already-queued single-enforcement-gate + single-renderer). This is the **core loop and ~80% of real-user cost** — today it's 2 engines, 2 renderers, and a CV-gen invoke body **copy-pasted inline in 3 places**.
2. **Unify the two chat clients into one coach.** `ChatInterface.jsx` (1,452 LOC) and the `CoachThread`/`CoachInput`/`CoachConversationContext` dock stack both stream/render/retry the same `ai-chat` — **every coach feature is built twice.** Biggest single maintenance tax in the codebase.
3. **One shared `assignTrack()`** across the three scoring surfaces — permanently kills the drift-bug _class_ (Cheap Win #1 fixes today's instance; this stops it recurring).
4. **PARK the satellite belt** (LinkedIn suite, internships-until-pilot, learning paths, story bank, tasks/daily-action). Hide entry points, stop the crons + LLM spend, keep the code. Reclaims focus and most of the non-core spend for a team shipping a launch.
5. **Rebuild the nav around the actual loop.** Make the **one chosen, paid** thing (CV generation) the obvious center — reachable in one step from "here's your fit," not via Track → Generate. The reworked nav (Today/Career/Chat/Profile) already delisted the satellites; finish the job by pointing the whole surface at onboard → fit → CV.

---

## PART 5 — THE STRATEGIC READ

**The core loop the data actually shows.** Not the aspirational "see job → fit → tailor → apply → track." The _observed_ loop is shorter and paid:

> **onboard → see your fit & roadmap (career-analysis) → generate a tailored CV.**

That's where every real signal concentrates: onboarding is the only thing 35 people finish, career-analysis is the only thing users _choose to re-run_ (23 refreshes), and CV generation is the only thing they _spend money to get_ (~80% of real cost, 23–25 users). Everything past "generate a CV" — apply, track, LinkedIn, internships, tasks, daily action, story bank — is either **undiscoverable** (delisted from nav) or **premature** (the tracker has 4 applications from 2 users; the internship pilot is months away). The "apply → track" tail exists in code but not in behavior.

**What % of code serves it.** Rough, by LOC + edge-fn count: the spine (onboarding, Career, `ai-chat`, `generate-career-analysis`, `generate-tailored-cv`/`refine`/`render`/`edit`, Profile) is **roughly half** the shipping surface. The other half — 6 LinkedIn fns, 3 internship fns, learning paths, tasks/daily-action, story bank, the second chat engine, the tracker, the dead/legacy pile — serves surfaces at **~0 real usage**. You are maintaining two products: the one people use, and a satellite belt they can't find or aren't ready for.

**The platform rebuilt around only the loop + top 3 satellites.** Keep the spine. Keep exactly three satellites: **(1) the coach** (one engine) as the connective tissue that runs the loop conversationally; **(2) the tracker** as the lightweight "I applied" home the loop hands off to (kept simple, not a Kanban product); **(3) job-fit/match** made _discoverable_ so the loop can start from a real job, not just a stored roadmap. Park everything else. The result is a product that does one thing users demonstrably want — _turn where-you-stand into a CV for a specific role_ — and is ~half the code to maintain through launch.

**The 5 highest-leverage improvements to the loop itself (not new features):**

1. **Fix track-drift** so fit is consistent wherever it renders (trust: the number can't disagree with itself).
2. **Make career-analysis refresh cheaper/faster** — it's the healthiest demand and it's the ~80s wait; the honest progress bar shipped, now attack the latency/cost.
3. **One CV engine, one renderer** — the download and the Studio preview must be the same document (already found diverging), and the enforcement gate must run once.
4. **One coach** — halve the surface so every loop improvement ships once, not twice.
5. **Point discovery at CV-gen** — the one paid thing should be one click from onboarding's payoff, and instrumented so we finally know what happens after.

**Nothing here is a decision.** It's a ranked read of what the ~35-user data supports, with the big nominations on the table (Daily Action → kill-as-built, LinkedIn/internships/learning-paths → park, the second chat engine and second CV engine → combine). The most important caveat remains the first one: **instrument, then re-run this at n=200** — most PARK verdicts are "can't-find-it," not "don't-want-it," and only click data can tell them apart.
