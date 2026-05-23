// scripts/sample-extract-job-requirements.ts
//
// Phase 1 sample run for the job-requirements extractor. Picks ~80 jobs across
// the 5 ATSs that actually carry descriptions (Greenhouse / Lever / Ashby /
// Comeet / SmartRecruiters — Workday is skipped because its descriptions are
// null at the source) and invokes extract-job-requirements on each. Reports
// extraction quality summary so we can decide whether the prompt + model are
// good enough for the 3,187-job backfill.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/sample-extract-job-requirements.ts
//
// Optional flags:
//   --limit-per-ats=20    how many jobs to sample per ATS source (default 16)
//   --concurrency=4       parallel extraction calls (default 4 — gpt-4o-mini
//                         is cheap and fast but we want to be polite to the API)
//   --dry-run             pick the jobs but don't actually call the extractor
//
// Cost: ~80 jobs × ~$0.005 per extraction = ~$0.40 total.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const args = process.argv.slice(2);
const LIMIT_PER_ATS = Number(args.find(a => a.startsWith("--limit-per-ats="))?.split("=")[1] || 16);
const CONCURRENCY = Number(args.find(a => a.startsWith("--concurrency="))?.split("=")[1] || 4);
const DRY_RUN = args.includes("--dry-run");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// ATSs that carry real descriptions. Workday is excluded (null descriptions at
// the source per the scraper audit).
const ATS_SOURCES = ["greenhouse", "lever", "ashby", "comeet", "smartrecruiters"];

async function pickSampleJobs(): Promise<Array<{ id: string; title: string; ats_source: string; description_length: number }>> {
  const out: Array<{ id: string; title: string; ats_source: string; description_length: number }> = [];
  for (const ats of ATS_SOURCES) {
    // Variety: oldest (more likely to be real) + a mix of mid + recent. Length
    // filter keeps us out of empty-JD territory.
    // PostgREST doesn't support char_length(...) in a .filter chain directly.
    // Overfetch + client-side filter for description length.
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, ats_source, description")
      .eq("ats_source", ats)
      .eq("is_active", true)
      .not("description", "is", null)
      .limit(LIMIT_PER_ATS * 6);
    if (error) {
      console.warn(`[${ats}] query failed:`, error.message);
      continue;
    }
    // Filter by real description length and randomly sample
    const usable = (data || []).filter(j => j.description && j.description.length >= 800);
    const sampled = usable
      .sort(() => Math.random() - 0.5)
      .slice(0, LIMIT_PER_ATS)
      .map(j => ({ id: j.id, title: j.title, ats_source: j.ats_source, description_length: j.description.length }));
    out.push(...sampled);
    console.log(`[${ats}] sampled ${sampled.length}/${usable.length} eligible jobs`);
  }
  return out;
}

async function invokeExtractor(jobId: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/extract-job-requirements`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ job_id: jobId, force: true }),
  });
  if (!res.ok) {
    return { error: `HTTP ${res.status}`, body: await res.text() };
  }
  return await res.json();
}

async function pMap<T, R>(items: T[], n: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: n }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  console.log(`Phase 1 sample extraction — limit ${LIMIT_PER_ATS}/ATS, concurrency ${CONCURRENCY}, dry-run=${DRY_RUN}`);
  const jobs = await pickSampleJobs();
  console.log(`\nSampled ${jobs.length} jobs total across ${ATS_SOURCES.length} ATSs`);

  if (DRY_RUN) {
    console.log("\nDRY RUN — no extractor calls made. Jobs that would be processed:");
    jobs.forEach(j => console.log(`  [${j.ats_source}] ${j.title} (${j.description_length} chars) — ${j.id}`));
    return;
  }

  console.log(`\nInvoking extractor on ${jobs.length} jobs at concurrency ${CONCURRENCY}...`);
  const t0 = Date.now();
  const results = await pMap(jobs, CONCURRENCY, async (job, idx) => {
    const result = await invokeExtractor(job.id);
    const tag = result.error ? "ERR" : result.skipped ? "SKIP" : "OK";
    const conf = typeof result.extraction_confidence === "number" ? `${(result.extraction_confidence * 100).toFixed(0)}%` : "-";
    console.log(`  [${idx + 1}/${jobs.length}] ${tag} ${job.ats_source} "${job.title}" — conf=${conf} skills=${result.resolved_skills_count ?? "-"} unmapped=${result.unmapped_skills_count ?? "-"}`);
    return { job, result };
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s. Querying jobs table for extraction summary...\n`);

  // Pull the extracted rows back for analysis.
  const jobIds = jobs.map(j => j.id);
  const { data: extracted } = await supabase
    .from("jobs")
    .select("id, title, ats_source, req_years_min, req_years_max, req_seniority, req_education_levels, req_education_fields, req_education_strict, req_skills_core, req_skills_nice, req_languages, req_visa_constraint, function_family, responsibility_keywords, extraction_unmapped_skills, extraction_confidence, customer_type, industry_vertical, company_stage, company_size_employees, founded_year, tech_stack, methodology, salary_min, salary_max, salary_currency, salary_cadence, equity_mentioned, bonus_mentioned, team_size, reports_to, days_in_office, travel_percentage, application_extras, interview_process, benefits, eligibility_constraints, extraction_freeform_signals")
    .in("id", jobIds);

  const rows = extracted || [];

  // Aggregate stats
  const summary = {
    total: rows.length,
    by_ats: {} as Record<string, number>,
    // Confidence — 5-band rubric so we can see if the LLM stops hedging at 0.5
    confidence_buckets: {
      detailed: 0,    // 0.90-1.00
      solid: 0,       // 0.70-0.89
      partial: 0,     // 0.50-0.69
      sparse: 0,      // 0.30-0.49
      poor: 0,        // 0.00-0.29
    },
    // Core (v1)
    years_extracted: 0,
    seniority_extracted: 0,
    education_extracted: 0,
    skills_core_avg: 0,
    skills_nice_avg: 0,
    languages_extracted: 0,
    visa_constraints: 0,
    function_family_mapped: 0,
    avg_unmapped_per_job: 0,
    // Extended (v2)
    customer_type_extracted: 0,
    industry_vertical_extracted: 0,
    company_stage_extracted: 0,
    company_size_extracted: 0,
    founded_year_extracted: 0,
    tech_stack_avg: 0,
    methodology_extracted: 0,
    salary_extracted: 0,
    equity_flagged: 0,
    bonus_flagged: 0,
    team_size_extracted: 0,
    reports_to_extracted: 0,
    days_in_office_extracted: 0,
    travel_pct_extracted: 0,
    application_extras_extracted: 0,
    interview_process_extracted: 0,
    benefits_avg: 0,
    eligibility_extracted: 0,
    freeform_signals_avg: 0,
  };

  let coreTotal = 0, niceTotal = 0, unmappedTotal = 0;
  let techTotal = 0, benefitsTotal = 0, freeformTotal = 0;
  for (const r of rows) {
    summary.by_ats[r.ats_source] = (summary.by_ats[r.ats_source] || 0) + 1;
    const conf = Number(r.extraction_confidence) || 0;
    if (conf >= 0.9) summary.confidence_buckets.detailed++;
    else if (conf >= 0.7) summary.confidence_buckets.solid++;
    else if (conf >= 0.5) summary.confidence_buckets.partial++;
    else if (conf >= 0.3) summary.confidence_buckets.sparse++;
    else summary.confidence_buckets.poor++;
    if (r.req_years_min !== null) summary.years_extracted++;
    if (r.req_seniority) summary.seniority_extracted++;
    if (r.req_education_levels && r.req_education_levels.length > 0) summary.education_extracted++;
    coreTotal += (r.req_skills_core || []).length;
    niceTotal += (r.req_skills_nice || []).length;
    unmappedTotal += (r.extraction_unmapped_skills || []).length;
    if (r.req_languages && r.req_languages.length > 0) summary.languages_extracted++;
    if (r.req_visa_constraint) summary.visa_constraints++;
    if (r.function_family) summary.function_family_mapped++;
    if (r.customer_type && r.customer_type.length > 0) summary.customer_type_extracted++;
    if (r.industry_vertical && r.industry_vertical.length > 0) summary.industry_vertical_extracted++;
    if (r.company_stage) summary.company_stage_extracted++;
    if (r.company_size_employees) summary.company_size_extracted++;
    if (r.founded_year) summary.founded_year_extracted++;
    techTotal += (r.tech_stack || []).length;
    if (r.methodology && r.methodology.length > 0) summary.methodology_extracted++;
    if (r.salary_min !== null || r.salary_max !== null) summary.salary_extracted++;
    if (r.equity_mentioned) summary.equity_flagged++;
    if (r.bonus_mentioned) summary.bonus_flagged++;
    if (r.team_size) summary.team_size_extracted++;
    if (r.reports_to) summary.reports_to_extracted++;
    if (r.days_in_office) summary.days_in_office_extracted++;
    if (r.travel_percentage) summary.travel_pct_extracted++;
    if (r.application_extras && r.application_extras.length > 0) summary.application_extras_extracted++;
    if (r.interview_process) summary.interview_process_extracted++;
    benefitsTotal += (r.benefits || []).length;
    if (r.eligibility_constraints) summary.eligibility_extracted++;
    freeformTotal += (r.extraction_freeform_signals || []).length;
  }
  const n = Math.max(1, rows.length);
  summary.skills_core_avg = Math.round((coreTotal / n) * 10) / 10;
  summary.skills_nice_avg = Math.round((niceTotal / n) * 10) / 10;
  summary.avg_unmapped_per_job = Math.round((unmappedTotal / n) * 10) / 10;
  summary.tech_stack_avg = Math.round((techTotal / n) * 10) / 10;
  summary.benefits_avg = Math.round((benefitsTotal / n) * 10) / 10;
  summary.freeform_signals_avg = Math.round((freeformTotal / n) * 10) / 10;

  console.log("=".repeat(60));
  console.log("EXTRACTION SUMMARY");
  console.log("=".repeat(60));
  console.log(JSON.stringify(summary, null, 2));

  // Top unmapped skills
  const { data: topUnmapped } = await supabase
    .from("jd_unmapped_skill_counts")
    .select("skill_phrase, job_count, example_job_id")
    .order("job_count", { ascending: false })
    .limit(25);

  console.log("\n" + "=".repeat(60));
  console.log("TOP UNMAPPED SKILL PHRASES (candidates for skill library)");
  console.log("=".repeat(60));
  (topUnmapped || []).forEach((u, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. (${u.job_count}x) "${u.skill_phrase}"`);
  });

  // Spot-check sample: print 3 random extracted rows in full
  console.log("\n" + "=".repeat(60));
  console.log("SPOT-CHECK SAMPLE (3 random extractions, full detail)");
  console.log("=".repeat(60));
  const spotCheck = rows.sort(() => Math.random() - 0.5).slice(0, 3);
  for (const r of spotCheck) {
    console.log(`\n--- ${r.title} (${r.ats_source}) ---`);
    console.log(`  confidence: ${r.extraction_confidence}`);
    console.log(`  years: ${r.req_years_min}–${r.req_years_max}  | seniority: ${r.req_seniority}  | family: ${r.function_family}`);
    console.log(`  education: levels=${JSON.stringify(r.req_education_levels)}  fields=${JSON.stringify(r.req_education_fields)}  strict=${r.req_education_strict}`);
    console.log(`  core skills: ${JSON.stringify(r.req_skills_core)}`);
    console.log(`  nice skills: ${JSON.stringify(r.req_skills_nice)}`);
    console.log(`  languages: ${JSON.stringify(r.req_languages)}  | visa: ${r.req_visa_constraint}`);
    console.log(`  responsibility_keywords: ${JSON.stringify(r.responsibility_keywords)}`);
    console.log(`  unmapped: ${JSON.stringify(r.extraction_unmapped_skills)}`);
    console.log(`  customer_type: ${JSON.stringify(r.customer_type)}  | industry_vertical: ${JSON.stringify(r.industry_vertical)}`);
    console.log(`  company_stage: ${r.company_stage}  | employees: ${r.company_size_employees}  | founded: ${r.founded_year}`);
    console.log(`  tech_stack: ${JSON.stringify(r.tech_stack)}`);
    console.log(`  methodology: ${JSON.stringify(r.methodology)}`);
    console.log(`  salary: ${r.salary_min}-${r.salary_max} ${r.salary_currency}/${r.salary_cadence}  | equity: ${r.equity_mentioned}  | bonus: ${r.bonus_mentioned}`);
    console.log(`  team_size: ${r.team_size}  | reports_to: ${r.reports_to}  | days_in_office: ${r.days_in_office}  | travel: ${r.travel_percentage}`);
    console.log(`  application_extras: ${JSON.stringify(r.application_extras)}`);
    console.log(`  interview_process: ${JSON.stringify(r.interview_process)}`);
    console.log(`  benefits: ${JSON.stringify(r.benefits)}`);
    console.log(`  eligibility: ${JSON.stringify(r.eligibility_constraints)}`);
    console.log(`  freeform signals: ${JSON.stringify(r.extraction_freeform_signals)}`);
  }

  // Aggregate freeform signals across all 64 jobs — these are the patterns
  // the LLM flagged as "interesting recurring market themes" we hadn't pre-
  // defined. Surfacing them is the whole point of the freeform field.
  const freeformByCategory: Record<string, Array<{ signal: string; evidence: string; jobTitle: string }>> = {};
  for (const r of rows) {
    const signals = Array.isArray(r.extraction_freeform_signals) ? r.extraction_freeform_signals : [];
    for (const s of signals) {
      if (!s?.signal) continue;
      const cat = (s.category || 'uncategorized').toLowerCase();
      if (!freeformByCategory[cat]) freeformByCategory[cat] = [];
      freeformByCategory[cat].push({ signal: s.signal, evidence: s.evidence || '', jobTitle: r.title });
    }
  }
  if (Object.keys(freeformByCategory).length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("FREEFORM SIGNALS — recurring market themes the LLM flagged");
    console.log("=".repeat(60));
    for (const [cat, signals] of Object.entries(freeformByCategory).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n[${cat}] (${signals.length} total)`);
      // Group by signal name to see recurrence
      const byName: Record<string, Array<{ jobTitle: string; evidence: string }>> = {};
      for (const s of signals) {
        if (!byName[s.signal]) byName[s.signal] = [];
        byName[s.signal].push({ jobTitle: s.jobTitle, evidence: s.evidence });
      }
      for (const [name, instances] of Object.entries(byName).sort((a, b) => b[1].length - a[1].length)) {
        console.log(`  (${instances.length}x) "${name}" — e.g. ${instances[0].jobTitle}: "${instances[0].evidence.slice(0, 100)}"`);
      }
    }
  }
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
