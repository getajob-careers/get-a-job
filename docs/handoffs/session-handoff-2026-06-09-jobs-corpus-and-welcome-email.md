# Session Handoff — 2026-06-09 — Jobs Corpus Sourcing + Welcome-Email Re-send

## TL;DR

1. **Jobs sourcing arc: COMPLETE and verified.** Nothing left to build on the free path.
2. **Immediate next action: welcome-email re-send to 14 pilot users.** The bug is already fixed; only the operational re-send remains. Build + dry-run, then Eli fires the send himself.
3. **After that: two funnel items** (CV-extract OCR gap, profile-droppers).

No em dashes in deliverables. Verify everything against Supabase (project ref `ilmqmodklutztuybsvwd`); do not trust CC reports alone, especially for anything touching real users.

---

## Part 1 — Jobs corpus sourcing (DONE)

### What shipped this session

| PR | What | Note |
|----|------|------|
| #269 | Illinois-as-Israel location fix | ~261 US rows reclassified out of IL |
| #270 | Seniority over-labeling fix | True entry corrected to ~96; conservative bare-Manager/Controller -> mid |
| #271 | Lever + SmartRecruiters empty-desc fix (`?? -> \|\|`) + dormant-probe tooling | +~11 recovered |
| #272 | Wrong-slug fixes (Honeybook, Nexxen) | +27 Tel Aviv jobs |
| #273 | AdamTotal fetcher + 7 tenants | +489 (Harel, Tempo, Kalmobil, Gefen, Partner, Pelephone, Israel Railways) |
| #274 | AdamTotal 4 token recoveries + PwC Heroku fetcher | +678 (CBC, Matav, Novolog, Peres + PwC) |
| #276 | Hebrew seniority derive from `req_seniority` (pipeline Stage 3, idempotent) | commit 64b1d6c |

Plus a one-shot UPDATE (148 rows) applying the Hebrew seniority derive to existing data. Rollback artifact: `public._seniority_derive_rollback_2026_06_09`.

### Verified end state (corpus-wide, active + is_il)

| Metric | Session start | Now | Change |
|--------|---------------|-----|--------|
| Total active IL | 2,898 | 4,022 | +1,124 |
| Hebrew JD | 123 (4.2%) | 1,203 (~30%) | ~10x |
| Entry | 98 | 197 | 2x |
| Mid | 1,437 | 2,377 | |
| Senior / Lead | 888 / 360 | 931 / 396 | |

New sources: `adamtotal` 675, `adamtotal_agency` (Peres) 403, `pwc_heroku` 62.

### Architecture / decisions a new agent must know

- **Two seniority fields.** `seniority` (regex, set at ingest in `scripts/lib/normalize.ts`, ENGLISH-ONLY) drives the user-facing filters, the card badge, and the experience-level gate. `req_seniority` (LLM, set at backfill in `extract-job-requirements`) drives only the fit score. Because the regex is English-only, Hebrew titles fell through to the `'mid'` default.
- **The fix (PR #276):** derive `seniority` from `req_seniority` for Hebrew rows only. English stays on the #270-validated regex. Predicate: `jd_language IN ('he','iw','mixed') AND req_seniority IS NOT NULL AND seniority='mid'`. Idempotent; runs as a fail-safe Stage 3 in `refresh-jobs.yml` (`always()` + `continue-on-error` + 2-min cap).
- **Mapping:** Entry->entry, **Entry_Mid->mid** (deliberately conservative; Entry_Mid->entry would have flipped ~290 English rows into entry and re-created the #270 over-labeling), Mid->mid, Senior->senior, Lead_Manager->lead, Director_Head->director, VP_Executive->executive. Restrict to `current seniority='mid'` so the LLM never overrides a regex-asserted entry/senior/lead.
- **Accepted floor:** ~700 new rows have `req_seniority` NULL (LLM could not extract seniority from sparse Hebrew agency JDs). They stay `'mid'` and still surface to early-career students via the `[entry, mid]` gate, just not under a strict "Entry" filter.
- **Free registry is CAPPED.** The 286-company unknown/custom probe recovered ~0; Israeli enterprises are WAF-walled or run custom portals. The discovery crawler is a confirmed dead end. The business/Hebrew unlock came entirely from AdamTotal (a clean, server-rendered Israeli ATS, no bot challenge).
- **Held / deferred (separate decision):** the Playwright/WAF tier (Phoenix, CLAL, Mizrahi Tefahot, Cellcom, BDO nonce-gated, the Comeet token jobs) ~500-700 jobs, ~1 week of fragile infra. Carries a real ToS question (bypassing Radware/Akamai bot protection) that needs a legal gut-check with Noms before any commitment. JobsPipe (paid-ish aggregator) was deliberately declined for now.

### Tracked loose threads (not blocking)

- Drop `public._seniority_derive_rollback_2026_06_09` after a cron or two of stable pipeline runs (keeps the RLS-on-every-table invariant clean).
- Peres rows are tagged `ats_source='adamtotal_agency'` (placement agency, 403 jobs, vaguer + can duplicate direct listings). Decide matcher treatment: deprioritize/flag agency reposts. Product tuning.

---

## Part 2 — IMMEDIATE NEXT ACTION: welcome-email re-send

### The bug (already fixed, no code work needed)

A trailing newline in the `RESEND_API_KEY` dashboard secret put a newline into the Authorization header, so Deno's `Request` constructor rejected the whole headers object ("not a valid ByteString"). This silently failed **17/17 welcome-email sends from June 2 to June 7.** Fixed June 8 (`trim()` + ByteString guard at `supabase/functions/_shared/send-email.ts:66-70`); 6/6 successes since. The Resend call shape is correct against the current API.

Optional hardening: strip the trailing newline from the actual `RESEND_API_KEY` secret in the Supabase dashboard so the code `trim()` is belt-and-suspenders rather than the only safeguard.

### What remains: re-send to the 14 who never received it

The 14 failed during the newline window and never got a success. Independently verified via `function_metrics` (failed AND never succeeded, pilot cohort, no test aliases):

| # | Email | Name | Code |
|---|-------|------|------|
| 1 | danzfine@gmail.com | Daniella Fine | GETAJOBPILOT |
| 2 | matiborlak@gmail.com | Matthew Jordan Borlak | GETAJOBPILOT |
| 3 | dan.sonnenblick@gmail.com | Dan Sonnenblick | GETAJOBPILOT |
| 4 | redheadeg@gmail.com | Ella Galer | GETAJOBPILOT |
| 5 | jenna.grob22@gmail.com | Jenna Grob | GETAJOBPILOT |
| 6 | amischapiro@gmail.com | Amitai Schapiro | GETAJOBPILOT |
| 7 | rhinepenelope@gmail.com | Penelope L. Galitzer | GETAJOBPILOT |
| 8 | adar123cohen@gmail.com | Adar Cohen | GETAJOBPILOT |
| 9 | ybarshain@gmail.com | Yonah Bar-Shain | GETAJOBPILOT |
| 10 | agamf123@gmail.com | Agam Faragi | GETAJOBPILOT |
| 11 | david.p.lifschitz@gmail.com | David Lifschitz | GETAJOBPILOT |
| 12 | gavibook@gmail.com | Gabriel Book | GETAJOBPILOT |
| 13 | ofriraichel@gmail.com | Ofri Raichelson | INTERNSHIPGETAJOB |
| 14 | burshanadi62@gmail.com | Adiburshan | INTERNSHIPGETAJOB |

Do NOT re-send to the 5 who succeeded post-fix: werner.gidon, nevo.liani, rpress13, zaczbrown, michael@sobol.cc.

**Verification note:** the raw "failed-and-never-succeeded" set is 18, but 4 are Eli's own `elienglard34+demo...` test aliases on TEAMGETAJOB / VIPGETAJOB. The picker filter below correctly drops them. This filter is load-bearing.

### Picker filter (safety-critical)

A user is in the re-send list only if ALL hold:
- has a `function_metrics` row with `function_name='send-welcome-email'` and `ok=false`
- has NO `function_metrics` row with `function_name='send-welcome-email'` and `ok=true`
- `profiles.invite_code IN ('GETAJOBPILOT','INTERNSHIPGETAJOB')`
- `auth.users.email NOT LIKE '%+%'`

### Re-send plan

Build `scripts/resend-failed-welcomes.ts` + a `workflow_dispatch` GitHub Action (matches the backfill pattern).

Three idempotency layers so a re-run cannot double-send:
1. Pre-flight DB filter: skip any user_id with an existing `ok=true`.
2. Resend `Idempotency-Key: welcome:<user_id>` (24h Resend-side dedupe).
3. Post-send metric write to `function_metrics` so the next run's pre-flight catches it.

Safety guards:
- **Dry-run by default** (`--dry-run` lists the 14 without sending; `--execute` to fire).
- Recipient cap: abort if the picker pulls more than 20.
- `--confirm-count=14` must match, else abort.

Email: `from: Get A Job <noreply@getajob.careers>`, `replyTo: eli@getajob.careers`, subject "You're in.", body `buildBody(full_name, cohort_label)`.

**CRITICAL:** run dry-run first, review the 14 names, then Eli runs `--execute` himself. This sends to real external users; it must not be auto-fired by an agent.

### Paste-ready prompt for the build agent (Claude Code)

```
Build a one-shot welcome-email re-send for the 14 pilot users whose sends failed during the
June 2-7 RESEND_API_KEY-newline window (bug already fixed June 8, no code fix needed).

Picker (a user qualifies only if ALL hold):
- function_metrics has function_name='send-welcome-email' AND ok=false for the user
- AND no function_metrics row with ok=true for 'send-welcome-email' for that user
- AND profiles.invite_code IN ('GETAJOBPILOT','INTERNSHIPGETAJOB')
- AND auth.users.email NOT LIKE '%+%'
Expect exactly 14 (the 4 +demo TEAMGETAJOB/VIPGETAJOB aliases must be filtered out).

Deliverable: scripts/resend-failed-welcomes.ts + a workflow_dispatch GitHub Action.
- Reuse the existing sendEmail() in _shared/send-email.ts (from noreply@getajob.careers,
  replyTo eli@getajob.careers, subject "You're in.", body from full_name + cohort_label).
- Idempotency: (1) pre-flight skip any user with ok=true; (2) Resend Idempotency-Key
  welcome:<user_id>; (3) write a function_metrics row per send.
- Safety: --dry-run DEFAULT (print the 14 recipients and stop), --execute to send,
  recipient cap abort >20, require --confirm-count=14.
- Do NOT auto-execute. Run --dry-run, print the list, and stop for Eli to review and fire
  --execute himself.

Also: strip the trailing newline from the RESEND_API_KEY secret in the Supabase dashboard.
```

---

## Part 3 — Funnel items after the welcome re-send (priority order)

1. **CV-extract OCR gap.** `dan.sonnenblick@gmail.com` (one of the 14) failed CV extraction twice on a scanned/image PDF (`empty_text` / 422). No OCR fallback today. Product gap: empty-text extraction needs an OCR fallback or a clear re-upload prompt. A welcome + re-upload nudge re-engages him on both fronts.
2. **Profile-droppers.** ~9 sign-ups who never built a profile. These had NO invite code (a separate funnel leak from the 14). Investigate the invite-gate / first-onboarding path.

---

## Working method for the new agent

- Claude.ai (or this planning agent) scopes, drafts paste-ready Claude Code prompts, and independently verifies via Supabase MCP (project ref `ilmqmodklutztuybsvwd`). Claude Code executes on branches. Eli approves before merge.
- Verify, do not trust CC reports alone, especially anything that sends to or mutates real users.
- Edge functions do NOT auto-deploy on merge; manual `supabase functions deploy <slug>` after backend PRs.
- No em dashes in any deliverable.
