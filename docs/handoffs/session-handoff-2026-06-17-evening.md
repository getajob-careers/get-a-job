# Session handoff: 2026-06-17 (evening)

Continuation of the long pair-programming session (Eli + Claude.ai as architect/verifier over Claude Code in the terminal). Picks up after the morning 2026-06-17 handoff. Live pilot. Supabase ref `ilmqmodklutztuybsvwd`, repo `getajob-careers/get-a-job`. Eli's profile id `4b243f3a-5035-474e-a89d-aff13fe06cc2`.

Standing rules in force: independently verify CC claims against the live DB before any merge or production action (never trust CC self-reports alone); never paste the service-role key into CC chat (pull it inline so it never prints); no em dashes anywhere; surface decisions before locking them; investigate-before-build; `db push` is broken, so migrations go through `apply_migration` or manual SQL; edge functions do not auto-deploy, each needs `supabase functions deploy <slug> --project-ref ilmqmodklutztuybsvwd`; squash-merge then delete the branch only after confirming `merged:true` as a separate step (see lesson below); mind deploy coupling (apply schema before the frontend that reads it goes live).

---

## DONE AND CLOSED THIS SESSION

### 1. Story Bank to bullets, Part A + Part B — shipped and verified

- **Part A (#348, merged 1122ed6):** source ATS job link on the application-tracker kanban cards. "View listing" when `applications.url` is set, muted "No source link" otherwise. Live-data check: 24/41 applications carry a URL, the 17 without (15 manual + 2 null-source) all fall to the empty state, so no fabrication and no capture fix needed. Frontend-only.

- **Part B (#349, merged 9afe97f):** generalized the bullet-capture contract from `experience_id` to `target:{type,id}` spanning experiences AND education, an evolution of Phase 1b's contract, not a behavior change. What landed:
  - Schema: additive `education.bullets text[] NOT NULL DEFAULT '{}'` (verified live, mirrors `experiences.bullets`); captured skills dedupe into `education.skills` with a null-to-`{}` coalesce.
  - `extract-experience-bullets` renamed to `extract-bullets` (target-typed ownership check by table); new slug, callers repointed, deployed; `ai-chat` redeployed for the new contract.
  - prompt-lib emits `target:{type,id}`, best-guesses across experiences + a new EDUCATION `[id:]` context block; CONTEXT_HONESTY item 5 makes education writable but keeps the no-downstream-promise (CV/LinkedIn/internship do not read bullets until Phase 4, so the post-save card does NOT offer CV regen).
  - `coachActionHandlers` generalized to `{targetType, targetId}`; `BulletSaveCard` picker spans Experiences + Education (grouped); per-education-row `BulletsEditor`.
  - Deploy order: migration first, then `extract-bullets`, then merge/Vercel, then `ai-chat` (frontend-first kept the contract-mismatch window to seconds).
  - **Live round-trips verified by Claude.ai (not CC's report):** experience capture landed on Guardio (`5aed1c1c-...`) 13 to 15, education capture landed on the Reichman row (`9bfe66ba-...`) 0 to 2, high-school row untouched (disambiguation held), skills deduped 3 to 6 on education, all four bullets trace to the source stories. Note: each story split into two bullets because each carried two accomplishments. Expected behavior, not a bug.
  - `extract-experience-bullets` old slug deleted (gate met). Confirmed HTTP 404.

### 2. Reengagement email campaign — SHIPPED, 32/32 delivered

Built the sender as a deployed edge function (`send-reengagement`) reading the deployed `RESEND_API_KEY`, not a local script, so the key never touched disk. Idempotency via a new `campaign_sends` table (UNIQUE(campaign_id,user_id), RLS on, service-role only, no FK so the log is durable) plus a Resend Idempotency-Key. Admin gate is `verify_jwt=false` + a dedicated random `REENGAGE_ADMIN_TOKEN` (NOT the service_role key, that was caught and changed before send).

- Sent **2026-06-17 16:27 UTC** (about 7:27pm Israel, not the planned 10am slot) to all 32 real users. Per-segment: A 19, B 3, C 2, D 8. Zero failures, every row has a `resend_message_id`.
- Recipient list verified against live DB before send: all 32 are real external users; all 8 internal/test/demo accounts and the 3 never-confirmed correctly excluded.
- Smoke ran first under `reengage-2026-06-smoke` (4 emails to eli@, one per segment), idempotency re-run skipped all 4, real campaign started from zero rows.
- Code landed on main as **#351 (squash 9b0c2188)** after a messy #350 merge (see lesson). `campaign_sends` migration tracked on main, no drift.
- **Teardown done:** `send-reengagement` deleted (404), `REENGAGE_ADMIN_TOKEN` unset, `/tmp/.gaj_reengage_token` deleted. `campaign_sends` preserved (32 live + 4 smoke).

Copy decisions worth keeping: Segment B reframed off the (flat, undifferentiated) internship matcher. Ido leads with his 25 tracker companies, naming Datarails and Anyword as examples (not "top picks", the matcher scored all 25 an identical 85). Adi and Ofri (faculty-assigned) got no company names, leaning on skills/LinkedIn/coach. All segments use the honest "five agents" line (Eli confirmed an interview agent exists as a coach mode) and the honest "knows your matched roles" capability line, no pricing or model SKUs.

### 3. Admin dashboard correction — shipped and verified

The headline "users visited" tile was wrong by construction: it counted `profiles` rows (started-onboarding), not sign-ins, and excluded no internal accounts. The displayed 32 was a coincidence (24 real profiles + 8 internal == 32 real signed-in).

- **#352 (squash 75cd7d4):** Option A. New `is_internal_user(uuid)` SECURITY DEFINER mirroring `internalUsers.js` (the rule: `email LIKE '%+%' OR id IN (the 5 team accounts)`), new `admin_user_counts()` RPC, and `AND NOT is_internal_user(user_id)` threaded into `admin_funnel`, `admin_activation_funnel`, `admin_student_engagement`, `admin_list_students`, with AdminLaunch routed through the RPC. Verified live: **visited 32, started_onboarding 24, onboarded 22.** Funnel now honest: 32 visited to 24 started to 22 onboarded to 22 ran-analysis to 0 applications to 0 stories (the internal accounts were masking a real post-onboarding activation gap).
- **Security verified by Claude.ai (ACL + gate inspection):** both new SECURITY DEFINER functions have anon revoked and an `is_admin()` gate, so the anon-callable-DEFINER-with-arbitrary-input class from the May 14 audit is not present.
- **#353 (squash 2dd537b):** anon-revoke hardening. The 4 INVOKER funnels had a PUBLIC grant plus an explicit anon grant, so a bare `REVOKE FROM anon` would have been a no-op. The migration does `REVOKE EXECUTE FROM PUBLIC, anon`. Verified live: all 6 admin functions now anon-rejected at the grant level.
- **#354 (squash 6d42822):** white-screen fix. Root cause was a missing `UserCheck` import in both `AdminLaunch.jsx` and `Admin.jsx` (the PostToolUse formatter deleted it while momentarily unused, `no-undef` was inactive under the flat config, and no test renders those cards, so it shipped behind four green gates over a blank page). Fix imports it in both files and **enables `no-undef`** so it cannot recur. Verified the deployed prod bundle binds the icon to a renamed import alias with zero literal `UserCheck` left.
- **Isaac granted admin:** `isaacseligcoding@gmail.com` (`b16b7ad7-dfe8-44ff-8ebf-13eedb1ecdd3`) added to `admin_users`. He stays excluded from the real-user counts (admin access and being counted are separate). He must log in on that account specifically.

---

## OPEN / PARKED (none blocking, all independent)

1. **Part B test-bullet cleanup (on Eli's go).** The two round-trip bullets are Claude-invented examples, not real. Strip them: Guardio back to 13, Reichman back to 0, and revert `education.skills` to its original three (remove Team Leadership, Market Analysis, Competitive Analysis). Claude.ai to run a guarded UPDATE matched on the exact bullet texts. Targets: experience `5aed1c1c-344d-48d1-8a07-059fd7568fb0`, education `9bfe66ba-8a38-4e25-8887-9e876212c619`.
2. **Three never-confirmed confirmation resends:** gulicheric@gmail.com, jenna@bettear.com, rachelimiller24@gmail.com. All `email_confirmed_at IS NULL`, no profile. Separate from the campaign, a `supabase.auth.resend({type:'signup'})` action.
3. **Cost-card "Active users" metric is misleading (not fixed).** It counts distinct `function_metrics` user_ids, which sweeps in the `send-reengagement` send itself (logged a row per recipient), the nightly `cron-generate-daily-action`/`generate-daily-action`, and internal accounts, so it reads close to the whole base every day. Same disease as the headline tile. Fix: exclude system/batch functions and internal users so it means "real humans who used a feature."
4. **Post-email engagement read (do tomorrow AM Israel, after a full overnight).** In the first ~2.5 hours after the 16:27 UTC send there were zero real-user fresh logins and zero real-user feature calls, but that is partial: `last_sign_in_at` misses already-logged-in click-throughs and `function_metrics` misses pure browsing, and it was an evening send. The real engagement answer lives in Resend (opens/clicks per `resend_message_id`) and PostHog (sessions/pageviews since 16:27), neither of which Claude.ai can query. Plan: pull post-email logins + activation for the 32 vs their prior baseline.
5. **Admin page final eyeball.** Static evidence is strong (fixed build confirmed in the deployed bundle) but no one has loaded the rendered page in an authed admin session. A single hard-reload of /AdminLaunch confirms it.
6. **Story Bank phases remaining** (from the morning handoff): Phase 2 (internship-profile + daily-action read bullets), Phase 3 (5 LinkedIn surfaces read bullets, resolve `story_id`), Phase 4 (CV, highest risk, last, keep stories as fallback so revert is a precedence flip), Phase 5 (retire `stories`).
7. **/profile editing TODO (Eli, non-blocking):** prune the Guardio near-duplicate bullets, fix the Heseg 8-vs-10 volunteers contradiction, smooth two rough trailing-metric appends.
8. **Internship matcher quality (separate diagnosis, not started).** `match-internship-companies` returns a flat 85 for every company with templated rationales and null `pitch_rationale`. An investigate-only prompt was drafted (find whether the batched LLM call is phoning in a constant, whether `pitch_rationale` is ever populated, whether per-company differentiators reach the prompt, and whether 85 is a hardcoded fallback).

---

## NEXT SESSION: BROWSER EXTENSION

The chosen focus for next session. Prep so we start clean:

- It is already surfaced as "coming soon" in the nav.
- **Legal gate is the central constraint.** The LinkedIn piece and the Playwright/WAF-bypass sourcing tier are both held pending legal review with Noms (Eli's wife, the lawyer). `privacy-policy-draft.md` is in the project. So v1 should almost certainly be the legally-clear surface (e.g. capturing a job from a public ATS posting into the tracker, or application autofill from the user's own profile) while the LinkedIn scraping and any anti-bot-bypass sourcing wait on Noms.
- **Start investigate-first, no build.** Open with scoping: what does the extension actually do in v1, which pieces are legally clear vs Noms-gated, and how it authenticates to and talks to the existing Supabase backend (it is a separate client surface, so auth, RLS, and the API boundary need thinking through). Then a read-only investigation of any existing extension scaffolding in the repo and the Chrome-extension architecture (manifest v3, content script vs background, the message boundary to our edge functions) before a line is written.
- Apply the same discipline that worked all session: investigate-before-build, HOLD PRs, independent live verification, and for anything touching auth or a new public surface, the security caution that caught the SECURITY DEFINER and admin-token issues this session.

---

## KEY IDS / FACTS

- Supabase ref `ilmqmodklutztuybsvwd`. Eli profile id `4b243f3a-5035-474e-a89d-aff13fe06cc2`.
- User universe (live): 43 auth users = 40 confirmed and signed in + 3 never-confirmed. Of the 40, 8 are internal/test/demo (both elienglard, all three isaacselig, both yishailieser, gymnastgirl323), so **32 real users**. Profiles total 32 (24 real + 8 internal).
- Internal-user rule (single source, `internalUsers.js` and the SQL `is_internal_user`): `email LIKE '%+%' OR id IN (the 5 no-plus team accounts)`. Keep the two in lockstep (cross-link comment in both).
- admin_users: Eli (`4b243f3a-...`, primary) + Isaac (`b16b7ad7-...`, isaacseligcoding).
- Reengagement: `campaign_sends` has `reengage-2026-06` (32 sent) and `reengage-2026-06-smoke` (4). `send-reengagement` function is deleted; do not assume it is deployed.
- `education.bullets` is live: text[], NOT NULL, default `'{}'`. `extract-bullets` is the current slug; `extract-experience-bullets` is gone.
- Invite codes: GETAJOBPILOT (regular pilot), INTERNSHIPGETAJOB (practicum, 3 users), TEAMGETAJOB (team), VIPGETAJOB (hand-picked).
- Deploy edge fn: `supabase functions deploy <slug> --project-ref ilmqmodklutztuybsvwd`.

---

## LESSONS LOGGED THIS SESSION

- **Merge-then-verify-then-delete.** Bundling the branch delete into the merge command meant a failed squash still deleted the ref and auto-closed #350. Rule: confirm `merged:true` (or a returned sha), then delete the branch as a separate step, never in the same command.
- **`no-undef` was off under the flat config**, and `react/jsx-uses-vars` only tracks JSX tag identifiers, not prop values like `icon={UserCheck}`, so a free identifier shipped behind green gates over a blank page. Now enabled.
- **Dashboard metrics that count `function_metrics` user_ids conflate "a function touched this user" with "this human showed up."** Crons and the send job inflate "active/visited" to the whole base. Any user-activity metric must exclude system/batch functions and internal accounts (the headline tile was fixed this way; the Cost card still needs it).
- **The internship matcher returns an undifferentiated flat 85**, which is why the reengagement copy was reframed off it rather than presenting arbitrary "top picks". Honest framing beat the broken signal.

---

## RECURRING THROUGH-LINE

Independent live verification earned its keep again and again: it confirmed the reengagement recipient list was clean before a real send to 32 people, caught that the admin "users visited" number was right only by coincidence, caught the service_role key being reused as a function trigger token before it shipped, confirmed the anon-revoke was a real fix and not the no-op a bare revoke would have been, and showed that the "40 active users" after the email was the send job and the cron, not people coming back. Believe the live DB over the snapshot, verify before every production write, and say the smaller, more accurate thing rather than the flattering one.
