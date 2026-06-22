# User base rundown, 2026-06-22

Read-only investigation against the live Supabase project `ilmqmodklutztuybsvwd`. Every count below was verified directly via SQL, not taken from any handoff or snapshot. Internal/team users are excluded everywhere using the canonical rule from `src/lib/internalUsers.js`: `email LIKE '%+%' OR id IN (the five team UUIDs)`. Counts are labelled real-only unless stated otherwise.

Author: Claude (for Eli). No data was written, no functions deployed, no emails sent.

## 1. Headline

We have 44 auth accounts, of which 35 are real (9 are internal/team). The acquisition story is healthy-ish: a launch trickle in mid-May, then an 18-signup WhatsApp pilot burst on June 7, settling to 32 confirmed real users. The activation story is where it falls apart. 22 users finished onboarding, but onboarding is almost entirely machine-generated content (career analysis, tasks, a master CV), and once that runs, genuine human engagement collapses to near zero. Only 5 real users have taken any human action beyond onboarding, only 1 real user has ever added a real job application, and only 1 real user has been active on two or more distinct days. Three product surfaces we shipped (Story Bank, LinkedIn Post Creator, LinkedIn Outreach Coach) have zero real-user adoption. On top of that, two data-quality problems distort the raw numbers badly: a CV re-bake test harness contaminated 22 users' sign-in timestamps and created 5 fake applications on June 19, and a welcome-email bug left 22 of 32 confirmed users never successfully welcomed. The reengagement send on June 17 produced essentially no measurable lift.

## 2. Funnel snapshot

Real users only. "Onboarding started" means a `profiles` row exists. "First app added" counts real applications only (the 5 `__REBAKE_HARNESS__` test rows are excluded, see section 9). "Returning" means human actions on two or more distinct calendar days (see hygiene note: `last_sign_in_at` cannot be used for this).

| Stage                      | Count | % of signups | Drop from prior stage            |
| -------------------------- | ----- | ------------ | -------------------------------- |
| Signups                    | 35    | 100%         | n/a                              |
| Confirmed                  | 32    | 91%          | 9% (3 never confirmed)           |
| Onboarding started         | 24    | 69%          | 25% (8 confirmed, never started) |
| Onboarding complete        | 22    | 63%          | 8% (2 stalled mid-flow)          |
| First real app added       | 1     | 3%           | 95% (the activation cliff)       |
| Returning (2+ action days) | 1     | 3%           | 0%                               |

The single catastrophic leak is onboarding-complete (22) to any genuine post-onboarding action (5 users) to a first real application (1 user). Everything upstream of that is fine.

By cohort:

| Cohort                | Signups | Confirmed | Onb started | Onb complete | Real app added |
| --------------------- | ------- | --------- | ----------- | ------------ | -------------- |
| GETAJOBPILOT          | 21      | 21        | 21          | 19           | 1              |
| INTERNSHIPGETAJOB     | 3       | 3         | 3           | 3            | 0              |
| none (no invite code) | 11      | 8         | 0           | 0            | 0              |

The "none" cohort (11 real users, no invite code, no profile) is pure top-of-funnel leakage: 8 confirmed their email and then never started onboarding, 3 never confirmed at all. The two invite cohorts onboard well but do not activate. TEAMGETAJOB (2 uses) and VIPGETAJOB (1 use) resolve to internal/team accounts and have no real-user funnel.

## 3. Signup cadence

Real signups, last 60 days. No new real signup has landed since June 16, a 6-day drought through today.

Weekly:

| Week of          | Real signups | Note                                                                            |
| ---------------- | ------------ | ------------------------------------------------------------------------------- |
| May 11           | 3            | Launch (May 12)                                                                 |
| May 18           | 2            |                                                                                 |
| May 25           | 0            | Dead week                                                                       |
| Jun 1            | 18           | WhatsApp pilot, all 18 landed Jun 7                                             |
| Jun 8            | 11           | Pilot tail                                                                      |
| Jun 15           | 1            | Last signup Jun 16                                                              |
| Jun 22 (partial) | 0            | Dead, includes the Jun 17 reengagement send (drove no new signups, as expected) |

Daily, the active days only:

| Day    | Signups |
| ------ | ------- |
| Jun 7  | 18      |
| Jun 8  | 4       |
| Jun 9  | 2       |
| Jun 10 | 2       |
| Jun 11 | 2       |
| Jun 12 | 1       |
| Jun 16 | 1       |

The "WhatsApp pilot ~June 1" event actually fired on June 7 (the entire burst is that one day). The May 25 week and the entire June 17 to 22 stretch are dead for acquisition.

## 4. Feature reach matrix

Real users only. Denominators for context: 35 signups, 32 confirmed, 22 onboarding-complete. "Users" is distinct real users with at least one row; "Total rows" exposes skew. The "System or onboarding write?" column is the load-bearing hygiene flag (see section 10): rows that exist because an edge function wrote them, not because a human chose to do something.

| Feature / table                 | Users | Total rows | System or onboarding write?                                                                                               |
| ------------------------------- | ----- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| daily_actions                   | 28    | 289        | Yes. Written by generate-daily-action and a cron (cron-generate-daily-action). Presence is not a human-engagement signal. |
| career_roles                    | 22    | 242        | Yes. Generated by generate-career-analysis at onboarding.                                                                 |
| application_cvs                 | 22    | 28         | Mixed. 22 master CVs generated at onboarding; the other 6 rows were written June 19 by the re-bake harness, not by users. |
| tasks                           | 22    | 65         | Yes. Generated by generate-tasks at onboarding.                                                                           |
| applications                    | 6     | 6          | Mostly fake. 5 of 6 are `__REBAKE_HARNESS__` test rows. Only 1 is a real human application.                               |
| chat_messages                   | 4     | 18         | Human. User-role messages across 5 conversations.                                                                         |
| conversations                   | 4     | 5          | Human.                                                                                                                    |
| linkedin_optimizations          | 2     | 2          | Human, but trivial volume.                                                                                                |
| company_targets                 | 1     | 25         | Human. One internship power user.                                                                                         |
| internship_profiles             | 1     | 1          | Human (generated on user request).                                                                                        |
| stories                         | 0     | 20         | Zero real users. All 20 rows are internal/team.                                                                           |
| linkedin_posts                  | 0     | 10         | Zero real users. All internal/team.                                                                                       |
| linkedin_outreach_conversations | 0     | 23         | Zero real users. All internal/team.                                                                                       |
| internship_pitches              | 0     | 0          | None.                                                                                                                     |

Decontaminated read: the only human-initiated, real-user feature usage in the whole product is 1 application, 4 chat users (18 messages), 1 internship-pipeline user (25 company targets), 2 LinkedIn-optimizer users, and 1 internship-profile user. Story Bank and both LinkedIn generators have never been touched by a real user.

CV generation specifically (function_metrics): in the last 30 days, generate-tailored-cv logged 166 real-user calls, but 92 of those were the June 19 harness; human CV generations come from 22 distinct users (their onboarding master CVs). refine-cv (the per-job CV feature) logged 200 real-user calls in 30 days, 148 of them the June 19 harness, and zero genuine human calls after the harness window. refine-cv has no real human usage yet.

## 5. Tracker depth

Of real users with a real application: exactly 1 user (ymayberg@gmail.com), 1 application.

| Metric                                    | Value                                      |
| ----------------------------------------- | ------------------------------------------ |
| Real users with >=1 real app              | 1                                          |
| Total real apps                           | 1                                          |
| Status distribution                       | interested: 1                              |
| Median apps per user (of users with apps) | 1                                          |
| Max apps per user                         | 1                                          |
| Status changes on real apps               | 0                                          |
| Recency of last status change             | n/a (no status changes have ever occurred) |

The one real application is PwC Israel, Entry Level Consultant, created June 18 via a job suggestion, never moved past "interested." The tracker, as a feature, is effectively unused.

## 6. Heavy users

Top 5 real users by human activity score, defined as real applications + user chat messages + company targets + status changes + conversations (all human-initiated, harness and system writes excluded). These 5 are the entire set of real users who have done anything beyond onboarding; all other 30 real users score 0.

| Email                  | Cohort            | Days since signup | Onb complete | Score | What they actually did                                                   | Last human action |
| ---------------------- | ----------------- | ----------------- | ------------ | ----- | ------------------------------------------------------------------------ | ----------------- |
| idodagan1414@gmail.com | INTERNSHIPGETAJOB | 11                | Yes          | 25    | 25 company targets via the Internship Finder; the one genuine power user | 2026-06-17        |
| naomipelled@gmail.com  | GETAJOBPILOT      | 6                 | Yes          | 5     | 4 chat messages                                                          | 2026-06-16        |
| gavibook@gmail.com     | GETAJOBPILOT      | 15                | Yes          | 5     | 3 chat messages                                                          | 2026-06-19        |
| ymayberg@gmail.com     | GETAJOBPILOT      | 13                | Yes          | 3     | 1 real application (PwC) + 1 chat message                                | 2026-06-18        |
| werner.gidon@gmail.com | GETAJOBPILOT      | 14                | Yes          | 2     | 1 chat message                                                           | 2026-06-15        |

Note: `last_sign_in_at` for all five is June 19 and is contaminated (section 9), so the "last human action" column uses feature-action timestamps instead. idodagan's company-target activity predates the June 17 reengagement send, so it is not a reengagement response.

## 7. Drift list (reactivation candidates)

Real users who completed onboarding but have taken zero human action in the last 14 days (in fact, zero human action ever beyond onboarding). 17 users. All have a system-generated master CV, career analysis, and tasks from onboarding, and then nothing. For every one of these, `last_sign_in_at` reads 2026-06-19 but is the harness artifact (section 9), so "last meaningful action" is shown as none.

| Email                       | Cohort            | last_sign_in_at (contaminated) | Last meaningful action |
| --------------------------- | ----------------- | ------------------------------ | ---------------------- |
| sofia.krasotkina@gmail.com  | GETAJOBPILOT      | 2026-06-19                     | none                   |
| ayalkariv@gmail.com         | GETAJOBPILOT      | 2026-06-19                     | none                   |
| michael@sobol.cc            | GETAJOBPILOT      | 2026-06-19                     | none                   |
| zaczbrown@gmail.com         | GETAJOBPILOT      | 2026-06-19                     | none                   |
| nevo.liani@gmail.com        | GETAJOBPILOT      | 2026-06-19                     | none                   |
| rpress13@gmail.com          | GETAJOBPILOT      | 2026-06-19                     | none                   |
| dan.sonnenblick@gmail.com   | GETAJOBPILOT      | 2026-06-19                     | none                   |
| david.p.lifschitz@gmail.com | GETAJOBPILOT      | 2026-06-19                     | none                   |
| adar123cohen@gmail.com      | GETAJOBPILOT      | 2026-06-19                     | none                   |
| danzfine@gmail.com          | GETAJOBPILOT      | 2026-06-19                     | none                   |
| amischapiro@gmail.com       | GETAJOBPILOT      | 2026-06-19                     | none                   |
| matiborlak@gmail.com        | GETAJOBPILOT      | 2026-06-19                     | none                   |
| jenna.grob22@gmail.com      | GETAJOBPILOT      | 2026-06-19                     | none                   |
| agamf123@gmail.com          | GETAJOBPILOT      | 2026-06-19                     | none                   |
| rhinepenelope@gmail.com     | GETAJOBPILOT      | 2026-06-19                     | none                   |
| ofriraichel@gmail.com       | INTERNSHIPGETAJOB | 2026-06-19                     | none                   |
| burshanadi62@gmail.com      | INTERNSHIPGETAJOB | 2026-06-19                     | none                   |

This is the highest-value reactivation list: they invested enough to finish onboarding, so they had intent, and then the product gave them no reason to come back.

## 8. Cold list (funnel-leak candidates)

Real users who signed up but never completed onboarding. 13 users, three sub-groups.

| Email                     | Cohort       | Signup     | Stall point                                                                                   |
| ------------------------- | ------------ | ---------- | --------------------------------------------------------------------------------------------- |
| rachelimiller24@gmail.com | none         | 2026-05-19 | Never confirmed email; no profile                                                             |
| jenna@bettear.com         | none         | 2026-06-07 | Never confirmed email; no profile                                                             |
| gulicheric@gmail.com      | none         | 2026-06-11 | Never confirmed email; no profile                                                             |
| noberlander323@gmail.com  | none         | 2026-05-11 | Confirmed, never started onboarding (no profile)                                              |
| judahmiller@gmail.com     | none         | 2026-05-11 | Confirmed, never started onboarding (no profile)                                              |
| emmejoshua@gmail.com      | none         | 2026-05-11 | Confirmed, never started onboarding (no profile)                                              |
| sammyshai97@yahoo.com     | none         | 2026-05-18 | Confirmed, never started onboarding (no profile)                                              |
| gastonerlijman@gmail.com  | none         | 2026-06-07 | Confirmed, never started onboarding (no profile)                                              |
| yoni.bennaim@gmail.com    | none         | 2026-06-07 | Confirmed, never started onboarding (no profile)                                              |
| salofogel@gmail.com       | none         | 2026-06-07 | Confirmed, never started onboarding (no profile)                                              |
| adarevekalter@gmail.com   | none         | 2026-06-10 | Confirmed, never started onboarding (no profile)                                              |
| redheadeg@gmail.com       | GETAJOBPILOT | 2026-06-07 | Started onboarding, stalled at step 4 (education entered, no experiences, no career analysis) |
| ybarshain@gmail.com       | GETAJOBPILOT | 2026-06-07 | Started onboarding, stalled at step 0 (entered the flow and immediately dropped)              |

The dominant leak is "confirmed but no profile" (8 users): they got an account and never entered onboarding, likely because they had no invite code to redeem (all are the "none" cohort). The 4 May signups are launch-week tire-kickers. Only 2 users actually entered the pilot onboarding flow and stalled inside it.

## 9. Anomalies and data hygiene notes

### The June 19 sign-in cluster is a test harness, confirmed

The 22 segment A+B reengagement recipients all have `last_sign_in_at` on 2026-06-19 inside three tight windows (12:30 to 12:36, 14:01 to 14:08, 15:21 to 15:25 UTC). This is not organic. Root cause, verified two ways:

1. `function_metrics` shows heavy refine-cv and generate-tailored-cv fan-out in exactly those three windows (148 refine-cv calls and 92 generate-tailored-cv calls on June 19), matching the cluster shape.
2. The codebase has the CV re-bake / bake-off harnesses (`scripts/refine-rebake.mjs`, `scripts/refine-bakeoff.mjs`) which mint a per-user JWT via `auth.admin.generateLink({type:'magiclink'})` then `verifyOtp({token_hash})`. That `verifyOtp` is exactly what overwrites `last_sign_in_at`. The harness selects onboarded users with a master CV (which is precisely the 22 A+B users), runs at concurrency 3, and was run three times that day while tuning the refine-cv variant.

The auth audit log (`auth.audit_log_entries`) returned no rows for those windows; its retention does not reach back to June 19, so it could not corroborate, but `function_metrics` is conclusive.

Consequence: `last_sign_in_at` is contaminated for all 22 A+B users and must not be used as an engagement signal for them. Throughout this doc I used feature-action timestamps instead. The raw recency distribution (today 0, last 7 days 22, 8 to 30 days 6, older 4, never 0) is misleading: strip the contamination and zero confirmed real users have organically signed in within the last 7 days, 6 are in the 8 to 30 day window, and 4 are older.

### The harness also created 5 fake applications and 6 fake CVs

5 of the 6 rows in `applications` have company `__REBAKE_HARNESS__`, created June 19 just before the mint windows, with junk titles (Director Sterile Operations, Office Manager, etc.). They are harness fixtures, not user tracker activity. Likewise 6 of the 28 `application_cvs` rows were written June 19 by the harness. Excluding these, real tracker usage is 1 application and real per-job CV usage is 0. Any naive query over `applications` or `application_cvs` will overstate engagement by roughly 6x. The `__REBAKE_HARNESS__` company sentinel makes them easy to filter; consider deleting them in a future cleanup (not done here, read-only).

### Welcome emails: 22 of 32 confirmed users never successfully welcomed

| Welcome status                      | Users |
| ----------------------------------- | ----- |
| Sent successfully (at least one ok) | 10    |
| Attempted, every attempt failed     | 14    |
| No send attempt ever logged         | 8     |

All 14 failures occurred on June 7 with the same error: `send_failed: Failed to construct 'Request': 'headers' of 'RequestInit' ...`, which is the RESEND_API_KEY newline bug. The June 8 fix stopped new failures but did not backfill these 14, so they remain unwelcomed. Of the 8 never-attempted, 4 are pre-June-1 signups (the welcome function's first call was June 1, so they predate it) and 4 are June 7 to 10 "none" cohort users who never triggered a send. Net: only 10 of 32 confirmed real users got a working welcome email.

### The three never-confirmed accounts are still unconfirmed

gulicheric@gmail.com (June 11), jenna@bettear.com (June 7), and rachelimiller24@gmail.com (May 19) remain unconfirmed today. No change since the June 17 handoff.

### Reengagement send (June 17 16:27 UTC): no measurable lift

Excluding harness writes, only 2 of 32 recipients took any human action after the send, both in segment A:

| Segment | Recipients | Active 5 days pre-send | Active post-send | Post apps | Post chat | Post company targets | Post career re-runs |
| ------- | ---------- | ---------------------- | ---------------- | --------- | --------- | -------------------- | ------------------- |
| A       | 19         | 4                      | 2                | 1         | 2         | 0                    | 0                   |
| B       | 3          | 1                      | 0                | 0         | 0         | 0                    | 0                   |
| C       | 2          | 0                      | 0                | 0         | 0         | 0                    | 0                   |
| D       | 8          | 0                      | 0                | 0         | 0         | 0                    | 0                   |

The post-send activity is 1 application (ymayberg's PwC, June 18) and 2 chat messages. Segments C and D were completely inert before and after. The campaign produced no detectable reactivation. The June 19 mass "sign-in" that might look like a reengagement win is the harness, not users.

### Invite code utilization

| Code              | Cohort             | Cap       | Used | Remaining                  |
| ----------------- | ------------------ | --------- | ---- | -------------------------- |
| GETAJOBPILOT      | pilot_whatsapp     | 30        | 21   | 9                          |
| INTERNSHIPGETAJOB | practicum_reichman | 30        | 3    | 27                         |
| TEAMGETAJOB       | employee           | unlimited | 2    | n/a (internal)             |
| VIPGETAJOB        | handpicked         | unlimited | 1    | n/a                        |
| CWSREVIEW         | cws_reviewer       | 2         | 1    | 1 (created today, June 22) |

GETAJOBPILOT at 21 of 30 matches the handoff exactly. INTERNSHIPGETAJOB is barely used (3 of 30). Redemption dates track signups: the pilot code was redeemed mostly on June 7.

### System-write exclusions applied (the Cost-card lesson)

Per dimension 10 and the June 17 handoff lesson, the following writers were treated as non-human and excluded from engagement metrics: generate-daily-action and cron-generate-daily-action (write daily_actions), generate-career-analysis / generate-tasks / generate-tailored-cv at onboarding (write career_roles, tasks, master CV), send-welcome-email and send-reengagement (write nothing user-facing), and the June 19 re-bake harness (writes refine-cv/generate-tailored-cv metrics, application_cvs, and the `__REBAKE_HARNESS__` applications). What remains as genuine human signal: real applications, user chat messages, company_targets, conversations, internship profiles, and LinkedIn optimizations.

### CV experience-title mislabel bug exposure

22 distinct real users generated a tailored CV (human, excluding the June 19 harness) in the last 30 days, all essentially their onboarding master CV, generated June 7 to 16. That is the affected surface for the experience-title mislabel bug. The per-job refine-cv path has zero real human usage, so no real user has hit the bug through that path yet. Not fixed here, just counted.

### LinkedIn outreach generator usage

Zero real users have ever invoked the outreach generator (`linkedin_outreach_conversations` has 0 real-user rows; the 37 `generate-linkedin-outreach-message` function calls are all internal/team). Zero in the last 30 days. There is no completion-versus-abandonment rate to compute because there is no real usage.

## 10. Open questions for Eli

1. Activation, not acquisition, is the problem. 22 users finished onboarding and 17 of them did literally nothing afterward. Do you want the next priority to be a post-onboarding "first real action" nudge (add one application, run one chat), rather than more top-of-funnel invites?
2. The drift list (section 7, 17 onboarded-inert users) is your best reactivation target, far better than the cold list. Do you want a targeted re-activation specifically for them, given the June 17 broad send produced nothing?
3. Welcome-email backfill: 14 users failed on June 7 and 8 never got one. Do you want a one-time backfill send to the 22 unwelcomed confirmed users? (Would need a careful, deduped send; flagging as a follow-up, not done here.)
4. Harness cleanup: the 5 `__REBAKE_HARNESS__` applications and 6 harness CVs are sitting in production tables and skew every applications query. Do you want them deleted, and the harness pointed at a dedicated seed account going forward so it stops writing to real users and bumping their sign-in timestamps?
5. Three shipped surfaces (Story Bank, LinkedIn Post Creator, LinkedIn Outreach Coach) have zero real adoption. Is that a discovery problem (users never find them) or a sequencing problem (they are not part of the onboarding-to-first-action path)? Worth deciding before investing more in them.
6. The "none" cohort (11 users, 8 confirmed, 0 onboarded) suggests people are reaching signup without an invite code and then hitting a wall. Is invite-gating costing you confirmed users who would otherwise onboard?
7. Returning users equals 1. Before scaling the pilot to 100 students, do we need a retention mechanic (a reason to return on day 2) that does not currently exist?

### Follow-ups I did not chase without checking first

- I did not try to recover the true pre-June-19 `last_sign_in_at` for the 22 contaminated users; that value is overwritten and gone. If you want their real last-seen, the only source would be older auth logs or analytics (PostHog), which I have not queried.
- I did not compute a precise abandonment funnel inside onboarding (step-by-step drop) because only 2 users are mid-onboarding; the sample is too small to be meaningful. Flag if you want it anyway.
