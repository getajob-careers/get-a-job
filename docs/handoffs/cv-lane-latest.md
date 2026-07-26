# CV lane - latest handoff (resume point)

Overwrite-on-update (standing rule). **After any context clear, read THIS +
`tasks/lessons.md` first.** ~150-line resume point, not a log.

## Standing protocol (session hygiene - Eli)

- **Name canary.** Begin EVERY reply to Eli with "Eli, …". When it stops, Eli says
  **"canary"** → overwrite THIS file + tell him to `/clear`.
- **Statusline** shows context % (green<60, yellow 60-79, red≥80). **Offer a handoff at ~80%.**
- **Reports end with a compact ledger** (PR · SHA · state · claims · evidence · open qs).
- **NEVER delete rows** (even void/test/dry-run) without an explicit Eli ruling; mark eras by
  `created_at` ([[never-delete-rows-without-ruling]]).
- **Formatter reflows WHOLE files + strips just-added imports.** Add an import in the SAME edit as
  its first usage; for test files use Bash `cat >>` (no PostToolUse hook) to avoid whole-file churn;
  after any Edit to a dense file, check `git diff --stat` for churn ([[formatter-strips-just-added-imports]] + tasks/lessons.md).
- **No em dashes** in repo artifacts (code/docs/PR bodies) - hyphens. Grep additions before commit.
- Protocol lives HERE (design lane owns CLAUDE.md).

## CURRENT ARC - Skill-library expansion (Eli superseding ruling 2026-07-26): runs NOW, in full

Per-label A/L/N triage REMOVED, replaced by MACHINE GATES. Standing order: finish an item → next
immediately; PRs pile HELD; merges in batch; stop only for reserved categories / failing gate / 80%
context. Plan of record + joint re-rank: `docs/research/skill-corpus-mining-2026-07-26.md`
(supersedes the batch order in `skill-coverage-and-suggester-2026-07-26.md`). [[flagon-feed-ranking-arc]] sibling.

**Queue status:**

1. **Suggester floor - DONE, PR #760 HELD.** `suggestSkillFromUnmapped.js`: suggest only when
   `levenshtein ≤ 2 AND shared first char`, else nothing + existing "No close match" copy.
   vercel→zero (was "Perl"). +tests.
2. **Above-ceiling chip - BUILT but DEFERRED (Eli resequence 2026-07-26).** PR #762 CLOSED, branch
   `eli/above-ceiling-chip` KEPT (SHA `a15699b`) = shelved diff. Deferred because it edits
   JobGridCard.jsx + JobDetailModal.jsx, which the **design-lane CV-gen theater PR owns right now**
   (one writer per path). **Re-open / re-insert AFTER the hub announces the theater merge**, then
   rebase the shelved branch on the post-theater main and reconcile any overlap. (Diff: pure
   `deriveJobDisplay.aboveCeiling` + quiet chip on card + note in modal, flag-on only, display-only, +tests.)
3. **Corpus mining report - DONE, filed, PR #763 HELD (docs).** Supply coverage **0.243** (88% jobs
   <0.5); joint both-sides re-rank. Re-ranked batches (see doc §c): (1) AI-tools ALIAS→`ai_tool_fluency`
   [chatgpt is #1 user label ×9; `ai_tool_fluency` id EXISTS], (2) Finance/accounting functions [NEW],
   (3) PM functions [NEW], (4) Security/risk [NEW, re-resolve vs prior Security batch first],
   (5) Marketing/growth/CX [NEW+alias], (6) Office tools [ALIAS], (7) modern web/cloud/no-code/HRIS-ATS
   [NEW; supabase/vercel/tailwind are user-only, low corpus payoff], (8) Hebrew - DEMOTED optional
   (JD supply = 12 Hebrew skill terms only).
4. **LIBRARY BATCHES - NEXT (not started).** One scoped PR per batch, HELD. MANDATORY per-batch protocol:
   - **Builder/reviewer split:** I propose mappings, then spawn an INDEPENDENT reviewer agent (fresh
     context) to validate each alias→ID and each new ID against: (i) genuinely means that skill in
     hiring, (ii) no collision/shadow of an existing alias, (iii) new IDs are real distinct skills not
     synonyms, (iv) nothing on the noise do-not-add list. **Reviewer reject/unsure → DROP + log, never
     argue in. Conservative default.**
   - **Additive ONLY** (never repoint/delete). New IDs → regen `skillIdsGenerated.json` via
     `node scripts/regen-skill-ids.mjs` (the two-file sync). Alias-only = single-file (skill-aliases.ts:25,
     `SKILL_ALIASES` - single source, both consumers import shared `resolveSkill`).
   - **After merge:** run `scripts/reresolve-corpus.ts`; report coverage movement - user unmapped
     (baseline 1,165 occ / 1,067 distinct / 41 of 60 users) + corpus avg ratio (baseline 0.243) / jobs<0.5 (5,325).
   - **EVAL GUARD (replaces Eli's eyes):** run the 160-label eval; **GOOD-band movement must be 0**
     (any GOOD regression FAILS the batch → report + hold, do NOT tune). Also assert the flag-on feed
     top-10 for the three #757 acceptance profiles stays majority-relevant (walkthrough/finance/marketing;
     harness `scripts/walkthrough-diag-next.ts rankscore <snap>`; snaps in `$CLAUDE_JOB_DIR/tmp` - may
     need re-fetch next session).
   - **PR body:** additions list · reviewer-dropped list w/ reasons · coverage movement · eval result.

**do-not-add noise list (VERIFIED both-sided-but-generic + non-skills):** generic soft skills
(teamwork, planning, performance, reporting, accuracy, execution, delivery, ownership, initiative…),
military terms, sports/hobbies, hyper-niche SaaS products, bare fragments.

## RECENTLY CLOSED (pointers; do not re-open without new evidence)

- **Flag-on feed ranking #757 - MERGED (squash `8f93738`), branch deleted, frontend-only (no edge
  deploy).** ?next=1 feed (JobsSearchTab) now gates off-direction + sorts by `rank_score` (was gate-less
  fit_score); honest_match_labels chip. Walkthrough 5/10 primary ACCEPTED by Eli. Production two-tab
  untouched. `?honest_match_labels=1` eyeball DONE (Eli verified live: Overall / Search fit /
  matched-of-listed render correctly); only the default-flip decision remains - a triage item, NOT this lane.
- Prior arcs: scoring v2 stack LIVE default-on (formula PARKED); digest primary-only + honest_match_labels
  flag LIVE (#749 `71c360e`); story extraction / refine-cv / outreach CLOSED+LIVE.

## PARKED - do NOT touch

- **Emails: fully parked until Flip 2.** Eli standing ruling 2026-07-26: digest enable + re-engagement
  one-off + new-look announcement fire together as ONE Eli-gated moment AFTER the reveal. Do NOT touch
  `EMAIL_SEND_ENABLED`, the cron, or `dry_run`. Runbook detail: `docs/Handoffs/email-automation-arc.md`.
- **All scoring formula/weight work** (adjacency tightening, specificity weighting, field-relevant years,
  C3/C4/C5) - post-launch re-measure ([[scoring-parked-postlaunch-remeasure]]). The library work is DATA,
  not formula - if a batch tempts a scoring change, that's the line.

## PRs this session

- **#760 suggester floor** - MERGED (squash `a458904`), branch deleted.
- **#763 research docs** - MERGED (squash `4fa8d12`), branch deleted.
- **#757 flag-on feed ranking** - MERGED (`8f93738`).
- **#762 above-ceiling chip** - CLOSED/DEFERRED (branch `eli/above-ceiling-chip` `a15699b` kept; re-open post-theater).
- Queue after resequence: suggester floor (merged) → corpus-mining (merged) → **library batches (NEXT, batch-1 first)**;
  chip re-inserted after the hub announces the theater merge.

## Reusable techniques

- **Large MCP SQL reads** auto-save to a file when over the token cap: parse the outer JSON, extract
  the array between the untrusted markers, `data[0].<col>` (NOT the wrapper) - see `$CLAUDE_JOB_DIR/tmp`.
- **Faithful feed repro:** `scripts/walkthrough-diag-next.ts` imports the shipped `orderDefaultMatches`;
  snapshots via the scrubbed-usage CTE + `search_jobs_by_role_titles` RPC (call as SQL via MCP).
- **Per-PR clean branch:** stash tracked dirty docs → `git checkout -b <b> origin/main` (split from any
  cmd containing both "push"+"main") → pop only the item's files. Untracked files travel freely.
- **skill-aliases.ts is single-source** (post-#511); `skillIdsGenerated.json` = generated mirror
  (`scripts/regen-skill-ids.mjs`), needed only for new IDs. `jobs.extraction_unmapped_skills` (COLUMN)
  = supply-side unresolved terms; `profiles.skills_unmapped` = user-side.
