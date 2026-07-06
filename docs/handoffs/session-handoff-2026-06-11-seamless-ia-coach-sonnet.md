# Session Handoff — 2026-06-11 — Seamless IA ships, Coach everywhere, Sonnet on chat

**The day in one line:** opened against a stale handoff, ended with the new IA live, the Career page complete (Roadmap + Jobs + Tracker on one page), the Coach docked into the sidebar on every page with working action handlers, page-context injection live on ai-chat, and a flag-gated Sonnet swap on the chat route — eval-gated by a harness built the same day.

**Read this first if you're a new session:** the previous handoff (June 10/11, CV Sonnet ramp) said "resume the redesign queue at LinkedIn Networking (3J-C)." That was stale — the whole restyle rollout had already shipped. Do not trust handoffs over `PROJECT_INSTRUCTIONS.md` on main + `tasks/redesign.md`; both were updated in every PR today and are current as of this file.

---

## Merged today (chronological)

| PR | SHA | What |
|---|---|---|
| #287 | 9a1f977 | Isaac's seamless IA: Home → "Today" command center, new Career page (Roadmap+Jobs condensed), nav slim-down (Today / Career / Chat / Internship / Profile). Merged after two CC review cycles + fix commit b1ee594 (axis-bar numerals removed, null-score guards, typecheck casts, RULINGS.md). Merge pulled forward from June 15 with Isaac's blessing. |
| #288 | 6add29e | HOTFIX: career_roles scores are 0-1 fractions (max across all 426 rows = 1.0); Career rendered them as 0-100 → "1%" rail for every user. `toPct()` + pluralization + fixtures converted to the live contract + lessons entry (fixtures must mirror data contracts, not display units). |
| #289 | — | Parity 1: seniority pre-filter restored on Career (with the Track-3 bypass, the 66→0 Senior-PM lesson) + queryKey extension + duplicate location chip dropped. |
| #290 | 394b37d | Parity 2: Career adopts canonical `<JobCard>` (JD toggle, strengths/gap chips, reason line back; net −50 lines) + "This track / All jobs" search scope (plain ilike path mirroring Jobs.jsx, debounced, own query key) + RULINGS-d copy fix in JobCard. |
| #291 | e33e7d9 | Pipeline strip on Career (4 buckets; rejected excluded) + `FUNNEL_BUCKETS` → src/lib/funnelBuckets.js + `RdFunnelTile` extraction + optimistic Apply (cache prepend + rollback in JobCard, Jobs page inherits it) + all /Tracker entry points retargeted to `/Career?pipeline=open` + rider: search-scope toggle always visible pre-typing. |
| #292 | 86cf752 | Inline expandable kanban on Career (reuses ApplicationsKanban + ApplicationDetailDrawer), `?pipeline=open&app=<id>` URL contract, /Tracker → redirect, 7-step guide as dismissible first-time card. Revision required mid-review: manual-add had been scope-cut to protect the typecheck number — rejected; `AddApplicationDialog` extracted shared (Tracker + Career), zero TS delta. |
| #293 | 8763108 | Agent drawer Phase A: right-edge tab + panel hosting Career Agent, `variant="drawer"` ChatInterface, coach-band CTAs open the drawer pre-seeded. (Tab later removed in #295.) |
| #294 | c01355f | Page-context injection: client sends `{page, application_id?, job_id?, role_id?, track?, company_target_id?}` IDs only; server fetches authoritatively under auth (page-context.ts, 22 tests); rate limit 30→50. **ai-chat deployed.** Smoke test on production confirmed injection (+2,596 input tokens/turn; agent used the APM gap + Workiz application unprompted). |
| #295 | — | Coach dock (reworked twice): coach chat permanently docked in sidebar dead space (desktop), persistent coral Coach chip in mobile header → bottom sheet (primary mobile entry), dock + panel share one rolling conversation (CoachConversationContext), overscroll-contained thread, ResizeObserver collapse <~220px. Revision required: condensed suggestion rows were dead ends → `coachActionHandlers.js` extracted (all 5 SUGGESTED_* types Apply for real from dock + panel; zero deferrals; ChatInterface now delegates). |
| #296 | 9052efa | ai-chat eval harness + bake-off: 19 frozen fixtures (15 core + 16-19 from today's real production failures), production-mirrored parser, banded judge, findings doc. |
| #297 | pending merge at write time | Dock visual polish: single inset card, anchored empty state, coral-tint starter chips, asymmetric bubbles, suggestion-row redesign, solid-coral send. Restyle-only; one hex nit in CoachThread flagged for tokenizing at merge. |
| #298 | pending merge at write time | Flag-gated Sonnet on the chat route (`chat_model='sonnet'` → claude-sonnet-4.6 via OpenRouter, gpt-4o-mini fallback; two rollback levers), fence-tolerant extractJsonBlock, CONTEXT_HONESTY_RULES, Option-B refactor (prompt assembly → prompt-lib.ts; harness drift guard deleted), `scripts/validate-chat-deploy.ts`, raw judge scores frozen in repo. **Approved flag-live; merge → Vercel → `supabase functions deploy ai-chat` → validate-chat-deploy against production.** If this file predates that report, confirm it completed before anything else. |

## The bake-off verdict (drives #298)

5 candidates × 19 fixtures, production-identical prompt. **Sonnet sweeps**: action 16/19, adversarial 3.79, voice 4.00, grounding 3.95, p50 2333ms, $0.0232/turn (+$386/mo at the 40-turns × 100-students ceiling; realistic current spend is tens of dollars). gpt-5.4-mini = documented **budget fallback** (+$75/mo) but NOT within noise — supplementary grounding 2.50 vs 4.00. gpt-5.4 matches quality at 6.1s p50 (ruled out for chat). gpt-4o dominated. Incumbent + gpt-4o both still fabricate a full inline CV on CHAT-19. **Spend tripwire: revisit with a mini/Sonnet route split if real spend crosses $150/mo** (watch function_metrics weekly).

## Decisions locked today (do not relitigate)

- **Scores rule codified:** max one SCORE per card; counts/fractions exempt (rule governs model judgments that can disagree, not arithmetic facts); axes as bars with NO numerals; null scores render nothing, never 0%.
- **`docs/design/redesign/isaac/RULINGS.md` is part of the design spec**; the PNG mockups alone are not. Mockup-vs-rulings conflicts resolve to the ruling.
- **Career board = inline expandable** (option a). Full-width sheet rejected (three-Sheet stack with the agent panel).
- **Coach = dock in sidebar (desktop) + header chip (mobile).** Right-edge tab retired. One rolling conversation, two views.
- **Prompt honesty rules** (in #298): page-viewed entity is the subject over TARGET APPLICATION; deixis honesty (can't see page lists → ask, never substitute); score vocabulary entity-bound (jobs never get readiness); CV requests emit the card, never inline content.
- **Sonnet on chat, flag-gated, flag-live** (not dark-ramped — validation must exercise the real path).
- Strip `[HOLD FOR REVIEW]` from PR titles before squash-merge (memory rule saved after #292's title leaked into history).

## Data corrections discovered

- **14 of the 44 profiles are Eli's test accounts.** Real pilot ≈ 26-27 onboarded humans of ~30 profiles. Adjust any PostHog/pilot reporting; a demo-account cleanup pass is worth scheduling.
- career_roles scores are **0-1 fractions** by contract (426 rows, all users). Roadmap's RoleCard always scaled ×100; Career didn't until #288.
- Jobs corpus ~5,294 at last count. ai-chat rate limit now 50/h.

## Open items (next session's menu, roughly in order)

1. **Confirm #297 + #298 closed green** (merge SHAs, ai-chat deploy, validate-chat-deploy results, first-week cost expectation). If validation failed, the rollback levers are the frontend `CHAT_MODEL` flag and the OpenRouter secret.
2. **Welcome-email re-send** — STILL unexecuted (paste-ready prompt from the June 9 session); verified-user count has grown since.
3. **propose_internship CHECK-constraint migration** (23514 on Practicum prefill) — small, practicum approaches.
4. **Typecheck baseline discrepancy:** main checkout measures 404, eval worktree measured 416 — environment-dependent counting; logged on the ratchet-drift Notion card. Reconcile measurement env, then fix back toward the documented 400 or consciously re-baseline.
5. **Langfuse push of bake-off scores** — raw evidence frozen at `docs/research/raw-chat-bakeoff-judged-2026-06-11.json`; the runner's push step is env-gated, run locally with keys when convenient.
6. **Phase B epics (carded):** agent merge (all agents → the coach; rich SUGGESTED card UI extraction to shared components is its first slice); B3 visible-list IDs in page_context (makes "second role on this page" answerable — the structural fix behind the deixis honesty rule).
7. **Mobile coach follow-up:** watch pilot data on header-chip usage; the hamburger-dock is secondary by design.
8. **Standing third-party items:** Isaac — landing page (last unticked redesign row), Stripe/pilot gate/waitlist; Noms — privacy/ToS content + the extension-LinkedIn + Playwright legal gut-check (one conversation, same question twice).
9. **Demo-account cleanup** + Turnstile localhost allowlist if not yet done.

## Gotchas earned today (also in tasks/lessons.md)

- **Preview fixtures must mirror live data contracts, not display units** — a 100× display bug survived two reviews and a 17-page visual packet; only the real-account production lap caught it. The founder's five-click lap is a non-optional review stage.
- **A more-tolerant harness parser silently lies** — mirror production's extractJsonBlock exactly (Sonnet fences JSON).
- **Branch reviews are commit-pinned:** Isaac pushed a 501-line Career page onto a branch mid-review; always delta-review `old_tip..new_tip` before merging anything that moved.
- **Squash-merging a stale-based branch silently reverts main** — the seamless-IA branch predated the CV Sonnet PRs; merge main into long-lived branches (squash hides the merge commit anyway).
- **Never scope-cut a user capability to protect the typecheck counter** — extract/shared-componentize instead (AddApplicationDialog, coachActionHandlers both netted zero delta).
- deno check needs `--node-modules-dir=auto`; Langfuse EU traces display ~10 min late; worktrees (`git worktree add -b <branch> ../dir main`) are the pattern for parallel CC sessions — one branch per worktree, merges stay sequential through Eli.
