import { createClient } from "npm:@supabase/supabase-js@2";
import { startMetric, finishMetric, type Metric } from '../_shared/metrics.ts'
import { openaiChatCompletionWithRetry } from '../_shared/openai-chat.ts'
import { openrouterChatCompletion } from '../_shared/openrouter-chat.ts'
import type { ReconcileWarning } from './reconcile.ts'
import { pickPrimaryEducation } from '../_shared/education-helpers.ts'
import { CV_VOICE_RULES } from '../_shared/voice-rules.ts'
import { stripHtml } from '../_shared/strip-html.ts'
import { buildCvPdf } from '../_shared/cv-templates/build-pdf.ts'
import { matchRoleToLibrary, resolveSectorTheme } from '../_shared/cv-templates/sector-mapping.ts'
import type { TemplateStyle, SectionKey } from '../_shared/cv-templates/types.ts'
import { fillFromSource, type SourceExperience } from './reconcile.ts'

// --- Load JSON Libraries ---
import { roleLibrary } from "../_shared/libraries/00_role_library.ts";
import { skillLibrary } from "../_shared/libraries/01_skill_library.ts";
import { proofSignalLibrary } from "../_shared/libraries/02_proof_signal_library.ts";
import { roleSkillMapping } from "../_shared/libraries/04_role_skill_mapping.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// gpt-4o (not -mini): two-step LLM pipeline (JD keyword extract + CV gen)
// was 28s p50 / 35s max on -mini. -4o brings the full pipeline to ~14s
// for +$45/mo at ~500 CV-gen calls/mo across 100 students. Per-application
// click — moderate volume, latency matters because users wait synchronously
// for the docx download to be ready.
const MODEL = "gpt-4o";

// Sonnet authoring slug — only loaded when the request's cv_model param is
// the literal 'sonnet'. The slug must match the OpenRouter catalog entry
// exactly. The model identifier surfaced in function_metrics for billing
// is a different shape (no slash) — see m.modelUsed assignment at the call
// site. Phase-0 bake-off evidence: docs/research/cv-bakeoff-2026-06.md.
const SONNET_OPENROUTER_SLUG = "anthropic/claude-sonnet-4.6";
const SONNET_MODEL_USED = "claude-sonnet-4-6";

// Helper so every response path picks up CORS headers without having to thread
// them manually. Replaces Response.json() — which does NOT merge custom headers
// the way we need for cross-origin browser calls from the Vite dev server.
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Two-step LLM tailoring. The first pass extracts ATS-style keywords from
// the job description; those keywords then become a mandatory instruction
// layer in the main CV generation prompt. Without this, GPT-4o-mini's
// compliance with "tailor to the JD" was too weak — the output came back
// generic even when the user had a perfect JD. Returns an empty skeleton if
// the extraction call fails, so the rest of the pipeline still works.
type JDKeywords = {
  must_include_phrases: string[];
  action_verbs: string[];
  tools_and_platforms: string[];
  domain_terms: string[];
  soft_skill_keywords: string[];
};
// Smart JD truncation. Israeli tech JDs commonly put boilerplate
// (company mission, DEI, benefits) BEFORE the requirements section — so a
// naive .slice(0, N) frequently chops the highest-signal portion of the JD.
// Strategy: detect section headings, pull the role-relevant sections
// first ("Requirements", "Qualifications", "Responsibilities", "What you'll
// do", "About the role"), then concatenate. If no recognizable headings are
// found, fall back to plain truncation. English JDs only — Hebrew JDs (which
// are less common in IL tech postings) bypass the section logic and fall
// through to plain truncation.
const JD_SECTION_HEADINGS = [
  /^\s*(?:requirements?|qualifications?|what (?:you'?ll?|we) (?:need|require|expect|are looking for)|must[- ]?haves?|minimum (?:requirements?|qualifications?))\s*:?\s*$/im,
  /^\s*(?:responsibilities|what you'?ll? do|the role|role description|your (?:role|responsibilities)|day[- ]to[- ]day|key (?:responsibilities|duties))\s*:?\s*$/im,
  /^\s*(?:about (?:the role|this role|the position|the job)|the opportunity|the position)\s*:?\s*$/im,
  /^\s*(?:nice[- ]to[- ]haves?|preferred (?:qualifications?|skills)|bonus (?:points|skills)|plus)\s*:?\s*$/im,
];
function smartTruncateJD(jd: string, maxChars: number): { text: string; mode: 'sections' | 'plain' } {
  const raw = String(jd ?? '').trim();
  if (raw.length <= maxChars) return { text: raw, mode: 'plain' };
  const lines = raw.split(/\r?\n/);
  type Section = { startLine: number; rank: number; text: string };
  const sections: Section[] = [];
  let currentStart = -1;
  let currentRank = -1;
  let currentBuf: string[] = [];
  const flush = () => {
    if (currentStart >= 0) {
      sections.push({ startLine: currentStart, rank: currentRank, text: currentBuf.join('\n').trim() });
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let hit = -1;
    for (let r = 0; r < JD_SECTION_HEADINGS.length; r++) {
      if (JD_SECTION_HEADINGS[r].test(line)) { hit = r; break; }
    }
    if (hit >= 0) {
      flush();
      currentStart = i;
      currentRank = hit;
      currentBuf = [line];
    } else if (currentStart >= 0) {
      currentBuf.push(line);
    }
  }
  flush();
  if (sections.length === 0) {
    return { text: raw.slice(0, maxChars), mode: 'plain' };
  }
  // Sort by section rank (Requirements/Qualifications first, then
  // Responsibilities, About, Nice-to-have) then by original document order
  // within same rank.
  sections.sort((a, b) => a.rank - b.rank || a.startLine - b.startLine);
  let out = '';
  for (const s of sections) {
    if (out.length + s.text.length + 2 > maxChars) {
      const remaining = maxChars - out.length - 2;
      if (remaining > 200) out += '\n\n' + s.text.slice(0, remaining);
      break;
    }
    out += (out ? '\n\n' : '') + s.text;
  }
  return { text: out, mode: 'sections' };
}

async function extractJDKeywords(
  jd: string,
  openaiKey: string,
  m: Metric | undefined,
  traceCtx: { userId: string; sessionId: string },
): Promise<JDKeywords> {
  const empty: JDKeywords = {
    must_include_phrases: [], action_verbs: [], tools_and_platforms: [],
    domain_terms: [], soft_skill_keywords: [],
  };
  try {
    const response = await openaiChatCompletionWithRetry(
      {
        model: MODEL,
        temperature: 0,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an ATS keyword extraction specialist. Extract the most important keywords and phrases from job descriptions that should appear in a tailored CV. Return JSON only, no markdown.",
          },
          {
            role: "user",
            content:
              `Extract keywords from this job description. Return JSON with these exact fields:
- must_include_phrases: 8-12 exact multi-word phrases from the JD that are core to the role (e.g. "operational excellence", "adoption dashboards", "GTM initiatives")
- action_verbs: 5-8 action verbs the JD uses (e.g. "own", "lead", "collaborate", "monitor")
- tools_and_platforms: all specific tools, platforms, technologies mentioned (e.g. "Data Cloud", "Tableau", "Agentforce")
- domain_terms: 5-8 domain/industry terms (e.g. "marketing analytics", "martech", "customer signals")
- soft_skill_keywords: 3-5 soft skill phrases (e.g. "cross-functional", "stakeholder management")

JOB DESCRIPTION:
${jd}`,
          },
        ],
      },
      openaiKey,
      {
        // Pass-1 trace — shares sessionId with pass-2 so both calls group as
        // one CV generation in the Langfuse UI.
        traceName: 'generate-tailored-cv:pass-1-keywords',
        userId: traceCtx.userId,
        sessionId: traceCtx.sessionId,
      },
      { signal: AbortSignal.timeout(20000) },
    );
    if (!response.ok) return empty;
    const data = await response.json();
    if (m) {
      m.modelUsed = MODEL
      m.tokensIn = (m.tokensIn ?? 0) + (data.usage?.prompt_tokens ?? 0)
      m.tokensOut = (m.tokensOut ?? 0) + (data.usage?.completion_tokens ?? 0)
    }
    const raw = data.choices?.[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<JDKeywords>;
    // Provenance filter: drop any phrase the LLM emitted that doesn't actually
    // appear in the source JD. LLMs occasionally invent plausible-sounding
    // keywords that aren't in the JD ("operational excellence" when the JD
    // never used that phrase). When those reach the main CV-gen prompt as
    // "MUST-INCLUDE PHRASES", the LLM dutifully forces them into bullets —
    // which is keyword-injection fabrication, not tailoring. Case-insensitive
    // substring match against the JD text; if a multi-word phrase doesn't
    // appear, it's dropped. Single-word action_verbs and short tools are
    // checked the same way. soft_skill_keywords get a looser pass (they're
    // often paraphrased in JDs).
    const jdLower = String(jd ?? '').toLowerCase();
    const grounded = (arr: unknown, max: number, strict = true): string[] => {
      if (!Array.isArray(arr)) return [];
      const out: string[] = [];
      for (const item of arr) {
        const s = String(item).trim();
        if (!s) continue;
        if (strict && !jdLower.includes(s.toLowerCase())) continue;
        out.push(s);
        if (out.length >= max) break;
      }
      return out;
    };
    const result: JDKeywords = {
      must_include_phrases: grounded(parsed.must_include_phrases, 15),
      action_verbs: grounded(parsed.action_verbs, 10),
      tools_and_platforms: grounded(parsed.tools_and_platforms, 20),
      domain_terms: grounded(parsed.domain_terms, 10),
      soft_skill_keywords: grounded(parsed.soft_skill_keywords, 8, false),
    };
    const dropped = [
      Array.isArray(parsed.must_include_phrases) ? parsed.must_include_phrases.length - result.must_include_phrases.length : 0,
      Array.isArray(parsed.tools_and_platforms) ? parsed.tools_and_platforms.length - result.tools_and_platforms.length : 0,
      Array.isArray(parsed.domain_terms) ? parsed.domain_terms.length - result.domain_terms.length : 0,
    ].reduce((a, b) => a + Math.max(0, b), 0);
    if (dropped > 0) console.log(`[CV] JD keyword provenance filter dropped ${dropped} ungrounded phrase(s)`);
    return result;
  } catch (err) {
    console.warn("[CV] JD keyword extraction failed:", err instanceof Error ? err.message : err);
    return empty;
  }
}

// Defensive array coercer. Profile columns are inconsistent in this DB: some
// are proper Postgres ARRAY/jsonb (JS array), others like profiles.honors are
// text storing JSON ("[]" / "[\"Dean's List\"]"), and some users paste plain
// text ("Presidential Award, Heseg Scholarship"). Accept all three shapes.
function safeArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return [];
    // Try JSON first (["a","b"] or [])
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* fall through */ }
    // Fall back to CSV / line-separated plain text so a user who typed
    // "Presidential Award, Heseg Scholarship" still gets rendered.
    return trimmed
      .split(/\r?\n|,|;/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

// Defensive JSON parser for LLM responses.
//
// Three tiers, evaluated in order, no-op fast path for clean JSON:
//   1. JSON.parse — bare-JSON path. gpt-4o's chat-completions endpoint
//      with response_format json_object returns bare JSON; this tier
//      succeeds unchanged for every call the default branch makes.
//   2. Fenced-block regex — extracts the body from a markdown fence,
//      ```json\n{...}\n``` or ```\n{...}\n```. Sonnet via OpenRouter
//      ignores response_format and wraps its output in a fence (see
//      bake-off raw dumps at /tmp/cv-bakeoff-raw/*sonnet*); this tier
//      makes the Sonnet branch parseable without prompt or transport
//      changes. The harness at scripts/test-cv-authoring-diff.ts has
//      had this fallback for months — porting it here closes the
//      contract drift the 2026-06-11 Phase-2 failure exposed.
//   3. Greedy brace match — catches the rare prose-preamble case
//      ("Here's the CV:\n{...}") that occasionally surfaces when an
//      LLM hedges before emitting structured output.
//
// On all-three failure: throws a structured Error whose message
// includes finish_reason and the first 80 chars of the unparseable
// content. Caller's catch turns this into the user-facing error AND
// the function_metrics.error_code tag, so a future regression can be
// triaged from the metric row alone instead of pulling edge-function
// logs.
//
// Behavior contract:
//   - Pure: no I/O, no global state. Safe to call from any branch.
//   - Idempotent on clean JSON: tier 1 succeeds, tiers 2-3 untouched.
//   - No silent fabrication: if NO tier yields a parseable object,
//     we throw — never returns {} or null on parse failure (callers
//     downstream rely on the absence of throws to mean "valid CV").
function parseLlmJson(rawContent: string, finishReason: string, label: string): any {
  const raw = String(rawContent || "");
  const tryParse = (s: string): any | null => {
    try { return JSON.parse(s); } catch { return null; }
  };
  // Tier 1: strict bare-JSON parse (default branch fast path).
  let parsed = tryParse(raw);
  if (parsed !== null && typeof parsed === 'object') return parsed;
  // Tier 2: fenced-block extraction. The regex is greedy on the
  // content so a JSON payload containing internal ``` characters
  // (none expected, but defensive) would still extract correctly.
  const fenced = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/i);
  if (fenced) {
    parsed = tryParse(fenced[1]);
    if (parsed !== null && typeof parsed === 'object') return parsed;
  }
  // Tier 3: greedy brace match (preamble-prose path).
  const brace = raw.match(/\{[\s\S]*\}/);
  if (brace) {
    parsed = tryParse(brace[0]);
    if (parsed !== null && typeof parsed === 'object') return parsed;
  }
  // All three tiers failed — emit a structured error.
  const preview = raw.trim().slice(0, 80).replace(/\s+/g, ' ');
  throw new Error(`AI returned unparseable response (label=${label}, finish_reason=${finishReason || 'unknown'}, preview="${preview}"). Please try again.`);
}

Deno.serve(async (req) => {
  // CORS preflight. Must come before any other logic — without this the browser
  // aborts the POST with "Failed to send a request to the Edge Function".
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const m = startMetric('generate-tailored-cv')
  let _ok = false
  let _http = 500
  let _err: string | null = null

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      _http = 401; _err = 'auth'
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      _http = 401; _err = 'auth'
      return json({ error: "Unauthorized" }, 401);
    }
    m.userId = user.id

    // Per-request id used to group both LLM calls (JD keyword extraction +
    // CV generation) into one Langfuse session, so the two passes appear
    // together in the UI for a single CV generation request.
    const cvSessionId = `cv-gen-${crypto.randomUUID()}`

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const rawBody = JSON.stringify(body);
    if (rawBody.length > 50_000) {
      _http = 413; _err = 'payload_too_large'
      return json({ error: 'Request payload too large.' }, 413);
    }
    const { job_description, target_role, application_id, template_style, cv_model } = body;
    const safeTargetRole = String(target_role ?? '').slice(0, 200);
    // Smart truncation: pull Requirements/Qualifications/Responsibilities
    // sections first when the JD has detectable headings; otherwise fall
    // back to plain .slice(). 10000 chars is roughly double the old 5000
    // budget — affordable in the prompt because most JDs are < 8k chars in
    // their relevant sections. The smartTruncateJD helper returns the mode
    // so we can log which path fired for telemetry.
    // Defensive HTML strip — see _shared/strip-html.ts. Catches dirty
    // legacy rows + any write path that forgets to clean.
    const jdInput = stripHtml(String(job_description ?? '')) ?? '';
    const jdTrunc = smartTruncateJD(jdInput, 10000);
    let safeJobDescription = jdTrunc.text;
    let jdTruncMode = jdTrunc.mode;
    let targetCompany = ""; // populated from the linked application when available
    // Template style: 'ats-optimized' (default — safest parse) or 'polished'
    // (visually richer, still single-column for ATS). Validated against the
    // exhaustive set so a bad client can't trigger a downstream error.
    const safeTemplateStyle: TemplateStyle =
      template_style === 'polished' ? 'polished' : 'ats-optimized';

    // cv_model: 'sonnet' routes Pass 2 (authoring) + Pass 3 (coverage retry)
    // through OpenRouter to anthropic/claude-sonnet-4.6 with the Option A
    // prompt blocks (responsibilities-first source ranking, 1-per-line bullet
    // cap up to 6, verbatim metrics across responsibilities AND stories,
    // sparse fallback). Anything else — including missing, malformed,
    // misspelled, or null — resolves to the gpt-4o default branch, which is
    // byte-identical to today's main. Same parse/validate/default shape as
    // safeTemplateStyle above. Phase-0 evidence: 21/21 index validity and
    // 35/35 numbers carried on Sonnet+Option A vs 13/21 on gpt-4o.
    const safeCvModel: 'gpt-4o' | 'sonnet' =
      cv_model === 'sonnet' ? 'sonnet' : 'gpt-4o';

    if (!safeTargetRole) {
      _http = 400; _err = 'missing_input'
      return json({ error: "target_role is required" }, 400);
    }
    if (application_id !== undefined && typeof application_id !== 'string') {
      _http = 400; _err = 'bad_input'
      return json({ error: 'Invalid application_id.' }, 400);
    }

    // 30/hour. Bumped from 10 after pilot-readiness review: a student
    // iterating on a CV against the same JD can generate 4-5 in quick
    // succession; combined with 2-3 different applications they hit the
    // old 10/hour cap inside a single working session. Cost ceiling at
    // 30 × $0.038 = $1.14/student/hour worst case is acceptable for
    // 80-student pilot.
    const { data: allowed } = await serviceClient.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_function_name: 'generate-tailored-cv',
      p_max_calls: 30,
      p_window_seconds: 3600,
    });
    if (!allowed) {
      _http = 429; _err = 'rate_limit'
      return json({ error: 'Rate limit exceeded. Try again in an hour.' }, 429);
    }

    const [profileRes, experiencesRes, projectsRes, certificationsRes] = await Promise.all([
      supabase.from("profiles").select("*, education(*)").eq("id", user.id).single(),
      supabase.from("experiences").select("*").eq("user_id", user.id),
      supabase.from("projects").select("*").eq("user_id", user.id),
      supabase.from("certifications").select("*").eq("user_id", user.id),
    ]);

    const profile = profileRes.data;
    if (!profile) {
      _http = 404; _err = 'no_profile'
      return json({ error: "No user profile found" }, 404);
    }

    const experiences = experiencesRes.data || [];
    const projects = projectsRes.data || [];
    const certifications = certificationsRes.data || [];

    // Visibility log for which profile fields are present/absent. This shows
    // up in the Supabase edge-function log stream and is the fastest way to
    // diagnose "my phone isn't showing" style reports — the most common
    // cause is simply an empty string in the DB (CV extractor didn't capture
    // it, or the user hasn't filled in the profile yet).
    const phonePresent = !!String(profile.phone_number ?? "").trim();
    const emailPresent = !!String(user.email ?? "").trim();
    const linkedinPresent = !!String(profile.linkedin_url ?? "").trim();
    const locationPresent = !!String(profile.location ?? "").trim();
    const languagesPresent = Array.isArray(profile.languages) && profile.languages.length > 0;
    // Phase B: education_dates now lives per-row on the education table.
    // "Present" means at least one row has a start_date populated.
    const educationDatesPresent = Array.isArray(profile.education) && profile.education.some(
      (e: any) => String(e?.start_date ?? "").trim() || String(e?.end_date ?? "").trim()
    );
    console.log("generate-tailored-cv contact-fields", JSON.stringify({
      user_id: user.id,
      phone_number: phonePresent ? "present" : "MISSING (empty in DB)",
      email: emailPresent ? "present" : "MISSING",
      location: locationPresent ? "present" : "MISSING",
      linkedin: linkedinPresent ? "present" : "MISSING",
      languages_field: languagesPresent ? "present" : "MISSING (will infer)",
      education_dates: educationDatesPresent ? "present" : "MISSING",
    }));

    // If an application is linked, use it as an additional context source.
    // The client often omits job_description from the body (because it doesn't
    // have it); the tracker row usually does. Also capture the company so we
    // can ask the LLM to reference it in the About Me.
    let targetRoleContext: {
      required_seniority?: string | null;
      track?: string | null;
      qualification_score?: number | null;
      goal_alignment_score?: number | null;
      skills_required?: unknown;
      location?: string | null;
      // PR-F: v4-extracted structured signal from the linked jobs row
      // (populated only when application.job_id is set + jobs row has v4
      // fields). The LLM uses these as primary anchors instead of inferring
      // from raw JD prose.
      req_skills_core?: string[] | null;
      req_skills_nice?: string[] | null;
      req_years_min?: number | null;
      req_years_max?: number | null;
      req_education_levels?: string[] | null;
      req_education_fields?: string[] | null;
      notable_customers?: string[] | null;
      scale_signals?: Record<string, unknown> | null;
      funding_signals?: Record<string, unknown> | null;
      req_ai_tooling?: Record<string, unknown> | null;
    } | null = null;
    if (application_id) {
      // Pull the application + its v4 requirements snapshot. The snapshot
      // is the canonical source of structured grounding now — pre-PR
      // 2026-05-26 we tried to join via applications.job_id, but that
      // column never existed; the SELECT failed silently and every CV
      // shipped without v4 grounding (sparse About Me path always fired).
      // See migration 20260526_applications_req_snapshot.sql.
      const { data: app, error: appErr } = await supabase
        .from("applications")
        .select("company, role_title, job_description, notes, required_seniority, track, qualification_score, goal_alignment_score, skills_required, location, ats_source, external_id, req_snapshot")
        .eq("id", application_id)
        .eq("user_id", user.id)
        .single();
      if (appErr) {
        console.warn("[CV] application fetch failed:", appErr.message);
      }
      if (app) {
        targetCompany = String(app.company ?? '').slice(0, 200);
        if (!safeJobDescription && app.job_description) {
          // Defensive strip on fallback path too — legacy applications.job_description
          // rows can hold raw HTML from pre-fix user pastes.
          const cleaned = stripHtml(String(app.job_description)) ?? '';
          const t = smartTruncateJD(cleaned, 10000);
          safeJobDescription = t.text;
          jdTruncMode = t.mode;
        }
        // `notes` sometimes holds the JD when the user pasted it there instead.
        if (!safeJobDescription && app.notes) {
          const t = smartTruncateJD(String(app.notes), 10000);
          safeJobDescription = t.text;
          jdTruncMode = t.mode;
        }
        // Structured role-requirement signal from prior career-analysis /
        // job-match runs. Null-tolerant: some apps have all of these, others
        // have none. We surface whatever's present in a TARGET_ROLE_CONTEXT
        // block so the LLM doesn't have to extract these from prose.
        targetRoleContext = {
          required_seniority: app.required_seniority ?? null,
          track: app.track ?? null,
          qualification_score: typeof app.qualification_score === 'number' ? app.qualification_score : null,
          goal_alignment_score: typeof app.goal_alignment_score === 'number' ? app.goal_alignment_score : null,
          skills_required: app.skills_required ?? null,
          location: app.location ?? null,
        };

        // v4 grounding via the application's req_snapshot. Three-stage
        // lookup chain — each stage runs only if the prior stage missed:
        //
        // STAGE 1 — read app.req_snapshot directly. This is the steady-
        //   state path. The snapshot was populated either by the
        //   2026-05-26 backfill migration (Browse-add applications with a
        //   live matching jobs row) or by a prior CV-gen stage 2/3 below.
        // STAGE 2 — if no snapshot but the app has (ats_source, external_id),
        //   join jobs by that pair. If hit, persist to req_snapshot so the
        //   next gen skips this step. Handles Browse-add apps whose job
        //   row was created AFTER the application was added.
        // STAGE 3 — if still no snapshot AND we have a substantive JD,
        //   call extract-job-requirements in stateless mode against the
        //   JD itself. Pays the ~5-10s LLM cost once per application;
        //   persists to req_snapshot so subsequent regenerations are
        //   instant. Covers manual-add applications + Browse-add apps
        //   where the linked job row has since been deleted.
        //
        // If all three miss, targetRoleContext stays sparse and the
        // About Me sparse path fires — same as today's broken behavior,
        // but now an honest "no JD grounding available" outcome rather
        // than a silent SELECT failure masquerading as it.
        let v4Source: Record<string, unknown> | null = null;
        const isJsonObject = (v: unknown): v is Record<string, unknown> =>
          !!v && typeof v === 'object' && !Array.isArray(v);

        // STAGE 1 — existing snapshot on the application.
        if (isJsonObject(app.req_snapshot)) {
          v4Source = app.req_snapshot;
          console.log("[CV] v4 grounding: stage 1 — req_snapshot on application");
        }

        // STAGE 2 — try the jobs join via ATS link.
        if (!v4Source && app.ats_source && app.external_id) {
          const { data: jobRow } = await supabase
            .from("jobs")
            .select("req_skills_core, req_skills_nice, req_years_min, req_years_max, req_education_levels, req_education_fields, req_seniority, notable_customers, scale_signals, funding_signals, req_ai_tooling")
            .eq("ats_source", app.ats_source)
            .eq("external_id", app.external_id)
            .maybeSingle();
          if (jobRow && (
            (Array.isArray(jobRow.req_skills_core) && jobRow.req_skills_core.length > 0) ||
            (Array.isArray(jobRow.req_skills_nice) && jobRow.req_skills_nice.length > 0) ||
            jobRow.scale_signals || jobRow.funding_signals
          )) {
            v4Source = jobRow as unknown as Record<string, unknown>;
            console.log("[CV] v4 grounding: stage 2 — jobs join by (ats_source, external_id)");
            // Persist the snapshot back to the application so stage 1
            // wins on the next regen. Fire-and-forget — a write failure
            // here just means we'll re-do stage 2 next time.
            void supabase.from("applications").update({ req_snapshot: jobRow }).eq("id", application_id).then(({ error }) => {
              if (error) console.warn("[CV] snapshot persist (stage 2) failed:", error.message);
            });
          }
        }

        // STAGE 3 — stateless extraction from the JD text. Costs ~5-10s
        // LLM latency but only on first CV for this application. Uses
        // the extract-job-requirements edge function's stateless mode
        // (jd_text param). Same extractor + same schema as the jobs-
        // table extraction — output is shape-compatible with stages 1+2.
        if (!v4Source && safeJobDescription && safeJobDescription.length >= 200) {
          try {
            const extractRes = await supabase.functions.invoke("extract-job-requirements", {
              body: { jd_text: safeJobDescription, title: app.role_title || safeTargetRole },
            });
            const extraction = (extractRes.data as { extraction?: Record<string, unknown> } | undefined)?.extraction;
            if (extraction && (
              (Array.isArray(extraction.req_skills_core) && (extraction.req_skills_core as unknown[]).length > 0) ||
              (Array.isArray(extraction.req_skills_nice) && (extraction.req_skills_nice as unknown[]).length > 0)
            )) {
              v4Source = extraction;
              console.log("[CV] v4 grounding: stage 3 — stateless extraction from JD");
              void supabase.from("applications").update({ req_snapshot: extraction }).eq("id", application_id).then(({ error }) => {
                if (error) console.warn("[CV] snapshot persist (stage 3) failed:", error.message);
              });
            }
          } catch (e) {
            console.warn("[CV] stateless extraction failed:", e instanceof Error ? e.message : String(e));
          }
        }

        // Project v4Source onto targetRoleContext if any stage succeeded.
        if (v4Source) {
          targetRoleContext = {
            ...targetRoleContext,
            required_seniority: targetRoleContext.required_seniority ?? ((v4Source.req_seniority as string | null | undefined) ?? null),
            req_skills_core: Array.isArray(v4Source.req_skills_core) ? (v4Source.req_skills_core as string[]) : null,
            req_skills_nice: Array.isArray(v4Source.req_skills_nice) ? (v4Source.req_skills_nice as string[]) : null,
            req_years_min: typeof v4Source.req_years_min === 'number' ? v4Source.req_years_min : null,
            req_years_max: typeof v4Source.req_years_max === 'number' ? v4Source.req_years_max : null,
            req_education_levels: Array.isArray(v4Source.req_education_levels) ? (v4Source.req_education_levels as string[]) : null,
            req_education_fields: Array.isArray(v4Source.req_education_fields) ? (v4Source.req_education_fields as string[]) : null,
            notable_customers: Array.isArray(v4Source.notable_customers) ? (v4Source.notable_customers as string[]) : null,
            scale_signals: isJsonObject(v4Source.scale_signals) ? v4Source.scale_signals : null,
            funding_signals: isJsonObject(v4Source.funding_signals) ? v4Source.funding_signals : null,
            req_ai_tooling: isJsonObject(v4Source.req_ai_tooling) ? v4Source.req_ai_tooling : null,
          };
        }
      }
    }

    // ─── Step 1 of two-step tailoring: extract ATS keywords from the JD ───
    // Without explicit keywords injected into the main prompt, the generator
    // produces a generic CV. Pass-through of OPENAI_API_KEY happens inside the
    // helper. We read the secret once here so both calls share it.
    const _openaiKeyForExtraction = Deno.env.get("OPENAI_API_KEY");
    const jdKeywords: JDKeywords | null = (safeJobDescription && _openaiKeyForExtraction)
      ? await extractJDKeywords(safeJobDescription, _openaiKeyForExtraction, m, {
          userId: user.id,
          sessionId: cvSessionId,
        })
      : null;
    if (jdKeywords) {
      console.log("[CV] JD keywords extracted", JSON.stringify({
        phrases: jdKeywords.must_include_phrases.length,
        verbs: jdKeywords.action_verbs.length,
        tools: jdKeywords.tools_and_platforms.length,
        domain: jdKeywords.domain_terms.length,
        soft: jdKeywords.soft_skill_keywords.length,
      }));
    }

    const trunc = (s: unknown, max: number) => String(s ?? '').slice(0, max);

    // ─── Story Bank consumption (Wk 2 Day 4) ──────────────────────────────
    // Pull stories matching the JD's extracted keywords so the LLM can prefer
    // user-confirmed STAR records as bullet evidence over the freeform
    // responsibilities text. Strict matching: stories without an experience_id
    // (chat-captured floating stories) are excluded — once linked via the
    // AddInformation Wk 3 flow they'll show up automatically.
    //
    // Scoring: equal-weight categories (no per-category tuning surface
    // pre-pilot). Bidirectional substring match accommodates both abbreviation
    // ↔ full-name and the natural variations the LLM emits ("Project Management"
    // vs JD's "PM project management"). +3 per skill match (most semantic),
    // +2 per tool/tag, +1 per keyword present in STAR text. Top 8 by score
    // included; stories with score=0 dropped.
    const jdKeywordSet = new Set<string>();
    if (jdKeywords) {
      // Deliberately EXCLUDES action_verbs. Single-word generic verbs ("lead",
      // "drive", "own", "partner") are too common — they leak through both
      // bidirectional skill matching ("lead" in "Team Leadership") and word-
      // boundary narrative matching ("Lead patrols" in a military story),
      // producing false-positive matches across unrelated stories. Action
      // verbs serve the downstream TAILORING_RULES path that rephrases
      // bullets in JD voice; they're noise for story-relevance scoring.
      // Wk 2 Day 4 smoke probes verified this: with action_verbs included,
      // a combat_soldier story scored against a Senior PM JD via the verb
      // "lead" — semantically irrelevant signal.
      const allKw = [
        ...jdKeywords.must_include_phrases,
        ...jdKeywords.tools_and_platforms,
        ...jdKeywords.domain_terms,
        ...jdKeywords.soft_skill_keywords,
      ];
      for (const k of allKw) {
        const norm = String(k || '').toLowerCase().trim();
        if (norm.length >= 3) jdKeywordSet.add(norm);
      }
    }

    const experiencesById = new Map<string, any>();
    for (const e of (experiences || [])) {
      if (e?.id) experiencesById.set(e.id, e);
    }

    type ScoredStory = { id: string; score: number; story: any; experience_label: string };
    const scoredStories: ScoredStory[] = [];

    if (jdKeywordSet.size > 0 && experiencesById.size > 0) {
      const { data: storiesRaw } = await supabase
        .from('stories')
        .select('id, experience_id, title, situation, task, action, result, metrics, skills_demonstrated, tools_used, relevance_tags')
        .eq('user_id', user.id);

      const matchesKeyword = (term: string): boolean => {
        const norm = String(term || '').toLowerCase().trim();
        if (!norm || norm.length < 3) return false;
        for (const kw of jdKeywordSet) {
          if (norm.includes(kw) || kw.includes(norm)) return true;
        }
        return false;
      };

      // Word-boundary regex per keyword for narrative scoring. Cheap raw
      // .includes() leaks false positives like "team" → "fireteam" or
      // "schedule" → "scheduled" — both showed up in Wk 2 Day 4 smoke probes
      // before this fix. Skills/tools/tags keep bidirectional substring
      // (intentional — accommodates "PM" ↔ "Project Management" style
      // synonyms where partial match is the right semantic).
      const narrativeRegex = new Map<string, RegExp>();
      for (const kw of jdKeywordSet) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        narrativeRegex.set(kw, new RegExp(`\\b${escaped}\\b`, 'i'));
      }

      for (const s of (storiesRaw || [])) {
        // Strict: only include stories linked to one of this user's current
        // experiences. Floating stories (experience_id=null) excluded —
        // become available once user links them in AddInformation.
        if (!s.experience_id || !experiencesById.has(s.experience_id)) continue;

        let score = 0;
        for (const skill of (s.skills_demonstrated || [])) if (matchesKeyword(skill)) score += 3;
        for (const tool of (s.tools_used || [])) if (matchesKeyword(tool)) score += 2;
        for (const tag of (s.relevance_tags || [])) if (matchesKeyword(tag)) score += 2;

        const narrativeLower = [s.situation, s.task, s.action, s.result]
          .filter(Boolean).map(String).join(' ').toLowerCase();
        if (narrativeLower) {
          for (const kw of jdKeywordSet) {
            if (narrativeRegex.get(kw)?.test(narrativeLower)) score += 1;
          }
        }

        if (score > 0) {
          const exp = experiencesById.get(s.experience_id);
          scoredStories.push({
            id: s.id,
            score,
            story: s,
            experience_label: `${exp?.title || ''}${exp?.company ? ` at ${exp.company}` : ''}`.trim() || 'unspecified role',
          });
        }
      }

      scoredStories.sort((a, b) => b.score - a.score);
    }

    const TOP_N_STORIES = 8;
    const topStories = scoredStories.slice(0, TOP_N_STORIES);
    const stories_used = topStories.map((s) => s.id);
    console.log(`[CV] story bank: ${scoredStories.length} scored>0, ${topStories.length} included (top ${TOP_N_STORIES} cap)`);

    // LLM-friendly shape — `experience_label` ("Role at Company") replaces
    // the UUID so the model correlates by natural language, not opaque ID.
    const storiesForLLM = topStories.map(({ story, experience_label }) => ({
      title: trunc(story.title, 200),
      situation: story.situation ? trunc(story.situation, 600) : null,
      task: story.task ? trunc(story.task, 600) : null,
      action: story.action ? trunc(story.action, 600) : null,
      result: story.result ? trunc(story.result, 600) : null,
      metrics: safeArray(story.metrics).slice(0, 10).map((m) => trunc(m, 200)),
      skills_demonstrated: safeArray(story.skills_demonstrated).slice(0, 10).map((s) => trunc(s, 100)),
      tools_used: safeArray(story.tools_used).slice(0, 10).map((s) => trunc(s, 100)),
      experience_label,
    }));

    // Classify each experience into professional / military / volunteering /
    // leadership. `experiences.type` is unreliable across this DB (legacy rows
    // are tagged "full_time" even when they're clearly military or
    // volunteering), so we infer from the COMPANY and TITLE fields only —
    // never from the free-form responsibilities text (which once caused a
    // false "military" positive on a Program Coordinator role whose curriculum
    // mentioned "military benefits").
    type Bucket = "military" | "volunteering" | "leadership" | "professional";
    const classifyExperience = (exp: any): Bucket => {
      const company = String(exp.company || "").toLowerCase();
      const title = String(exp.title || "").toLowerCase();
      const type = String(exp.type || "").toLowerCase();

      const militaryKeywords =
        /\b(idf|israel\s?defense\s?forces|nahal|golani|givati|paratroopers?|sayeret|unit\s?8200|8200|army|navy|air\s?force|brigade|platoon|battalion|regiment|commander|sergeant|corporal|lieutenant|captain|staff\s?sergeant|reservist|conscript|military\s?service|military\s?role)\b/;
      const looksMilitary = militaryKeywords.test(company) || militaryKeywords.test(title) || type === "military";

      const volunteerKeywords = /\b(volunteer(ed|ing)?|voluntary|pro\s?bono)\b/;
      const ngoCompany = /\b(ngo|non[-\s]?profit|charity|foundation)\b/;
      const looksVolunteering =
        volunteerKeywords.test(title) ||
        volunteerKeywords.test(company) ||
        ngoCompany.test(company) ||
        type === "volunteering" ||
        type === "volunteer";

      // Leadership bucket: explicit type tag OR title pattern like
      // "President of X Club", "Editor of ...", "Captain of ..." — used for
      // student leadership roles that aren't paid work. Intentionally narrow.
      const looksLeadership = type === "leadership" ||
        /\b(president of|editor of|captain of|head of student|club president|society president|student council)\b/.test(title);

      // Precedence: if the title says "Volunteer" AND the company looks
      // military (e.g. "Volunteer Reservist"), prefer volunteering. Otherwise
      // military > volunteering > leadership > professional.
      if (looksMilitary && volunteerKeywords.test(title)) return "volunteering";
      if (looksMilitary) return "military";
      if (looksVolunteering) return "volunteering";
      if (looksLeadership) return "leadership";
      return "professional";
    };

    const mapExperience = (exp: any) => ({
      title: trunc(exp.title, 100),
      company: trunc(exp.company, 100),
      start_date: trunc(exp.start_date, 20),
      end_date: trunc(exp.end_date, 20),
      is_current: exp.is_current,
      // Generous cap: max responsibility length in production is 534 chars
      // (DB audit, 2026-05-21). 4000 is purely defensive — covers a 5x growth
      // headroom without crowding the prompt budget.
      responsibilities: trunc(exp.responsibilities, 4000),
      skills: safeArray(exp.skills).slice(0, 40).map((s) => trunc(s, 60)),
      type: trunc(exp.type, 50),
      bucket: classifyExperience(exp), // "military" | "volunteering" | "professional"
    });

    const allExperiences = safeArray(experiences).slice(0, 15).map(mapExperience);
    // Per-bucket integer index (0,1,2…) is the stable join key the LLM
    // echoes back so the server can attach bullets to the correct source
    // experience without paraphrasing-tolerant date matching. Index is
    // assigned AFTER bucket filtering so each bucket starts from 0.
    const withIndex = (arr: any[]) => arr.map((e, i) => ({ ...e, index: i }));
    const professionalExperiences = withIndex(allExperiences.filter((e: any) => e.bucket === "professional"));
    const militaryExperiences = withIndex(allExperiences.filter((e: any) => e.bucket === "military"));
    const volunteeringExperiences = withIndex(allExperiences.filter((e: any) => e.bucket === "volunteering"));
    const leadershipExperiences = withIndex(allExperiences.filter((e: any) => e.bucket === "leadership"));

    // Language resolution. Prefer the user's explicitly stored languages
    // (new profiles.languages jsonb). Only fall back to inference when the
    // profile is silent — inferring can get proficiency levels wrong
    // (American-Israeli students are typically English-native + Hebrew-fluent,
    // not the other way round).
    const storedLanguagesRaw = Array.isArray(profile.languages) ? profile.languages : [];
    const storedLanguages = storedLanguagesRaw
      .map((l: any) => {
        if (!l) return null;
        if (typeof l === "string") return { language: l.trim(), proficiency: "" };
        const lang = String(l.language || l.name || "").trim();
        if (!lang) return null;
        const prof = String(l.proficiency || l.level || "").trim();
        return { language: lang, proficiency: prof };
      })
      .filter(Boolean) as Array<{ language: string; proficiency: string }>;

    const locationHint = String(profile.location || "").toLowerCase();
    const inferredLanguages: string[] = [];
    if (storedLanguages.length === 0) {
      // Only infer when the profile has zero languages stored — otherwise
      // inference could contradict explicit user data.
      if (/\b(israel|tel aviv|jerusalem|haifa|herzliya|ramat|netanya|rehovot|beer sheva|be'?er sheva|eilat|ashdod|petah tikva)\b/.test(locationHint)) {
        inferredLanguages.push("Hebrew (likely fluent based on candidate's location; proficiency should be inferred conservatively)");
      }
    }

    const userContext = {
      full_name: trunc(profile.full_name, 100),
      email: trunc(user.email, 200),
      phone_number: trunc(profile.phone_number, 30),
      location: trunc(profile.location, 100),
      linkedin_url: trunc(profile.linkedin_url, 200),
      summary: trunc(profile.summary, 800),
      primary_domain: trunc(profile.primary_domain, 100),
      cv_tailoring_strategy: trunc(profile.cv_tailoring_strategy, 600),
      skills: safeArray(profile.skills).slice(0, 50).map((s) => trunc(s, 60)),
      // PR-F: canonical skill IDs resolved at profile save time. Lets the
      // LLM do deterministic intersection against jobs.req_skills_core
      // rather than substring-matching free-text labels.
      skills_canonical: safeArray((profile as any).skills_canonical).slice(0, 50),
      // Pre-bucketed experiences with stable integer `index` (0,1,2…).
      // The LLM honors these groupings and echoes ONLY {index, bullets} per
      // entry — the server stamps title / org / dates from the DB onto the
      // output by matching the echoed index. See ./reconcile.ts.
      professional_experiences: professionalExperiences,
      military_experiences: militaryExperiences,
      volunteering_experiences: volunteeringExperiences,
      leadership_experiences: leadershipExperiences,
      // Explicit languages (from profile.languages) — when non-empty, the
      // LLM must use these verbatim and NOT infer. language_hints is only
      // populated when stored_languages is empty.
      stored_languages: storedLanguages,
      language_hints: inferredLanguages,
      projects: safeArray(projects).slice(0, 10).map((p: any) => ({
        name: trunc(p.name, 100),
        description: trunc(p.description, 500),
        skills: safeArray(p.skills).slice(0, 20).map((s) => trunc(s, 60)),
        url: trunc(p.url, 300),
      })),
      certifications: safeArray(certifications).slice(0, 10).map((c: any) => ({
        name: trunc(c.name, 100),
        issuer: trunc(c.issuer, 100),
        date_earned: trunc(c.date_earned, 20),
      })),
      // Education entries — Phase B moved education off profiles flat
      // columns into its own table. The LLM receives the full list so it
      // can render all of the user's degrees (e.g. Bachelor's AND Master's,
      // or a dual-degree pair). Primary education comes from
      // pickPrimaryEducation; secondary entries (high school) just sort
      // after via display_order.
      education_list: (profile.education ?? []).map((e: any) => ({
        institution: trunc(e?.institution ?? '', 200),
        degree: trunc(e?.degree_type ?? '', 100),
        field_of_study: trunc(e?.field_of_study ?? '', 100),
        education_level: trunc(e?.education_level ?? '', 50),
        gpa: trunc(e?.gpa ?? '', 10),
        // Dates: free text — render the natural-language range. The
        // renderer / LLM echoes through as-is.
        dates: ((e?.start_date && e?.end_date) ? `${e.start_date} – ${e.end_date}`
              : (e?.start_date ? `${e.start_date}${e?.is_current ? ' – Present' : ''}` : '')),
        honors: safeArray(e?.honors).slice(0, 15).map((h: unknown) => trunc(h, 200)),
        relevant_coursework: safeArray(e?.relevant_coursework).slice(0, 20).map((c: unknown) => trunc(c, 100)),
        academic_projects: safeArray(e?.academic_projects).slice(0, 10).map((p: unknown) => trunc(p, 200)),
        location: trunc(e?.location ?? '', 200),
        is_current: !!e?.is_current,
      })),
      // Rich pre-scored evidence from the onboarding analyzer. Helps the LLM
      // pick which experiences to emphasize without inventing metrics.
      proof_signals: safeArray(profile.proof_signals).slice(0, 20),
      // Story Bank evidence — top-N user-confirmed STAR records ranked by
      // overlap with the JD's extracted keywords. Each carries an
      // experience_label ("Role at Company") so the LLM correlates to one
      // of the bucketed experience entries above. STORY BANK PRECEDENCE
      // rule in the system prompt directs the LLM to prefer these over
      // freeform responsibilities text. Empty array when no JD provided
      // or no stories matched.
      stories: storiesForLLM,
      target_application: application_id ? {
        company: targetCompany,
        role_title: safeTargetRole,
      } : null,
    };

    // --- Role library lookup via shared matcher ---
    // matchRoleToLibrary handles parens-stripping, seniority-prefix
    // stripping, alternate_titles search, and slash-split fallback.
    // Empirical match rate against real application titles lifted from
    // 17% → 42% with this matcher (n=12 sampled 2026-05-05). The
    // library_match flag drives the LIBRARY_CONTEXT prompt block, so
    // higher match rate = more CVs benefit from role-library tailoring.
    const matchResult = matchRoleToLibrary(safeTargetRole, roleLibrary as any);
    const targetRoleDef = matchResult?.role || null;
    const matchVia = matchResult?.via || null;

    const targetMapping = (roleSkillMapping as any).role_skill_mapping.find((m: any) =>
      m.role_id === (targetRoleDef?.role_id || targetRoleDef?.id || safeTargetRole)
    );

    const library_match = Boolean(targetRoleDef);
    if (library_match) {
      console.log(`[CV] role library match: "${safeTargetRole}" → ${targetRoleDef?.role_family} (via ${matchVia})`);
    } else {
      console.log(`[CV] role library miss: "${safeTargetRole}" — falling back to keyword/profile sector resolution`);
    }

    // Collect skill IDs from both possible mapping schemas
    const allSkillIds = new Set<string>();
    if (targetMapping) {
      const flatBuckets = [
        ...(targetMapping.core_skills || []),
        ...(targetMapping.secondary_skills || []),
        ...(targetMapping.differentiator_skills || []),
      ];
      const nested = targetMapping.skills || {};
      const nestedBuckets = [
        ...(nested.core || []),
        ...(nested.secondary || []),
        ...(nested.differentiator || []),
      ];
      [...flatBuckets, ...nestedBuckets].forEach((entry: any) => {
        if (typeof entry === "string") allSkillIds.add(entry);
        else if (entry && typeof entry.skill_id === "string") allSkillIds.add(entry.skill_id);
      });
    }

    const relevantSkills = (skillLibrary as any).skill_library.filter(
      (s: any) => allSkillIds.has(s.skill_id || s.id)
    );

    const relevantSignals = (proofSignalLibrary as any).proof_signal_library.filter(
      (ps: any) => {
        const signalSkills = ps.mapped_skills || ps.skills || ps.skill_ids || [];
        return signalSkills.some((sid: any) => {
          if (typeof sid === "string") return allSkillIds.has(sid);
          if (sid && typeof sid.skill_id === "string") return allSkillIds.has(sid.skill_id);
          return false;
        });
      }
    );

    // --- Build System Prompt with Scoped Library Context ---
    // This prompt is built in three zones:
    //   1) TRUTHFULNESS — the most important rules, stated first and last.
    //   2) Structure & tailoring — what sections to produce and how to tailor
    //      to the target role / JD / company.
    //   3) Role-library context (only when a library match exists) — gives the
    //      LLM a controlled vocabulary of skills and proof signals.
    const ONE_PAGE_RULE = `CONTENT DENSITY & QUALITY:

Page-fit is now handled by the PDF renderer — it measures your output and scales typography down (within readable bounds) until it fits on one page. Your job is not to ration content for the page; your job is to write the right amount of content at the right quality, and let the renderer handle layout.

Per-experience bullet counts:
- Professional experiences: 2-4 bullets per role. Pick the number based on richness of the source: a role with one short responsibility line gets 2 bullets; a role with multiple stories + named tools + measured outcomes gets 4.
- Military experiences: 2-3 bullets per role.
- Volunteering / Leadership: 1-3 bullets per role.
- Hard ceiling: 5 bullets per experience. Beyond that the section reads as a list rather than a profile.

Per-bullet word count (quality, not page-fit):
- Target 14-22 words for most bullets. Bullets shorter than 12 words usually under-describe the work and read as thin. Bullets longer than 26 words are almost always padded — tighten.
- A bullet running to two rendered lines should earn it with a real metric or specific tool, not with filler.

Section richness:
- Include every experience, education entry, certification, award, and language the user has. NEVER drop entries — the renderer will shrink before anything is cut.
- About Me density follows the path-specific rules below (3-4 sentences grounded, 1-2 sparse).

Recruiter scan order remains: professional experience top, then education, then skills/honors. Lead with your strongest material in each bucket — chronologically AND by relevance to the JD.
`;

    const TRUTHFULNESS_RULES = `ABSOLUTE TRUTHFULNESS & PRESERVATION RULES — THESE OVERRIDE EVERY OTHER RULE:

A. Factual integrity (no invention):
1. NEVER invent, fabricate, or estimate any metrics, percentages, numbers, dollar amounts, team sizes, or durations that aren't EXPLICITLY in the user's source data. No "reduced response time by 20%", no "managed a team of 15", no "drove $1M in pipeline" unless those exact figures appear in the source.
2. NEVER add a quantified achievement unless the user's own data contains that exact number. If a bullet would be stronger with a metric, leave it without. Weaker-but-truthful beats strong-but-false.
3. NEVER add skills, tools, certifications, experiences, education entries, or awards the user doesn't actually have in the source data. If the JD asks for SQL and the user has no SQL anywhere, do not add it.

B. Preservation (don't drop, don't paraphrase identifiers — BUT fix obvious typos):
4. Use the EXACT job titles from the source data. Never shorten, generalize, or paraphrase a title — "Supervised and trained teams of soldiers" stays "Supervised and trained teams of soldiers", never "Soldier". "Senior Customer Success Manager" stays "Senior Customer Success Manager", never "CS Manager".
5. Use the EXACT company / institution / organization names from the source data. Don't re-capitalize, abbreviate, or translate them.
6. EXCEPTION to rules 4 and 5 — you MUST silently correct obvious spelling mistakes in degree names, field-of-study strings, institution names, and company names. "specilization" → "specialization". "Reichmann" → "Reichman". "Mangement" → "Management". "Engeering" → "Engineering". Only fix clear typos; never rephrase, re-order words, translate, or expand abbreviations. The user will be embarrassed if the CV goes to an employer with a misspelled degree or school.
7. Preserve every bullet from the source responsibilities. Rephrase for clarity and role alignment, but do not drop content. Five source bullets in → five bullets out.
8. Include EVERY experience, education entry, certification, award, and language present in USER DATA. Do not silently omit entries because they feel less relevant — reorder them, but include them all.

C. Surfacing awards and honors:
8. If a responsibility line mentions an award (e.g. "Awarded Presidential Award for Excellence"), keep it in the bullet AND surface the award in honors_and_awards[] so it appears in a dedicated Honors & Awards section.
9. CAPITALIZATION — all degree names, specializations, field-of-study strings, institution names, AND every entry in skills.domain (the role-specific capability list) must use TITLE CASE. "bachelor's degree in business administration-specialization in digital innovation" becomes "Bachelor's Degree in Business Administration - Specialization in Digital Innovation". "process improvement" in skills.domain becomes "Process Improvement". Small connector words like "in", "of", "and", "the", "a", "at" stay lowercase unless they're the first word. NOTE: skills.tools (brand names like "Figma", "HubSpot") and skills.technical (acronyms like "SQL", "AWS", "JavaScript") should preserve their natural casing — do NOT title-case acronyms or brand names. Apply this silently during the typo-correction step (rule 6) — the reader should never see a sentence-case or lower-case degree or domain skill.

D. What you MAY do:
9. MAY rephrase and tighten bullets for stronger action verbs, ATS keywords, and role alignment — while preserving facts.
10. MAY reorder experiences and bullets so the most role-relevant lead.
11. MAY write a tailored About Me that connects the user's real experience to the target role and (when provided) the target company by name.
`;

    // ─── Dynamic About Me rules ───
    // Two paths chosen at prompt-build time based on whether v4 grounding
    // exists for this job AND whether the user's canonical skills overlap
    // the job's required skills. Computed in the edge function (not the
    // LLM) so the overlap calculation is deterministic — the LLM only
    // has to follow the path-specific instruction.
    const userSkillSet = new Set<string>(
      (Array.isArray((userContext as any).skills_canonical)
        ? ((userContext as any).skills_canonical as unknown[])
        : []
      ).map((s) => String(s).toLowerCase().trim()).filter(Boolean)
    );
    const reqCore: string[] = Array.isArray(targetRoleContext?.req_skills_core)
      ? (targetRoleContext!.req_skills_core as string[])
      : [];
    const overlapIds: string[] = reqCore.filter((id) => userSkillSet.has(String(id).toLowerCase().trim()));

    // Humanize at prompt-build time using the canonical library names map
    // so the LLM receives "Customer Health Management & Retention" not
    // "customer_health_management". Falls back to a Title-Case of the
    // snake_case ID for any skill the library hasn't promoted yet.
    const skillNameById: Map<string, string> = (() => {
      const m = new Map<string, string>();
      const items: any[] = (skillLibrary as any)?.skill_library ?? [];
      for (const s of items) {
        if (s?.id && s?.name) m.set(String(s.id), String(s.name));
      }
      return m;
    })();
    const titleCaseFromId = (id: string): string => id
      .replace(/[_-]+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const humanizeId = (id: string): string => skillNameById.get(id) || titleCaseFromId(id);
    const overlapHumanized = overlapIds.map(humanizeId);

    const hasV4Grounding = reqCore.length > 0;
    const usesGroundedPath = hasV4Grounding && overlapIds.length > 0;

    const ABOUT_ME_RULES = usesGroundedPath
      ? `- About Me — GROUNDED MODE (matched skills available).
    Matched skills (verified as both in USER DATA and required by the JD): ${JSON.stringify(overlapHumanized)}
    Target role: "${safeTargetRole}"
    Length: 3-4 sentences. (Page-fit is handled by the PDF renderer; About Me density is now governed by grounding richness, not the line budget.)
    Sentence 1: reference the user's primary qualification — degree program from USER DATA.education_list[0], OR current role + company from USER DATA.professional_experiences[0] — AND name at least one matched skill from the list above using its natural-language phrasing (NOT the snake_case ID).
    Sentence 2: connect to the target role's domain by referencing ONE of: a USER DATA-grounded fact about the role context (notable_customers entry, scale_signals entry), the function_family + req_seniority, or one more matched skill. The target company name may appear AT MOST once across the whole About Me.
    Sentence 3 (and optional 4): expand with ONE more concrete grounding — another matched skill in context, a quantified outcome from a proof_signal or story, or a specific tool the user has used. Prefer naming a story metric or a USER DATA.experiences[i].skills entry over generic positioning.
    Every concrete claim (skill, company, metric, role title) must trace to USER DATA. If a claim doesn't trace, leave it out.
    ANTI-FABRICATION (load-bearing — read carefully):
    Do NOT infer domains, industries, functional specialties, or career interests that are NOT supported by USER DATA. The bridge from a degree to a specialty is the part to watch — degrees alone do not grant work experience. Specifically:
      - A "Business Administration" degree alone does NOT mean the user has consulting, finance, marketing, or strategy experience. Their actual experiences + skills + projects.skills are what count.
      - A "Computer Science" degree alone does NOT mean the user has software engineering experience — only the experience rows + skill list do.
      - Do NOT write "interested in X" / "exploring X" / "focused on X" unless USER DATA.summary, USER DATA.cv_tailoring_strategy, or USER DATA.primary_domain explicitly says so.
    The target role's domain (e.g. "fintech", "cybersecurity", "B2B SaaS") IS safe to reference in the About Me when ANY of these is true:
      - one of the user's experiences was AT a company in that domain, OR
      - one of the user's skills or skills_canonical names that domain, OR
      - one of the user's projects or proof_signals references that domain.
    If none of those hold, leave the industry out.
    BAD: "Business Administration student at State University with consulting experience, interested in fintech." (Consulting + fintech were INFERRED — neither traces to an experience, skill, or project.)
    GOOD: "Business Administration student at State University with two years at the Civic Scholars Foundation supporting program operations, focused on B2B SaaS customer success (skills include enterprise account management and Salesforce)." (B2B SaaS + CS terms trace to skills + experience.)`
      : `- About Me — SPARSE MODE (no v4 grounding or zero skill overlap).
    Length: 1-2 sentences MAX. Shorter is more credible when grounding is thin — better to say less truthfully than more generically.
    Reference exactly two profile anchors from USER DATA:
      (a) the user's primary qualification — degree + institution from USER DATA.education_list[0], OR current role + company from USER DATA.professional_experiences[0]
      (b) one domain or focus area they ACTUALLY have, drawn from USER DATA.skills or one of their experiences.
    Example: "Business Administration student at State University with two years of operational support experience at the Civic Scholars Foundation, focused on customer-facing roles in product and operations."
    If you can't write 2 honestly-grounded sentences, write 1.
    ANTI-FABRICATION (load-bearing — read carefully):
    Do NOT infer domains, industries, or specialties from the user's DEGREE or the TARGET ROLE alone. A Business Administration degree alone does not give the user "consulting", "strategy", "finance", or "marketing" experience — only their actual experience rows + skills do. The target role's industry (e.g. "fintech", "cybersecurity") IS safe to reference when the user has experience at a company in that domain OR their skills/projects name that domain. If neither holds, leave the industry out.
    BAD: "Business Administration student at State University with consulting experience, interested in fintech." (Both inferred — neither traces.)
    GOOD: "Business Administration student at State University." (1 sentence — honest beats padded.)`;

    const STRUCTURE_RULES = `OUTPUT STRUCTURE:
- Produce a single JSON document (see schema below). The PDF renderer reads it verbatim.
- Omit any section the user has no data for. Do NOT return empty arrays of placeholders.
- Experiences are pre-bucketed in USER DATA. You MUST honor those buckets — route each one into the correct output array:
    • bucket === "professional" → professional_experiences[]
    • bucket === "military"     → military_experiences[]
    • bucket === "volunteering" → volunteering_experiences[]
    • bucket === "leadership"   → leadership_experiences[]
- About Me: FACTUAL style with no pronouns and no candidate-speak. The subject of every sentence is the USER (their experience, work, skills) — NOT the target company. JD domain terms, tools, and skill names ARE allowed when they describe the user's real experience. What is NEVER allowed is the company's own MISSION / TAGLINE / MARKETING / SLOGAN language. The path-specific instruction below governs LENGTH and CONTENT — follow it exactly.
${ABOUT_ME_RULES}
  BAD: "Excited to join Acme's mission to revolutionize payroll." BAD: "Aligns with the company's vision of seamless workforce solutions." BAD: "Hands-on experience in customer success and process improvement." BAD: "Demonstrated ability to drive results across cross-functional teams."
- Experience bullets: lead with the ACHIEVEMENT, OUTCOME, or ACTION — never with a tool or instrument. Tools belong mid-sentence as the means, never as the subject of the bullet. PREFER the XYZ structure when the source has measurable outcomes: "Accomplished X (impact Y) by doing Z" — e.g. "Reduced ticket resolution time by 40% by building a triage workflow in Zendesk". The metric Y MUST come verbatim from the user's source data. When source has no metric, fall back to action-verb + concrete-outcome — but still NEVER start with a tool name (NEVER fabricate a number to fit the XYZ shape either — the truthfulness rules above always win).
  BAD (tool-first): "Used HubSpot to track customer health and renewal risk." → flat, instrumentation-first.
  BAD (tool-first): "Utilized Notion to manage scholarship registration pipeline." → tool name as subject.
  GOOD (outcome-first): "Drove a 15-point lift in renewal rate by rebuilding the health dashboard in HubSpot." → outcome leads, tool supports.
  GOOD (action-first, no metric): "Owned the scholarship registration pipeline end-to-end for 200 students, coordinating intake through Notion." → action leads, tool supports.
  When the verb you want to use is "Used" / "Utilized" / "Leveraged" / "Employed" — STOP and rewrite. Those verbs are a tell that the bullet is starting at the wrong place. Replace with the action the tool enabled.
- STORY BANK PRECEDENCE: When USER DATA.stories[] contains a story whose \`experience_label\` matches one of the user's experiences AND a JD requirement, prefer the story's \`result\` + \`metrics\` + \`tools_used\` as the bullet's content over the experience's freeform \`responsibilities\` text. Stories are user-confirmed STAR records — every metric, tool, and skill there is real and verbatim. Each bullet traces to ONE source: either a single story OR a responsibility line from one experience — NEVER combine two stories into one bullet, and NEVER blend story content with imagined details. Match a story to its parent experience by \`experience_label\` ("Role at Company"); place the bullet under that experience's bucket. If a story is irrelevant to the bullet you're writing, skip it — never force-fit.

  STORY BANK BINDING (mandatory for each matched story):
    (1) METRICS VERBATIM — for each story you use, write at least one bullet under that experience that contains every entry from the story's \`metrics\` array WORD-FOR-WORD. Numbers ("12", "88%", "$1M") and units ("interviews", "first quarter") stay exactly as the story has them. The TAILORING rule about rephrasing applies to action verbs and surrounding structure — NOT to the metric figures themselves. Example: a story with metrics ["12 user research interviews", "88% adoption in first quarter"] MUST produce a bullet like "Drove 88% adoption in first quarter via 12 user research interviews with security leads" — NOT "Led product discovery to enhance enterprise adoption" (which strips both metrics).
    (2) TOOLS PRESERVED — every entry from the story's \`tools_used\` array MUST appear in the CV: ideally in the matching experience's bullet, or — if it doesn't fit naturally there — in the Skills & Tools section. Story tools are confirmed-real and must surface somewhere visible.
    (3) NO CROSS-EXPERIENCE SMEARING — story content stays attached to its \`experience_label\`. Do not sprinkle the story's adoption/metric/result language across other experiences in the CV. If you wrote a bullet referencing "88% adoption" under Experience A, do not also reference "adoption metrics" or similar paraphrases under Experience B unless Experience B has its own story or responsibilities text supporting it.
- PROOF SIGNALS — USER DATA.proof_signals is a ranked list of pre-extracted, pre-scored evidence from the user's onboarding analysis. Each entry has a proof_signal name, mapped_skills, primary_domain, and confidence_score. When writing a professional bullet, FIRST check whether one of the proof_signals describes work the user did in that role — if so, prefer the proof_signal's evidence over rephrasing the freeform responsibilities text. Treat proof_signals as second only to Story Bank for bullet sourcing (Stories > proof_signals > responsibilities). Do NOT list proof_signal names in the output — they are inputs that ground bullets, not standalone CV content.
- EXPERIENCE SKILLS — every experience entry in USER DATA carries a skills[] array alongside its responsibilities text. This is the user's confirmed list of skills + tools/platforms for that specific role (one combined array). When writing bullets for that experience, surface specific items from skills[] whenever they fit naturally (e.g. a marketing internship with skills: ["HubSpot", "Google Analytics", "lifecycle marketing"] should mention HubSpot, Google Analytics, or lifecycle work in bullets that describe the matching work). Any platform-style entry that doesn't fit naturally in a bullet MUST still appear in skills.tools[] so it's visible.
- Skills & Tools: categorize as Domain (role-specific capabilities) and Tools (software/platforms/systems). Languages do NOT go here.
- Languages: human spoken/written languages only. Draw them from the user's skills list if language-like entries are there; draw also from language_hints[] which flags likely languages based on location. Include a proficiency level (Native | Fluent | Professional | Conversational | Basic) when the source or hint supports it, otherwise omit level.
- Education: include every entry from USER DATA.education_list — render them in the order provided. Do not invent additional entries; the LLM's job is to format what's given, not to synthesize a second entry from another source.
- Honors & Awards: include USER DATA.education.honors verbatim and any awards mentioned inside experience responsibilities.
- Military Service: preserve unit names and ranks (titles), but phrase bullets in civilian-readable language.
- Never keyword-stuff. JD keywords appear only where they genuinely apply to real experience.
`;

    const TAILORING_RULES = `
TAILORING (per-bucket policy — different rules for different experience types):

THE CORE PRINCIPLE: tailoring must preserve the AUTHENTIC NATURE of each role. A volunteer educator coordinating youth programs is not a Product Analyst. Repackaging volunteer work in corporate-tech vocabulary ("monitored adoption dashboards", "stakeholder alignment on growth priorities") makes the CV worse, not better — recruiters spot the mismatch and trust the candidate less. Each role keeps its own register.

WHERE TO TAILOR AGGRESSIVELY:
- professional_experiences[] bullets — full JD-language rewriting, use must_include_phrases / action_verbs / domain_terms wherever they describe real work the user did
- About Me — describe the user's experience using JD vocabulary where it genuinely applies
- Skills & Tools — lead with JD-matching skills, then list others

WHERE TO PRESERVE AUTHENTIC REGISTER (do NOT force JD vocabulary):
- volunteering_experiences[] bullets — keep the language native to the volunteer context (curriculum, mentorship, community, youth, outreach, recruitment of volunteers, fundraising, etc). Use the user's actual responsibilities text and Story Bank metrics. JD keywords appear here ONLY when the activity genuinely maps (a volunteer running a coding bootcamp legitimately "taught Python"; a youth-education volunteer does NOT "monitor adoption dashboards").
- military_experiences[] bullets — civilian-readable but militarily authentic. Preserve unit names + ranks. Do NOT inject corporate-tech vocabulary; keep the language of operational leadership, training, missions, teams under pressure.
- leadership_experiences[] bullets — same authentic-register rule. Student-org leadership stays student-org-shaped, not corporate-shaped.

EXAMPLES:

✅ AUTHENTIC volunteering bullet (good): "Designed life-skills curricula for at-risk youth, covering financial literacy, career readiness, and conflict resolution."
✗ OVER-TAILORED volunteering bullet (bad): "Monitored adoption dashboards and engagement metrics across a youth program portfolio."

✅ AUTHENTIC volunteering bullet (good): "Coordinated weekly programming for a 12-volunteer team serving 80 students across two community centers."
✗ OVER-TAILORED volunteering bullet (bad): "Coordinated with stakeholders to ensure alignment on growth priorities."

✅ AUTHENTIC military bullet (good): "Led a 12-soldier squad through six-month operational deployment in Sector 4, including reconnaissance and patrol routes."
✗ OVER-TAILORED military bullet (bad): "Drove cross-functional alignment across operational stakeholders to deliver on mission KPIs."

✅ AUTHENTIC professional bullet (good): "Owned customer relationships and drove 88% adoption in Q1 via 12 user research interviews with security leads."
- (this is OK because the user actually did customer success work — JD keywords genuinely apply)

PROJECTS — reorder by JD relevance. When USER DATA.projects is non-empty, score each project on overlap between its skills[] and the JD's must_include_phrases / tools_and_platforms / domain_terms. Output the top 2-3 most relevant projects first; drop the least relevant if you're tight on space. Project bullets follow the same XYZ structure as experience bullets — what was built + tools used + outcome. Include the URL when present.

EDUCATION COURSEWORK — select by JD relevance. USER DATA.education_list[i].relevant_coursework[] is the user's full coursework array (up to 20 items). For the output education[i].coursework[], pick up to 5 courses ranked by overlap with the JD's domain_terms and must_include_phrases. A Finance JD should surface "Financial Modeling, Corporate Finance"; a Product JD should surface "Data Science, SQL, Product Management". Pad with breadth courses only if there's no JD-aligned coursework. NEVER invent course names.

EDUCATION ACADEMIC PROJECTS — surface when JD-relevant. USER DATA.education_list[i].academic_projects[] holds thesis/capstone/coursework projects. If any align with the JD, render them in education[i].academic_projects[] (new schema field — see OUTPUT SCHEMA). One line per project, format "Project name — short description". Cap at 2 per education entry.

UNIVERSAL RULES (apply to every bucket):
- TAILORING SCORE TARGET: at least 6 of the must_include_phrases (or close variants) appear across the CV — distributed across PROFESSIONAL bullets, Skills, and About Me. The score is NOT measured on volunteering/military/leadership bullets — those should never inflate the count by absorbing keywords that don't fit.
- REORDER bullets within each experience: put the most-JD-relevant responsibility first WHEN it genuinely applies. Don't reorder volunteering bullets to feature curriculum-design first because the JD says "design" — if the user spent more time on coordination, coordination leads.
- About Me must read like it was written FOR this specific role through the USER's relevant experience — not by quoting the company's mission. Domain reference is OK ("fintech", "B2B SaaS"); reciting the company's tagline is NOT.
- NEVER invent experiences, skills, tools, certifications, or metrics. Rephrasing is allowed; fabrication is not. "Managed multiple cases" can become "Prioritised and managed a backlog of concurrent cases" if that's what actually happened, but CANNOT become "Managed a product backlog" if the user didn't work on one.
- If unsure whether a rephrasing is truthful or natural to the role, keep the original wording. Conservative rephrasing > aggressive over-tailoring.
`;

    // Extracted keywords — the single most effective lever for forcing
    // tailoring. Appended to the END of the user prompt (not the system
    // prompt) because GPT-4o-mini weights the tail of the user message
    // most heavily when the response is structured JSON.
    const KEYWORD_INJECTION_BLOCK = jdKeywords && (
      jdKeywords.must_include_phrases.length +
      jdKeywords.action_verbs.length +
      jdKeywords.tools_and_platforms.length +
      jdKeywords.domain_terms.length +
      jdKeywords.soft_skill_keywords.length
    ) > 0
      ? `
=== JOB-DESCRIPTION KEYWORDS TO USE WHERE THEY GENUINELY FIT ===

These keywords were extracted from the target job description. Use them in the CV ONLY where they describe real user experience that fits the keyword's meaning. Do NOT mechanically inject them into every bullet — that produces inauthentic over-tailoring (e.g. forcing "adoption dashboards" into a youth-education volunteering bullet). The TAILORING per-bucket policy in your system instructions governs WHERE each keyword can appropriately appear.

${jdKeywords.must_include_phrases.length > 0 ? `MUST-INCLUDE PHRASES (use at least 6 across professional bullets / Skills / About Me where they describe real user work):
${jdKeywords.must_include_phrases.map((p) => `"${p}"`).join(", ")}
` : ""}
${jdKeywords.action_verbs.length > 0 ? `ACTION VERBS to prefer over generic synonyms when describing similar actions in PROFESSIONAL bullets:
${jdKeywords.action_verbs.join(", ")}
` : ""}
${jdKeywords.tools_and_platforms.length > 0 ? `TOOLS to mention in Skills section (only if the user could reasonably claim familiarity):
${jdKeywords.tools_and_platforms.join(", ")}
` : ""}
${jdKeywords.domain_terms.length > 0 ? `DOMAIN TERMS to use in About Me and PROFESSIONAL descriptions where they apply:
${jdKeywords.domain_terms.join(", ")}
` : ""}

WHERE THE KEYWORDS LIVE:
- Primary: professional_experiences[] bullets, Skills & Tools section, About Me
- Avoid: volunteering_experiences[] / military_experiences[] / leadership_experiences[] bullets — these preserve their authentic register per the per-bucket policy. Forcing JD keywords into volunteer or military bullets produces the over-tailoring failure mode (corporate-tech vocabulary applied to non-corporate roles), which recruiters spot immediately and trust LESS.

REPHRASING DISCIPLINE:
- Truthfulness > keyword count. Never invent experience to hit the score target.
- Rephrasing existing real activities in JD language is encouraged WHEN authentic ("Managed customer cases" → "Owned customer relationships" is fine if the role was customer success).
- Mapping fundamentally different activities to JD vocabulary is forbidden ("Tracked youth attendance" must NOT become "Monitored adoption dashboards" — those describe different work).
- If unsure whether a rephrasing fits naturally, KEEP THE ORIGINAL.
`
      : "";

    const LIBRARY_CONTEXT = library_match ? `ROLE-LIBRARY CONTEXT (controlled vocabulary — use to pick which of the user's real skills to emphasize; DO NOT use to invent skills the user doesn't have):

TARGET ROLE DEFINITION:
${JSON.stringify(targetRoleDef, null, 2)}

ROLE-SKILL MAPPING (core = must-haves, secondary = nice-to-haves, differentiator = standouts):
${JSON.stringify(targetMapping, null, 2)}

RELEVANT SKILLS (only the skills mapped to this role):
${JSON.stringify(relevantSkills, null, 2)}

RELEVANT PROOF SIGNALS (map user experiences to these signals when possible):
${JSON.stringify(relevantSignals, null, 2)}
` : `NOTE: The target role was not found in the standardized role library. Tailor strictly using the job description and the user's actual profile data.\n`;

    // PR-F: when the application is linked to a v4-extracted jobs row, we
    // have CANONICAL skill IDs the JD requires (req_skills_core / _nice)
    // plus quantified company-context signals (notable_customers,
    // scale_signals, funding_signals). Telling the LLM to prioritize these
    // anchors beats keyword-substring guessing for skill emphasis +
    // unlocks honest scale/brand-fit framing in the About Me.
    const STRUCTURED_REQUIREMENTS_RULE = (
      targetRoleContext && (
        (targetRoleContext.req_skills_core && targetRoleContext.req_skills_core.length > 0) ||
        (targetRoleContext.notable_customers && targetRoleContext.notable_customers.length > 0) ||
        targetRoleContext.scale_signals ||
        targetRoleContext.funding_signals
      )
    ) ? `STRUCTURED JOB REQUIREMENTS — PRIORITY ANCHORS

When the user prompt contains a STRUCTURED_JOB_REQUIREMENTS block, treat it
as the authoritative requirements set for skill emphasis and bullet
prioritization. Specifically:

1. req_skills_core[] holds canonical skill IDs the JD requires. For each
   ID, check userContext.skills_canonical[] for membership. When present,
   the user's matching experience bullets MUST surface that skill (verbatim
   or in a recognizable form) — these are ATS-critical keywords + the
   strongest fit signal we have. Cap the skills section's domain/tools/
   technical buckets to favor IDs that appear in req_skills_core[] over
   user-only skills.

2. req_skills_nice[] are secondary. Include if the user has them, but never
   force-fit and never displace req_skills_core matches.

3. notable_customers[] and scale_signals{} are CONTEXT, not requirements.
   Reference them in the About Me / summary ONLY when the user has
   genuinely worked at comparable scale or with comparable brands —
   otherwise stay silent. Inventing a connection breaks the
   TRUTHFULNESS_RULES.

4. funding_signals{} (last_round_size_usd, last_round_type, notable_investors)
   informs voice calibration — early-stage seed company expects scrappy
   builder framing; late-stage / public expects polished operator framing.
   Don't quote the numbers in the CV.

5. req_years_min / req_years_max bound how much of the user's tenure to
   surface up-front in the About Me. If the user has 2y and req_years_min
   is 5, don't lead with tenure — lead with proof-signal stories instead.

When both STRUCTURED_JOB_REQUIREMENTS and the KEYWORD_INJECTION_BLOCK at
the end of the user prompt are present, the structured anchors define the
PRIORITY ORDER; the keyword block enforces ATS-substring presence. Both
constraints must be honored.
` : ``;

    // Option A overlay — appended ONLY when safeCvModel === 'sonnet'. Lives
    // at the END of the system prompt so the model treats it as authoritative
    // over the earlier conflict-mapped blocks (ONE_PAGE_RULE bullet counts,
    // STRUCTURE_RULES STORY BANK PRECEDENCE, TAILORING_RULES verbatim-metrics
    // scope, ABOUT_ME SPARSE branch). LLMs weight later instructions higher
    // for conflicting guidance; the Phase-0 bake-off validated this content
    // against the Sonnet candidate and the writing-quality + index-validity
    // metrics moved decisively in this direction (21/21 vs 13/21 index
    // validity, 35/35 vs 30/35 numbers carried; see
    // docs/research/cv-bakeoff-2026-06.md).
    //
    // The two targeted prompt additions at the bottom of the overlay address
    // specific defects observed in the Phase-0 outputs:
    //   - PROJECTS guard fixes the gavibook coursework-mis-filed-as-project
    //     case (Sonnet pulled education.relevant_coursework into a Projects
    //     section because the prompt left "what is a project" open-ended).
    //   - DERIVED-FIGURES guard fixes the michael "14 years" case (Sonnet
    //     computed tenure from start/end dates and stated it as if from
    //     source — a fabrication by computation even though every individual
    //     date was real).
    const OPTION_A_OVERLAY = `
─── OPTION-A AUTHORING OVERLAY (overrides any conflicting rule above) ───

SOURCE RANKING (RESPONSIBILITIES FIRST):
- experience.responsibilities is the PRIMARY source for bullets. Stories and proof_signals are ENRICHMENT only — they may contribute a metric or named tool the responsibility omits, but they NEVER replace a responsibility line. Ranking: responsibilities > proof_signals (enrichment) > stories (enrichment).

BULLET CAP (faithfulness over compression):
- Emit ONE bullet per distinct responsibility line in the source, capped at 6 per experience. If the user wrote 5 responsibility lines, emit 5 bullets — do NOT compress to 3. If a single short responsibility line exists, emit 1-2 bullets (split a compound responsibility if needed; never invent). Drop the LEAST JD-relevant line ONLY when you hit the 6-bullet ceiling.

VERBATIM METRICS (responsibilities AND stories):
- Every number appearing in experience.responsibilities — counts, percentages, currency, durations, team sizes, volumes — MUST appear in a bullet for that experience, word-for-word. Rephrasing applies to verbs and surrounding structure, NEVER to the number tokens themselves. If a single bullet cannot carry all numbers, distribute across multiple bullets for the same experience. Story metrics remain verbatim (unchanged from the existing STORY BANK BINDING rules).

SPARSE-PROFILE FALLBACK:
- When professional_experiences[] is empty or contains only one short entry: the About Me must anchor on education + draw 2-3 specific claims from proof_signals. Render up to 4 academic_projects per education entry (cap rises from 2 to 4 for sparse profiles only). Surface every project. Skills carry the relevance signal in place of bullet density.

PROJECTS SECTION — POPULATE ONLY FROM USER DATA.projects:
- Output projects[] contains entries drawn ONLY from USER DATA.projects[]. Do NOT promote education.relevant_coursework, course assignments, internships, or work tasks into Projects. If USER DATA.projects[] is empty or absent, omit the projects[] field from the output JSON entirely — do not emit an empty array, do not synthesize entries to fill a section.

NO DERIVED OR COMPUTED FIGURES:
- State only figures present VERBATIM in the source. Do NOT compute, derive, or estimate numbers — including tenure expressed in years/months from start_date and end_date, head-counts inferred from a team description, percentages calculated from raw figures, totals summed across roles, or any other arithmetic over source values. If the source says "Jan 2010 – Dec 2024" you may render the date range exactly — but you may NOT write "14 years of experience" or any computed restatement of that span. The same rule applies to currency totals, percentages, ratios, and head-counts: if a number didn't appear verbatim in source, it cannot appear in output.
`;

    const systemPrompt =
      `You are a CV Generation Engine for the "Get A Job" Career Operating System. Your job is to produce a tailored, one-page, truthful CV as JSON. The CV WILL be sent to real employers — so every word must be grounded in the user's actual data.\n\n` +
      `You are generating a TAILORED CV. The CV must be specifically customized for the target job description. Generic CVs that don't incorporate JD-specific language will be rejected.\n\n` +
      ONE_PAGE_RULE + `\n` +
      TRUTHFULNESS_RULES + `\n` +
      CV_VOICE_RULES + `\n` +
      STRUCTURE_RULES + `\n` +
      TAILORING_RULES + `\n` +
      STRUCTURED_REQUIREMENTS_RULE + `\n` +
      LIBRARY_CONTEXT + `\n` +
      `REMINDER: Truthfulness beats polish AND one-page fit is non-negotiable. If a bullet needs a metric to sound impressive but you have no metric in the source, leave it without. Do not invent. If content is overflowing, shorten bullets rather than dropping entries.

BEFORE FINALIZING THE JSON: count how many of the must_include_phrases appear anywhere in your output (case-insensitive substring match in any field). If fewer than 6 of 10 — or fewer than 60% of however many were provided — rewrite bullets to incorporate more, but ONLY where the user actually has the underlying experience. The factual-integrity rules above always win.` +
      (safeCvModel === 'sonnet' ? OPTION_A_OVERLAY : '');
    // KEYWORD_INJECTION_BLOCK is appended to the END of the user prompt below
    // so it's the last instruction the LLM sees before producing output.

    const userPrompt = `TARGET ROLE: ${safeTargetRole}
${targetCompany ? `TARGET COMPANY: ${targetCompany}` : ""}

USER DATA:
${JSON.stringify(userContext, null, 2)}

${safeJobDescription ? `JOB DESCRIPTION:\n${safeJobDescription}\n` : "(No job description provided — tailor using the target role and user profile only.)"}
${targetRoleContext && Object.values(targetRoleContext).some(v => v !== null && v !== undefined && v !== '') ? `
TARGET_ROLE_CONTEXT (pre-computed signal from this application; null fields just mean unknown — don't penalize the user for them):
${JSON.stringify({
  required_seniority: targetRoleContext.required_seniority,
  track: targetRoleContext.track,
  qualification_score: targetRoleContext.qualification_score,
  goal_alignment_score: targetRoleContext.goal_alignment_score,
  skills_required: targetRoleContext.skills_required,
  location: targetRoleContext.location,
}, null, 2)}

Use this context to calibrate your fit_analysis honestly: a "track_3" or "qualification_score < 40" target is genuinely a stretch role for this user, and the bullets/About Me should not overclaim. A "track_1" with high qualification_score is a strong fit — lean into the matching experience.
` : ''}
${(() => {
  // PR-F: emit the v4-extracted structured requirements block when the
  // linked jobs row has any of the anchor signals populated. See the
  // STRUCTURED_REQUIREMENTS_RULE in the system prompt for how the LLM
  // should consume it.
  if (!targetRoleContext) return '';
  const v4 = {
    req_skills_core: targetRoleContext.req_skills_core,
    req_skills_nice: targetRoleContext.req_skills_nice,
    req_years_min: targetRoleContext.req_years_min,
    req_years_max: targetRoleContext.req_years_max,
    req_education_levels: targetRoleContext.req_education_levels,
    req_education_fields: targetRoleContext.req_education_fields,
    notable_customers: targetRoleContext.notable_customers,
    scale_signals: targetRoleContext.scale_signals,
    funding_signals: targetRoleContext.funding_signals,
    req_ai_tooling: targetRoleContext.req_ai_tooling,
  };
  const hasAny = Object.values(v4).some((v) =>
    v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)
  );
  if (!hasAny) return '';
  return `
STRUCTURED_JOB_REQUIREMENTS (extracted by the v4 JD extractor — these are CANONICAL anchors. See the STRUCTURED JOB REQUIREMENTS rule in the system prompt for how to use them):
${JSON.stringify(v4, null, 2)}
`;
})()}
TASK:
Produce a tailored, truthful, one-page CV for this user as JSON matching the exact schema below.

OUTPUT SCHEMA (JSON):
{
  "header": {
    "name": "string — exact full name from USER DATA",
    "email": "string",
    "phone": "string — only if USER DATA.phone_number is non-empty",
    "location": "string",
    "linkedin": "string — linkedin URL or handle"
  },
  "summary": "string — FACTUAL descriptive sentences. Typical 3-4 sentences (grounded path); 1-2 sentences when grounding is sparse. No pronouns (he/she/his/her). No candidate-speak (no 'strong candidate', 'eager to', 'well-suited'). Describe skills and current work as facts; let content speak for fit.",
  "professional_experiences": [
    { "index": "integer — the EXACT \`index\` from USER DATA.professional_experiences[]. You echo this number only; do NOT emit title, company, or dates.", "bullets": [
      "Action verb + what the user did + concrete outcome (tool / scope / metric). 14-22 words. Anchored in a story metric or proof_signal when available.",
      "Second bullet referencing a specific item from the experience's skills[] (a tool, platform, or named capability) or a named project — different facet of the role than bullet 1.",
      "Third bullet describing scope, stakeholders, or impact — preferably with a quantified outcome from the source data.",
      "Optional fourth bullet when the role has rich source material (multiple stories, multiple named tools, distinct facets). 5 bullets is the hard ceiling; beyond that the section reads as a list rather than a profile."
    ] }
  ],
  "military_experiences": [
    { "index": "integer — the EXACT \`index\` from USER DATA.military_experiences[]. You echo this number only; do NOT emit title, unit, or dates.", "bullets": [
      "Civilian-readable description of operational responsibility. 14-22 words.",
      "Second bullet describing team size, mission scope, or training led.",
      "Optional third bullet for honors / commendations earned in the role."
    ] }
  ],
  "volunteering_experiences": [
    { "index": "integer — the EXACT \`index\` from USER DATA.volunteering_experiences[]. You echo this number only; do NOT emit title, organization, or dates.", "bullets": [
      "Authentic volunteer-context bullet — what was built, taught, or coordinated.",
      "Second bullet — scope (audience size, duration, team coordinated)."
    ] }
  ],
  "leadership_experiences": [
    { "index": "integer — the EXACT \`index\` from USER DATA.leadership_experiences[]. You echo this number only; do NOT emit title, organization, or dates.", "bullets": [
      "What the user led + the concrete outcome.",
      "Second bullet — scope, format, frequency, or impact."
    ] }
  ],
  "education": [
    { "degree": "string — EXACT degree level/type from USER DATA (e.g. 'Bachelor's Degree', 'Master's Degree'). Do NOT include the field of study here — that goes in field_of_study.", "field_of_study": "string — EXACT field/major from USER DATA.education_list[i].field_of_study (e.g. 'Business Administration', 'Computer Science - AI specialization'). Empty string if USER DATA has no field_of_study.", "institution": "string — EXACT institution", "dates": "string", "gpa": "string — only if explicitly in USER DATA and strong", "coursework": ["short course name selected by JD relevance"], "academic_projects": ["Project name — short description, only when JD-aligned"], "activities": ["leadership role / club / notable activity — one per entry, NOT awards"] }
  ],
  "skills": {
    "domain": ["role-specific capability 1", "role-specific capability 2"],
    "tools": ["software/platform 1", "software/platform 2"],
    "technical": ["programming language or technical stack 1", "stack 2"]
  },
  "languages": [
    { "language": "English", "proficiency": "Native | Fluent | Professional | Conversational | Basic" }
  ],
  "honors_and_awards": [
    { "name": "Award name exactly as in source", "description": "one short line of context — omit if none" }
  ],
  "certifications": [
    { "name": "string", "issuer": "string", "date_earned": "string — copy from USER DATA.certifications[].date_earned" }
  ],
  "projects": [
    { "name": "string", "url": "string — copy from USER DATA.projects[].url when present", "bullets": ["XYZ-shaped bullet: what was built + tools used + outcome", "second bullet only when content supports it"] }
  ],
  "fit_analysis": {
    "skill_match_percentage": 0,
    "alignment": "Strong | Moderate | Weak",
    "major_gaps": ["gap1", "gap2"],
    "explanation": "honest 1-2 sentence assessment of fit"
  }
}

SPECIFIC OUTPUT RULES:
- "professional_experiences" contains ONLY entries whose \`bucket\` in USER DATA is "professional". Military → military_experiences[]. Volunteering → volunteering_experiences[]. Leadership → leadership_experiences[].
- For every experience entry you output exactly two fields: \`index\` (the integer from the matching USER DATA bucket entry — 0, 1, 2…) and \`bullets\` (the array of bullet strings). DO NOT emit title, company, unit, organization, or dates — the server fills those from the DB by index. Echoing them is wasted tokens and any value you put there is discarded.
- Emit at most one output entry per source index. Out of the four buckets, the union of indices you emit must match the indices present in USER DATA (don't skip a real experience, don't invent indices beyond the source bucket length).
- Every bullet must trace to something in the user's responsibilities text. Rephrase, don't invent.
- If a responsibility line mentions an award (e.g. "Awarded Presidential Award for Excellence"), keep the mention AND add the award to honors_and_awards[] as an object {name, description?}.
- Output education[] should mirror USER DATA.education_list 1:1 — every entry in education_list becomes exactly one entry in education[]. Do not duplicate a primary degree or synthesize a "second entry" if education_list has only one row.
- education[].coursework[] is a list of SHORT course names (e.g. "SQL", "Python", "Data Science") — the renderer joins them into a single "Relevant coursework: X, Y, Z" line. education[].activities[] is for leadership roles, clubs, or notable activities held DURING the education, each rendered as its own bullet. Do NOT duplicate awards here — awards only appear in honors_and_awards[].
- skills.technical[] is for programming languages or technical stacks (Python, SQL, React, AWS, etc.) — include only if the user actually has them. Non-technical roles can omit this category entirely.
- Languages priority: (1) If USER DATA.stored_languages is a non-empty array, use those entries VERBATIM (same language name, same proficiency) — do NOT re-infer or flip levels. (2) Otherwise, include every language signal from USER DATA.skills, USER DATA.summary, and USER DATA.language_hints. Use the "proficiency" field (not "level") with one of Native | Fluent | Professional | Conversational | Basic. The language_hints array is advisory — if it suggests Hebrew (likely fluent), mark Hebrew at "Fluent" (not "Native") unless you have stronger signal.
- Education dates: if USER DATA.education.dates is non-empty, output that string verbatim as the education entry's "dates". Do not guess "Present" or similar when the source is blank — leave the field empty instead.
- fit_analysis.skill_match_percentage is an integer 0-100. Compute honestly: how many of the JD's core requirements does this candidate actually meet? An entry-level candidate with clearly-transferable experience should score 40-70%. A perfect match should score 80-95%. Never output 0% unless the candidate has no overlap at all — 0% is almost never correct for a real candidate.
${KEYWORD_INJECTION_BLOCK}
Return ONLY valid JSON. No markdown, no prose outside the JSON object.`;

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      _http = 500; _err = 'no_openai_key'
      return json({ error: "OpenAI API key not configured on server" }, 500);
    }

    // OPENROUTER_API_KEY only required when this request opted into Sonnet.
    // Lookup-then-validate; the default branch never reaches this code path
    // so a missing key cannot break gpt-4o requests. Flag-gated rollout
    // means any user on the Sonnet path is one who explicitly opted in.
    const openrouterKey = safeCvModel === 'sonnet'
      ? Deno.env.get("OPENROUTER_API_KEY")
      : null;
    if (safeCvModel === 'sonnet' && !openrouterKey) {
      _http = 500; _err = 'no_openrouter_key'
      return json({ error: "OpenRouter API key not configured on server (required for cv_model='sonnet')" }, 500);
    }

    // Diagnostic: confirm the JD is actually reaching the LLM and the
    // keyword extraction pulled something useful out. Shows up in
    // Supabase edge-function logs under this function.
    console.log("[CV] JD present:", !!safeJobDescription, "JD length:", safeJobDescription?.length || 0);
    console.log("[CV] Keywords extracted:", JSON.stringify(jdKeywords?.must_include_phrases?.slice(0, 5) || []));
    console.log("[CV] Injection block length:", KEYWORD_INJECTION_BLOCK.length);

    // Pass 2 — CV authoring. cv_model flag routes the call to either OpenAI
    // (gpt-4o, default branch — byte-identical to current production) or
    // OpenRouter (anthropic/claude-sonnet-4.6). Both transports return
    // OpenAI-shaped JSON (choices[].message.content + usage.*), so the
    // downstream parse code path is unchanged.
    const pass2Model = safeCvModel === 'sonnet' ? SONNET_OPENROUTER_SLUG : MODEL;
    const pass2MetricsModel = safeCvModel === 'sonnet' ? SONNET_MODEL_USED : MODEL;
    const pass2Payload = {
      model: pass2Model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // lower = less likely to invent metrics
      max_tokens: 4096,
    };
    const pass2TraceCtx = {
      // Pass-2 trace — shares sessionId with pass-1 so both passes group
      // as one CV generation in the Langfuse UI.
      traceName: 'generate-tailored-cv:pass-2-cv',
      userId: user.id,
      sessionId: cvSessionId,
      metadata: {
        template_style: safeTemplateStyle,
        cv_model: safeCvModel,
        has_jd: !!safeJobDescription,
        has_target_role: !!safeTargetRole,
        has_application_link: !!application_id,
      },
    };
    const openaiRes = safeCvModel === 'sonnet'
      ? await openrouterChatCompletion(
          pass2Payload,
          openrouterKey!,
          pass2TraceCtx,
          { signal: AbortSignal.timeout(45000) },
        )
      : await openaiChatCompletionWithRetry(
          pass2Payload,
          openaiKey,
          pass2TraceCtx,
          { signal: AbortSignal.timeout(45000) },
        );

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      _http = 500; _err = `openai_${openaiRes.status}`
      m.modelUsed = pass2MetricsModel
      return json({ error: `OpenAI error: ${err}` }, 500);
    }

    const openaiData = await openaiRes.json();
    m.modelUsed = pass2MetricsModel
    m.tokensIn = (m.tokensIn ?? 0) + (openaiData.usage?.prompt_tokens ?? 0)
    m.tokensOut = (m.tokensOut ?? 0) + (openaiData.usage?.completion_tokens ?? 0)
    let cvData: Record<string, any>;
    try {
      cvData = parseLlmJson(
        openaiData.choices?.[0]?.message?.content || "",
        String(openaiData.choices?.[0]?.finish_reason || ""),
        `pass2:${safeCvModel}`,
      );
    } catch (parseErr) {
      _http = 500; _err = 'json_parse'
      const msg = (parseErr as Error)?.message || 'AI returned an invalid response format. Please try again.';
      console.warn(`[CV] Pass-2 parse failed: ${msg}`);
      return json({ error: msg }, 500);
    }

    // ─── Smart retry on low tailoring score ─────────────────────────────
    // If the first pass missed too many of the JD's must-include phrases,
    // call OpenAI a second time with the missed phrases echoed back as a
    // retry hint. We only retry when the user has enough skill overlap with
    // the role that incorporating more phrases is plausible — for a genuine
    // bad-fit candidate, retrying just produces fabricated bullets.
    //
    // Eligibility heuristic: at least 30% of must_include_phrases overlap
    // (case-insensitive substring) with USER DATA.skills + every experience's
    // unified `skills` column. Below that, the role is genuinely a stretch
    // and the thin-source warning UX should fire instead of an LLM retry.
    let retryFired = false;
    if (jdKeywords && jdKeywords.must_include_phrases.length > 0) {
      const cvLower = JSON.stringify(cvData).toLowerCase();
      const preliminaryMatched = jdKeywords.must_include_phrases.filter(
        (p) => cvLower.includes(String(p).toLowerCase())
      );
      const preliminaryPct = preliminaryMatched.length / jdKeywords.must_include_phrases.length;
      if (preliminaryPct < 0.5) {
        // Build a haystack of the user's claimable skill vocabulary
        const userSkillHaystack = [
          ...(userContext.skills || []),
          ...allExperiences.flatMap((e: any) => (e.skills || [])),
          ...((userContext.projects || []) as any[]).flatMap((p: any) => p.skills || []),
        ].map((s) => String(s).toLowerCase()).join(' \n ');
        const overlapCount = jdKeywords.must_include_phrases.filter(
          (p) => userSkillHaystack.includes(String(p).toLowerCase())
        ).length;
        const overlapPct = overlapCount / jdKeywords.must_include_phrases.length;
        if (overlapPct >= 0.3) {
          const missed = jdKeywords.must_include_phrases.filter((p) => !cvLower.includes(String(p).toLowerCase()));
          console.log(`[CV] Retry firing: tailoring ${Math.round(preliminaryPct*100)}% + overlap ${Math.round(overlapPct*100)}%; ${missed.length} missed phrases`);
          const retryHint = `\n\nRETRY: The previous draft missed these phrases that genuinely describe the user's experience:\n${missed.map((p) => `- "${p}"`).join('\n')}\n\nRewrite the CV bullets, About Me, and Skills to incorporate as many of these as TRUTHFULLY apply. ABSOLUTE FACTUAL INTEGRITY rules still win — do not invent. If a missed phrase doesn't honestly describe the user's work, leave it out.`;
          try {
            // Pass 3 (coverage retry) routes through the same transport as
            // Pass 2 — keeping both authoring calls on the same model so the
            // retry's output shape matches what the bake-off measured.
            const pass3Payload = {
              model: pass2Model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt + retryHint },
              ],
              response_format: { type: "json_object" },
              temperature: 0.2,
              max_tokens: 4096,
            };
            const pass3TraceCtx = {
              traceName: 'generate-tailored-cv:pass-3-retry',
              userId: user.id,
              sessionId: cvSessionId,
              metadata: { cv_model: safeCvModel },
            };
            const retryRes = safeCvModel === 'sonnet'
              ? await openrouterChatCompletion(
                  pass3Payload,
                  openrouterKey!,
                  pass3TraceCtx,
                  { signal: AbortSignal.timeout(45000) },
                )
              : await openaiChatCompletionWithRetry(
                  pass3Payload,
                  openaiKey,
                  pass3TraceCtx,
                  { signal: AbortSignal.timeout(45000) },
                );
            if (retryRes.ok) {
              const retryData = await retryRes.json();
              m.tokensIn = (m.tokensIn ?? 0) + (retryData.usage?.prompt_tokens ?? 0)
              m.tokensOut = (m.tokensOut ?? 0) + (retryData.usage?.completion_tokens ?? 0)
              const retryParsed = parseLlmJson(
                retryData.choices?.[0]?.message?.content || "",
                String(retryData.choices?.[0]?.finish_reason || ""),
                `pass3:${safeCvModel}`,
              );
              // Only swap if retry has at least as many bullets as the original — never
              // let a retry that lost content win.
              const countBullets = (cv: any): number => {
                let n = 0;
                for (const k of ['professional_experiences','military_experiences','volunteering_experiences','leadership_experiences','projects']) {
                  for (const e of (cv?.[k] || [])) n += Array.isArray(e?.bullets) ? e.bullets.length : 0;
                }
                return n;
              };
              const origBullets = countBullets(cvData);
              const retryBullets = countBullets(retryParsed);
              const retryLower = JSON.stringify(retryParsed).toLowerCase();
              const retryMatched = jdKeywords.must_include_phrases.filter(
                (p) => retryLower.includes(String(p).toLowerCase())
              ).length;
              if (retryMatched > preliminaryMatched.length && retryBullets >= origBullets - 1) {
                console.log(`[CV] Retry win: keywords ${preliminaryMatched.length} → ${retryMatched}, bullets ${origBullets} → ${retryBullets}`);
                cvData = retryParsed;
                retryFired = true;
              } else {
                console.log(`[CV] Retry rejected: would have lost content (keywords ${preliminaryMatched.length} → ${retryMatched}, bullets ${origBullets} → ${retryBullets})`);
              }
            }
          } catch (e) {
            console.warn('[CV] Retry call failed:', e instanceof Error ? e.message : e);
          }
        } else {
          console.log(`[CV] Retry skipped: user skill overlap with JD is ${Math.round(overlapPct*100)}% (< 30%) — role is a genuine stretch, not a tailoring miss`);
        }
      }
    }

    // ─── Server-driven experience fill (index-based join) ───
    // The LLM emits only {index, bullets} per experience entry. The
    // server iterates the authoritative per-bucket source list and stamps
    // title / org / dates from the DB onto each output, attaching the
    // LLM's bullets by `index`. This is the load-bearing anti-fabrication
    // step — see ./reconcile.ts and PR #234 for the bug history that
    // replaced the prior date-keyed reconcile path.
    const toSource = (e: any): SourceExperience => ({
      title: String(e?.title || ""),
      company: String(e?.company || ""),
      start_date: String(e?.start_date || ""),
      end_date: String(e?.end_date || ""),
      is_current: !!e?.is_current,
      responsibilities: String(e?.responsibilities || ""),
    });
    // Defensive instrumentation sink — additive, no behavior change. Each
    // bucket's fillFromSource appends any unclaimed or positional-fallback
    // warnings here; the final array is surfaced on the response payload
    // (mirrors the unsourced_bullets pattern) so callers and admin views
    // can flag silent reconcile drift without scraping edge-function logs.
    // See ./reconcile.ts for the warning shape + when each kind fires.
    const reconcileWarnings: ReconcileWarning[] = [];
    cvData.professional_experiences = fillFromSource(
      professionalExperiences.map(toSource),
      cvData.professional_experiences,
      "company",
      { warnings: reconcileWarnings, bucket: "professional_experiences" },
    );
    cvData.military_experiences = fillFromSource(
      militaryExperiences.map(toSource),
      cvData.military_experiences,
      "unit",
      { warnings: reconcileWarnings, bucket: "military_experiences" },
    );
    cvData.volunteering_experiences = fillFromSource(
      volunteeringExperiences.map(toSource),
      cvData.volunteering_experiences,
      "organization",
      { warnings: reconcileWarnings, bucket: "volunteering_experiences" },
    );
    cvData.leadership_experiences = fillFromSource(
      leadershipExperiences.map(toSource),
      cvData.leadership_experiences,
      "organization",
      { warnings: reconcileWarnings, bucket: "leadership_experiences" },
    );
    if (reconcileWarnings.length > 0) {
      console.warn(`[CV] reconcile flagged ${reconcileWarnings.length} warning(s): ${
        reconcileWarnings.map((w) => `${w.bucket}.${w.kind}@${w.entry_position}`).join(', ')
      }`);
    }

    // ─── Normalize education + certification date strings to "Mon YYYY" ───
    // The LLM emits mixed formats inside the same CV ("October 2025" vs
    // "Aug 2025") because the prompt doesn't enforce one shape. Normalize
    // server-side so every date renders as "Oct 2025" or "Oct 2025 – Present".
    // Idempotent: a string already in target shape passes through unchanged.
    //
    // NOTE: experience-bucket dates are NOT normalised here — fillFromSource
    // above already stamps DB dates through formatExperienceDates(), which
    // does the same normalisation from start_date + end_date + is_current.
    const MONTHS_FULL: Record<string, string> = {
      january: "Jan", february: "Feb", march: "Mar", april: "Apr", may: "May",
      june: "Jun", july: "Jul", august: "Aug", september: "Sep", sept: "Sep",
      october: "Oct", november: "Nov", december: "Dec",
    };
    const MONTHS_SHORT_OK = new Set([
      "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
    ]);
    const PASSTHROUGH = new Set(["present", "current", "now", "ongoing"]);
    // Splitter handles en-dash (–), em-dash (—), hyphen (-), and word "to".
    const RANGE_RE = /\s*(?:[–—-]|\bto\b)\s*/i;
    const normaliseDatePart = (raw: string): string => {
      const t = String(raw || "").trim();
      if (!t) return "";
      if (PASSTHROUGH.has(t.toLowerCase())) {
        return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
      }
      // "Oct 2025" — already correct shape.
      const short = t.match(/^([A-Za-z]{3,4})\.?\s+(\d{4})$/);
      if (short && MONTHS_SHORT_OK.has(short[1].slice(0, 3).charAt(0).toUpperCase() + short[1].slice(1, 3).toLowerCase())) {
        const m = short[1].slice(0, 3).charAt(0).toUpperCase() + short[1].slice(1, 3).toLowerCase();
        return MONTHS_SHORT_OK.has(m) ? `${m} ${short[2]}` : t;
      }
      // "October 2025" / "Sept 2024"
      const long = t.match(/^([A-Za-z]+)\s+(\d{4})$/);
      if (long) {
        const monKey = long[1].toLowerCase();
        const abbrev = MONTHS_FULL[monKey];
        if (abbrev) return `${abbrev} ${long[2]}`;
      }
      // Year-only "2025" — leave as-is.
      if (/^\d{4}$/.test(t)) return t;
      // "10/2025" or "10-2025"
      const numeric = t.match(/^(\d{1,2})[\/\-](\d{4})$/);
      if (numeric) {
        const idx = parseInt(numeric[1], 10);
        if (idx >= 1 && idx <= 12) {
          const abbrev = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][idx - 1];
          return `${abbrev} ${numeric[2]}`;
        }
      }
      // Anything else — leave unchanged so we don't corrupt edge cases.
      return t;
    };
    const normaliseDateString = (raw: unknown): string => {
      const s = String(raw || "").trim();
      if (!s) return s;
      const parts = s.split(RANGE_RE);
      if (parts.length === 1) return normaliseDatePart(parts[0]);
      // Range — rejoin with en-dash for visual consistency.
      return parts.map(normaliseDatePart).filter(Boolean).join(" – ");
    };
    const normaliseDatesIn = (entries: any[] | undefined) => {
      if (!Array.isArray(entries)) return;
      for (const e of entries) {
        if (!e) continue;
        if (e.dates) e.dates = normaliseDateString(e.dates);
      }
    };
    normaliseDatesIn(cvData.education);
    normaliseDatesIn(cvData.certifications as any[]);

    // ─── Education institution guard ───
    // Anti-fabrication: the institution name MUST come from profile data,
    // never from the LLM. Discovered 2026-05-06 that "Polished" was emitting
    // "Heseg Tzair" as Eli's university (the most-mentioned company in his
    // profile) because the schema didn't capture institution, so the LLM
    // confabulated it. PR #25 added profiles.education_institution; this
    // guard enforces the override even when LLM emits something else.
    //
    // Behavior:
    //   - If profile.education_institution is set → override every
    //     primary-degree entry's institution with the canonical value.
    //     Identification of "primary-degree entry" = the first entry whose
    //     institution doesn't match secondary_education.institution (since
    //     that one is correctly bound).
    //   - If profile.education_institution is empty → STRIP the LLM's
    //     value (set to empty string) on the primary entry. The renderer
    //     will show the degree without an institution line, surfacing the
    //     gap. Anti-fabrication > completeness.
    // Phase B: canonical institutions are now per-row on the education
    // table. Build a set of known-good institution names from the user's
    // education rows. Any LLM-produced cvData.education[].institution that
    // doesn't match a known name is overridden with the closest match by
    // education_level (degree pairing), or stripped if no match.
    // Token-set guard: the LLM is told to copy institution names verbatim
    // from USER DATA, but it sometimes shortens long names ("Torah Academy
    // of Bergen County" → "Torah Academy") for one-page CV layout. Equally,
    // it sometimes hallucinates a plausible-looking institution. We need
    // both:
    //   (a) accept legitimate shortenings (LLM tokens ⊆ known tokens) AND
    //       promote them to the canonical full name, and
    //   (b) reject everything else (fabrication).
    //
    // The prior version used `primaryEdu.institution` as a bare fallback
    // whenever `edu.education_level` didn't match, which silently rewrote
    // every multi-entry user's second institution to their primary one
    // (e.g. Torah Academy → Reichman) — because the LLM output schema
    // doesn't include `education_level` so the level lookup ALWAYS missed.
    const primaryEdu = pickPrimaryEducation(profile.education ?? []);
    const knownInstitutionsByLevel = new Map<string, string>();
    for (const e of (profile.education ?? [])) {
      if (e?.institution && e?.education_level) {
        knownInstitutionsByLevel.set(e.education_level, e.institution);
      }
    }

    // Tokenize into 2+ char alphanumeric tokens. Strips stop-words like
    // "of" / "&" so "Torah Academy of Bergen County" → {torah, academy,
    // bergen, county}. Word-boundary granularity prevents short fabricated
    // names like "MIT Sloan Executive Program" from matching a user who
    // only attended "MIT" (extra tokens "sloan"/"executive"/"program"
    // wouldn't all be in the known set).
    const institutionTokens = (s: unknown): Set<string> => {
      return new Set(
        String(s ?? "").toLowerCase()
          .split(/[\s\-,.&\/()]+/)
          .map((t) => t.replace(/[^a-z0-9]/g, ""))
          .filter((t) => t.length >= 2),
      );
    };
    const knownTokenSets: Array<{ institution: string; tokens: Set<string> }> = [];
    for (const e of (profile.education ?? [])) {
      const tokens = institutionTokens(e?.institution);
      if (tokens.size > 0 && e?.institution) {
        knownTokenSets.push({ institution: e.institution, tokens });
      }
    }
    // Return the FULL canonical institution name if the LLM's name is a
    // token-subset of any known institution (handles shortened LLM output
    // and exact match). Returns null if no known institution accepts it.
    const findKnownInstitutionFullName = (name: string): string | null => {
      const llmTokens = institutionTokens(name);
      if (llmTokens.size === 0) return null;
      for (const { institution, tokens } of knownTokenSets) {
        let allMatch = true;
        for (const t of llmTokens) {
          if (!tokens.has(t)) { allMatch = false; break; }
        }
        if (allMatch) return institution;
      }
      return null;
    };

    if (Array.isArray(cvData.education)) {
      for (const edu of cvData.education) {
        // (a) Strong path: LLM happened to include education_level AND it
        // matches a known row → use the canonical from that row.
        const byLevel = knownInstitutionsByLevel.get(edu.education_level);
        if (byLevel) {
          if (edu.institution !== byLevel) {
            console.log(`[CV] education institution overridden (level match): "${edu.institution}" → "${byLevel}"`);
            edu.institution = byLevel;
          }
          continue;
        }
        // (b) LLM emitted blank — surface the gap, don't silently fill it
        // with an unrelated institution.
        if (!edu.institution) continue;
        // (c) Token-subset match → promote shortened name to full canonical
        // (e.g. "Torah Academy" → "Torah Academy of Bergen County"). This
        // also no-ops on exact matches.
        const matched = findKnownInstitutionFullName(edu.institution);
        if (matched) {
          if (edu.institution !== matched) {
            console.log(`[CV] education institution promoted (token subset): "${edu.institution}" → "${matched}"`);
            edu.institution = matched;
          }
          continue;
        }
        // (d) Doesn't match any known institution → fabrication. Fall back
        // to primary, or strip if user has no education rows at all.
        const fallback = primaryEdu?.institution || "";
        console.log(`[CV] education institution overridden (fabrication catch): "${edu.institution}" → "${fallback}"`);
        edu.institution = fallback;
      }
    }

    // ─── Honors & Awards dedup ───
    // The LLM occasionally emits the same award twice in honors_and_awards
    // — once as a string (no description) and once as an object with a
    // description, or two object entries with slightly different
    // descriptions. The renderer prints both, producing visible duplicates
    // (e.g. "Presidential Award for Excellence" appears as a bare bullet
    // AND with the expanded description, observed PR #25 polished smoke).
    //
    // Dedup by normalized name (case-insensitive, whitespace-collapsed).
    // For duplicates: prefer the entry with a description, then the
    // longest description. String entries with no metadata are kept only
    // when no object form of the same name exists.
    if (Array.isArray(cvData.honors_and_awards) && cvData.honors_and_awards.length > 1) {
      const normHonor = (s: unknown) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
      const byKey = new Map<string, { entry: any; descLen: number }>();
      let droppedCount = 0;
      for (const raw of cvData.honors_and_awards) {
        if (!raw) continue;
        const name = typeof raw === "string" ? raw : String(raw.name || "");
        const desc = typeof raw === "string" ? "" : String(raw.description || "");
        const key = normHonor(name);
        if (!key) continue;
        const descLen = desc.trim().length;
        const existing = byKey.get(key);
        if (!existing || descLen > existing.descLen) {
          if (existing) droppedCount++;
          byKey.set(key, { entry: raw, descLen });
        } else {
          droppedCount++;
        }
      }
      if (droppedCount > 0) {
        console.log(`[CV] honors dedup (in-list): ${cvData.honors_and_awards.length} → ${byKey.size} (${droppedCount} dropped)`);
        cvData.honors_and_awards = Array.from(byKey.values()).map((v) => v.entry);
      }
    }

    // ─── Cross-section honors dedup ───
    // The LLM occasionally mentions the same award TWICE: once as text
    // inside an experience bullet ("Awarded Presidential Award for
    // Excellence (Independence Day 2022)") AND once as a standalone
    // entry in honors_and_awards. Both render, producing a visible
    // duplicate (observed PR #25 polished smoke).
    //
    // Resolution: if the honor's name appears as a substring of any
    // experience bullet across all buckets, drop the standalone honor.
    // The bullet already conveys the award WITH context (what the user
    // did to earn it), which is more useful than a bare name-drop in
    // the Honors section. Conservative — only drops when the duplication
    // is empirically present in the rendered text.
    if (Array.isArray(cvData.honors_and_awards) && cvData.honors_and_awards.length > 0) {
      const allBullets: string[] = [];
      const bulletBuckets = [
        cvData.professional_experiences,
        cvData.military_experiences,
        cvData.volunteering_experiences,
        cvData.leadership_experiences,
      ];
      for (const bucket of bulletBuckets) {
        if (!Array.isArray(bucket)) continue;
        for (const exp of bucket) {
          if (!exp || !Array.isArray(exp.bullets)) continue;
          for (const b of exp.bullets) {
            if (typeof b === "string") allBullets.push(b.toLowerCase());
          }
        }
      }
      if (allBullets.length > 0) {
        const before = cvData.honors_and_awards.length;
        const filtered: any[] = [];
        for (const h of cvData.honors_and_awards) {
          const name = typeof h === "string" ? h : String(h?.name || "");
          if (!name.trim()) continue;
          // Use a lowercased substring check — the bullet may have the
          // honor name embedded with surrounding text. Case-insensitive
          // because the LLM occasionally varies capitalization between
          // the two emissions.
          const nameLower = name.toLowerCase().trim();
          const inBullet = allBullets.some((bul) => bul.includes(nameLower));
          if (!inBullet) {
            filtered.push(h);
          } else {
            console.log(`[CV] honor "${name}" already in a bullet — dropping standalone entry`);
          }
        }
        if (filtered.length < before) {
          console.log(`[CV] honors dedup (cross-section): ${before} → ${filtered.length}`);
          cvData.honors_and_awards = filtered;
        }
      }
    }

    // ─── Title-case pass on education degree + institution strings ───
    // The LLM is told to title-case these, but a server-side safety net makes
    // this deterministic for every user. Small connector words stay lowercase
    // unless they're the first word.
    const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "per", "the", "to", "vs", "via", "with"]);
    const toTitleCase = (raw: string): string => {
      if (!raw) return raw;
      // Tokenize on whitespace but keep punctuation-adjacent words intact.
      // Then, for each token, title-case the leading alphabetic run.
      return raw.split(/(\s+)/).map((tok, idx) => {
        if (/^\s+$/.test(tok)) return tok;
        // Preserve trailing/leading punctuation around the word body.
        const m = tok.match(/^([^a-zA-Z]*)([a-zA-Z][a-zA-Z'\-]*)(.*)$/);
        if (!m) return tok;
        const [, lead, word, trail] = m;
        const lower = word.toLowerCase();
        const isFirst = idx === 0 || raw.slice(0, raw.indexOf(tok)).trim() === "";
        // Keep words that look like ALL-CAPS acronyms (IDF, SQL, IBM) as-is if
        // the user typed them that way — don't clobber.
        if (word.length >= 2 && word === word.toUpperCase()) {
          return `${lead}${word}${trail}`;
        }
        if (!isFirst && SMALL_WORDS.has(lower)) {
          return `${lead}${lower}${trail}`;
        }
        // Title case: first char upper, rest lower — but preserve internal
        // apostrophe-s (e.g. Bachelor's).
        const titled = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        return `${lead}${titled}${trail}`;
      }).join("");
    };

    if (Array.isArray(cvData.education)) {
      for (const edu of cvData.education) {
        if (edu && typeof edu === "object") {
          if (edu.degree) edu.degree = toTitleCase(String(edu.degree));
          if (edu.field_of_study) edu.field_of_study = toTitleCase(String(edu.field_of_study));
          if (edu.institution) edu.institution = toTitleCase(String(edu.institution));
        }
      }
    }

    // Deterministic Title Case for skills.domain (role-specific capability
    // phrases like "process improvement"). LLM compliance with the prompt
    // rule above is good but not perfect; this guard ensures the output is
    // consistent every time. Intentionally NOT applied to skills.tools or
    // skills.technical — Title Case would corrupt brand names ("HubSpot"
    // → "Hubspot") and acronyms ("SQL" → "Sql", "AWS" → "Aws"). The LLM
    // handles those correctly because they're well-known canonical strings.
    if (cvData.skills && Array.isArray((cvData.skills as any).domain)) {
      (cvData.skills as any).domain = (cvData.skills as any).domain.map(
        (s: unknown) => toTitleCase(String(s ?? "")).trim()
      ).filter(Boolean);
    }

    // Subtitle derivation removed per Eli's design call (PR #24, 2026-05-06).
    // The 1-line "current identity" subtitle was anchoring recruiters on the
    // user's CURRENT role when applying for a different target. The About Me
    // block does the positioning work; subtitle was duplicative noise. The
    // header.subtitle data field is left intact in cvData (build.ts ignores
    // it now); LLM schema no longer requests it; line estimator no longer
    // counts it.

    // ─── Banned-verb post-LLM strip ───
    // The CV_VOICE_RULES ban list in voice-rules.ts catches most cases,
    // but the LLM keeps slipping verbs like "Utilized TypeScript". Backstop
    // with a deterministic word-substitution pass that preserves
    // capitalization. Walks every string field in cvData recursively.
    // Replacement targets the verbs (any tense): leveraged / utilized /
    // employed (as transitive) / made use of / spearheaded / orchestrated.
    // Replaced with neutral verbs ("used", "led") that read as plain English
    // and don't trigger the "LLM-written" tell. Excludes "employed" in the
    // "hired" sense by NOT replacing standalone "employed" — only the
    // transitive-verb usages "employed X" / "made use of X" / "utilized X".
    const BANNED_VERB_REPLACEMENTS: Array<[RegExp, (m: string) => string]> = [
      // utilized / utilizes / utilize / utilizing → used / uses / use / using
      [/\b(U|u)tilized\b/g, (m) => m[0] === "U" ? "Used" : "used"],
      [/\b(U|u)tilizes\b/g, (m) => m[0] === "U" ? "Uses" : "uses"],
      [/\b(U|u)tilize\b/g, (m) => m[0] === "U" ? "Use" : "use"],
      [/\b(U|u)tilizing\b/g, (m) => m[0] === "U" ? "Using" : "using"],
      // leveraged / leverages / leverage / leveraging → used / uses / use / using
      [/\b(L|l)everaged\b/g, (m) => m[0] === "L" ? "Used" : "used"],
      [/\b(L|l)everages\b/g, (m) => m[0] === "L" ? "Uses" : "uses"],
      [/\b(L|l)everage\b/g, (m) => m[0] === "L" ? "Use" : "use"],
      [/\b(L|l)everaging\b/g, (m) => m[0] === "L" ? "Using" : "using"],
      // made use of → used (less common but a known LLM tell)
      [/\b(M|m)ade use of\b/g, (m) => m[0] === "M" ? "Used" : "used"],
      // spearheaded → led (preserves the leadership flavor)
      [/\b(S|s)pearheaded\b/g, (m) => m[0] === "S" ? "Led" : "led"],
      [/\b(S|s)pearheading\b/g, (m) => m[0] === "S" ? "Leading" : "leading"],
      [/\b(S|s)pearhead\b/g, (m) => m[0] === "S" ? "Lead" : "lead"],
      // orchestrated → led (same logic)
      [/\b(O|o)rchestrated\b/g, (m) => m[0] === "O" ? "Led" : "led"],
      [/\b(O|o)rchestrating\b/g, (m) => m[0] === "O" ? "Leading" : "leading"],
      [/\b(O|o)rchestrate\b/g, (m) => m[0] === "O" ? "Lead" : "lead"],
    ];
    const deBanish = (text: string): string => {
      let out = text;
      for (const [re, fn] of BANNED_VERB_REPLACEMENTS) {
        out = out.replace(re, fn);
      }
      return out;
    };
    const walkAndCleanStrings = (obj: any): any => {
      if (obj == null) return obj;
      if (typeof obj === "string") return deBanish(obj);
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) obj[i] = walkAndCleanStrings(obj[i]);
        return obj;
      }
      if (typeof obj === "object") {
        for (const k of Object.keys(obj)) obj[k] = walkAndCleanStrings(obj[k]);
        return obj;
      }
      return obj;
    };
    walkAndCleanStrings(cvData);

    // ─── Step 2 of tailoring: validate how many JD phrases made it through ───
    // Two-step phrase match (fuzzy, recovers paraphrases):
    //   (1) Exact substring (case-insensitive) — fast first check
    //   (2) If (1) fails, proximity-windowed token overlap:
    //       - tokenize the phrase, strip stopwords
    //       - "matched" if every non-stopword token appears in the CV within
    //         a 200-char window of an anchor occurrence
    //       - for 1-3 token phrases: ALL tokens required
    //       - for 4+ token phrases: allow 1 missing
    //   Why: JD says "adoption dashboards" but LLM paraphrases to "dashboards
    //   for adoption tracking" — exact substring misses, proximity catches.
    //   Stopword filter prevents false-positive matches via common words
    //   like "in" or "of". 200-char window keeps the match local (one
    //   bullet or sub-section) rather than counting tokens scattered across
    //   the whole CV.
    const KEYWORD_STOPWORDS = new Set([
      "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
      "of", "with", "by", "as", "is", "are", "be", "been", "into", "over",
      "through", "across", "from", "up", "out", "via",
    ]);
    const tokenizePhrase = (s: string): string[] => {
      return String(s).toLowerCase()
        .split(/[\s\-_,.:;!?()\[\]\/]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && !KEYWORD_STOPWORDS.has(t));
    };
    const MATCH_WINDOW = 200;
    const phraseMatchesProximity = (phrase: string, cvLower: string): boolean => {
      const tokens = tokenizePhrase(phrase);
      if (tokens.length === 0) return false;
      // 1-3 token phrases need ALL tokens; 4+ allow one missing.
      const required = tokens.length <= 3 ? tokens.length : tokens.length - 1;
      // Find all positions of each token in CV text.
      const positions: number[][] = tokens.map((tok) => {
        const out: number[] = [];
        let idx = 0;
        while ((idx = cvLower.indexOf(tok, idx)) !== -1) {
          out.push(idx);
          idx += tok.length;
        }
        return out;
      });
      const presentTokens = positions.filter((p) => p.length > 0).length;
      if (presentTokens < required) return false;
      // For each occurrence of each token, treat it as an anchor and count
      // how many OTHER tokens have at least one position within ±WINDOW.
      // If anchor + window-members ≥ required, match.
      for (let anchorTokIdx = 0; anchorTokIdx < positions.length; anchorTokIdx++) {
        for (const anchorPos of positions[anchorTokIdx]) {
          let inWindow = 1; // anchor itself counts
          for (let otherIdx = 0; otherIdx < positions.length; otherIdx++) {
            if (otherIdx === anchorTokIdx) continue;
            if (positions[otherIdx].some((p) => Math.abs(p - anchorPos) <= MATCH_WINDOW)) {
              inWindow++;
            }
          }
          if (inWindow >= required) return true;
        }
      }
      return false;
    };
    let tailoring = null as null | {
      tailoring_score: number;
      matched_phrases: string[];
      missed_phrases: string[];
    };
    if (jdKeywords && jdKeywords.must_include_phrases.length > 0) {
      const cvTextLower = JSON.stringify(cvData).toLowerCase();
      const matched: string[] = [];
      const missed: string[] = [];
      let exactCount = 0;
      let fuzzyCount = 0;
      for (const phrase of jdKeywords.must_include_phrases) {
        const phraseLower = String(phrase).toLowerCase();
        if (cvTextLower.includes(phraseLower)) {
          matched.push(phrase);
          exactCount++;
        } else if (phraseMatchesProximity(phrase, cvTextLower)) {
          matched.push(phrase);
          fuzzyCount++;
        } else {
          missed.push(phrase);
        }
      }
      const pct = matched.length / jdKeywords.must_include_phrases.length;
      const matchBreakdown = `${exactCount} exact + ${fuzzyCount} fuzzy = ${matched.length}/${jdKeywords.must_include_phrases.length}`;
      if (pct < 0.4) {
        console.warn(`[CV] Low tailoring score: ${Math.round(pct * 100)}% (${matchBreakdown}) — matched: ${matched.join(" · ") || "(none)"}`);
      } else {
        console.log(`[CV] Tailoring score: ${Math.round(pct * 100)}% (${matchBreakdown})`);
      }
      tailoring = {
        tailoring_score: Math.round(pct * 100),
        matched_phrases: matched,
        missed_phrases: missed,
      };
    }

    // Honest fit percentage — no auto-floor. Previously we floored 0 → 20
    // when the user had any data ("avoid misleading 0s"), but that LIED UP:
    // a genuine no-fit was rendered as 20% Weak. Per the credibility audit,
    // an honest 0 is more useful than a fabricated 20.
    //
    // Rebucket is tighter than before — the old 40/70 thresholds left a
    // wide "Moderate" middle that the LLM defaults to. Bucket boundaries
    // now match the per-band rubric documented elsewhere: 75/50/25.
    const fa = (cvData.fit_analysis || {}) as any;
    let pct = Number(fa.skill_match_percentage);
    if (!Number.isFinite(pct) || pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    fa.skill_match_percentage = Math.round(pct);
    // Always recompute alignment from the numeric score so the band and the
    // number can't disagree (LLM has previously emitted "Strong" + 45%).
    fa.alignment = pct >= 75 ? "Strong"
      : pct >= 50 ? "Moderate"
      : pct >= 25 ? "Weak"
      : "Not a match";
    cvData.fit_analysis = fa;

    // ─── Bullet-source validator (quantified-token check) ─────────────
    // Scans every emitted bullet for QUANTIFIED claims — numbers, percentages,
    // dollar amounts, named tools/companies — and checks that the same token
    // appears somewhere in the user's source data (responsibilities, story
    // metrics/result/action, proof_signal supporting_evidence, profile.skills,
    // experiences.skills_used/tools_used). Prose paraphrasing is intentionally
    // NOT validated — the LLM rephrases bullets and exact substring matching
    // would over-fire on legitimate rephrases. Only quantified tokens get
    // flagged. Result is a non-blocking warning surfaced to the user in the
    // response payload so they can review before sending; bullets are not
    // modified or removed.
    type UnsourcedFlag = { bucket: string; bullet: string; tokens: string[] };
    const unsourcedBullets: UnsourcedFlag[] = [];
    {
      // Build the source haystack — everything in USER DATA we'd accept as
      // grounding for a numeric or named-tool claim.
      const sourceHaystackParts: string[] = [];
      for (const e of allExperiences as any[]) {
        if (e.responsibilities) sourceHaystackParts.push(String(e.responsibilities));
        for (const s of (e.skills || [])) sourceHaystackParts.push(String(s));
      }
      for (const story of storiesForLLM as any[]) {
        for (const m of (story.metrics || [])) sourceHaystackParts.push(String(m));
        if (story.result) sourceHaystackParts.push(String(story.result));
        if (story.action) sourceHaystackParts.push(String(story.action));
        for (const s of (story.skills_demonstrated || [])) sourceHaystackParts.push(String(s));
        for (const t of (story.tools_used || [])) sourceHaystackParts.push(String(t));
      }
      for (const ps of safeArray(profile.proof_signals) as any[]) {
        if (!ps) continue;
        for (const ev of safeArray((ps as any).supporting_evidence)) sourceHaystackParts.push(String(ev));
      }
      for (const s of (userContext.skills || [])) sourceHaystackParts.push(String(s));
      for (const p of (userContext.projects || []) as any[]) {
        if (p.description) sourceHaystackParts.push(String(p.description));
        for (const s of (p.skills || [])) sourceHaystackParts.push(String(s));
      }
      const sourceHaystack = sourceHaystackParts.join(' \n ').toLowerCase();
      // Quantified token regex — captures numbers (incl. percentages, currency,
      // multipliers like "3x"), and proper-noun-like tool names (CamelCase or
      // ALLCAPS, 3+ chars). Common stopword-like CamelCase ("New York", "Tel
      // Aviv") get excluded by length and a small blocklist.
      const QUANT_TOKEN_RE = /\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?[%$€₪]?|[$€₪]\d+[KMB]?|\d+\+|\d+x|[A-Z][a-z]+(?:[A-Z][a-zA-Z]+)+|[A-Z]{3,})\b/g;
      const TOKEN_BLOCKLIST = new Set(['Israel','Tel','Aviv','Hebrew','English','USA','UK','EU','API','CV','JD','PM','HR','CS','VIP','CEO','CFO','CTO','COO','SQL']);
      const checkBullet = (bullet: string, bucket: string) => {
        const text = String(bullet || '').trim();
        if (!text) return;
        const tokens = text.match(QUANT_TOKEN_RE) || [];
        const unsourced: string[] = [];
        for (const tok of tokens) {
          if (TOKEN_BLOCKLIST.has(tok)) continue;
          // Numeric tokens get a strict substring check; named tokens use a
          // case-insensitive check. If a number appears in source-data text
          // verbatim, the bullet's quantified claim is grounded.
          const lower = tok.toLowerCase();
          if (!sourceHaystack.includes(lower)) unsourced.push(tok);
        }
        if (unsourced.length > 0) unsourcedBullets.push({ bucket, bullet: text, tokens: unsourced });
      };
      for (const bucket of ['professional_experiences','military_experiences','volunteering_experiences','leadership_experiences','projects']) {
        const entries = Array.isArray((cvData as any)[bucket]) ? (cvData as any)[bucket] : [];
        for (const e of entries) {
          for (const b of (e?.bullets || [])) checkBullet(b, bucket);
        }
      }
      if (unsourcedBullets.length > 0) {
        console.warn(`[CV] Bullet-source validator flagged ${unsourcedBullets.length} bullet(s) with unsourced quantified tokens`);
      }
    }

    // ─── Rough content length estimator + auto-trim ───
    // The LLM is told to respect the ONE PAGE RULE, but we run a cheap
    // safety net to catch cases where it overshoots. One "line" ≈ one
    // visible rendered line at baseline typography. The estimator is
    // deliberately conservative; the trim order below targets content the
    // user is least likely to miss (volunteering bullets → leadership
    // bullets → professional bullets → military bullets → honor descs).
    const estimatePageLines = (cv: any): number => {
      let lines = 0;
      lines += 2; // name + contact (subtitle removed PR #24)
      lines += 1; // rule / spacing buffer

      // About Me — tightened to ~10 words per line (was 12) to match the
      // wrap-threshold tightening for bullets.
      const aboutWords = String(cv.summary || cv.about_me || "").split(/\s+/).filter(Boolean).length;
      if (aboutWords > 0) {
        lines += Math.ceil(aboutWords / 10) + 1;
      }

      // Experience buckets
      const buckets: Array<[string, any[]]> = [
        ["professional_experiences", cv.professional_experiences || []],
        ["military_experiences", cv.military_experiences || []],
        ["volunteering_experiences", cv.volunteering_experiences || []],
        ["leadership_experiences", cv.leadership_experiences || []],
      ];
      const hasAnyExp = buckets.some(([, arr]) => arr.length > 0);
      if (hasAnyExp) {
        lines += 1; // EXPERIENCE heading
        for (const [, entries] of buckets) {
          if (!Array.isArray(entries) || entries.length === 0) continue;
          lines += 1; // sub-heading
          for (const entry of entries) {
            lines += 1; // title + dates row
            const bullets = Array.isArray(entry?.bullets) ? entry.bullets : [];
            // Long bullets wrap to a second line; add 1 for each bullet that
            // exceeds ~18 words so the estimate matches reality.
            for (const b of bullets) {
              // Wrap-threshold tightened to 10 words (was 14) because Word
              // renders longer at the 9.5-11pt body sizes we ship and bullet
              // indent eats horizontal width. Honest under-estimate beats
              // hopeful over-estimate — every miss here ships a 2-page CV.
              const w = String(b).split(/\s+/).filter(Boolean).length;
              lines += 1 + (w > 10 ? 1 : 0) + (w > 22 ? 1 : 0);
            }
          }
        }
      }

      // Education
      const edu = Array.isArray(cv.education) ? cv.education : [];
      if (edu.length > 0) {
        lines += 1; // heading
        for (const e of edu) {
          lines += 2; // degree line + institution line
          // Long composite top line ("Bachelor's Degree in Business
          // Administration - Specialization in Digital Innovation" wraps)
          // — count +1 when degree + field_of_study together exceed ~7
          // words (matches the tightened wrap model for body type).
          const topLine = `${String(e?.degree || "").trim()}${e?.field_of_study ? ` in ${e.field_of_study}` : ""}`;
          if (topLine.split(/\s+/).filter(Boolean).length > 7) lines += 1;
          const cw = Array.isArray(e?.coursework) ? e.coursework : [];
          if (cw.length > 0) lines += 1; // relevant coursework line
          const ap = Array.isArray(e?.academic_projects) ? e.academic_projects : [];
          if (ap.length > 0) lines += 1; // academic projects line
          const act = Array.isArray(e?.activities) ? e.activities : [];
          lines += act.length;
        }
      }

      // Skills (Domain / Tools / Technical — each a wrapped line)
      const sk = (cv.skills || {}) as any;
      const skCount = [sk.domain, sk.tools, sk.technical].filter((v) => Array.isArray(v) && v.length > 0).length;
      if (skCount > 0) lines += 1 + skCount;

      // Languages
      if (Array.isArray(cv.languages) && cv.languages.length > 0) lines += 2;

      // Honors
      const honors = Array.isArray(cv.honors_and_awards) ? cv.honors_and_awards : [];
      if (honors.length > 0) lines += 1 + honors.length;

      // Certifications
      const certs = Array.isArray(cv.certifications) ? cv.certifications : [];
      if (certs.length > 0) lines += 1 + certs.length;

      // Projects
      const projs = Array.isArray(cv.projects) ? cv.projects : [];
      if (projs.length > 0) {
        lines += 1;
        for (const p of projs) {
          lines += 1; // name
          lines += Array.isArray(p?.bullets) ? p.bullets.length : 0;
        }
      }

      return lines;
    };

    // Page-fit is now handled by the PDF renderer (build-pdf.ts) via
    // shrink-to-fit measure pass. The line estimator + bullet-floor trim
    // below is a SAFETY NET against pathological LLM output (e.g. 50
    // bullets per role), not the line of defense against typical
    // overflow. maxLines raised 55 → 120 so this code path almost never
    // fires for normal CVs. Drop-entry passes (former passes 2-4)
    // removed entirely — Eli's directive is "never drop content, shrink
    // instead." The renderer now lives up to that promise; trimming
    // entries here would defeat its purpose.
    const maxLines = 120;

    const initialEstimatedLines = estimatePageLines(cvData);
    let estimatedLines = initialEstimatedLines;
    let trimFired = false;
    if (estimatedLines > maxLines) {
      trimFired = true;
      console.warn(`[CV] Estimated ${estimatedLines} lines (max ${maxLines}) — pathological output, trimming bullets to floor`);

      // Bullet-floor trim — only fires when estimate exceeds the very
      // generous maxLines=120 ceiling. Iterates entries OLDEST-FIRST so
      // most-recent entries keep richest bullets. Floor differs by
      // bucket: professional stays at 3 because that's where JD keywords
      // land (KEYWORD_INJECTION policy in system prompt). Secondary
      // buckets floor at 2.
      const PROFESSIONAL_FLOOR = 3;
      const SECONDARY_FLOOR = 2;
      const trimOrder = [
        "volunteering_experiences",
        "leadership_experiences",
        "military_experiences",
        "professional_experiences",   // last — keep richest content
      ];
      for (const bucket of trimOrder) {
        if (estimatedLines <= maxLines) break;
        const floor = bucket === "professional_experiences"
          ? PROFESSIONAL_FLOOR
          : SECONDARY_FLOOR;
        const entries = (cvData[bucket] || []) as any[];
        for (let i = entries.length - 1; i >= 0; i--) {
          if (estimatedLines <= maxLines) break;
          const entry = entries[i];
          while (Array.isArray(entry?.bullets) && entry.bullets.length > floor && estimatedLines > maxLines) {
            entry.bullets.pop();
            estimatedLines -= 1;
          }
        }
      }

      // Re-estimate for the log + response.
      estimatedLines = estimatePageLines(cvData);
      console.log(`[CV] Post-trim estimate: ${estimatedLines} lines`);
    }

    // --- Build DOCX via shared cv-templates engine ---
    // Section order per Eli's design call PR #26: peer top-level sections,
    // no umbrella. The four experience buckets (professional / military /
    // volunteering / leadership) each render only when non-empty; empty
    // ones short-circuit silently in their renderers.
    //
    // Conditional swap on proCount preserved from PR #21:
    //   2+ pro experiences → experience-first
    //   < 2 pro experiences → education-first (students lead with education)
    const proCount = Array.isArray(cvData.professional_experiences)
      ? cvData.professional_experiences.length
      : 0
    const sectionOrder: SectionKey[] = proCount >= 2
      ? ['about', 'professional_experience', 'military_service', 'volunteering', 'leadership',
         'education', 'skills', 'languages', 'honors', 'certifications', 'projects']
      : ['about', 'education', 'professional_experience', 'military_service', 'volunteering', 'leadership',
         'skills', 'languages', 'honors', 'certifications', 'projects']

    const sectorResolution = resolveSectorTheme(safeTargetRole, roleLibrary as any, profile as any)
    console.log(`[CV] sector theme: ${sectorResolution.theme.label} (${sectorResolution.source})`)

    // CV now renders as PDF via pdf-lib (build-pdf.ts). DOCX renderer
    // (build.ts) remains in the codebase as a fallback but is no longer
    // wired in — see PR / commit message for the rationale.
    const cvBytes = await buildCvPdf(cvData, userContext as any, {
      style: safeTemplateStyle,
      theme: sectorResolution.theme,
      sectionOrder,
      photo: null, // photo embedding still pending — renderer ignores when null
    })

    const safeRole = safeTargetRole.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const fileName = `${user.id}/${safeRole}_CV_${Date.now()}.pdf`;
    const PDF_MIME = "application/pdf";

    const { error: uploadError } = await serviceClient.storage
      .from("cvs")
      .upload(fileName, cvBytes, { contentType: PDF_MIME, upsert: true });

    if (uploadError) {
      _http = 500; _err = 'upload'
      return json({ error: `CV upload failed: ${uploadError.message}` }, 500);
    }

    const { data: signedUrlData, error: signedUrlError } = await serviceClient.storage
      .from("cvs")
      .createSignedUrl(fileName, 315360000);

    if (signedUrlError || !signedUrlData) {
      _http = 500; _err = 'signed_url'
      return json({ error: "Failed to generate CV download URL" }, 500);
    }
    const cv_url = signedUrlData.signedUrl;

    let appRecord;
    if (application_id) {
      const { data } = await supabase.from("applications").update({
        cv_url,
        cv_status: "ready",
        cv_version_name: `${safeTargetRole} CV`,
        cv_skills_emphasized: (cvData.skills as any)?.domain || [],
      }).eq("id", application_id).eq("user_id", user.id).select().single();
      if (!data) { _http = 404; _err = 'app_not_found'; return json({ error: "Application not found or not owned by user." }, 404); }
      appRecord = data;
    } else {
      const { data } = await supabase.from("applications").insert({
        user_id: user.id,
        role_title: safeTargetRole,
        cv_url,
        cv_status: "ready",
        cv_version_name: `${safeTargetRole} CV`,
        cv_skills_emphasized: (cvData.skills as any)?.domain || [],
        status: "interested",
      }).select().single();
      appRecord = data;
    }

    // Collect any profile fields that silently dropped out of the CV because
    // the underlying data is empty — so the user can fix their profile
    // without having to diff the PDF against what they expected.
    const missing_contact_fields: string[] = [];
    if (!phonePresent) missing_contact_fields.push("phone_number");
    if (!emailPresent) missing_contact_fields.push("email");
    if (!locationPresent) missing_contact_fields.push("location");
    if (!linkedinPresent) missing_contact_fields.push("linkedin_url");

    _ok = true; _http = 200
    return json({
      cv_url,
      application_id: appRecord?.id,
      fit_analysis: cvData.fit_analysis,
      library_match,
      message: `CV generated for "${safeTargetRole}". Download it using the link, and it's been saved to your Application Tracker.`,
      // Diagnostic metadata — lets callers see the overflow decision at a
      // glance without having to pull edge-function logs.
      page_fit: {
        max_lines: maxLines,
        initial_estimate: initialEstimatedLines,
        final_estimate: estimatedLines,
        trim_fired: trimFired,
      },
      // Story Bank diagnostics — IDs of stories that were given to the LLM
      // as evidence. Lets the admin view show "this CV was enriched with N
      // stories" without re-querying. Empty when no JD or no matches.
      stories_used,
      ...(tailoring && { tailoring }),
      ...(missing_contact_fields.length > 0 && { missing_contact_fields }),
      // Quantified-token grounding warnings. Non-blocking; the user is shown
      // a "review these bullets" note in the success card so they can spot
      // any fabricated numbers before sending. Empty when every quantified
      // token in the emitted bullets traces to source data.
      ...(unsourcedBullets.length > 0 && { unsourced_bullets: unsourcedBullets }),
      // Reconcile defensive warnings. Same additive pattern as
      // unsourced_bullets above: present only when fillFromSource detected
      // an unclaimed LLM entry (silent drop) or a positional fallback
      // (rescued via slot j rather than a valid index match). The CV
      // rendered exactly as it would have without this surface — this is
      // pure diagnostic exposure of the bake-off-observed gpt-4o cross-
      // bucket migration failure mode, so it can be flagged in admin views
      // and tracked in user reports without scraping edge-function logs.
      ...(reconcileWarnings.length > 0 && { reconcile_warnings: reconcileWarnings }),
      // JD truncation telemetry — surfaces which path fired and how many JD
      // chars actually reached the LLM. Used by ops/admin views; the frontend
      // generally won't render this.
      jd_truncation: {
        mode: jdTruncMode,
        chars_used: safeJobDescription.length,
        chars_input: jdInput.length,
      },
      retry_fired: retryFired,
    });
  } catch (error) {
    console.error("generate-tailored-cv error:", error);
    _http = 500; _err = 'unhandled'
    return json({ error: (error as Error).message }, 500);
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
});
