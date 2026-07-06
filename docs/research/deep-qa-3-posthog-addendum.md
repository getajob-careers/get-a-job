# Deep QA 3 — PostHog Addendum (real click data)

**Read-only analysis. No code, no data changed. HELD for Eli's review — meant to land before
the IA-spec review closes, so the spec's park/dissolve calls get checked against real clicks
instead of routing inference.**

Run 2026-07-06 against the live PostHog project (`Default project`, id 180945) via scrubbed
HogQL. This is the analysis deep-qa-3's own correction banner points to — the report wrongly
assumed "no instrumentation," but PostHog has been ingesting since 2026-05-17. Every number
below is from an actual query (queries shown). This **replaces routing inference with clicks**
for the discoverability question deep-qa-3 could not answer.

---

## 0. Coverage + the scrub (read this first — it gates everything)

**The feared coverage problem did not materialise. PostHog sees ~all real users.**

```sql
select count(distinct person_id) as raw_persons,
       count(distinct if(<email is real>, person_id, null)) as scrubbed_real_persons,
       count(distinct if(person.properties.email is null, person_id, null)) as anon_no_email
from events where timestamp > now() - interval 400 day;
-- → raw 113 · scrubbed_real 50 · anon_no_email 84
```

- **50 scrubbed real persons** are identified in PostHog — against deep-qa-3's **53 real users /
  42 profiles / 35 onboarded**. That is **~94% coverage of the real-user base at the identified
  level.** Per-surface counts below are near-complete, **not deep floors.**
- PR #418's opt-in consent banner gates **anonymous** capture — that's the 84 no-email persons
  (pre-login / landing visitors), correctly out of scope. It does **not** materially suppress
  identified (post-login) users, which is what every surface below measures.
- **Scrub** (applied to every query): drop `person.properties.email` in the four team addresses
  (isaacselig@, isaacseligcoding@, elienglard34@, yishailieser@) and any `+demo/+test/+audit/
+cwsreview/cwscts`. Person-on-events mode is on (email = value at ingestion) — fine here.

**Instrumentation windows matter — not all events have equal history:**

```sql
select event, toDate(min(timestamp)) first, toDate(max(timestamp)) last, count() total …
```

| event                                     | first seen | last seen | note                                                 |
| ----------------------------------------- | ---------- | --------- | ---------------------------------------------------- |
| `$pageview`                               | 2026-05-17 | 07-06     | **full history (5,209) → reliable**                  |
| `chat_message_sent`                       | 2026-05-17 | 07-06     | full                                                 |
| `signup_completed` / `onboarding_started` | 2026-05-18 | 07-01     | full                                                 |
| `career_analysis_refreshed`               | 2026-05-18 | 07-02     | full (fires only on the Roadmap manual-refresh path) |
| `cv_uploaded`                             | 2026-05-18 | **06-25** | old name — stopped at the #412 rename                |
| `resume_uploaded`                         | **06-26**  | 07-01     | renamed target — **~10 days only**                   |
| `cv_generated`                            | **06-27**  | 07-06     | **added in #412 — ~10 days only**                    |

**⚠️ The single most important caveat:** the value-events added in **#412 (which merged ~2026-06-26)**
— `cv_generated`, `resume_uploaded` — have only ~10 days of history and are **team-test-dominated**
(`cv_generated` = 40 total events but **0 scrubbed real users** — all team CV-gen testing). The
historical real usage of CV-gen/upload predates the event. **So for CV generation and CV upload,
the DB (deep-qa-3 `function_metrics`) is the source of truth, not these events.** Pageviews and the
onboarding funnel have full history and are trustworthy.

---

## 1. Pageviews by path — the satellite verdict-checker (the headline result)

Scrubbed distinct real users per route (`$pageview`, full history):

```sql
select coalesce(nullIf(properties.$pathname,''), path(properties.$current_url)) as route,
       count(distinct person_id) as real_users, count() as pageviews
from events where event='$pageview' and timestamp > now()-interval 400 day and <scrub>
group by route order by real_users desc;
```

| route                      | real users | pageviews | read                                                          |
| -------------------------- | ---------- | --------- | ------------------------------------------------------------- |
| `/Onboarding`              | 49         | 67        | funnel entry                                                  |
| `/Home`                    | 43         | 148       | the hub                                                       |
| `/Roadmap`                 | **20**     | 60        | **reached by 20 — NOT undiscoverable**                        |
| `/Career`                  | 18         | 50        | core                                                          |
| `/Jobs`                    | **17**     | 68        | **reached by 17 — NOT undiscoverable**                        |
| `/Profile`                 | 12         | 33        |                                                               |
| `/Linkedin`                | **5**      | 9         | reached by 5                                                  |
| `/StoryBank`               | **5**      | 5         | **reached by 5 — deep-qa-3 called this "0 / undiscoverable"** |
| `/Tasks`                   | 4          | 7         | reached by 4                                                  |
| `/Tracker`                 | 4          | 9         | redirect path                                                 |
| `/CVAgent`                 | 4          | 9         |                                                               |
| `/CareerAgent`             | 4          | 9         |                                                               |
| `/SkillDevelopmentAdvisor` | **3**      | 10        | reached by 3                                                  |
| `/Internship`              | 2          | 5         | gated (7 practicum)                                           |
| `/InterviewCoach`          | 2          | 5         |                                                               |
| `/Settings` / `/Resources` | 2          |           |                                                               |
| `/Calendar`                | **1**      | 1         | **the only near-unreached satellite**                         |

**The finding that changes the diagnosis:** deep-qa-3 inferred "undiscoverable" for the satellites
from nav config. The clicks say most were **reached and skipped**, not hidden:

- **Story Bank: 5 real users reached it, 0 saved a story.** deep-qa-3 said "0 / undiscoverable."
  It's **reached-but-unwanted**, not undiscoverable.
- **Jobs: 17 reached it, 0 real job-match calls (deep-qa-3).** Heavily reached, not engaged.
- **Roadmap: 20 reached it** — the most-reached satellite; the fold-into-Career call is validated
  (users do go there), but it is far from dead.
- **LinkedIn (5), Skill Advisor (3): reached, ~0 engagement** → reached-but-unwanted.
- **Calendar (1): genuinely near-unreached** → the one clean "hide it" case.

Why this matters for the IA spec: the PARK/HIDE calls are **still right**, but the _reason_ shifts
from "undiscoverable → make it findable" to "**seen and skipped → don't invest in discovery.**"
Making Jobs/Story-Bank/Skill-Advisor more discoverable would be spending on surfaces users already
find and decline. That sharpens §4.5's "pull, not a parked page" into "**park, and don't reinvest
in pull.**"

---

## 2. Per-event real usage + onboarding funnel

Scrubbed distinct real users per named event (full-history events only — see §0 caveat):

| event                       | real users | total | note                                                       |
| --------------------------- | ---------- | ----- | ---------------------------------------------------------- |
| `onboarding_started`        | 49         | 55    |                                                            |
| `signup_completed`          | 45         | 46    | (by method: OAuth vs email available on drill-down)        |
| `onboarding_step_completed` | 41         | 282   |                                                            |
| `onboarding_completed`      | 33         | 34    | matches deep-qa-3's ~35 onboarded                          |
| `career_analysis_refreshed` | 8          | 21    | manual Roadmap refresh only (event undercounts vs DB's 23) |
| `chat_message_sent`         | 6          | 11    | standalone coach — matches deep-qa-3's "7 standalone"      |
| `resume_uploaded`           | 6          | 6     | **~10-day window only — DB says 31; use DB**               |
| `application_tracked`       | 0 real     | 19    | all team/test (deep-qa-3: 4 apps / 2 users)                |
| `cv_generated`              | **0 real** | 40    | **~10-day window, all team-test — use DB (23–25 users)**   |

**Onboarding funnel (reliable, full history):** 49 started → 41 step-completed → **33 completed ≈
67% start→complete**. This is the one place PostHog _upgrades_ deep-qa-3 from inference to a real
funnel — and it corroborates onboarding as CORE with a healthy completion rate.

---

## 3. Each IA-spec call vs the clicks

`docs/design/ia-interaction-spec.md`. **SUPPORT** = clicks/DB back the call · **SHARPEN** = call
holds but the click data changes the _reason/remedy_ · **INCONCLUSIVE** = still stage-confounded/thin.

| Surface                        | Spec call                | Click evidence (this addendum)                                                                                                                                                                              | Verdict                                                                                                                        |
| ------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Onboarding                     | CORE, keep               | 49 reached, 67% funnel completion                                                                                                                                                                           | **SUPPORT (upgraded to real funnel)**                                                                                          |
| Career                         | CORE workspace           | 18 reached; the fit/jobs hub                                                                                                                                                                                | SUPPORT                                                                                                                        |
| CV workspace                   | RISE, one-click-from-fit | CV-gen events team-only (too new); DB = 80% cost / 23–25 users. `/CVAgent` only 4 pageviews → **CV is under-trafficked as a destination today**, which _supports_ making it a first-class one-click surface | **SUPPORT (DB) + the low /CVAgent traffic argues FOR the RISE**                                                                |
| Roadmap → fold into Career     | MERGE                    | **20 real users reached /Roadmap**                                                                                                                                                                          | **SUPPORT — and it's live, not dead; preserve the content in Career, don't drop it**                                           |
| Job-match / Jobs               | FIX-DISCOVERY            | **17 reached /Jobs, ~0 engaged**                                                                                                                                                                            | **SHARPEN → the problem is not discovery (17 found it); it's that fit-on-a-job isn't wanted/ready. Re-think "FIX-DISCOVERY."** |
| Story Bank                     | PARK (undiscoverable)    | **5 reached, 0 stories**                                                                                                                                                                                    | **SHARPEN → reached-but-unwanted, not undiscoverable. Park is right; don't invest in surfacing it.**                           |
| LinkedIn suite                 | PARK / collapse          | 5 reached, ~0 engaged                                                                                                                                                                                       | **SUPPORT (sharpened: unwanted, not hidden)**                                                                                  |
| Skill Advisor / Learning paths | PARK → coach             | 3 reached, 0 learning-path calls                                                                                                                                                                            | **SUPPORT (sharpened: reached-but-unwanted)**                                                                                  |
| Calendar                       | HIDE/PARK                | **1 reached**                                                                                                                                                                                               | **SUPPORT — the cleanest hide (truly unreached)**                                                                              |
| Tasks                          | PARK, auto-gen off       | 4 reached; DB 5 done by 3                                                                                                                                                                                   | SUPPORT                                                                                                                        |
| Daily Action                   | KILL as built            | 0 completions (DB); no daily-action pageview surface                                                                                                                                                        | **SUPPORT (DB decisive)**                                                                                                      |
| Tracker (standalone)           | KILL, fold to Career tab | 4 pageviews on redirect path; `application_tracked` 0 real                                                                                                                                                  | SUPPORT                                                                                                                        |
| Internship                     | PARK until pilot         | 2 reached (gated to 7)                                                                                                                                                                                      | SUPPORT                                                                                                                        |
| Coach                          | one client, omnipresent  | 6 real standalone chatters (matches deep-qa-3)                                                                                                                                                              | SUPPORT (code-driven)                                                                                                          |

**No IA-spec call is contradicted by the clicks.** Two are **sharpened**: _Story Bank_ and _Jobs_
are reached-then-declined, not hidden — so the remedy is "park and stop reinvesting in discovery,"
not "make discoverable." One call to revisit: **Jobs "FIX-DISCOVERY"** — 17 users found /Jobs and
didn't engage, so discovery isn't the blocker (stage-readiness or the feature itself is).

---

## 4. What changed vs deep-qa-3's routing-inferred verdicts

- deep-qa-3's blanket "everything LOW-CONFIDENCE because we have no click data" is **void** — the
  clicks exist and cover ~94% of real users.
- The satellites deep-qa-3 marked **UNDISCOVERABLE** were, for the most part, **REACHED** (Story
  Bank 5, Jobs 17, Roadmap 20, LinkedIn 5, Skill Advisor 3). The correct label is **reached-but-
  unwanted**. Verdicts don't flip (park stays park) but the _reasoning_ does, and so does the
  implied remedy.
- **Onboarding** gets a real funnel (67% completion) instead of a row-count inference.
- **Calendar** is the one satellite the clicks confirm as genuinely unreached (1 user).

## 5. Honest limits

- **CV-gen / upload events are ~10 days old and team-dominated** — CV-gen volume MUST come from the
  DB, not `cv_generated`. This is the biggest interpretation trap; §0 states it.
- **Small-n stands:** 50 real persons; single-digit counts on every satellite. Directionally clear
  (reached-vs-not), not statistically tight.
- **Stage confound:** ~35 pre-application students — the apply/track tail being thin is partly
  "not there yet," which clicks narrow but don't fully resolve.
- **`career_analysis_refreshed` (8) undercounts** the DB's 23 chosen refreshers — the event only
  fires on the Roadmap manual-refresh path, not on every career-analysis run.

---

_Addendum to deep-qa-3. Read-only, held. Informs Eli's IA-spec review; does not rewrite deep-qa-3's
verdicts. Queries were run live 2026-07-06 against project 180945._
