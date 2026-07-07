Here's the handoff for the next session — formatted to match your repo's handoff docs. Since I can't write to disk this session, it's below to save as session-handoff-2026-06-03-evening.md (or paste via Claude Code).

Session Handoff — 2026-06-03 (evening)
Continues: the jobs / skills / extraction work from earlier 2026-06-03. Focus this session: Tracker Skills auto-fill, the extraction-quality diagnosis + Workday fetcher fix, and job-sourcing strategy.
Infra constants: Supabase ref ilmqmodklutztuybsvwd · Task Board data source ddf6e32b-f852-4070-b586-0ddb68a411a8 · repo getajob-careers/get-a-job.
Shipped this session (all merged + live)
PRWhatKey SHA / note#238Tracker Skills auto-fill — pure rewrite. Store skills_required {core,nice} at JobCard track-time; live-derive matched/missing vs profile.skills_canonical at render (never frozen). New src/lib/skillMatch.js.16f39697… · backfill applied: 16 rows populated / 12 empty-state / 28 total#239Workday + SmartRecruiters description fetcher fix — per-job CXS detail fetch (fetchWorkdayDetail/fetchSmartRecruitersDetail), 8s AbortController, null-on-failure, concurrency 4; new enrichDescriptions step in refresh-jobs.ts post-IL-filter. + B1 migration invalidating zero-conf Workday/SR rows for re-extraction.merged; hotfix #240 9aa913ec… after a failed first dispatch run
(#236 Jobs seniority/track fix 06802ca5 and #237 nightly-extraction-wiring landed earlier today.)
Workday outcome (verified post-#239)

Descriptions: 0 → 442 of 454 rows (>100 chars). Avg extraction confidence 0.00 → 0.699. 428/454 at conf ≥ 0.5.
Durable this time — the fix is in the fetcher, not a one-time backfill (the May "Workday descriptions recovered" card decayed precisely because that was a one-time backfill while the fetcher stayed list-only).
Tonight's cron picks up: 10 --limit=500 spillover rows + 3 swept transient-failure stragglers. Re-verify they cleared.
SmartRecruiters: 5 of 6 holdouts are genuinely empty at the SR API level (employer left description blank) — nothing to fetch. Accept the 5-row gap; not carded.

Headline finding (drives priorities)
The recovered Workday cohort is 80% Engineering vs 39% in the rest of the corpus — more eng-skewed, not less. Business functions negligible (Sales 6, Product 4, Marketing 2; BD / RevOps / Customer Experience all 0). The "enterprise ATS = business roles" hypothesis is disproven. Net: extraction quality and corpus usability are now solid, but the business-role gap is confirmed as a pure sourcing problem — no pipeline/library work touches it; only adding business-hiring employers does.
Principles reaffirmed

No stale info: derive anything reflecting current user state (skill match, roadmap, qualification); freeze point-in-time records (requirements as-applied, sent CVs).
ATS-direct sourcing: do NOT scrape job boards. AllJobs/Drushim/SNC/Ethosia/SQLink are discovery tools only — find business employers → add their ATS to the 831-company registry (companies_il.json).

Notion — cards
Created: Lever-6 description quirk (Infra/P2, 3748298b-80cf-8194-8c92-d433a4fd33f5) · Business-role sourcing via discovery (Infra/P1, 3748298b-80cf-813e-bac2-c4a0e5f9ebe1).
⚠️ Three existing cards have paste-ready update text NOT yet applied (couldn't inline-edit existing pages this session — the update text is in the 2026-06-03 evening chat log):

Sourcing card (…813e…) — replace "Workday synergy" note with the disproven re-check result.
"Standing: harvest skills_unmapped" (3718298b-80cf-81e3-9058-d60a132cc972) — append the audience-aware harvest findings + sequence-after-#239.
"Skills extraction follow-up" (3748298b-80cf-8102-8a38-fedcb804ade3) — mark the quality lever's dominant cause RESOLVED via #239; remaining = Lever-1 full JD coverage + library gap.

Already tracked (no action): Tasks generator quality issue (3738298b-80cf-81ef-ac7b-f1d53b6950e8), Roadmap/qualification staleness (3748298b-80cf-81da-b7e2-dffa4e7aeb60), Tracker kanban (3748298b-80cf-811e-ae54-c4042b8d88c5), Steps-tab.
Recommended next path (Eli agreed)

Workday — DONE. Verify tonight's cron cleared the 13 trailing rows.
Skill-library expansion (harvest card) — audience-aware: promote business/GTM/CS skills, alias variants (technical_support↔technical support, integrations→integration, lookers→Looker), drop noise, deprioritize the chip-design cluster. Run after #239 since the recovered JDs enrich the unmapped harvest.
Tasks bug — Isaac has 3 tasks, all role "Software Engineer", single batch. Needs generate-tasks read (cap vs truncation) + multi-role spread. Still need Eli's call on target task count + how many roles to spread across before drafting the CC prompt.
(Parallel, Eli-owned) sourcing curation — the only lever for the business-role gap.

Deferred: kanban, Steps-tab links, roadmap-staleness. Gut-check: if the WhatsApp pilot is imminent, launch blockers (invite gate → waitlist → paywall, Eli's scope) jump the queue.
Working notes for next agent

CC pattern held all session: investigate-first report → options + lean → Eli picks → build; squash-merge + verify; manual supabase functions deploy only for edge-fn changes (none this session — all scripts/frontend/migrations).
Supabase MCP is the diagnosis workhorse (read-only SELECTs); all live findings this session came from it.
This session's tool set could create Notion pages but not edit existing ones — hence the three pending card-edits.