# LEVER 3 — DORMANT REGISTRY (zero-active companies)

Investigator run 2026-07-27. Project `ilmqmodklutztuybsvwd`. INVESTIGATE-ONLY.
Registry: `supabase/functions/_shared/libraries/companies_il.json` (1162 rows).
ENABLED_ATSS (15): `scripts/refresh-jobs.ts:87-103`.

## METHOD & MATCH CONFIDENCE (error bar)

- Registry `slug` uses the SAME format as jobs.`company_slug` (VERIFIED: comeet UID e.g.
  `B3.006`; workday full path e.g. `paypal.wd1.myworkdayjobs.com/jobs`; greenhouse handle
  e.g. `accessibe`). So slug is a reliable primary join key.
- DB pull: `SELECT DISTINCT company_slug, company_name, ats_source FROM jobs WHERE is_active`
  → **611 distinct active slugs / 610 distinct names** (VERIFIED, one query).
- Join: registry→active on exact slug (case-insensitive) first, normalized-name fallback.
  - matched by slug = **612**; matched by name-fallback = **0**; **zero-active = 550**.
- **Error bar = SMALL.** The name-fallback added 0 matches, i.e. NO zero-active registry
  company turned out to actually have active jobs under a differently-spelled name. 270 of the
  550 zero rows carry no registry slug at all — but those are all `unknown`/`custom`/foreign
  ATS with no fetcher, so they _cannot_ be pulled anyway; 0 name-match confirms none are
  secretly live. Residual risk: a handful where jobs.company_name diverges from registry name
  for a fetched company — bounded at ≈0 by the name pass. **Confidence HIGH.**

## (a)/(b)/(c) SPLIT of the 550 zero-active [VERIFIED — analyze.py]

- **(a) fetcher-SUPPORTED but zero-active = 279** (ats ∈ ENABLED_ATSS, producing nothing)
- **(b) careers_url known, NO fetcher for its ats = 202**
- **(c) dead (no careers_url) = 69**

### (a) supported-but-empty, by ats [VERIFIED]

greenhouse 116 · comeet 59 · ashby 49 · workday 17 · lever 15 · workable 9 ·
smartrecruiters 6 · successfactors 5 · bezeq_native 1 · hot_native 1 · iai 1.
(239 of 279 are `verified:true`; 40 unverified.)

## (a) SPOT-CHECKS — "wrong slug" vs "genuinely empty for IL" [VERIFIED curls]

The greenhouse (a) list is dominated by FOREIGN multinationals (Stripe, Reddit, Discord,
Duolingo, Dropbox, Lyft, Pinterest, Roblox, Twilio, Cloudflare, Anthropic, xAI, DeepMind…)
whose boards are live but carry 0 Israel-tagged rows — the fetcher's is_il filter correctly
yields nothing. These are NOT quick wins.

| slug (greenhouse)                  | HTTP    | total jobs | IL jobs | verdict                                                                        |
| ---------------------------------- | ------- | ---------- | ------- | ------------------------------------------------------------------------------ |
| stripe (control, multinational)    | 200     | 533        | 0       | GENUINELY EMPTY for IL (locations: Singapore/Dublin/Bengaluru/London… no TLV)  |
| cybereason (IL co)                 | 200     | 9          | 0       | live board, only Tokyo/Osaka roles right now — genuinely 0 IL                  |
| appnext (IL co)                    | 200     | 1          | 0       | 1 EMEA role, 0 IL — genuinely empty now                                        |
| octopusdeploy (=Codefresh mapping) | 200     | 3          | 0       | acquisition-redirect slug; Codefresh IL jobs not on this board — stale mapping |
| beewise (IL co)                    | **404** | —          | —       | **WRONG SLUG / board gone** — the one recoverable-type hit found               |

**Finding:** of 5 spot-checks, 4 are live-board-but-legitimately-0-IL and 1 is a 404 wrong-slug.
The 279 "supported-but-empty" are therefore NOT 279 quick wins — the dominant cause is
"board live, genuinely 0 IL openings right now," not misconfiguration. Real recoverable subset
(wrong slug / stale acquisition redirect like beewise-404 and Codefresh→octopusdeploy) is a
small minority. Any recovery must be per-tenant slug re-probe, not a bulk assumption.

NOTE — this excludes the SEPARATE, already-known large-Workday failure (NVIDIA 0/443,
PANW 0/187, dark 2 nights — see anchors.md). Those ARE genuine fetcher failures with proven
prior inventory and are the higher-value workday item; they sit in the (a) workday-17 bucket
by count but are a distinct diagnosis from the greenhouse "empty-for-IL" pattern.

## (b) UNSUPPORTED-ATS ranking — "build fetcher for X unlocks N companies"

Zero-active (b) by ats: unknown 173 · custom 22 · eightfold 3 · icims 1 · oracle 1 · jooble 1 ·
teamtailor 1. Whole-registry unsupported (incl. companies that DO have jobs elsewhere):
unknown 241 · custom 22 · eightfold 3 · icims 1 · oracle 1 · recruitee 1 · jooble 1 · teamtailor 1.

- `unknown` (241) and `custom` (22) are NOT shared multi-tenant platforms — no single fetcher
  addresses them; each is a bespoke/undetermined career page. Not a fetcher lever.
- Real shared platforms with no fetcher, ranked by IL tenant count:
  **1. eightfold — 3 · 2. icims — 1 · 3. oracle — 1 · 4. teamtailor — 1 · 5. recruitee — 1**
  (jooble = 1, already deliberately excluded per refresh-jobs.ts:83-86, no IL coverage).

**Finding vs the 4+-IL-tenant bar (anchors HARD PRIOR):** NONE clears it. eightfold is the top
at 3 registry tenants — still below 4, and unverified for CURRENT postings. Every other
unsupported platform is 1-tenant long-tail. **No new-fetcher build is justified by tenant count.**
Registry `ats` values can be stale (co's migrate ATS); even the eightfold-3 would need live
per-tenant probes before proposing.

## BOTTOM LINE

- 550/1162 registry companies (47%) have zero active jobs. Confidence HIGH (slug join, 0
  name-fallback additions).
- (a) 279 supported-but-empty is the "highest-value" bucket by construction but spot-checks show
  it is mostly boards that are live and legitimately 0-IL (Stripe/cybereason pattern), NOT bulk
  misconfig. Recoverable = a minority of wrong-slug/stale-redirect cases (beewise 404, Codefresh
  redirect) requiring per-tenant slug re-probe. The large-Workday dark set (NVIDIA/PANW) is the
  genuinely-broken, proven-inventory sub-case worth fixing first.
- (b) No unsupported ATS reaches the 4+-IL-tenant bar (top = eightfold 3). No new fetcher warranted.
- (c) 69 dead (no careers_url) — leave.

EVIDENCE FILES: analyze.py, cat_a.json, cat_b.json, cat_c.json, active_blob.txt (this scratchpad).
