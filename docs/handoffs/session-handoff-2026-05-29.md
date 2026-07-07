Session Handoff — May 29, 2026
Previous session ended: May 29, 2026 (evening)
Next session should: Read this first, then check Notion Task Board + QA Tracker. Critical first action below — there's an in-flight fix that needs verifying.

How to work (unchanged — see PROJECT_INSTRUCTIONS.md)

Ask-don't-tell with Claude Code. Frame prompts as questions; Claude Code shows design/decisions before building; Eli confirms.
Code blocks = prompts for Claude Code. Eli copy-pastes them. Regular text = conversation with Eli.
Claude.ai (this surface) scopes, advises, writes prompts; Claude Code executes. Surface decisions before locking in; share judgment, push back, name weak spots.
Plain language, real fixes, product-ready quality. Don't suggest breaks/stopping. Investigate before asserting. Eli pushes back well and is often right — listen.
Supabase project ref: ilmqmodklutztuybsvwd · Git remote: https://github.com/getajob-careers/get-a-job.git
Edge functions don't auto-deploy on merge — manual npx supabase functions deploy <slug> after every backend PR. Claude Code auto-merges low-risk PRs on green CI and deploys.


⚠️ CRITICAL FIRST ACTION — verify the in-flight fix landed
At session end, a prompt was handed to Claude Code that was not yet confirmed complete. It does four things:

Fix a breakage from PR #185. Console showed a 400 on a company_targets query + a 502 from match-internship-companies (thrown on "Find companies"). Hypothesis: PR #185 (the fit_score → match_score rename + career_compound_score drop) didn't fully land — lingering old-column references in frontend/functions, or the edge functions didn't redeploy in lockstep with the migration.
Matcher only adds HIGH matches to the pipeline (Eli's decision — curated A-list). Score Med/Low but don't UPSERT them; safety floor of ~top 5 so narrow profiles aren't empty; future runs only, don't purge existing rows.
Fix the Radix "DialogContent requires a DialogTitle" a11y warning on the drawer Sheet.
Default /Internship to the Pipeline tab (not Browse) when no ?tab= param; keep ?tab=browse working; confirm empty-pipeline state leads with the "Find companies" CTA.

Verify all four shipped and the matcher returns 200. If the breakage isn't fixed, that's priority #1 — nothing else matters until the matcher works again.

What shipped this session — the Internship redesign arc (PRs #180–#185)
PRWhat#180Catalog merge. Merged companies_il.json registry (832) into the companies table (was 391 research rows) → unified ~819. Added ats, ats_slug, api_url, verified, origin, enriched_at columns + 'registry' source. Did NOT cut over the job scraper (still reads JSON).#181Browse page. Grid of ~819 + filters + search + cheap rule-based fit score on cards; removed the "generate profile first" gate; Browse/Pipeline tabs via ?tab=; shared internship-rule-score.ts.#182Enrichment script (scripts/enrich-companies.ts). Filled 428 sparse registry companies (description/founded_year/stage/employee_count_range/hq_city/hq_country) via OpenAI Responses API web_search, gpt-4o-mini, source citations. Live run: 416/428 writes OK, 0 failed; fill 90%+ on desc/year/size/city/country, stage 30% (honest blanks).#183Detail drawer + on-demand pitch. CompanyDetailDrawer + generate-internship-pitch edge function + shared internship-pitch.ts + internship_pitches cache table. Career-compound pitch, who-to-contact, add-to-pipeline, outreach link. Prompt-identity gate 15/15 byte-equal.#184Score bands + consistency. High/Med/Low bands (no numbers) on browse+kanban cards+drawers; shared <PitchSection>; second-person voice fix; outreach 404 fix (route LinkedinOptimizer → Linkedin, renamed back in PR #80).#185Collapse to one score. Rename fit_score → match_score, drop career_compound_score (was always == fit). Kept band-floor anchoring (maps cleanly to bands; spread already adequate). Dropped stretch-pick idea. ← this is the PR that broke things; see CRITICAL above.
Plus mid-arc: a spinner-instead-of-skeleton on pitch load, and a cache-bust (prompt-version folded into the internship_pitches hash + one-time clear) so the voice fix propagates. Confirm both actually merged.

Key decisions made this session

Enrichment: gpt-4o-mini; size via raw-number→deterministic bucket (not model judgment); stage="Public" only if a ticker is detected (conservative — Continental/Dimri got NULL stage, a known false-negative, fine); brace-walking JSON parser. Anti-fab core verified (Magenta Medical perfect).
Pitch: on-demand generation via shared module; cached in internship_pitches (NOT function_cache — wrong shape); hash now includes a prompt-version so prompt edits bust the cache.
Scores: ONE match_score, displayed as High/Med/Low bands, no numbers. Two scores were redundant (fit always == compound). Kept anchoring deliberately.
Matcher: keep top-30 pre-filter (no stretch picks — they'd pollute the real pipeline). Pipeline = curated A-list of High matches only (in-flight). Med/Low differentiation belongs on browse.
Voice: pitches address the user in 2nd person ("your"), fixed in internship-pitch.ts buildPitchPrompt. Kanban pitches (stored on company_targets) keep old voice until re-matched — only the browse internship_pitches cache was cleared.
Pipeline-first: /Internship defaults to Pipeline tab (in-flight).


Open / next (priority order)

Verify the in-flight fix (see CRITICAL). Re-trigger the matcher, confirm 200 + clean all-High pipeline + Pipeline-first default.
Browse rule_score 70-cluster fix — logged P1 card. The real differentiation lever for browse: every IL company hitting stage+sector = 70 because signal points need literal substring matches that never land. Fix = fuzzy-match signals + downweight W_SECTOR. (Notion: "Browse rule_score differentiation — fix the 70-cluster".)
Enrichment cleanup (minor): 7 errored rows (--only re-run, maybe on gpt-4o); spot-audit the 104 non-credible-flagged rows (mostly false alarms); optionally extend the ticker regex to spelled-out exchanges.
Broader P1 queue (non-internship): merge tools into skills; Track 1 scoring fix (null req_skills_core free pass — distinct from the browse cluster); split Work Arrangement from Employment Type; auto-trigger career analysis on profile save; Projects/Certifications as experience types; task dedup (two duplicate cards).


Notion bookkeeping
Cards created this session: Entity-scoped chat context (P2), Unify kanban drawer onto shared PitchSection (effectively DONE by PR #184 — mark it), Browse rule_score differentiation (P1, next).
Manual edits Eli still needs to make (this surface lacked the edit tool): Stripe → P2, Internship redesign card → Done.

Important context for the next agent

Schema this session: companies gained registry columns (20260529_companies_registry_columns.sql); internship_pitches cache table added; company_targets renamed fit_score → match_score, dropped career_compound_score (20260530_..._collapse_match_score.sql).
Edge functions touched: match-internship-companies (refactored to import shared internship-pitch.ts; matcher filter in-flight), generate-internship-pitch (new). Both must deploy in lockstep (shared module).
Shared modules: _shared/internship-rule-score.ts (browse/card rule score), _shared/internship-pitch.ts (LLM pitch + score, used by both matcher and drawer).
Two scoring paths: browse card band = rule_score (clusters at 70, the next fix); browse drawer + kanban band = LLM match_score.
Notion hub: https://www.notion.so/3658298b80cf811d8adfe28be1afc455 · Test account: elienglard34@gmail.com (admin).
Eli's product framing: the pipeline is a curated "go pursue these" set (High only); browse is exploration (needs the full High/Med/Low spread). Anti-fabrication is non-negotiable everywhere.


Recommended first actions next session

Confirm the in-flight breakage fix + High-only filter + a11y + Pipeline-default all landed and the matcher returns 200. Don't proceed until green.
Have Eli re-trigger the matcher and eyeball: clean all-High pipeline, Pipeline tab opens first, drawers render match_score band with no stale-column errors.
Pick up the browse rule_score fix (next P1 lever) or move to the broader P1 queue — ask Eli which.
Remind Eli of the two manual Notion edits (Stripe → P2, Internship → Done).