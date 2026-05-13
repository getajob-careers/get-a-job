import { createClient } from "npm:@supabase/supabase-js@2";
import { startMetric, finishMetric, type Metric } from '../_shared/metrics.ts'
import { openaiChatCompletion } from '../_shared/openai-chat.ts'
import { CV_VOICE_RULES } from '../_shared/voice-rules.ts'
import { buildCV } from '../_shared/cv-templates/build.ts'
import { matchRoleToLibrary, resolveSectorTheme } from '../_shared/cv-templates/sector-mapping.ts'
import type { TemplateStyle, SectionKey } from '../_shared/cv-templates/types.ts'

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
    const response = await openaiChatCompletion(
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
${jd.slice(0, 6000)}`,
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
    return {
      must_include_phrases: Array.isArray(parsed.must_include_phrases) ? parsed.must_include_phrases.slice(0, 15).map(String) : [],
      action_verbs: Array.isArray(parsed.action_verbs) ? parsed.action_verbs.slice(0, 10).map(String) : [],
      tools_and_platforms: Array.isArray(parsed.tools_and_platforms) ? parsed.tools_and_platforms.slice(0, 20).map(String) : [],
      domain_terms: Array.isArray(parsed.domain_terms) ? parsed.domain_terms.slice(0, 10).map(String) : [],
      soft_skill_keywords: Array.isArray(parsed.soft_skill_keywords) ? parsed.soft_skill_keywords.slice(0, 8).map(String) : [],
    };
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
    const { job_description, target_role, application_id, template_style } = body;
    const safeTargetRole = String(target_role ?? '').slice(0, 200);
    let safeJobDescription = String(job_description ?? '').slice(0, 5000);
    let targetCompany = ""; // populated from the linked application when available
    // Template style: 'ats-optimized' (default — safest parse) or 'polished'
    // (visually richer, still single-column for ATS). Validated against the
    // exhaustive set so a bad client can't trigger a downstream error.
    const safeTemplateStyle: TemplateStyle =
      template_style === 'polished' ? 'polished' : 'ats-optimized';

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
      supabase.from("profiles").select("*").eq("id", user.id).single(),
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
    const educationDatesPresent = !!String(profile.education_dates ?? "").trim();
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
    if (application_id) {
      const { data: app } = await supabase
        .from("applications")
        .select("company, role_title, job_description, notes")
        .eq("id", application_id)
        .eq("user_id", user.id)
        .single();
      if (app) {
        targetCompany = String(app.company ?? '').slice(0, 200);
        if (!safeJobDescription && app.job_description) {
          safeJobDescription = String(app.job_description).slice(0, 5000);
        }
        // `notes` sometimes holds the JD when the user pasted it there instead.
        if (!safeJobDescription && app.notes) {
          safeJobDescription = String(app.notes).slice(0, 5000);
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
      responsibilities: trunc(exp.responsibilities, 1200),
      skills_used: safeArray(exp.skills_used).slice(0, 20).map((s) => trunc(s, 60)),
      tools_used: safeArray(exp.tools_used).slice(0, 20).map((s) => trunc(s, 60)),
      type: trunc(exp.type, 50),
      bucket: classifyExperience(exp), // "military" | "volunteering" | "professional"
    });

    const allExperiences = safeArray(experiences).slice(0, 15).map(mapExperience);
    const professionalExperiences = allExperiences.filter((e: any) => e.bucket === "professional");
    const militaryExperiences = allExperiences.filter((e: any) => e.bucket === "military");
    const volunteeringExperiences = allExperiences.filter((e: any) => e.bucket === "volunteering");
    const leadershipExperiences = allExperiences.filter((e: any) => e.bucket === "leadership");

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
        inferredLanguages.push("Hebrew (likely fluent — candidate is based in Israel; proficiency should be inferred conservatively)");
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
      // Pre-bucketed experiences — the LLM MUST honor these groupings and
      // must preserve `title` and `company` verbatim from each entry.
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
        skills_demonstrated: safeArray(p.skills_demonstrated).slice(0, 20).map((s) => trunc(s, 60)),
      })),
      certifications: safeArray(certifications).slice(0, 10).map((c: any) => ({
        name: trunc(c.name, 100),
        issuer: trunc(c.issuer, 100),
        date_earned: trunc(c.date_earned, 20),
      })),
      education: {
        // Institution is the canonical source — passed to the LLM so it
        // can echo correctly, and overridden server-side after generation
        // (see institution-guard block below) so the LLM can never
        // confabulate a different name. PR #25 added profiles.education_institution
        // because the column was missing — without it, the LLM was
        // hallucinating an institution name on every CV gen.
        institution: trunc(profile.education_institution, 200),
        degree: trunc(profile.degree, 100),
        field_of_study: trunc(profile.field_of_study, 100),
        education_level: trunc(profile.education_level, 50),
        gpa: trunc(profile.gpa, 10),
        // Dates are stored as free text ("2023 - Present", "Sep 2021 - Jun
        // 2024", etc.) — the LLM echoes this through as-is.
        dates: trunc(profile.education_dates, 40),
        honors: safeArray(profile.honors).slice(0, 15).map((h) => trunc(h, 200)),
        relevant_coursework: safeArray(profile.relevant_coursework).slice(0, 20).map((c) => trunc(c, 100)),
      },
      // Optional pre-university / high-school entry. Users without one will
      // see this as null and the renderer will skip the entry cleanly.
      secondary_education: profile.secondary_education && typeof profile.secondary_education === "object"
        ? {
            institution: trunc((profile.secondary_education as any).institution, 200),
            location: trunc((profile.secondary_education as any).location, 200),
            dates: trunc((profile.secondary_education as any).dates, 40),
            highlights: safeArray((profile.secondary_education as any).highlights).slice(0, 6).map((h) => trunc(h, 200)),
          }
        : null,
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
    const ONE_PAGE_RULE = `ONE PAGE RULE (HIGHEST PRIORITY — OVERRIDES ALL OTHER FORMATTING RULES):
The generated CV MUST fit on exactly ONE A4 page when rendered. This is a hard constraint.

You must DYNAMICALLY manage content density based on how much data the user has. More experiences and sections = shorter bullets and tighter descriptions. Fewer experiences = you can be more detailed.

Guidelines for fitting on one page:
- Count the user's total number of experience entries, education entries, certifications, projects, and honors. This is their "content volume."
- HIGH VOLUME (6+ experience entries OR 8+ total sections with content): Use 2-3 bullets per role, keep bullets to 10-12 words each, About Me should be 2-3 sentences, honors as name + year only with no descriptions.
- MEDIUM VOLUME (3-5 experience entries, 5-7 total sections): Use 3-4 bullets per role, bullets can be 12-18 words, About Me can be 3-4 sentences, honors can have brief context.
- LOW VOLUME (1-2 experience entries, under 5 sections): Use 4-5 bullets per role, bullets can be more detailed, About Me can be longer, include more detail in education and honors.

The goal is: everything the user has done should appear on the CV, but the level of detail per item scales inversely with the total amount of content. NEVER drop entries — compress them.

If the user has many roles, prefer shorter bullets over dropping roles entirely. If the user has few roles, give each one more space.

NEVER generate content that would exceed approximately 45 lines of rendered text (including headings, spacing, and contact info). When in doubt, be more concise.
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
9. CAPITALIZATION — all degree names, specializations, field-of-study strings, and institution names must use TITLE CASE. "bachelor's degree in business administration-specialization in digital innovation" becomes "Bachelor's Degree in Business Administration - Specialization in Digital Innovation". Small connector words like "in", "of", "and", "the", "a", "at" stay lowercase unless they're the first word. Apply this silently during the typo-correction step (rule 6) — the reader should never see a sentence-case or lower-case degree.

D. What you MAY do:
9. MAY rephrase and tighten bullets for stronger action verbs, ATS keywords, and role alignment — while preserving facts.
10. MAY reorder experiences and bullets so the most role-relevant lead.
11. MAY write a tailored About Me that connects the user's real experience to the target role and (when provided) the target company by name.
`;

    const STRUCTURE_RULES = `OUTPUT STRUCTURE:
- Produce a single JSON document (see schema below). The PDF renderer reads it verbatim.
- Omit any section the user has no data for. Do NOT return empty arrays of placeholders.
- Experiences are pre-bucketed in USER DATA. You MUST honor those buckets — route each one into the correct output array:
    • bucket === "professional" → professional_experiences[]
    • bucket === "military"     → military_experiences[]
    • bucket === "volunteering" → volunteering_experiences[]
    • bucket === "leadership"   → leadership_experiences[]
- About Me: variable length based on content volume (see ONE PAGE RULE above). FACTUAL style with no pronouns and no candidate-speak. The subject of every sentence is the USER (their experience, work, skills) — NOT the target company. JD domain terms, tools, and skill names ARE allowed when they describe the user's real experience ("two years building AI-powered features at a fintech startup" is OK if true). What is NEVER allowed is the company's own MISSION / TAGLINE / MARKETING / SLOGAN language. The distinction: domain / tool / skill words = OK if grounded in real user experience; company-pitch language = always wrong. The target company name may appear AT MOST once. Length 2-4 sentences depending on volume. GOOD: "Business Administration student specializing in Digital Innovation with hands-on experience in VIP customer success, operational leadership, and cross-functional coordination. Currently supporting high-value users at a cybersecurity startup while leading educational programs." GOOD: "Two years operating AI-powered customer support tools at a B2B SaaS startup, with hands-on experience deploying Salesforce and Notion integrations." BAD: "Excited to join Acme's mission to revolutionize payroll." BAD: "Aligns with the company's vision of seamless workforce solutions."
- Experience bullets: action verb + what you did. Factual, concrete. No invented metrics. PREFER the XYZ structure when the source has measurable outcomes: "Accomplished X (impact Y) by doing Z" — e.g. "Reduced ticket resolution time by 40% by building a triage workflow in Zendesk". The metric Y MUST come verbatim from the user's source data. When source has no metric, fall back to action-verb + concrete-outcome (NEVER fabricate a number to fit the XYZ shape — the truthfulness rules above always win).
- STORY BANK PRECEDENCE: When USER DATA.stories[] contains a story whose \`experience_label\` matches one of the user's experiences AND a JD requirement, prefer the story's \`result\` + \`metrics\` + \`tools_used\` as the bullet's content over the experience's freeform \`responsibilities\` text. Stories are user-confirmed STAR records — every metric, tool, and skill there is real and verbatim. Each bullet traces to ONE source: either a single story OR a responsibility line from one experience — NEVER combine two stories into one bullet, and NEVER blend story content with imagined details. Match a story to its parent experience by \`experience_label\` ("Role at Company"); place the bullet under that experience's bucket. If a story is irrelevant to the bullet you're writing, skip it — never force-fit.

  STORY BANK BINDING (mandatory for each matched story):
    (1) METRICS VERBATIM — for each story you use, write at least one bullet under that experience that contains every entry from the story's \`metrics\` array WORD-FOR-WORD. Numbers ("12", "88%", "$1M") and units ("interviews", "first quarter") stay exactly as the story has them. The TAILORING rule about rephrasing applies to action verbs and surrounding structure — NOT to the metric figures themselves. Example: a story with metrics ["12 user research interviews", "88% adoption in first quarter"] MUST produce a bullet like "Drove 88% adoption in first quarter via 12 user research interviews with security leads" — NOT "Led product discovery to enhance enterprise adoption" (which strips both metrics).
    (2) TOOLS PRESERVED — every entry from the story's \`tools_used\` array MUST appear in the CV: ideally in the matching experience's bullet, or — if it doesn't fit naturally there — in the Skills & Tools section. Story tools are confirmed-real and must surface somewhere visible.
    (3) NO CROSS-EXPERIENCE SMEARING — story content stays attached to its \`experience_label\`. Do not sprinkle the story's adoption/metric/result language across other experiences in the CV. If you wrote a bullet referencing "88% adoption" under Experience A, do not also reference "adoption metrics" or similar paraphrases under Experience B unless Experience B has its own story or responsibilities text supporting it.
- Skills & Tools: categorize as Domain (role-specific capabilities) and Tools (software/platforms/systems). Languages do NOT go here.
- Languages: human spoken/written languages only. Draw them from the user's skills list if language-like entries are there; draw also from language_hints[] which flags likely languages based on location. Include a proficiency level (Native | Fluent | Professional | Conversational | Basic) when the source or hint supports it, otherwise omit level.
- Education: include every entry from USER DATA.education and — if present — USER DATA.secondary_education as a second education entry. Do not drop pre-university education.
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

    const systemPrompt =
      `You are a CV Generation Engine for the "Get A Job" Career Operating System. Your job is to produce a tailored, one-page, truthful CV as JSON. The CV WILL be sent to real employers — so every word must be grounded in the user's actual data.\n\n` +
      `You are generating a TAILORED CV. The CV must be specifically customized for the target job description. Generic CVs that don't incorporate JD-specific language will be rejected.\n\n` +
      ONE_PAGE_RULE + `\n` +
      TRUTHFULNESS_RULES + `\n` +
      CV_VOICE_RULES + `\n` +
      STRUCTURE_RULES + `\n` +
      TAILORING_RULES + `\n` +
      LIBRARY_CONTEXT + `\n` +
      `REMINDER: Truthfulness beats polish AND one-page fit is non-negotiable. If a bullet needs a metric to sound impressive but you have no metric in the source, leave it without. Do not invent. If content is overflowing, shorten bullets rather than dropping entries.

BEFORE FINALIZING THE JSON: count how many of the must_include_phrases appear anywhere in your output (case-insensitive substring match in any field). If fewer than 6 of 10 — or fewer than 60% of however many were provided — rewrite bullets to incorporate more, but ONLY where the user actually has the underlying experience. The factual-integrity rules above always win.`;
    // KEYWORD_INJECTION_BLOCK is appended to the END of the user prompt below
    // so it's the last instruction the LLM sees before producing output.

    const userPrompt = `TARGET ROLE: ${safeTargetRole}
${targetCompany ? `TARGET COMPANY: ${targetCompany}` : ""}

USER DATA:
${JSON.stringify(userContext, null, 2)}

${safeJobDescription ? `JOB DESCRIPTION:\n${safeJobDescription}\n` : "(No job description provided — tailor using the target role and user profile only.)"}

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
  "summary": "string — FACTUAL descriptive sentences scaled to content volume per ONE PAGE RULE (high volume → 2-3 sentences; low volume → 3-5). No pronouns (he/she/his/her). No candidate-speak (no 'strong candidate', 'eager to', 'well-suited'). Describe skills and current work as facts; let content speak for fit.",
  "professional_experiences": [
    { "title": "string — EXACT title from USER DATA", "company": "string — EXACT company from USER DATA", "dates": "string — e.g. Oct 2025 - Present", "bullets": ["concrete factual action-verb statement"] }
  ],
  "military_experiences": [
    { "title": "string — EXACT role/rank from USER DATA", "unit": "string — EXACT unit from USER DATA", "dates": "string", "bullets": ["civilian-readable bullet"] }
  ],
  "volunteering_experiences": [
    { "title": "string — EXACT title from USER DATA", "organization": "string — EXACT org from USER DATA", "dates": "string", "bullets": ["what the user did"] }
  ],
  "leadership_experiences": [
    { "title": "string — EXACT title", "organization": "string — EXACT org", "dates": "string", "bullets": ["factual statement"] }
  ],
  "education": [
    { "degree": "string — EXACT degree/field from USER DATA", "institution": "string — EXACT institution", "dates": "string", "gpa": "string — only if explicitly in USER DATA and strong", "coursework": ["short course name", "short course name"], "activities": ["leadership role / club / notable activity — one per entry, NOT awards"] }
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
    { "name": "string", "issuer": "string", "date": "string" }
  ],
  "projects": [
    { "name": "string", "bullets": ["what was built and the result, factual only"] }
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
- Every experience title and company/unit/organization must be COPIED VERBATIM from USER DATA. Do not shorten, generalize, or paraphrase them. If the source title is "Supervised and trained teams of soldiers", that is the title you output.
- Every bullet must trace to something in the user's responsibilities text. Rephrase, don't invent.
- If a responsibility line mentions an award (e.g. "Awarded Presidential Award for Excellence"), keep the mention AND add the award to honors_and_awards[] as an object {name, description?}.
- If USER DATA.secondary_education is non-null, add it as a SECOND entry in education[] (institution, dates from secondary_education.dates, details[] containing the highlights strings). Do not drop it because it's pre-university.
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

    // Diagnostic: confirm the JD is actually reaching the LLM and the
    // keyword extraction pulled something useful out. Shows up in
    // Supabase edge-function logs under this function.
    console.log("[CV] JD present:", !!safeJobDescription, "JD length:", safeJobDescription?.length || 0);
    console.log("[CV] Keywords extracted:", JSON.stringify(jdKeywords?.must_include_phrases?.slice(0, 5) || []));
    console.log("[CV] Injection block length:", KEYWORD_INJECTION_BLOCK.length);

    const openaiRes = await openaiChatCompletion(
      {
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2, // lower = less likely to invent metrics
        max_tokens: 4096,
      },
      openaiKey,
      {
        // Pass-2 trace — shares sessionId with pass-1 so both passes group
        // as one CV generation in the Langfuse UI.
        traceName: 'generate-tailored-cv:pass-2-cv',
        userId: user.id,
        sessionId: cvSessionId,
        metadata: {
          template_style: safeTemplateStyle,
          has_jd: !!safeJobDescription,
          has_target_role: !!safeTargetRole,
          has_application_link: !!application_id,
        },
      },
      { signal: AbortSignal.timeout(45000) },
    );

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      _http = 500; _err = `openai_${openaiRes.status}`
      m.modelUsed = MODEL
      return json({ error: `OpenAI error: ${err}` }, 500);
    }

    const openaiData = await openaiRes.json();
    m.modelUsed = MODEL
    m.tokensIn = (m.tokensIn ?? 0) + (openaiData.usage?.prompt_tokens ?? 0)
    m.tokensOut = (m.tokensOut ?? 0) + (openaiData.usage?.completion_tokens ?? 0)
    let cvData: Record<string, any>;
    try {
      cvData = JSON.parse(openaiData.choices?.[0]?.message?.content || "{}");
    } catch {
      _http = 500; _err = 'json_parse'
      return json({ error: "AI returned an invalid response format. Please try again." }, 500);
    }

    // ─── Post-process: reconcile titles + companies against source data ───
    // The LLM sometimes shortens titles ("Supervised and trained teams of
    // soldiers" → "Soldier") or reformats company names. We match each output
    // entry back to its source experience by dates (cheapest stable key) and
    // force the DB's title/company/unit/organization onto the output. This
    // guarantees the "EXACT titles" rule even when the LLM paraphrases.
    const normDates = (s: unknown) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
    const matchSource = (outDates: string, sources: any[]) => {
      const key = normDates(outDates);
      if (!key) return null;
      // Exact-or-contains match on dates. Good enough given there are only a
      // handful of experiences per user; dates are distinctive.
      return sources.find((s) => {
        const srcKey = normDates(`${s.start_date} ${s.end_date || s.is_current ? "present" : ""}`) ||
                        normDates(`${s.start_date} - ${s.end_date}`);
        return srcKey === key || srcKey.includes(key) || key.includes(srcKey);
      }) || sources.find((s) => normDates(s.start_date) && key.includes(normDates(s.start_date)));
    };

    // Guard against DB titles that are actually responsibility sentences
    // (e.g. "Supervised and trained teams of soldiers" from a bad CV
    // extraction). Real titles are short and typically noun phrases. If a
    // source title looks like a sentence, substitute a bucket-appropriate
    // generic so we don't dump a responsibility line in the bold title slot.
    const VERB_PREFIX = /^(supervised|managed|led|coordinated|trained|oversaw|directed|assisted|designed|developed|delivered|built|owned|launched|executed|drove|ran|created|served|implemented|handled|facilitated|performed|worked)\b/i;
    const BUCKET_FALLBACK: Record<string, string> = {
      professional: "Team Member",
      military: "Service Member",
      volunteering: "Volunteer",
      leadership: "Member",
    };
    const sanitizeTitle = (rawTitle: string, bucket: string): string => {
      const t = String(rawTitle || "").trim();
      if (!t) return BUCKET_FALLBACK[bucket] || "Member";
      const looksLikeSentence = t.length > 60 || VERB_PREFIX.test(t);
      if (looksLikeSentence) return BUCKET_FALLBACK[bucket] || "Member";
      return t;
    };

    const reconcile = (outList: any[], sources: any[], titleField: string, orgField: string, bucket: string) => {
      if (!Array.isArray(outList)) return;
      for (const entry of outList) {
        const src = matchSource(entry.dates, sources);
        if (!src) continue;
        // Preserve source title, but sanitize if it's a sentence fragment.
        if (src.title) entry[titleField] = sanitizeTitle(src.title, bucket);
        // Preserve source company / unit / organization.
        if (src.company) entry[orgField] = src.company;
      }
    };

    reconcile(cvData.professional_experiences, professionalExperiences, "title", "company", "professional");
    reconcile(cvData.military_experiences, militaryExperiences, "title", "unit", "military");
    reconcile(cvData.volunteering_experiences, volunteeringExperiences, "title", "organization", "volunteering");
    reconcile(cvData.leadership_experiences, leadershipExperiences, "title", "organization", "leadership");

    // ─── Normalize all date strings to "Mon YYYY" ───
    // The LLM was emitting mixed formats inside the same CV ("October 2025"
    // vs "Aug 2025") because the prompt doesn't enforce one shape. Normalize
    // server-side so every date renders as "Oct 2025" or "Oct 2025 – Present".
    // Idempotent: a string already in target shape passes through unchanged.
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
    normaliseDatesIn(cvData.professional_experiences);
    normaliseDatesIn(cvData.military_experiences);
    normaliseDatesIn(cvData.volunteering_experiences);
    normaliseDatesIn(cvData.leadership_experiences);
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
    const canonicalInstitution = String(profile.education_institution || "").trim();
    const secondaryInstitutionLower = String(
      (profile.secondary_education as any)?.institution || ""
    ).trim().toLowerCase();
    if (Array.isArray(cvData.education)) {
      let primaryDone = false;
      for (const edu of cvData.education) {
        const eduInstLower = String(edu.institution || "").trim().toLowerCase();
        const isSecondary = secondaryInstitutionLower && eduInstLower === secondaryInstitutionLower;
        if (isSecondary) continue; // secondary_education entry — leave it alone
        if (primaryDone) continue; // we only override the first non-secondary entry
        if (canonicalInstitution) {
          if (edu.institution !== canonicalInstitution) {
            console.log(`[CV] education institution overridden: "${edu.institution}" → "${canonicalInstitution}"`);
            edu.institution = canonicalInstitution;
          }
        } else {
          // No source data — strip whatever the LLM produced. Renderer
          // handles empty institution gracefully (degree-only entry).
          if (edu.institution) {
            console.log(`[CV] education institution stripped (no profile source): was "${edu.institution}"`);
            edu.institution = "";
          }
        }
        primaryDone = true;
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
          if (edu.institution) edu.institution = toTitleCase(String(edu.institution));
        }
      }
    }

    // Subtitle derivation removed per Eli's design call (PR #24, 2026-05-06).
    // The 1-line "current identity" subtitle was anchoring recruiters on the
    // user's CURRENT role when applying for a different target. The About Me
    // block does the positioning work; subtitle was duplicative noise. The
    // header.subtitle data field is left intact in cvData (build.ts ignores
    // it now); LLM schema no longer requests it; line estimator no longer
    // counts it.

    // ─── Step 2 of tailoring: validate how many JD phrases made it through ───
    // The score is the fraction of must_include_phrases that literally appear
    // somewhere in the generated CV text (case-insensitive). If it's below
    // 40%, we log a warning to edge-function telemetry so we can track which
    // JDs are hard to tailor. The score is also returned to the frontend so
    // the UI can show a "Keyword match: X%" indicator next to the fit card.
    let tailoring = null as null | {
      tailoring_score: number;
      matched_phrases: string[];
      missed_phrases: string[];
    };
    if (jdKeywords && jdKeywords.must_include_phrases.length > 0) {
      const cvTextLower = JSON.stringify(cvData).toLowerCase();
      const matched: string[] = [];
      const missed: string[] = [];
      for (const phrase of jdKeywords.must_include_phrases) {
        if (cvTextLower.includes(phrase.toLowerCase())) matched.push(phrase);
        else missed.push(phrase);
      }
      const pct = matched.length / jdKeywords.must_include_phrases.length;
      if (pct < 0.4) {
        console.warn(`[CV] Low tailoring score: ${Math.round(pct * 100)}% — matched: ${matched.join(" · ") || "(none)"}`);
      } else {
        console.log(`[CV] Tailoring score: ${Math.round(pct * 100)}% (${matched.length}/${jdKeywords.must_include_phrases.length})`);
      }
      tailoring = {
        tailoring_score: Math.round(pct * 100),
        matched_phrases: matched,
        missed_phrases: missed,
      };
    }

    // Sanity-floor the fit percentage. The LLM very occasionally returns 0
    // for a candidate who does have overlap — we floor at a low but non-zero
    // value and recompute alignment bucket from the number. This never
    // inflates a genuine poor fit above "Weak", it just stops misleading 0s.
    const fa = (cvData.fit_analysis || {}) as any;
    let pct = Number(fa.skill_match_percentage);
    if (!Number.isFinite(pct) || pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    // Only floor if we have any experience/skills/projects at all — keep a
    // genuinely empty profile at 0.
    const hasAnyData = (allExperiences.length + (userContext.skills?.length || 0) + (userContext.projects?.length || 0)) > 0;
    if (pct === 0 && hasAnyData) pct = 20;
    fa.skill_match_percentage = Math.round(pct);
    if (!fa.alignment || typeof fa.alignment !== "string") {
      fa.alignment = pct >= 70 ? "Strong" : pct >= 40 ? "Moderate" : "Weak";
    }
    cvData.fit_analysis = fa;

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

      // About Me
      const aboutWords = String(cv.summary || cv.about_me || "").split(/\s+/).filter(Boolean).length;
      if (aboutWords > 0) {
        lines += Math.ceil(aboutWords / 12) + 1; // ~12 words per line + heading
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
              // At 9-9.5pt body type with ~170mm content width, a line holds
              // about 14 words. Count an extra line for each bullet that
              // clearly wraps, and a second extra line for very long bullets.
              const w = String(b).split(/\s+/).filter(Boolean).length;
              lines += 1 + (w > 14 ? 1 : 0) + (w > 28 ? 1 : 0);
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
          const cw = Array.isArray(e?.coursework) ? e.coursework : [];
          if (cw.length > 0) lines += 1; // relevant coursework line
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

    // Tightened from 48 → 42 lines on the page-fit budget. Margins moved
    // from 500-twip (~0.35") to 1008-twip (0.7") to give the new template
    // research-backed breathing room — that costs about 6 lines of vertical
    // budget, which we eat by trimming bullets harder. Pilot users are
    // students with sub-2-year experience; three strong bullets per role
    // beats four generic ones (PR A research call).
    const maxLines = 42;

    const initialEstimatedLines = estimatePageLines(cvData);
    let estimatedLines = initialEstimatedLines;
    let trimFired = false;
    if (estimatedLines > maxLines) {
      trimFired = true;
      console.warn(`[CV] Estimated ${estimatedLines} lines (max ${maxLines}) — trimming`);

      // 1. Shorten bullets in the least-prominent buckets first. Keep at
      //    least 2 bullets per role so the experience stays legible.
      const trimOrder = ["volunteering_experiences", "leadership_experiences", "professional_experiences", "military_experiences"];
      for (const bucket of trimOrder) {
        if (estimatedLines <= maxLines) break;
        const entries = (cvData[bucket] || []) as any[];
        for (const entry of entries) {
          if (estimatedLines <= maxLines) break;
          while (Array.isArray(entry.bullets) && entry.bullets.length > 2 && estimatedLines > maxLines) {
            entry.bullets.pop();
            estimatedLines -= 1;
          }
        }
      }

      // 2. If still over, strip honor descriptions ("Name — description" → "Name").
      if (estimatedLines > maxLines && Array.isArray(cvData.honors_and_awards)) {
        cvData.honors_and_awards = cvData.honors_and_awards.map((h: any) => {
          if (!h) return h;
          if (typeof h === "string") {
            const dash = h.indexOf(" \u2014 ");
            return dash > 0 ? h.slice(0, dash) : h;
          }
          if (typeof h === "object") {
            return { name: h.name };
          }
          return h;
        });
      }

      // 3. Re-estimate for the log + response.
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

    const docBytes = await buildCV(cvData, userContext as any, {
      style: safeTemplateStyle,
      theme: sectorResolution.theme,
      sectionOrder,
      photo: null, // PR B wires this up
    })

    const safeRole = safeTargetRole.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const fileName = `${user.id}/${safeRole}_CV_${Date.now()}.docx`;
    const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const { error: uploadError } = await serviceClient.storage
      .from("cvs")
      .upload(fileName, docBytes, { contentType: DOCX_MIME, upsert: true });

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
    });
  } catch (error) {
    console.error("generate-tailored-cv error:", error);
    _http = 500; _err = 'unhandled'
    return json({ error: (error as Error).message }, 500);
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
});
