# Session Handoff - 2026-07-06 - Batch 1 closed, P0 firing cluster fixed, product investigation, Claude system, arcs kicked off

Covers the working sessions of July 3-6 (one Claude.ai thread; two CC sessions - the long one hit 100% context and was retired at a clean milestone; lesson below).

## HEADLINE STATE
Main at 8764f7e. PRs #472-#493 all merged and LIVE. Deep QA Pass 2 (Batch 1) CLOSED. Deep QA Pass 3 (full product investigation) COMPLETE, report in docs/research/. Preview environment FIXED end to end. Claude system upgrades SHIPPED (#492). A fresh CC session is running today's three arcs (Arc 0 cleanup GO, Arc 2 Step 0 IA spec, Arc 1 extension investigation).

## WHAT HAPPENED

### 1. Batch 1 closure caught and killed a P0 (the firing cluster)
Eli's re-replay failed and surfaced a live P0: 11 gtc invocations in one day on the demo (~$0.68), most phantom. Four symptoms, one root: fire-on-mount CV generation in SuggestionRow (#471), amplified by dual-mount (dock + off-screen panel, #295), no acceptance gate, results never merged into the in-memory message, plus replace-on-regen destroying reviewed CVs (CV 26f28880 was silently replaced by a phantom regen).
- #489: provider-owned single-owner auto-fire, fired-set keyed on message.id, result merged into memory, click-gated (fork C = client accept-gate + prompt rule; fork E = keep replace-on-intentional-regen, CV history queued to the CV consolidation arc).
- #490: verbal-accept (accepted:true auto-fires once through the same path) + fork-2 = Generate implies app-creation through the #481 rule (known company -> create/dedup + link + generate; unresolved -> coach asks, acceptance PARKS and resumes on the bare company answer, no second yes). Closed the orphan-CV class (00aadc76).
- Verified live across SIX consecutive clean single-fire runs (Marigold, Fernwood, Larkspur, Pemberton + two earlier), each DB-confirmed: one gtc per accept, app + CV linked, no orphans, no Unknowns, count frozen through navigation.
- Real users were never hit (zero same-minute gtc pairs post-June-20, scrubbed).
- ai-chat is at v101 (proposal reframe + same-turn rule + no-cover-letter-artifact + accepted parse + company-before-fireable-CV).

### 2. The rest of the closure wave
- #488 (pre-session): Studio section parity. Enforcement divergence remains (download strips a first-person sentence Studio keeps) -> one-enforcement-gate PULLED FORWARD in the CV consolidation arc.
- #491: post-gen CTA - Tracker deep-link button on the done card (Download + Open in Studio already existed). Verified live.
- #493: Studio deep-link opened the MASTER CV instead of the tailored one (root cause: ["applicationCvs"] cache never invalidated at either generation site + guard only waited on isLoading, warm-cache race). Fixed (invalidations + isFetching guard) + dock card layout overflow fixed under design-craft. Verified on a working preview, merged via /merge-and-deploy (its maiden run, flawless).
- Known open polish: finding-1 (same-turn Apply card - prompt-tightening 0-for-2, next attempt structural: emit add_application from the same parser as the CV block); coach CV-blindness (ai-chat never reads application_cvs so it proposes generation for apps that already have a CV - decision made: SERVER-SIDE context fix, its own PR + edge deploy, queued).

### 3. Deep QA Pass 3 - full product investigation (docs/research/deep-qa-3-product-investigation.md + 3 part-files)
- 53 real users (not the stale ~38), ~35 completed onboarding. $58.46 gross edge-fn spend but only $21.52 real-user; CV gen+refine = ~80% of real spend.
- Core loop the data shows: onboard -> career-analysis (only feature users choose to re-run) -> tailored CV (only paid feature). Apply/track tail barely registers (but the last-mile links only shipped this week - the measured loop is partly what the product permitted).
- Daily Action: 50 users reached, 0 completions, 723 pending rows - cron to be disabled (Arc 0).
- Track-scorer contradiction CONFIRMED as live bug: 0.80 vs 0.70 alignment gates across three scorers - same user+job, different track by page. Shared-constant fix in Arc 0.
- Satellites (Story Bank, LinkedIn suite, job-match, learning paths) at ~0 usage but DELISTED from nav - undiscoverable vs unwanted is unresolved; PostHog EU EXISTS (report's "no analytics" claim corrected) and can partially answer it.
- Verdict framework (CORE/KEEP/COMBINE/PARK/KILL/FIX-DISCOVERY); approved-now = the kills, cron-off, threshold constant, instrumentation. Parks and big merges (two chat engines, two CV engines) deferred to post-outreach data at n~200.
- Dead code found: 3 camelCase legacy edge fns, send-reengagement (564 LOC, never deployed) + campaign_sends, empty tables, redirect-only Tracker.jsx. Actual deployed edge fns = 32, not the documented 27.

### 4. Extension v0.1.3 live-tested against prod: SAFE but BROKEN - resubmit now GATES extension outreach
- Mechanically safe (zero gtc, zero apps, no auto-fire vs the new prompt).
- Functionally dead-ended: extension coach never creates an application; the linked-generation guard correctly blocks Generate; JD->CV cannot complete.
- Truth-broken: reported "92% readiness" (no platform surface computes that) and claimed a Zendesk gap for a profile with daily Zendesk - the extension likely ships its own ungoverned prompt/context. Arc 1 investigates.
- Extension REMOVED from outreach messaging; Eli considering unlisting v0.1.3 on the store meanwhile. Resubmit scope: e0e8837 + ea08afa + full platform-contract alignment (#489/#490 protocol, governed prompt, profile context, app-resolution path); manifest permission-diff must stay empty. The Arc 2 IA spec is the extension's target contract.

### 5. Preview environment FIXED (three dashboard items, now documented for the handbook)
(1) Vercel: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY enabled for the Preview environment (Vite inlines at build time; missing vars threw at import -> eternal boot spinner). (2) Supabase auth redirect wildcard https://get-a-job-git-*-getajob-team.vercel.app/**. (3) Cloudflare Turnstile hostname allowlist += vercel.app (captcha refused preview domains). Boot PASS verified at bundle level; #493 was verified on a working preview end to end.

### 6. Claude system upgrades (#492 + user-scope)
- User-scope: block-main-push hook (already earned its keep, then was tightened after a false positive on commit prose - it inspects only the push refspec now), em-dash warn hook, usage-analyst + db-claim-verifier subagents.
- Project-scope (#492): design-craft skill (the design bar - 9 rules, v1 tokens extracted from the codebase, values swap at Arc 2, rules survive; first live case was the dock card fix), deploy-edge-fn skill, scrubbed-usage skill, /merge-and-deploy + /verify-live commands, formatter scoped to skip supabase/functions/** + churn-prone jsx.
- CRITICAL scrub correction baked in: the naive email regex missed bare isaacselig/yishailieser and Noms (UUID 90bcf097-77f2-437f-9210-42755ba4d143) - it returned 57; the corrected scrub returns 53 = the investigation number. Never hand-derive the scrub again; use the skill.
- Plugins installed (user scope): claude-code-setup, commit-commands, pr-review-toolkit, security-guidance. PostHog MCP connected in CC (the investigation's blindness is now fixable). GitHub app (/install-github-app, review-only) left for Eli to run.
- Obsidian: repo root opened as vault (.obsidian/ + notes/ gitignored), Dataview + Git plugins, relative-path markdown links, docs/handoffs/ created - THIS folder - handoffs migrated from the Claude.ai project.

### 7. Eli's own CV (personal, non-platform)
Deployment Strategist application (Wonderful, via Yonah's referral): full CV rebuilt (Eli_Englard_CV_Deployment_Strategist.pdf) - Founder & Sole Developer, Jan 2026 - Present, "first commit to production in six months", live-scrubbed traction (50+ activated users, ~70% coach adoption, ~half generated CVs), DS-language competencies, extension on its own line. Profile founder-dates fix started in the platform UI (doubles as the data-hygiene launch item). Wonderful application + KPMG eyeball deferred by Eli's explicit choice.

## RUNNING NOW (fresh CC session)
- ARC 0 (GO): kills, Daily Action cron off, track-threshold shared constant, instrumentation PR, docs reconciliation (32 fns / 53 users / PostHog correction).
- ARC 2 STEP 0 (main event): feature-format + IA spec from PRODUCT LOGIC (not n=35 usage) - every feature gets one job, a format decided by frequency x depth, in-flow entry points, all four states, a never-do list; global sitemap + nav model + coach-as-operator + minute-0-to-first-CV screenplay. HELD for Eli's review. Drives Step 1 (visual direction, absorbs dark-hive) and the extension contract.
- ARC 1 (paper): extension ai-chat call mapping + alignment proposal + store-link grep.
- QUEUED BEHIND: remote-jobs sourcing expansion (Eli wants many remote jobs added - AFTER the IA spec lands); coach CV-blindness PR; finding-1 structural cue; one-enforcement-gate; CV consolidation arc; SCORING COVERAGE ARC (unchanged); AdminLaunch funnel fixes (auth.users not profiles, is_internal_user misses Noms, cron-counting).

## OPEN HUMAN ITEMS (Eli)
1. CREDENTIAL ROTATION - oldest open item, now urgent: the demo password was restated in chat THREE more times this session. Rotate demo password (Supabase Auth -> Users), rotate CuFinder key, sign out stale sessions. Store secrets ONLY in the password manager.
2. Wonderful application (CV is ready) + KPMG eyeball - deferred by choice, not forgotten.
3. Review the IA spec when it lands (the highest-leverage document of the redesign - read twice).
4. /install-github-app (review-only) in CC.
5. Unlist extension v0.1.3 decision (recommended: unlist until resubmit clears).

## LESSONS ADDED THIS SESSION
- CC sessions end at milestones; a session that ran days of QA + investigation hit 100% context and degraded. One arc per session; fresh session grounds itself from docs (this file, the investigation report, Modifications log).
- Never start a CC paste with "/" - the CLI eats it as a command.
- Stale browser tabs run stale bundles: a "failed" verify was the pre-merge frontend. Hard-refresh before verifying anything.
- Dashboard config (Vercel env scoping, Supabase redirect list, Turnstile hostnames) is invisible-in-code infrastructure; it broke previews silently for weeks. It is now documented in the handbook's preview section.
- Hooks beat prompt rules for rules that must always hold (the scrub regex bug and the main-push gap were both caught and closed structurally this session).

## STANDING RULES (delta only)
All prior rules stand. New: previews are the default verification surface again (the merge-then-verify exception is retired); /merge-and-deploy is the merge ritual; the scrubbed-usage skill is the only sanctioned analytics denominator; design-craft binds every UI edit.
