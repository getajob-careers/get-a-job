# Session Handoff — 2026-06-25

## What shipped this session (done, merged, live)

**CV fix (refine-cv JD fallback)**
- Bug: extension CV generation 400'd when the JD wasn't in the request body (user referencing a prior-message JD).
- Root cause: `refine-cv` rejected empty body JD while the JD sat unused on the application row (SELECT didn't pull `job_description`).
- Fix (PR #394): added `job_description` to the app SELECT; falls back to stored JD when body JD empty; 400 still fires only when BOTH are empty. `source_jd` persists the resolved JD. `generate-tailored-cv` untouched (already JD-agnostic).
- Deployed: refine-cv v10 (manual `supabase functions deploy`), then merged to main (701bfe8). Prod + main in sync.

**Extension chat history + permissions fix**
- CWS rejected v0.1.0 for requesting unused `storage` permission (violation ref "Purple Potassium").
- Built DB-backed reopenable chat history reusing the web app's existing `conversations` + `chat_messages` tables (one client-side write path, awaited inserts, no fire-and-forget, no chrome.storage, no edge change). Mirrors web app's career_agent pattern exactly.
- Removed `storage` permission; remaining perms (scripting, tabs, sidePanel, host) all have real call sites.
- Merged as PR #399 / v0.1.2 (618e4474), superseded PR #395.
- VERIFIED LIVE: tested in loaded build — conversation 3e3fe903 "test persistence" wrote correctly to DB (user+assistant msgs, no dupes, RLS held). Read/restore + write both confirmed against live DB.
- **RESUBMITTED to Chrome Web Store** (v0.1.2 zip). In-depth review pending (host permissions trigger it). Awaiting Google's email.
  - Pre-submission audit passed: privacy policy live at getajob.careers/privacy, single-purpose clear, data-use disclosure (PII + Authentication + Website content checked, rest unchecked), permission justifications corrected to match code (no page-scraping language), reviewer test account seeded (elienglard34+cwsreview@gmail.com).

**Registry add — PR #400 (merged, 41307e34)**
- 7 new rows from the Aleph/83North/TLV/Hetz probing: Daisy (2 IL), Dream (31 IL — standout), Fabric (1 IL), Visit.org (2 IL), Mirakl/Orbem/Svix (0 IL self-heal).
- 11 candidates were already-current existing rows (no-op): OneStep, Panorays, Travelier, Windward, PDQ, Nimble, Placer.ai, Unframe, Mixtiles, Lendbuzz, Snappy.
- Excluded: Bond (GH slug 404'd), Fundamental (needs domain).
- Cynet token `33D103133D19E8136E1D25103133D10311D25` confirmed valid live (was earlier suspected malformed — it's correct).

## Registry / corpus state (live, 2026-06-25)
- companies table: 820 rows, 459 verified. NOTE: this LAGS companies_il.json (~915 rows now). The JSON is the authoritative fetch registry; the table is a downstream projection. **For dedupe, the JSON is the source of truth, NOT the table** (this caused a false-absent on Digital Turbine this session).
- Jobs: **4,169 active IL jobs, 344 companies, 305 added last 7 days, 844 remote-eligible, 608 entry/junior.**
- Dream's 31 + Daisy/Fabric/Visit.org flow on next refresh-jobs cron.

## QUEUED FOR TOMORROW — consolidated registry-add PR (prompt already drafted)
Three sourcing streams converged. One CC prompt ready to send (curl-verifies every credential live, classifies IL on country_code/location object, dedupes against companies_il.json, drops non-IL). HOLD FOR REVIEW.

**Comeet embedded, token captured (curl-verify each — some tokens printed inconsistently across report sections, trust only 200 responses, exclude on 400, never repair a token):**
- Appcharge — 9A.00B — A9B4A3D35074A3D3507A9B2A6CA9BA9BA9B — 11 IL (manual capture)
- Port — 59.004 — 954414C02550414C4AA01BFC12A81BFC2550 (manual capture)
- Appdome — E6.005 — 6E5295EDCA304314AF03043295E1B9422799 — 9 IL
- Sensi.AI — E7.00F — 7EF2F9A1FBC3F78017CD7EFFDE1FBC3789 — 4 IL
- Browsi — F3.00B — 3FB13E7FEC13E70BF1BF13FB13E7BF13 — 3 IL
- BeeHero — 78.00E — 87E32F43B7287E32F487E43F087E4C6E10FC0 — 0 IL
- Cynomi — F9.00F — 9FF45F91DFD1DFD4FF845F9013FE59F79FF0 — 0 IL
- Artlist — 85.003 — 5831B8F2C185832C182C181B8F319BB061089 — 2 IL (directory walk)
- SysAid — 43.00A — 34A107269434A069401D9A10721A50 — 2+ IL (directory walk)
- FundGuard — 37.002 — 7322B2C1596159623FA40C21CC8159615961CC8 — 0 IL (directory walk)

**Comeet, likely existing rows (re-verify, update-only):**
- Backslash — 98.004 — 89433783C0C22503378337889419BC33782AE4
- Cynet — 33.00D — 33D103133D19E8136E1D25103133D10311D25

**Comeet hosted board, no token (test endpoint with uid/slug; if token strictly required, mark needs-manual):**
- IVIX — 09.002 — ivix (13+ IL)
- Immunai — 37.009 — immunai
- Flexor — F9.006 — flexor
- Band — 8A.003 — slug thenvoi

**Greenhouse:**
- OpenWeb — slug openweb — 2 IL
- Stream Elements — slug streamelements — 0 IL

**EXCLUDE (credentialed but non-Israeli HQ, 0 IL):** Teza (Chicago), Inshur (London), Archy (US), NetBox (US), Aquant (US-HQ), Torii (US-HQ).

## STILL PENDING — your manual cookie-wall pass (next batch)
Method that works: open careers page in normal browser, accept cookies, find `comeet-init` script with `const token` OR Network tab → comeet.co/careers-api request URL. If page is just a wall of `comeet.com/jobs/SLUG/UID/` links (hosted board), token NOT browser-accessible — log slug+uid, move on.
- ThetaRay — 72.00F (Tel Aviv)
- Toka — 46.00D (Israel)
- Identiq — cookie-blocked iframe (accept cookies, retry)
- Imagindairy, Versatile — cookie-blocked iframes
- IVIX/Immunai/Flexor/Band — hosted boards (CC tests endpoint instead)

## STILL PENDING — browser-agent (CB) follow-ups
- **6 VC portfolios never list-built** (domain-blocked): Viola, Glilot, StageOne, Grove, Vertex, Vintage. Need these domains pre-approved at session start: viola.vc, glilotcapital.com, groveventures.io, stageoneventures.com, vertexventures.co.il, vintageinvestmentpartners.com.
- **Blocked-redirect companies** needing domain pre-approval to probe: Nas.io (nas.com), NVsion (nvision-quantum.com), Novu (careers.novu.co), SWAPP (swapp.ai), EO Network (eo.tech), Regal (regal.ai), Zocks (careers.zocks.io).
- **"domain TBD" candidates** never probed (no domain): AAI Technologies, QuantHealth, Cellular Intelligence, CareFam, Guardoc Health, LeaFix Medical, Incredo, Altesa, Surge Therapeutics, OpenEyes, Silk, Sweett, Undecimal.

### KEY LEARNING — domain allowlist
CB sessions reset a domain allowlist each session. Only domains named in the plan at session start are reachable; novel/redirect domains hard-block (no per-domain mid-session approval available — tested, doesn't work). FIX: pre-approve ALL candidate domains in the plan's domains array at launch. This is what made the successful ~69-company VC probe work. Redirects (e.g. aquant.io→aquant.ai) still block unless both variants pre-approved.

## DEFERRED bugs/fixes (not blocking)
- **Extension scoring write-back race/loss (v0.1.3 candidate):** match-score write-back is an un-awaited fire-and-forget client UPDATE in popup.js; when panel closes before it commits, CV survives but scores lost (confirmed on row 6df02b7a). FIX: move score write server-side into analyze-job-match (it already computes the scores; have it write to the row scoped to user_id). Edge-function + extension change. Prompt drafted in session.
- **main CI red:** "Test + build" failing since Isaac's #396-398 (missing VITE_SUPABASE_URL/ANON_KEY in test job). Unrelated to our changes, Vercel green. Isaac's to fix (dummy env vars in test job or guard client init).
- **Two ZeroPort test rows** in applications (one half-scored) — Eli's test data, delete when convenient.
- **Agora disambiguation:** agora.io (VC list, China/US, not IL — drop) vs agorareal.com (directory walk, real-estate fintech, Tel Aviv, Comeet SSR, 4 IL — keep, needs Comeet API lookup for company uid).

## PLATFORM HEALTH (real users, team/test excluded)
- **47 real users** (43 gmail, 1 Reichman post.runi.ac.il, plus yahoo/sobol/bettear). Accumulated Mar 18 – Jun 24, organic, not bots.
- **Retention is the real signal:** 27 of 47 returned after day-1; 26 of the gmail cohort returned. ~20 one-and-done.
- **Coach is the wedge:** 145 real coach conversations.
- **Core-loop activation is near zero:** only 5 users ever created an application, **1** has a generated CV, 2 marked applied. (Last night's 25-CV/45-app figure was inflated by Eli's own testing — real external usage of CV gen is ~1 person.)
- **Read:** retention + coach engagement encouraging; core-feature activation is the bottleneck, NOT listings (supply 4,169 IL >> demand). When sourcing settles, the lever is converting returning users into first-application-tracked, likely via the coach handing them into the loop.
- Caveat: 47 users is tiny, directional not statistical. Real answer to "who are the returning 26 and why don't they activate" comes from talking to them, not more queries.

## STANDING DISCIPLINE (carries every session)
- Never trust CC self-reports — verify against Supabase/live before merge.
- Dedupe against companies_il.json, NOT the companies table (table lags).
- Classify IL on country_code === "IL" / location object, never display string.
- HOLD-FOR-REVIEW on all PRs; squash-merge then delete branch as separate steps; verify on prod (Vercel previews unreliable).
- Edge functions need manual `supabase functions deploy` (no auto-deploy on merge).
- No em dashes anywhere. Voice rules positive (what TO write). Anti-fabrication everywhere.
- Browser-agent ATS detection: direct observation only, never infer slugs.
- Legal posture for sourcing: logged-out, factual fields only, link back, no PII, no WAF bypass. (Noms' formal sign-off on the public-page tier still open but activity stays within the conservative posture.)
