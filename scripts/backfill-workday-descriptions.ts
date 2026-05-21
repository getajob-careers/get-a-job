// scripts/backfill-workday-descriptions.ts
//
// One-shot Workday detail-page fetcher. The main scraper hits Workday's LIST
// endpoint which doesn't include job descriptions (per audit: "Workday list
// endpoint doesn't include descriptions. Fetching per job would 20x the
// request count — skipped in v1."). Result: ~446 jobs from NVIDIA, Intel,
// HPE, KLA, Medtronic, Salesforce, J&J, etc. are stored with description=null
// and are invisible to job-match scoring + CV tailoring.
//
// This script fixes it: for every active Workday job with a null description,
// derive the detail-API URL from apply_url, fetch the full JD, strip HTML,
// write back to jobs.description + reset the extraction state so the next
// extractor run picks them up.
//
// After this runs, call backfill-job-requirements.ts to extract the newly-
// populated rows.
//
// Cost: ~446 HTTP fetches + DB writes. Wall: ~2-3 min at concurrency 4.
// No LLM cost in this script (just text fetch + DB).
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/backfill-workday-descriptions.ts
//
// Flags:
//   --concurrency=4   parallel fetches (Workday rate-limits per-IP — keep low)
//   --limit=N         cap for debug runs
//   --company=name    only one company (substring match on company_name)
//   --dry-run         resolve URLs + check shape but don't write to DB

import { createClient } from "@supabase/supabase-js";
import { stripHtml } from "./lib/normalize.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const args = process.argv.slice(2);
const arg = (name: string, fb: string): string =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fb;
const CONCURRENCY = Number(arg("concurrency", "4"));
const LIMIT = arg("limit", "0") === "0" ? null : Number(arg("limit", "0"));
const COMPANY = arg("company", "");
const DRY_RUN = args.includes("--dry-run");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// Convert an apply_url into the Workday detail API URL.
//
// Apply URL shape:
//   https://{tenant}.wd{N}.myworkdayjobs.com/{site}{externalPath}
// e.g. https://hpe.wd5.myworkdayjobs.com/Jobsathpe/job/Herzliya-Israel/Senior-Backend-Engineer---Tech-Lead_1194775-3
//
// Detail API:
//   https://{tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}{externalPath}
// e.g. https://hpe.wd5.myworkdayjobs.com/wday/cxs/hpe/Jobsathpe/job/Herzliya-Israel/Senior-Backend-Engineer---Tech-Lead_1194775-3
//
// Returns null when the apply_url doesn't match the Workday pattern (defensive
// — some companies in the registry have non-Workday URLs even though ats_source
// got mis-classified historically).
function applyUrlToDetailApi(applyUrl: string): string | null {
  try {
    const u = new URL(applyUrl);
    if (!u.hostname.includes("myworkdayjobs.com")) return null;
    const tenant = u.hostname.split(".")[0];
    // Path looks like: /Site/job/Location/Title_ID
    const pathParts = u.pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) return null;
    const site = pathParts[0];
    const externalPath = "/" + pathParts.slice(1).join("/");
    return `https://${u.hostname}/wday/cxs/${tenant}/${site}${externalPath}`;
  } catch {
    return null;
  }
}

interface WorkdayDetailResponse {
  jobPostingInfo?: {
    title?: string;
    jobDescription?: string;
    location?: string;
    postedOn?: string;
  };
}

async function fetchDetail(detailUrl: string): Promise<string | null> {
  const res = await fetch(detailUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      // Workday API expects a browser-ish User-Agent; some tenants
      // 403 a bare fetch.
      "User-Agent": "Mozilla/5.0 (compatible; getajob-bot/1.0; +https://get-a-job-one.vercel.app)",
    },
  });
  if (!res.ok) {
    if (res.status === 404) return null; // job removed from posting between list + detail
    throw new Error(`HTTP ${res.status}`);
  }
  const data = (await res.json()) as WorkdayDetailResponse;
  return data.jobPostingInfo?.jobDescription ?? null;
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

async function pickJobs() {
  // PostgREST page cap is 1000, paginate.
  const PAGE = 1000;
  let offset = 0;
  const all: Array<{ id: string; title: string; company_name: string; apply_url: string }> = [];
  for (;;) {
    let q = supabase
      .from("jobs")
      .select("id, title, company_name, apply_url")
      .eq("ats_source", "workday")
      .eq("is_active", true)
      .is("description", null)
      .not("apply_url", "is", null)
      .range(offset, offset + PAGE - 1);
    if (COMPANY) q = q.ilike("company_name", `%${COMPANY}%`);
    const { data, error } = await q;
    if (error) { console.error(error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return LIMIT ? all.slice(0, LIMIT) : all;
}

async function main() {
  const t0 = Date.now();
  console.log(`Workday detail fetch — concurrency=${CONCURRENCY} company=${COMPANY || "all"} dry=${DRY_RUN}`);
  const jobs = await pickJobs();
  console.log(`Picked ${jobs.length} null-description Workday jobs.\n`);
  if (jobs.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let ok = 0;
  let nullDesc = 0;     // detail-fetch succeeded but jobPostingInfo.jobDescription was null
  let urlSkip = 0;      // apply_url couldn't be parsed
  let httpErr = 0;
  const errors: Array<{ job_id: string; company: string; error: string }> = [];

  await pMap(jobs, CONCURRENCY, async (job, idx) => {
    const detailUrl = applyUrlToDetailApi(job.apply_url);
    if (!detailUrl) {
      urlSkip++;
      return;
    }
    try {
      const html = await fetchDetail(detailUrl);
      if (!html) {
        nullDesc++;
        return;
      }
      const plain = stripHtml(html);
      if (!plain || plain.length < 200) {
        nullDesc++;
        return;
      }
      if (!DRY_RUN) {
        const { error } = await supabase
          .from("jobs")
          .update({
            description: plain,
            // Reset extraction state so the extractor re-runs and writes new
            // structured signal columns. description_hash=null forces re-do
            // even though extracted_at is non-null (the null-desc fast path
            // wrote a zero-conf row earlier).
            extracted_at: null,
            extraction_confidence: null,
            description_hash: null,
          })
          .eq("id", job.id);
        if (error) {
          httpErr++;
          errors.push({ job_id: job.id, company: job.company_name, error: error.message });
          return;
        }
      }
      ok++;
      if ((idx + 1) % 25 === 0) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
        console.log(`  [${idx + 1}/${jobs.length}] ${elapsed}s | ok=${ok} null=${nullDesc} url_skip=${urlSkip} err=${httpErr}`);
      }
    } catch (e) {
      httpErr++;
      errors.push({ job_id: job.id, company: job.company_name, error: e instanceof Error ? e.message : String(e) });
    }
  });

  console.log("\n" + "=".repeat(60));
  console.log("WORKDAY DESCRIPTION BACKFILL SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total:           ${jobs.length}`);
  console.log(`Fetched ok:      ${ok}`);
  console.log(`Null at source:  ${nullDesc}  (detail API returned no jobDescription)`);
  console.log(`URL unparsable:  ${urlSkip}`);
  console.log(`HTTP/DB errors:  ${httpErr}`);
  console.log(`Wall:            ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  if (errors.length > 0) {
    console.log("\nFirst 10 errors:");
    errors.slice(0, 10).forEach((e) => console.log(`  ${e.company}: ${e.error}`));
  }
  if (!DRY_RUN && ok > 0) {
    console.log(`\nNext: run backfill-job-requirements.ts to extract the ${ok} newly-populated descriptions.`);
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
