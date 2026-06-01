// Backfill companies.careers_url for rows that have a known ATS + ats_slug
// but no careers_url. Deterministic where possible; falls back to a per-row
// Comeet API probe for Comeet companies (their canonical URL contains a
// name segment that isn't in ats_slug).
//
// METHODOLOGY
// ──────────────────────────────────────────────────────────────────────────
// 1. Source: 46 rows where ats IN (comeet, greenhouse, ashby, lever,
//    recruitee, smartrecruiters) AND ats_slug IS NOT NULL AND careers_url
//    IS NULL.
// 2. Three resolution methods:
//      ats_pattern         — deterministic from {ats, ats_slug}
//      comeet_api          — hit api_url, take first posting's
//                            url_active_page, trim to /jobs/{name}/{hex}
//      company_site_derived— same probe, but the posting URL is hosted
//                            on the company's own domain (Comeet embedded
//                            board); take the /careers/ root.
// 3. Liveness gate: every proposed URL gets a single GET (follow redirects).
//    Accept only:
//      - ats_pattern / comeet_api: 2xx AND slug present in the final URL
//        (case-insensitive). Catches Lever case-folding + Recruitee dead
//        subdomain → recruitee.com homepage.
//      - company_site_derived: 2xx (no slug check — the URL is by
//        construction company-domain, not ATS-hosted).
//
// RESULTS (run on 2026-06-01)
// ──────────────────────────────────────────────────────────────────────────
// Resolved + live:       38 rows (25 strict pattern/API + 13 company-site)
// Dropped (5 strict):    Atidot (0 postings), DoControl (api 400),
//                        Edgybees (0 postings), SundaySky (0 postings),
//                        Helios (recruitee subdomain dead → homepage redirect)
// Dropped (3 site-fail): Foresight Autonomous (fetch failed), Hyro (403 bot
//                        protection), TailorMed (fetch failed)
// All dropped rows are left careers_url=NULL — none are written.
//
// WRITE SEMANTICS
// ──────────────────────────────────────────────────────────────────────────
// Single UPDATE with VALUES join keyed on (name, ats, ats_slug). The
// `careers_url IS NULL` predicate makes the write idempotent — re-running
// after a manual fix elsewhere won't overwrite.
// enrichment_sources is jsonb-merged: existing keys preserved, a new
// `careers_url` key added: {"method": <method>, "ts": <now>}.

import { writeFileSync } from "node:fs";

// ───── DATA — the 38 verified passers + 8 dropouts (for documentation) ─────

const PASSERS = [
  // Ashby (6) — ats_pattern
  { name: "Brandlight",            ats: "ashby",          ats_slug: "brandlight",         careers_url: "https://jobs.ashbyhq.com/brandlight",         method: "ats_pattern" },
  { name: "Capsule Security",      ats: "ashby",          ats_slug: "capsule",            careers_url: "https://jobs.ashbyhq.com/capsule",            method: "ats_pattern" },
  { name: "Granica",               ats: "ashby",          ats_slug: "granica",            careers_url: "https://jobs.ashbyhq.com/granica",            method: "ats_pattern" },
  { name: "Lakera",                ats: "ashby",          ats_slug: "lakera.ai",          careers_url: "https://jobs.ashbyhq.com/lakera.ai",          method: "ats_pattern" },
  { name: "Prospera",              ats: "ashby",          ats_slug: "prospera",           careers_url: "https://jobs.ashbyhq.com/prospera",           method: "ats_pattern" },
  { name: "Tavily",                ats: "ashby",          ats_slug: "tavily",             careers_url: "https://jobs.ashbyhq.com/tavily",             method: "ats_pattern" },
  // Greenhouse (7) — ats_pattern. Token Security excluded (redirects off-domain → see company_site_derived).
  { name: "Capitolis",             ats: "greenhouse",     ats_slug: "capitolis",          careers_url: "https://job-boards.greenhouse.io/capitolis",  method: "ats_pattern" },
  { name: "Guidde",                ats: "greenhouse",     ats_slug: "guidde",             careers_url: "https://job-boards.greenhouse.io/guidde",     method: "ats_pattern" },
  { name: "Honeycomb Insurance",   ats: "greenhouse",     ats_slug: "honeycombinsurance", careers_url: "https://job-boards.greenhouse.io/honeycombinsurance", method: "ats_pattern" },
  { name: "Parametrix",            ats: "greenhouse",     ats_slug: "parametrix",         careers_url: "https://job-boards.greenhouse.io/parametrix", method: "ats_pattern" },
  { name: "Simply",                ats: "greenhouse",     ats_slug: "simply",             careers_url: "https://job-boards.greenhouse.io/simply",     method: "ats_pattern" },
  { name: "Slice (Global Equity)", ats: "greenhouse",     ats_slug: "slice",              careers_url: "https://job-boards.greenhouse.io/slice",      method: "ats_pattern" },
  { name: "Sweet Security",        ats: "greenhouse",     ats_slug: "sweetsecurity",      careers_url: "https://job-boards.greenhouse.io/sweetsecurity", method: "ats_pattern" },
  // Lever (3) — ats_pattern
  { name: "CYE",                   ats: "lever",          ats_slug: "CYE",                careers_url: "https://jobs.lever.co/CYE",                   method: "ats_pattern" },
  { name: "Pillar Security",       ats: "lever",          ats_slug: "pillar",             careers_url: "https://jobs.lever.co/pillar",                method: "ats_pattern" },
  { name: "Tonic Security",        ats: "lever",          ats_slug: "tonic",              careers_url: "https://jobs.lever.co/tonic",                 method: "ats_pattern" },
  // SmartRecruiters (1) — ats_pattern
  { name: "ScaleOps",              ats: "smartrecruiters", ats_slug: "scaleops",          careers_url: "https://careers.smartrecruiters.com/scaleops", method: "ats_pattern" },
  // Comeet canonical (8) — comeet_api
  { name: "Bridgewise",            ats: "comeet", ats_slug: "F9.009", careers_url: "https://www.comeet.com/jobs/bridgewise/F9.009",  method: "comeet_api" },
  { name: "Cymotive Technologies", ats: "comeet", ats_slug: "F1.008", careers_url: "https://www.comeet.com/jobs/cymotive/F1.008",    method: "comeet_api" },
  { name: "Grip Security",         ats: "comeet", ats_slug: "A8.001", careers_url: "https://www.comeet.com/jobs/grip/A8.001",        method: "comeet_api" },
  { name: "MDClone",               ats: "comeet", ats_slug: "66.004", careers_url: "https://www.comeet.com/jobs/mdclone/66.004",     method: "comeet_api" },
  { name: "nSure.ai",              ats: "comeet", ats_slug: "A7.007", careers_url: "https://www.comeet.com/jobs/nsure/A7.007",       method: "comeet_api" },
  { name: "Seemplicity",           ats: "comeet", ats_slug: "67.00D", careers_url: "https://www.comeet.com/jobs/seemplicity/67.00D", method: "comeet_api" },
  { name: "Utila",                 ats: "comeet", ats_slug: "D9.00F", careers_url: "https://www.comeet.com/jobs/utila/D9.00F",       method: "comeet_api" },
  { name: "Winn.ai",               ats: "comeet", ats_slug: "4A.00F", careers_url: "https://www.comeet.com/jobs/winn_ai/4A.00F",     method: "comeet_api" },
  // Company-site derived (13) — company_site_derived
  // Token Security's Greenhouse board redirects to the live company site.
  { name: "Token Security",        ats: "greenhouse", ats_slug: "tokensecurity", careers_url: "https://token-security-new.webflow.io/company/careers", method: "company_site_derived" },
  // Comeet customers who embed the Comeet board into their own marketing site.
  { name: "Bigabid",               ats: "comeet", ats_slug: "A4.003", careers_url: "https://www.bigabid.com/careers/",        method: "company_site_derived" },
  { name: "CytoReason",            ats: "comeet", ats_slug: "16.002", careers_url: "https://cytoreason.com/career/",          method: "company_site_derived" },
  { name: "EasySend",              ats: "comeet", ats_slug: "D5.009", careers_url: "https://www.easysend.io/careers",         method: "company_site_derived" },
  { name: "Five Sigma",            ats: "comeet", ats_slug: "07.008", careers_url: "https://fivesigmalabs.com/careers/",      method: "company_site_derived" },
  { name: "Foretellix",            ats: "comeet", ats_slug: "84.007", careers_url: "https://www.foretellix.com/join-us/",     method: "company_site_derived" },
  { name: "IONIX",                 ats: "comeet", ats_slug: "08.003", careers_url: "https://www.ionix.io/careers/",           method: "company_site_derived" },
  { name: "KELA Targeted Cyber",   ats: "comeet", ats_slug: "2A.004", careers_url: "https://www.kelacyber.com/careers/",      method: "company_site_derived" },
  { name: "LayerX",                ats: "comeet", ats_slug: "F9.00D", careers_url: "https://layerxsecurity.com/careers/",     method: "company_site_derived" },
  { name: "ProteanTecs",           ats: "comeet", ats_slug: "D5.00E", careers_url: "https://www.proteantecs.com/careerinfo",  method: "company_site_derived" },
  { name: "Sett",                  ats: "comeet", ats_slug: "4A.00B", careers_url: "https://www.sett.ai/careers/",            method: "company_site_derived" },
  { name: "Tastewise",             ats: "comeet", ats_slug: "F8.000", careers_url: "https://tastewise.io/career/",            method: "company_site_derived" },
  { name: "Workiz",                ats: "comeet", ats_slug: "F6.006", careers_url: "https://www.workiz.com/careers/",         method: "company_site_derived" },
];

// ───── DROPPED (recorded for later revisit; not written) ─────
const DROPPED = [
  // Bucket C — strict resolution failures
  { name: "Atidot",                ats: "comeet",    ats_slug: "08.001", reason: "no_active_postings" },
  { name: "DoControl",             ats: "comeet",    ats_slug: "07.003", reason: "api_status_400" },
  { name: "Edgybees",              ats: "comeet",    ats_slug: "95.000", reason: "no_active_postings" },
  { name: "SundaySky",             ats: "comeet",    ats_slug: "71.000", reason: "no_active_postings" },
  { name: "Helios",                ats: "recruitee", ats_slug: "helios", reason: "subdomain_dead_redirect_to_recruitee_homepage" },
  // Bucket B fails — derived URL did not 200
  { name: "Foresight Autonomous",  ats: "comeet", ats_slug: "13.000", reason: "company_site_fetch_failed" },
  { name: "Hyro",                  ats: "comeet", ats_slug: "B9.00A", reason: "company_site_403_bot_protection" },
  { name: "TailorMed",             ats: "comeet", ats_slug: "E5.009", reason: "company_site_fetch_failed" },
];

// ───── BUILD SQL ─────

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

function buildUpdateSql() {
  const values = PASSERS.map((r) =>
    `('${sqlEscape(r.name)}', '${sqlEscape(r.ats)}', '${sqlEscape(r.ats_slug)}', '${sqlEscape(r.careers_url)}', '${sqlEscape(r.method)}')`
  ).join(",\n      ");

  return `-- Backfill careers_url for ${PASSERS.length} companies.
-- Methods: ats_pattern (17), comeet_api (8), company_site_derived (13).
-- Guard: only updates rows where careers_url IS NULL.
UPDATE companies c
SET careers_url = v.careers_url,
    enriched_at = now(),
    enrichment_sources = COALESCE(c.enrichment_sources, '{}'::jsonb) || jsonb_build_object(
      'careers_url', jsonb_build_object('method', v.method, 'ts', now())
    )
FROM (VALUES
      ${values}
) AS v(name, ats, ats_slug, careers_url, method)
WHERE c.name = v.name
  AND c.ats = v.ats
  AND c.ats_slug = v.ats_slug
  AND c.careers_url IS NULL
RETURNING c.name, c.ats, c.careers_url;`;
}

// ───── ENTRY ─────

const args = new Set(process.argv.slice(2));
if (args.has("--print-sql")) {
  console.log(buildUpdateSql());
} else if (args.has("--write-sql-file")) {
  const path = "/tmp/backfill-careers-url.sql";
  writeFileSync(path, buildUpdateSql());
  console.log(`Wrote ${path}`);
} else {
  console.log(`backfill-companies-careers-url.mjs

Usage:
  node scripts/backfill-companies-careers-url.mjs --print-sql       # print UPDATE
  node scripts/backfill-companies-careers-url.mjs --write-sql-file  # /tmp/backfill-careers-url.sql

This script is data-only: 38 verified passers + 8 documented dropouts.
The SQL is executed via the Supabase MCP / dashboard, not by this script
(no service-role key handling here).

PASSERS:  ${PASSERS.length}
DROPPED:  ${DROPPED.length}
`);
}
