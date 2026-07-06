# Session Handoff — 2026-06-11 — CV Authoring Moved to Sonnet 4.6 (Shipped to Default)

**Outcome:** generate-tailored-cv Pass 2 (authoring) and Pass 3 (coverage retry) now run on claude-sonnet-4.6 via OpenRouter for ALL users, by frontend default. Pass 1 (JD keyword extract) stays on gpt-4o. Shipped end to end in one session: PRs #284, #285, #286, all merged and deployed, final production validation all-PASS at ~00:07 UTC June 11.

**Rollback lever (memorize this):** revert the two frontend lines (cv_model: "sonnet" in src/components/tracker/CVManagement.jsx:80 and src/components/chat/ChatInterface.jsx:1207), ship Vercel. The server-side gpt-4o default takes over instantly. No edge-function redeploy needed.

---

## The arc, in order

### 1. Phase 0 invalidation and rebuild
The June 10 bake-off ("Sonnet won 18/18") turned out not to gate anything: it tested the PRE-#234 output schema ({title, company, dates, bullets}) and a simplified 4-line policy slice instead of the real production prompt. Rebuilt the harness (scripts/test-cv-authoring-diff.ts):
- Production prompt cell assembled via Option Y: static blocks vendored verbatim, LIBRARY_CONTEXT computed at module load through the same matcher production uses. Full assembled prompt dumped per run with SHA-256 in the report header (snapshot SHA dbfa7340...).
- Schema updated to the post-#234 {index, bullets} contract, with per-cell index-validity checking (integers, 0-based, bucket order, no gaps).
- Invite-code profile fetch (GETAJOBPILOT + INTERNSHIPGETAJOB), full pilot set: 21 profiles.
- Production validator ported faithfully (QUANT_TOKEN_RE, TOKEN_BLOCKLIST, six-source haystack), plus per-number hit/miss detail and a range-token manual-review flag.
- Committed evidence: docs/research/cv-bakeoff-2026-06.md.

### 2. Matrix results (21 profiles x 3 cells)
| Cell | Index validity | Unsourced | Numbers carried | p50 latency | Cost |
|---|---|---|---|---|---|
| gpt-4o + production prompt | 13/21 (62%) | 1 | 30/35 (86%) | 3430ms | $0.62 |
| gpt-4o + Option A | 13/21 (62%) | 1 | 31/35 (89%) | 4433ms | $0.28 |
| Sonnet + Option A | 21/21 (100%) | 6 | 35/35 (100%) | 3203ms | $0.46 |

Fabrication hard gate: all cells passed. Every unsourced flag decomposed to validator false positives (org names like ISCAR, SAP, IDF, unit 727, MBA living outside the haystack), one format variant, one derived figure ("14 years" computed from dates). Zero invented metrics in 63 calls. Sonnet's higher flag count is an instrument artifact: it includes more real detail the haystack cannot see.

Decision: Option A alone on gpt-4o moves nothing that matters. Prompt and model ship together behind the flag. Standalone prompt PR is dead.

### 3. Live production finding: gpt-4o cross-bucket migration
gpt-4o re-buckets military-service entries (source professional_experiences index N emitted under military_experiences index N) on 8 of 21 pilot profiles. Endemic to this cohort shape (Israeli students, near-universal military service). Traced reconcile behavior:
- Misroute into an EMPTY bucket: the entry's tailored bullets silently vanish; the source slot renders with raw responsibility text or zero bullets. Status 200, no log, no error row.
- Misroute into a NON-EMPTY bucket: positional fallback stamps the wrong bullets onto a real entry. Silent corruption variant.
- No live damage occurred: only 5 post-#234 CV generations existed, all from the test account.
- Decision (locked): NO reconcile hardening. A cross-bucket rescue heuristic cannot distinguish misroute from legitimate output and risks corrupting Sonnet's correct emissions. The Sonnet swap IS the fix (21/21 index validity). Defensive instrumentation added instead: fillFromSource now records unclaimed_entry and positional_fallback warnings as structured console.warn plus an additive reconcile_warnings array in the response payload.

### 4. PR #284 (transport + flag)
- _shared/openrouter-chat.ts: parallel helper, OpenAI-shaped request/response, reuses sendLangfuseTrace unchanged.
- cv_model body param on the template_style pattern. Anything other than literal 'sonnet' resolves to gpt-4o. Default branch verified byte-identical to pre-PR main (only Langfuse metadata gained cv_model).
- OPTION_A_OVERLAY appended on the Sonnet branch only: source ranking, bullet cap, verbatim-metrics scope, sparse fallback, plus two targeted rules from observed defects (projects only from USER_DATA.projects; never derive or compute figures).
- m.modelUsed='claude-sonnet-4-6' stamped on the Sonnet branch.

### 5. The fence bug (PR #285)
First deployed Sonnet calls 500'd with json_parse. Root cause: OpenRouter does not enforce response_format json_object for Anthropic models; Sonnet returns ```json fenced output. Phase 0 never saw it because the harness has a three-tier tolerant parser (strict, fence-strip, brace-match) that production lacked. Fix: parseLlmJson ported to production at both parse sites, both branches (strict fast path is a no-op for clean JSON; bonus: empty model content now throws instead of silently parsing "{}" into an empty CV). Structured error includes finish_reason plus 80-char preview.
**Lesson recorded in tasks/lessons.md (2026-06-11):** a harness parser must be no more tolerant than the production consumer it stands in for, or bake-off evidence silently stops describing production. Diff the harness parse path against production BEFORE running any evaluation.

### 6. PR #286 (ramp)
- openrouterChatCompletionWithRetry: full parity with the OpenAI wrapper (3 retries, exponential backoff + jitter, Retry-After honor capped 30s). Pass 2/3 route through it.
- Error-source relabel: Sonnet failures report "OpenRouter error" / openrouter_<status>; default branch labels byte-identical.
- Frontend default flipped at both call sites (verified independently via raw GitHub).
- scripts/validate-cv-deploy.ts committed as the standing post-deploy validation tool.
- Docs updated (PROJECT_INSTRUCTIONS.md, README.md env section), Notion cards created.
- Both deploys verified: edge function via CLI, Vercel webhook fired clean (no #221-style retrigger needed).

### 7. Final validation (post-ramp, production)
validate-cv-deploy.ts, three calls: (a) sonnet no-JD PASS claude-sonnet-4-6, (b) no cv_model PASS gpt-4o (rollback lever alive), (c) sonnet + Guidde JD PASS claude-sonnet-4-6. reconcile_warnings empty everywhere, zero unsourced flags. Eyeballs approved: matiborlak projects section exactly his 2 real projects; agamf content grounded and strong; Eli's Sonnet CVs visibly richer than the gpt-4o baseline and the JD variant absorbed CS vocabulary without invention.

---

## Standing tool: validate-cv-deploy.ts
Run after any generate-tailored-cv deploy. Auth via ELI_JWT (Supabase captcha blocks scripted password sign-in; this is correct, leave captcha alone).
1. Browser DevTools console at getajob.careers (signed in, page freshly refreshed; tokens expire in ~1 hour):
   JSON.parse(localStorage.getItem('sb-ilmqmodklutztuybsvwd-auth-token')).access_token
2. export ELI_JWT='<token>'
3. Single-line run (repo root):
   SUPABASE_URL=https://ilmqmodklutztuybsvwd.supabase.co SUPABASE_ANON_KEY="$(grep ^VITE_SUPABASE_ANON_KEY .env.local | cut -d= -f2-)" SUPABASE_SERVICE_ROLE_KEY="$(supabase projects api-keys --project-ref ilmqmodklutztuybsvwd 2>/dev/null | grep service_role | awk '{print $3}')" npx tsx scripts/validate-cv-deploy.ts 2>&1 | tee /tmp/cv-validate.log
4. unset ELI_JWT
Expected: (a)/(c) claude-sonnet-4-6, (b) gpt-4o, reconcile_warnings empty. A 401 on all three means a stale or clipped token, not a deploy problem.

---

## Known residuals (accepted, monitored)
1. **Pass 3 never exercised on OpenRouter in anger.** Sonnet keeps clearing the coverage threshold first pass (token arithmetic confirms no retry fired in any validation run). Structurally identical helper and payload to Pass 2. Watch Langfuse for the first organic pass-3-retry trace with cv_model=sonnet.
2. **Validator haystack gaps:** company names, titles, education degrees, military unit names are not in the haystack, so bullets naming the user's own employer flag as unsourced (ISCAR, SAP, IDF, 727, MBA classes). Production live validator shares the gap. Card: add experience company/title and education fields to the haystack.
3. **Eyeball script caveats:** bypasses the deployed function (no fillFromSource, so LLM-dropped entries look missing when production would render them); writes a PDF even on a failed model call; displays cost $0.0000 (OpenRouter usage not parsed). Card-worthy cleanup.
4. **PDF renderer title/date collision** on long single-line experience headers (Notion card created, P2/P3, render-layer only).
5. **OpenRouter balance** was $4.22 at session end; each Sonnet CV costs ~$0.07-0.08 ($0.04 on gpt-4o before). Top up ahead of any usage burst.
6. **Post-ramp at scale:** evaluate direct Anthropic transport + prompt caching (the ~33KB system prompt is a strong caching candidate). The helper file was designed so anthropic-chat.ts drops in as a third module.

## Method learnings worth keeping
- Three-cell matrices (control / prompt-only / prompt+model) separate levers cheaply; the missing control cell was the original sin of the first bake-off.
- A bake-off must test the production contract: schema, prompt, and parse path. Two of the three had drifted and the evidence was confidently wrong.
- One-profile smoke runs before full matrices: ~$0.20 to validate the instrument, and the dumped request bodies plus prompt snapshot made independent verification possible without reading a 1,600-line diff.
- Cell (a) anomalies are production findings. The 62% index-validity number was the most valuable output of the whole exercise and nobody was looking for it.

## Next actions
1. **Resume the redesign queue at LinkedIn Networking (3J-C)** (highest fidelity bar, LI_CSS gated teardown, anti-fabrication on warm_up_advice banner), then Chat, Internship, Resources, Settings, Landing.
2. **Welcome-email re-send** to verified pilot users: paste-ready kickoff prompt exists from the June 9 session, still unexecuted.
3. Monitor: first organic pass-3-retry Langfuse trace; any reconcile_warnings appearing in real responses (would indicate Sonnet index regressions); function_metrics error_code openrouter_* entries.
4. Open Notion cards from this session: CV Sonnet ramp (close it now that validation passed), PDF title/date collision, plus new cards to create for validator haystack expansion and eyeball-script cleanup.
5. The eval-harness program (Tier 2 on the horizon list) now has a working template: this bake-off pattern (frozen inputs, production-contract fidelity, committed evidence, hard gates before quality) is the shape to replicate per LLM surface, starting with the ai-chat model upgrade.
6. Unchanged launch blockers: Stripe + pilot gate + waitlist (Isaac), privacy policy + ToS (Noms), comprehensive QA pass (Yishai, after bugs).
