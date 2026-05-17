import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startMetric, finishMetric } from "../_shared/metrics.ts";
import {
  fetchTierJobs,
  locationToCountryCode,
  locationToCountryName,
  sanitizeKey,
} from "../_shared/job-search.ts";

// Browse Jobs — Tier N multi-role fetch with pagination, no LLM scoring.
//
// Flow:
//   1. Auth + rate limit (higher cap than top-picks — fires per filter click)
//   2. Parse body: { tier: 'tier_1'|'tier_2'|'tier_3', offset?, limit? }
//   3. Read profile + the tier's careerRoles (cap 5, sort by readiness_score)
//   4. Parallel fetch via Active Jobs DB (JSearch fallback for non-IL countries)
//   5. Dedupe + return — frontend renders + offers "Score This Job" on demand

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_CALLS = 60;        // 60/hr = comfortable for filter clicks
const RATE_LIMIT_WINDOW = 3600;
const MAX_ROLES_TO_QUERY = 5;
const DEFAULT_LIMIT = 20;
const ALLOWED_TIERS = new Set(["tier_1", "tier_2", "tier_3"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const m = startMetric("browse-jobs");
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
      p_function_name: "browse-jobs",
      p_max_calls: RATE_LIMIT_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW,
    });
    if (allowed === false) {
      _http = 429; _err = "rate_limit";
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in an hour." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const rawBody = await req.text();
    let tier = "tier_1";
    let offset = 0;
    let limit = DEFAULT_LIMIT;
    if (rawBody.trim().length > 0) {
      try {
        const parsed = JSON.parse(rawBody);
        if (typeof parsed?.tier === "string" && ALLOWED_TIERS.has(parsed.tier)) tier = parsed.tier;
        if (Number.isFinite(parsed?.offset) && parsed.offset >= 0) offset = Math.floor(parsed.offset);
        if (Number.isFinite(parsed?.limit) && parsed.limit > 0 && parsed.limit <= 50) limit = Math.floor(parsed.limit);
      } catch {
        _http = 400; _err = "bad_json";
        return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Read profile (for country) + tier's career roles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("location, target_job_titles")
      .eq("id", user.id);
    const profile = profiles?.[0];
    if (!profile) {
      _http = 404; _err = "no_profile";
      return new Response(JSON.stringify({ error: "No profile found." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tierRoles } = await supabase
      .from("career_roles")
      .select("title, readiness_score")
      .eq("user_id", user.id)
      .eq("tier", tier)
      .order("readiness_score", { ascending: false })
      .limit(MAX_ROLES_TO_QUERY);

    let candidateRoles: string[] = (tierRoles || []).map((r: any) => r.title).filter(Boolean);

    // Tier 1 fallback to target_job_titles when career roadmap hasn't run.
    // Other tiers — if empty, the frontend shows an empty state with a
    // "Run Career Roadmap" link instead of falling back.
    if (candidateRoles.length === 0 && tier === "tier_1") {
      candidateRoles = ((profile.target_job_titles as string[]) || []).slice(0, MAX_ROLES_TO_QUERY);
    }

    if (candidateRoles.length === 0) {
      _ok = true; _http = 200;
      return new Response(
        JSON.stringify({
          jobs: [],
          empty_reason: "no_roles_in_tier",
          tier,
          country_code: null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const countryCode = locationToCountryCode(profile.location || "");
    const countryName = locationToCountryName(profile.location || "");
    const rapidapiKey = sanitizeKey(Deno.env.get("RAPIDAPI_KEY"));

    if (!rapidapiKey) {
      _http = 500; _err = "no_rapidapi_key";
      return new Response(JSON.stringify({ error: "Job search API not configured." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tierResult = await fetchTierJobs({
      roleTitles: candidateRoles,
      countryCode,
      countryName,
      apiKey: rapidapiKey,
      limit,
      offset,
    });

    _ok = true; _http = 200;
    return new Response(
      JSON.stringify({
        jobs: tierResult.jobs,
        tier,
        country_code: countryCode,
        country_name: countryName,
        source: tierResult.source,
        offset,
        limit,
        has_more: tierResult.jobs.length >= limit,
        roles_queried: candidateRoles,
        empty_reason: tierResult.jobs.length === 0 ? "no_jobs_for_country" : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[browse-jobs] unhandled error:", (err as Error).message);
    _http = 500; _err = "unhandled";
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err });
  }
});
