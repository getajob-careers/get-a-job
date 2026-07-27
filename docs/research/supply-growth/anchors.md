# JOBS SUPPLY GROWTH — shared anchor facts (VERIFIED by coordinator, 2026-07-27)

All numbers below were queried live against Supabase project `ilmqmodklutztuybsvwd`
(jobs table) at session start. Cross-check any of YOUR numbers against these; if
you get a different value for the same thing, FLAG the discrepancy, do not silently override.

## DB access (use this)

- Supabase MCP tool `mcp__claude_ai_Supabase__execute_sql`, project_id `ilmqmodklutztuybsvwd`.
- Load it first: ToolSearch query `select:mcp__claude_ai_Supabase__execute_sql`.
- `jobs` table key cols: is_active (bool), is_il (bool), is_remote (bool), is_agency (bool),
  ats_source (text), company_slug, company_name, last_seen_at, first_seen_at, date_posted,
  location_raw, location_city, seniority, title, description, raw_payload (jsonb).

## Baseline (VERIFIED)

- active_total = 5,510 (100% is_il=true). active non-agency = 5,112. agency = 398.
- active_remote (is_remote=true) = 1,523 = 27.6% of active.
- inactive_total = 5,274. grand_total = 10,784.
- Nightly ALREADY RAN this morning: newest last_seen = 2026-07-27 04:41 UTC.
  Zero active rows older than 3 days -> the staleness sweep is HEALTHY (not the growth problem).

## Active jobs by ats_source (VERIFIED)

comeet 2936 (365 cos) [1358 of the 1523 remote are comeet]
greenhouse 866 (116 cos)
adamtotal 690 (10 cos)
workday 226 (24 cos) <-- but NVIDIA/PANW MISSING, see below
ashby 203 (40 cos)
amazon_jobs 147 (1 co)
lever 112 (21 cos)
successfactors 98 (4 cos)
workable 97 (26 cos)
adamtotal_agency 92 (1 co)
pwc_heroku 39 (1 co)
smartrecruiters 4 (2 cos)
bezeq_native 0 (0 cos) <-- DARK

## NVIDIA / PANW contention (VERIFIED — premise FALSIFIED)

- NVIDIA (workday, slug nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite):
  0 active, 443 inactive, last_seen 2026-07-25 03:59. NOT re-populated by 07-26 or 07-27 nightly.
- Palo Alto Networks (workday, paloaltonetworks.wd5.myworkdayjobs.com/panwexternalcareers):
  0 active, 187 inactive, last_seen 2026-07-25 03:58. Same — dark 2 nights running.
- => 630 rows dark (not the 416 estimate), and they did NOT self-heal. Persistent large-Workday failure.

## HARD PRIOR from tasks/lessons.md (respect, cite, do not blindly re-run dead vectors)

- 2026-06-14: free legal ATS/feed sourcing is MEASURED-EXHAUSTED for the IL business-into-tech
  audience. 5 free vectors probed to exhaustion (tech both-pass, ATS enumeration, Comeet enum,
  gov/taasuka, universities). Meaningful NEW volume now lives in the legal/partnership track
  (AllJobs.co.il / Drushim.co.il conversations) OR per-publisher JSON endpoints (Bezeq-style).
- Vendor-list-vs-infrastructure (5+ lessons): NEVER estimate yield from a vendor's customer
  logo wall or "industry uses X ATS". Any "company Y uses ATS X" claim needs a per-tenant LIVE
  probe (curl / XHR capture) of Y's actual current careers backend. Big-tech-on-Workday is stale.
- Bar to even PROPOSE a new multi-tenant ATS: independent evidence of 4+ IL tenants with CURRENT
  postings on that shared API surface. Below that, closed by precedent.
- AllJobs/Drushim aggregator scraping is HELD pending legal review (Amendment 13 + ToS). Do not
  propose scraping them as an engineering task; it is a business-development/legal track item.

## EVIDENCE RULE (mandatory for every claim you return)

Tag each claim VERIFIED / INFERRED / REPORTED. VERIFIED = you ran the query/curl/grep THIS run
and can paste the raw output (SQL rows, HTTP status line, grep hit with file:line). No summary
without its evidence line. Absolutes ("never", "zero", "impossible") only on VERIFIED claims.
