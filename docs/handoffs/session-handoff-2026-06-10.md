# Session handoff — 2026-06-10 — proof-signals swap shipped, CV→Sonnet kickoff

## TL;DR
Shipped: proof-signals prompt strip (PR #282) + extract-proof-signals model swap
gpt-4o → gpt-5.4-mini (PR #283), both merged + deployed. Resolved the "do we need more
domains/skills" question (answer: no, they're cosmetic downstream). Opened the next big
workstream: generate-tailored-cv → Claude Sonnet 4.6. Investigation complete, nothing built
yet. Next action is regenerating the CV bake-off evidence (it is NOT committed in-repo).

## Shipped this session
- PR #282 (squash d6f6055): proof-signals prompt strip (removed 500 "undefined: undefined"
  lines, 86,190 → 48,831 chars, 125 canonical lines byte-identical) + shared module
  `_shared/proof-signals-prompt.ts` + bake-off harness. Deployed on gpt-4o.
- PR #283 (squash beda4db): extract-proof-signals routed to gpt-5.4-mini via model-routing.ts
  (reasoning_effort 'none', max_completion_tokens 16000, no max_tokens). Call-site branching
  added; shared openai-chat.ts untouched (so all other consumers byte-identical). Deployed.
  Both feature branches deleted.
- Bake-off verdict (19 pilot CVs, 5 models): gpt-5.4-mini won. Clears the verbatim gate
  (93.9% ≈ gpt-4o 93.7%, both ~99% ex the jenna.grob22 measurement artifact), composite 0.909,
  ~6x cheaper than gpt-4o ($0.0066 vs $0.039/call), faster (9.6s vs 11.1s p50), more complete
  (11.9 vs 8.4 signals). Both onboarding extraction surfaces (resume-extractor + proof-signals)
  now on gpt-5.4-mini.
- Honest recalibration: the signal-ID-validity edge I first cited as a quality win is cosmetic
  downstream (see below). The pick stands on H1 parity + completeness + cost + latency.

## Resolved: "do we need more domains/skills/signals?" → NO
CC traced how generate-tailored-cv consumes proof_signals (verified against 3 live profiles):
- Bullets are grounded on `supporting_evidence` (array of verbatim CV quotes) + `mapped_skills`.
- `proof_signal` (the ID) is inert (explicitly kept out of CV output). `primary_domain` is a soft
  LLM cue with omission as its safe failure mode. `source`/`strength`/`level_modifiers`/
  `adjacent_fields` are unread.
- So bake-off axes H3 (signal-ID validity) and H4 (domain validity) do not affect CV output.
  Only H1 (verbatim evidence) matters, and that's a model+prompt property, not a library one.
- Decision: do NOT expand the signal library or domain set. The 500 orphan entries stay
  non-offerable. The only genuine library-quality lever is the separate Path B `relevantSignals`
  pipeline (125 canonical entries' mapped_skills accuracy, feeds LIBRARY_CONTEXT when target role
  is known) — lower priority, curation not expansion.
- Note: CC's closing line ("clean up supporting_evidence in the library") was wrong;
  supporting_evidence is a runtime extraction output, not a library field.

## ACTIVE workstream: generate-tailored-cv → Claude Sonnet 4.6
This is a feature on a production-critical rendering path, NOT a bare swap. Investigation done
(CC report this session). Nothing built.

### Baseline (function_metrics, gpt-4o)
p50 16.4s, p95 28.4s, ~$0.042/call, 1184 avg tokens_out, 5/95 model-call failures (~5%) plus
3 pre-model failures. Slow and not fully reliable — part of the motivation.

### Investigation findings
- Three OpenAI calls per request, all via `openaiChatCompletionWithRetry`, all on
  `const MODEL = "gpt-4o"` (index.ts:25). Pass 1 JD-keyword extract (line 130, max_tokens 600),
  Pass 2 main CV authoring (line 1396, 4096, temp 0.2), Pass 3 conditional coverage retry
  (line 1477). All parse `choices[0].message.content`.
- Transport: NO production Deno code calls a non-OpenAI vendor. model-routing.ts has a
  `transport` field but no edge function reads it. Shared helper is OpenAI-only. metrics.ts
  ALREADY prices claude-sonnet-4-6 (input 3.00 / output 15.00) so cost tracking works once wired.
- Credentials: neither ANTHROPIC_API_KEY nor OPENROUTER_API_KEY is in Supabase secrets.
  PREREQUISITE: add one before any Sonnet call authenticates.
- Numeric-preservation guard: ALREADY LIVE at index.ts:2085-2153. Post-author, non-blocking,
  attaches `unsourcedBullets[]` warnings; reads cvData + source haystack; transport-agnostic.
  No move needed.
- Thin-profile path: only a fragile prompt instruction ("Option A" in the harness). No code
  path. Durable fix = pre-compute bullet seeds from proof_signals.supporting_evidence in the
  edge function. Independent of the swap; Sonnet's stronger grounding MAY close the gap.
- Feature flag: NO precedent in Deno edge functions. We'd establish one.
- CV bake-off result is NOT committed to the repo. Harness exists
  (scripts/test-cv-authoring-diff.ts, candidate list includes claude-sonnet-4.6, compares
  gpt-4o+OLD vs gpt-4o+Option-A vs candidates+Option-A). "Sonnet won" is an external/local memory.

### Decisions locked
1. Transport = OpenRouter's OpenAI-compatible endpoint. Rationale: preserves the OpenAI response
   shape, collapsing the parse-layer blast radius to zero (6 sites in the function + 3 in the
   shared helper's Langfuse trace stay untouched). Proven by the bake-off harnesses. Cost: an
   OpenRouter intermediary dependency; mitigated by the opt-in flag (default stays gpt-4o) and a
   later gpt-4o fallback. Direct-Anthropic rejected for this surface (9 parse-site rewrite on a
   production-critical path).
2. Numeric guard reused as-is (already live, transport-agnostic). Watch unsourcedBullets in
   validation as the objective anti-fabrication signal.
3. Thin-profile code path is conditional (Phase 3), decided after eyeballing Sonnet output.
4. Flag pattern: establish `?sonnet=1` query-param gate; default branch stays gpt-4o.
5. Evidence gate: regenerate (or locate + commit) the CV bake-off result before building.

### Phase plan
- Phase 0 (GATING): get committed CV bake-off evidence. Re-run scripts/test-cv-authoring-diff.ts
  locally (Eli has OPENROUTER_API_KEY in shell), or locate + commit the prior /tmp result.
  Decision rule TBD with Claude.ai before the run: fabrication (unsourced bullets) is the hard
  gate, then quality, then latency/cost. Confirms Sonnet wins AND that Option A helps.
- Phase 1: OpenRouter transport in the call path (honor route.transport='openrouter') + Sonnet
  route entry + `?sonnet=1` opt-in flag (default gpt-4o). Prereq: add OPENROUTER_API_KEY to
  Supabase secrets. Test on Eli's own profile via the flag. HOLD-FOR-REVIEW PR.
- Phase 2: eyeball Sonnet output on real + a thin profile; check numeric-guard unsourcedBullets;
  decide whether Phase 3 is needed.
- Phase 3 (conditional): thin-profile bullet-seed code path (pre-compute seeds from
  proof_signals.supporting_evidence before the LLM call).
- Phase 4: flip default to Sonnet after opt-in validation + a real-CV smoke; keep the flag as a
  kill-switch.

## Immediate next action
Send CC the harness-recon prompt (report-only, HOLD): confirm the CV-authoring harness is current
(Sonnet 4.6 slug resolves on OpenRouter), report what it measures/outputs, search /tmp + repo for
the prior result, and stage the keyed run command without running it. Then Claude.ai sets the
decision rule, Eli runs it, results picked on evidence, then Phase 1 build.

## Method invariants (carry-over, do not drift)
- No em dashes in any deliverable or chat message.
- Never trust CC reports alone: verify diffs via raw GitHub fetch (cache-bust ?t=$(date +%s);
  GitHub API 403s, use raw) and live data via Supabase MCP execute_sql (check
  information_schema.columns first).
- Edge functions need manual deploy after merge:
  `supabase functions deploy <slug> --project-ref ilmqmodklutztuybsvwd`. Frontend auto-deploys on
  merge; confirm Vercel actually fired.
- HOLD-FOR-REVIEW PRs, squash-merge, never auto-merge. Ask-don't-tell with CC. Genuine pushback
  expected.
- Production-critical paths (auth, chat, rendering) → opt-in flag first (PR #156 streaming revert
  lesson). CV gen is one of these.
- Model upgrades = per-surface bake-off → pick on committed evidence → scoped routing-layer swap
  → smoke before default. Routing layer = _shared/model-routing.ts (ModelRoute: model, transport,
  response_format, temperature, reasoning_effort, max_completion_tokens).
- Eli's keyed local run pattern: SUPABASE_URL + service-role inline (never printed),
  OPENAI_API_KEY/OPENROUTER_API_KEY already exported, end with 2>&1 | tee /tmp/<name>.log.
  Ctrl+C the studio before terminal commands. No Docker (no local Supabase stack / functions
  serve). Vercel previews historically broken.

## Deferred / pending (not blocking)
- Smoke the proof-signals swap: first real onboarding logs an extract-proof-signals row on
  gpt-5.4-mini; verify model + ok=true + non-trivial tokens_out. (Or force via one throwaway
  onboarding.)
- Delete demo2121 throwaway (user 065acd73) via the delete-account function (not raw SQL) so
  CASCADEs + storage wipe run.
- Roadmap after CV: ai-chat conversational agent bake-off (career_agent, gpt-4o-mini, highest
  perception leverage, tied to 4-agents→1 consolidation); generate-career-analysis (slow, leaks
  raw scores); LinkedIn outreach (diagnose prompt before model). App-wide redesign queue
  (LinkedIn Networking 3J-C next). Isaac: Stripe/pilot-gate/100-cap/waitlist. Noms: privacy +
  ToS.

## Key infra facts
Supabase ref ilmqmodklutztuybsvwd. function_metrics: function_name, model_used, ok, error_code,
latency_ms, tokens_in/out, cost_usd, http_status, created_at. Models live: gpt-4o, gpt-4o-mini,
gpt-5.4-mini (resume-extractor + proof-signals). Sonnet not yet wired. Notion hub
3658298b80cf811d8adfe28be1afc455. Repo getajob-careers/get-a-job, local /Users/elienglard/getajob.
main @ beda4db.