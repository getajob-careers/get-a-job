# Session Handoff - 2026-07-06 (evening) - Arcs delivered, four held PRs, IA spec awaiting Eli's review

Supersedes the morning file (session-handoff-2026-07-06.md) as current state. That file covers July 3-6 in full; this one is the delta after the fresh CC session ran today's three arcs.

## CURRENT STATE (the five-line version)
Main at 8764f7e; #472-#493 live. Four PRs HELD: #494 (dead-code kill, ~1300 lines, deploy-side ritual = migration DROPs + 4 remote undeploys + types regen gated on Eli), #495 (IA spec + extension investigation docs), #496 (Daily Action cron off), #497 (shared track-threshold constant). PR#5 (docs reconciliation + .gitignore + handoffs import) scoped and building. The IA spec review by Eli is the CRITICAL PATH - everything in Arc 2 and the extension resubmit waits behind it.

## KEY FINDINGS SINCE THE MORNING FILE

1. INSTRUMENTATION WAS ALREADY LIVE (PR#4 skipped). Commit #412 shipped cv_generated, resume_uploaded rename, OAuth signup_completed, and unrestricted pageviews weeks ago; CC verified events actively ingesting in live PostHog. Deep-qa-3's central caveat ("no instrumentation, everything LOW-CONFIDENCE, cheapest win = instrument") was a FALSE NEGATIVE - the agent looked for a Postgres events table, but PostHog is a client-to-SaaS pipe. Click data has been collecting since #412. The high-leverage move is now ANALYZE, not instrument.

2. POSTHOG ANALYSIS QUEUED to land DURING Eli's IA spec review: real funnel/event counts for every surface the spec makes a call on (especially satellites - undiscoverable vs unwanted is finally answerable), scrubbed-usage lens applied, delivered as a deep-qa-3 addendum. Purpose: check the spec's park/dissolve calls against actual click data before Eli signs.

3. EXTENSION FABRICATION ROOT CAUSE (Arc 1, held in docs/research/extension-resubmit-investigation.md): NOT a rogue prompt, NOT empty context - missing per-job grounding (no page_context/application_id, so the pasted job is never scored and gpt-4o-mini parrots the roadmap's "Readiness: NN%"). Fix is body-and-wiring only, empty permission-diff. Corrected mechanism folded into IA spec section 4.5. Resubmit build stays queued behind spec approval.

4. DEAD-CODE MANIFEST CAUGHT TWO VERDICT ERRORS: calendar_events is NOT dead (live read+write, excluded from the drop); cv_templates needs an FK/column drop first (handled in the staged migration). Grep-before-delete earned its keep again.

5. IA SPEC (docs/design/ia-interaction-spec.md, in PR#495). Load-bearing calls awaiting Eli's redline: nav collapses to four loop slots (Today, Career, CV, Profile) + omnipresent coach; the four chat agent-pages dissolve into coach intents; CV becomes a first-class one-engine workspace one click from fit; all fit/readiness numbers consolidate into Career so a job's score cannot disagree with itself; acceptance test = the minute-0-to-first-CV screenplay.

## PROCESS CHANGES MADE TODAY
- Handoffs now live in git: docs/handoffs/ (34 files, 2026-05-12 through 2026-07-06, imported via PR#5). Obsidian reads the repo directly (repo root = vault), so anything in the folder appears there automatically - there is no separate "add to Obsidian" step, ever.
- Fresh-session ritual (both CC and Claude.ai): ground from docs/handoffs newest file + CLAUDE.md + Modifications log, confirm state back in five lines before working. Sessions end at milestones WITH a written handoff.
- One path one writer still binds: no second terminal while the main session holds working state.
- Claude.ai project knowledge cleanup pending: once PR#5 confirms the handoffs are committed, delete the ~30 stale handoff uploads from the Claude.ai project files (keep at most the newest). They are now redundant and a stale-grounding risk.

## OPEN HUMAN ITEMS (Eli) - unchanged plus one
1. READ THE IA SPEC (PR#495) - the critical path. Twice: once as founder, once as a cold new user. Bring reactions to Claude.ai to pressure-test the load-bearing calls before approving.
2. CREDENTIAL ROTATION - still open, oldest item: demo password (burned in scrollback repeatedly), CuFinder key, stale session sign-outs.
3. Review + merge decisions on #494/#496/#497 (each has a verify choreography; #494 carries the irreversible deploy-side ritual - do not rush it).
4. /install-github-app in CC (review-only).
5. Extension v0.1.3 unlist decision (recommended: unlist until resubmit clears).
6. Deferred by choice: Wonderful application (CV ready), KPMG eyeball.

## QUEUE (order of operations from here)
Eli reads IA spec + PostHog addendum lands -> spec redline/approval -> Arc 2 Step 1 (visual direction, absorbs dark-hive) -> per-page rollout. In parallel after PR#5: coach CV-blindness PR (server-side context, edge deploy), finding-1 structural cue, extension resubmit build (consumes the spec), then remote-jobs sourcing expansion. Post-outreach tier unchanged (CV consolidation arc, SCORING COVERAGE ARC, AdminLaunch fixes, satellites decisions at n~200).
