import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startMetric, finishMetric } from "../_shared/metrics.ts";
import {
  fetchTierJobs,
  locationToCountryCode,
  locationToCountryName,
  sanitizeKey,
  selectTopPicks,
  type NormalizedJob,
  type UserLevel,
} from "../_shared/job-search.ts";

// Top Picks — Tier 1 multi-role fetch + heuristic select + per-job scoring.
//
// Flow:
//   1. Auth + rate limit
//   2. Read profile, careerRoles (filter tier_1, sort by readiness_score, cap 5)
//      Fall back to profile.target_job_titles if no career_roles exist.
//   3. If !force_refresh and cache <7 days old → return cached
//   4. Parallel fetch: Active Jobs DB across all candidate roles, dedupe
//   5. Heuristic select 8 finalists (seniority match, city pref, employer diversity)
//   6. Parallel score via analyze-job-match
//   7. Replace cache (DELETE old + INSERT new)
//   8. Return scored results

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_CALLS = 10;
const RATE_LIMIT_WINDOW = 3600;
const CACHE_TTL_DAYS = 7;
const MAX_ROLES_TO_QUERY = 5;
const TOP_PICKS_LIMIT = 8;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const m = startMetric("generate-top-picks");
  let _ok = false;
  let _http = 500;
  let _err: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      _http = 401; _err = "auth";
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      _http = 401; _err = "auth";
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    m.userId = user.id;

    const { data: allowed } = await serviceClient.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_function_name: "generate-top-picks",
      p_max_calls: RATE_LIMIT_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW,
    });
    if (allowed === false) {
      _http = 429; _err = "rate_limit";
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in an hour." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body — force_refresh ignores cache; default false (return cached if fresh).
    let forceRefresh = false;
    const rawBody = await req.text();
    if (rawBody.trim().length > 0) {
      try {
        const parsed = JSON.parse(rawBody);
        forceRefresh = Boolean(parsed?.force_refresh);
      } catch {
        _http = 400; _err = "bad_json";
        return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Cache check ─────────────────────────────────────────────────────
    if (!forceRefresh) {
      const cutoffIso = new Date(Date.now() - CACHE_TTL_DAYS * 86400_000).toISOString();
      const { data: cached } = await supabase
        .from("job_suggestions")
        .select("*")
        .eq("user_id", user.id)
        .eq("suggestion_type", "live")
        .gte("fetched_at", cutoffIso)
        .order("match_score", { ascending: false });
      if (cached && cached.length > 0) {
        _ok = true; _http = 200;
        return new Response(
          JSON.stringify({ jobs: cached, from_cache: true, country_code: null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ── Read profile + career roles ─────────────────────────────────────
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*, education(*)")
      .eq("id", user.id);
    const profile = profiles?.[0];
    if (!profile) {
      _http = 404; _err = "no_profile";
      return new Response(JSON.stringify({ error: "No profile found." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: experiences } = await supabase
      .from("experiences")
      .select("*")
      .eq("user_id", user.id);

    const { data: tier1Roles } = await supabase
      .from("career_roles")
      .select("title, readiness_score")
      .eq("user_id", user.id)
      .eq("tier", "tier_1")
      .order("readiness_score", { ascending: false })
      .limit(MAX_ROLES_TO_QUERY);

    // Fall back to target_job_titles if career roadmap hasn't been run yet.
    let candidateRoles: string[] = (tier1Roles || []).map((r: any) => r.title).filter(Boolean);
    if (candidateRoles.length === 0) {
      candidateRoles = ((profile.target_job_titles as string[]) || []).slice(0, MAX_ROLES_TO_QUERY);
    }

    if (candidateRoles.length === 0) {
      _http = 200; _ok = true;
      return new Response(
        JSON.stringify({
          jobs: [],
          from_cache: false,
          empty_reason: "no_roles",
          message: "Add target job titles in onboarding or run the Career Roadmap first.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Country + API key ──────────────────────────────────────────────
    const userLocation: string = (profile.location || "").trim();
    const countryCode = locationToCountryCode(userLocation);
    const countryName = locationToCountryName(userLocation);
    const rapidapiKey = sanitizeKey(Deno.env.get("RAPIDAPI_KEY"));

    if (!rapidapiKey) {
      _http = 500; _err = "no_rapidapi_key";
      return new Response(JSON.stringify({ error: "Job search API not configured." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parallel fetch + heuristic select ──────────────────────────────
    const tierResult = await fetchTierJobs({
      roleTitles: candidateRoles,
      countryCode,
      countryName,
      apiKey: rapidapiKey,
    });

    if (tierResult.jobs.length === 0) {
      _http = 200; _ok = true;
      return new Response(
        JSON.stringify({
          jobs: [],
          from_cache: false,
          empty_reason: "no_jobs_found",
          country_code: countryCode,
          message: countryCode === "il"
            ? "No live jobs match your Tier 1 roles right now. Try refreshing in a few hours."
            : "No live jobs found for your roles in your country yet.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userLevel: UserLevel = inferUserLevelLite(experiences || [], profile);
    const finalists = selectTopPicks({
      jobs: tierResult.jobs,
      userLevel,
      countryCode,
      limit: TOP_PICKS_LIMIT,
    });

    // ── Score each finalist in parallel via analyze-job-match ──────────
    const analyzeUrl = `${supabaseUrl}/functions/v1/analyze-job-match`;
    const scoredResults = await Promise.all(finalists.map(async (job) => {
      try {
        const res = await fetch(analyzeUrl, {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
            "apikey": anonKey,
          },
          body: JSON.stringify({ job_description: job.description, mode: "text" }),
          signal: AbortSignal.timeout(45000),
        });
        if (!res.ok) {
          console.warn(`[top-picks] analyze-job-match ${res.status} for job ${job.id}`);
          return scoringFallback(job);
        }
        const scored = await res.json();
        return mapScoringResult(job, scored);
      } catch (err) {
        console.warn(`[top-picks] analyze-job-match error for job ${job.id}:`, (err as Error).message);
        return scoringFallback(job);
      }
    }));

    // ── Replace cache (DELETE old live rows + INSERT new) ──────────────
    await serviceClient
      .from("job_suggestions")
      .delete()
      .eq("user_id", user.id)
      .eq("suggestion_type", "live");

    const rows = scoredResults.map((sr) => ({
      user_id: user.id,
      title: sr.title,
      company: sr.company,
      location: sr.location,
      salary_min: sr.salary_min,
      salary_max: sr.salary_max,
      description_snippet: sr.description_snippet,
      job_url: sr.job_url,
      match_score: sr.match_score,
      match_reason: sr.match_reason,
      matched_skills: sr.matched_skills,
      missing_skills: sr.missing_skills,
      fetched_at: new Date().toISOString(),
      suggestion_type: "live",
    }));

    const { error: insertError } = await serviceClient.from("job_suggestions").insert(rows);
    if (insertError) {
      console.error("[top-picks] cache insert failed:", insertError);
    }

    _ok = true; _http = 200;
    return new Response(
      JSON.stringify({
        jobs: rows,
        from_cache: false,
        country_code: countryCode,
        source: tierResult.source,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-top-picks] unhandled error:", (err as Error).message);
    _http = 500; _err = "unhandled";
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err });
  }
});

// ───── helpers ────────────────────────────────────────────────────────

// Lightweight version of inferUserLevel — counts years from experiences,
// students always early_career. Local to this function (no transitive
// dependency on the shared library imports for browse-jobs).
function inferUserLevelLite(experiences: any[], _profile: any): UserLevel {
  let years = 0;
  for (const e of experiences || []) {
    const startMatch = String(e?.start_date ?? "").match(/\d{4}/);
    if (!startMatch) continue;
    const start = parseInt(startMatch[0], 10);
    if (start < 1990 || start > 2100) continue;
    const isCurrent = e?.is_current || /present|current/i.test(String(e?.end_date ?? ""));
    const endMatch = String(e?.end_date ?? "").match(/\d{4}/);
    const end = isCurrent ? new Date().getFullYear() : (endMatch ? parseInt(endMatch[0], 10) : 0);
    if (end >= start) years += end - start;
  }
  if (years < 3) return "early_career";
  if (years < 8) return "mid_career";
  return "senior_career";
}

interface ScoredJob {
  title: string;
  company: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  description_snippet: string;
  job_url: string;
  match_score: number;
  match_reason: string;
  matched_skills: string[];
  missing_skills: string[];
}

// Map analyze-job-match's response shape to job_suggestions columns.
// analyze-job-match returns matched_requirements[{requirement, reason}] and
// missing_requirements[{requirement, gap}] — flatten to string arrays for
// the existing text[] columns the frontend already renders.
function mapScoringResult(job: NormalizedJob, scored: any): ScoredJob {
  const matched = Array.isArray(scored?.matched_requirements)
    ? scored.matched_requirements.map((m: any) => String(m?.requirement || "")).filter(Boolean)
    : [];
  const missing = Array.isArray(scored?.missing_requirements)
    ? scored.missing_requirements.map((m: any) => String(m?.requirement || "")).filter(Boolean)
    : [];
  return {
    title: job.title,
    company: job.company,
    location: job.location,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    description_snippet: job.description.slice(0, 1000),
    job_url: job.job_url,
    match_score: typeof scored?.match_score === "number"
      ? Math.round(scored.match_score)
      : 50,
    match_reason: String(scored?.recommendation || scored?.verdict || ""),
    matched_skills: matched,
    missing_skills: missing,
  };
}

// When analyze-job-match fails (timeout, error, parse), still surface the
// job with a neutral 50% score and empty skill arrays so the user sees the
// listing instead of losing it from the Top Picks set.
function scoringFallback(job: NormalizedJob): ScoredJob {
  return {
    title: job.title,
    company: job.company,
    location: job.location,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    description_snippet: job.description.slice(0, 1000),
    job_url: job.job_url,
    match_score: 50,
    match_reason: "Could not score this job in time — open it to evaluate fit yourself.",
    matched_skills: [],
    missing_skills: [],
  };
}
