import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletionWithRetry } from '../_shared/openai-chat.ts'

// --- Load JSON Libraries ---
import { roleLibrary } from "../_shared/libraries/00_role_library.ts";
import { roleSkillMapping } from "../_shared/libraries/04_role_skill_mapping.ts";
import { taskGenerationLogic } from "../_shared/libraries/011_task_generation_logic.ts";
import { courseRecommendationLogic } from "../_shared/libraries/012_course_recommendation_logic.ts";
import { jobSearchStageLogic } from "../_shared/libraries/013_job_search_stage_logic.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const MODEL = 'gpt-4o-mini'
const RATE_LIMIT_CALLS = 10
const RATE_LIMIT_WINDOW = 3600 // 1 hour

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const m = startMetric('generate-tasks')
  let _ok = false
  let _http = 500
  let _err: string | null = null

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      _http = 500; _err = 'no_openai_key'
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      _http = 401; _err = 'auth'
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      _http = 401; _err = 'auth'
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    m.userId = user.id

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: allowed } = await serviceClient.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_function_name: 'generate-tasks',
      p_max_calls: RATE_LIMIT_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW,
    })
    if (!allowed) {
      // Best-effort error logging — failure to log must not mask the 429.
      // PostgrestBuilder is then-able but does NOT expose .catch.
      try {
        await serviceClient.rpc('log_error', {
          p_user_id: user.id,
          p_function_name: 'generate-tasks',
          p_error_message: 'Rate limit exceeded',
          p_error_details: null,
        })
      } catch { /* swallow — logging is non-essential here */ }
      _http = 429; _err = 'rate_limit'
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in an hour.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rawBody = await req.text();
    if (rawBody.length > 10_000) {
      _http = 413; _err = 'payload_too_large'
      return new Response(JSON.stringify({ error: 'Request payload too large.' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { context } = JSON.parse(rawBody);
    if (context !== undefined && typeof context !== 'string') {
      _http = 400; _err = 'bad_input'
      return new Response(JSON.stringify({ error: 'Invalid context field.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const VALID_CONTEXTS = ['weekly action plan', 'onboarding initial tasks'];
    const safeContext = (typeof context === 'string' && VALID_CONTEXTS.includes(context)) ? context : null;

    // --- Fetch full profile data ---
    const { data: profiles } = await supabase.from('profiles').select('*').eq('id', user.id)
    const { data: careerRoles } = await supabase.from('career_roles').select('*').eq('user_id', user.id)
    const { data: applications } = await supabase.from('applications').select('*').eq('user_id', user.id)
    const { data: experiences } = await supabase.from('experiences').select('*').eq('user_id', user.id)
    const { data: projects } = await supabase.from('projects').select('*').eq('user_id', user.id)
    const { data: certifications } = await supabase.from('certifications').select('*').eq('user_id', user.id)

    const profile = profiles?.[0]

    const trunc = (s: unknown, max: number) => String(s ?? '').slice(0, max);

    // --- Determine job search stage from tracker data ---
    const totalApplications = (applications || []).length
    const activeApplications = (applications || []).filter(a => a.status !== 'rejected')
    const interviewingApplications = (applications || []).filter(a => a.status === 'interviewing')
    const lateStageApplications = (applications || []).filter(a => a.interview_stage === 'final_round')
    const noResponseApplications = (applications || []).filter(a => a.status === 'applied')

    let jobSearchStage = 'not_started'
    if (lateStageApplications.length > 0) jobSearchStage = 'late_stage_no_offer'
    else if (interviewingApplications.length > 0) jobSearchStage = 'active_interviewing'
    else if (noResponseApplications.length >= 3) jobSearchStage = 'applying_no_response'
    else if (totalApplications > 0) jobSearchStage = 'early_search'
    else if (profile?.employment_status?.includes('employed')) jobSearchStage = 'transitioning_while_employed'

    // --- Build sanitised user data ---
    const sanitisedProfile = {
      full_name: trunc(profile?.full_name, 100),
      skills: (profile?.skills || []).slice(0, 50).map((s: unknown) => trunc(s, 60)),
      five_year_role: trunc(profile?.five_year_role, 100),
      target_job_titles: (profile?.target_job_titles || []).slice(0, 10).map((t: unknown) => trunc(t, 100)),
      employment_status: (profile?.employment_status || []).join(', ').slice(0, 100),
      biggest_challenge: trunc(profile?.biggest_challenge, 300),
      role_clarity_score: profile?.role_clarity_score ?? null,
      cv_tailoring_strategy: trunc(profile?.cv_tailoring_strategy, 100),
      linkedin_outreach_strategy: trunc(profile?.linkedin_outreach_strategy, 100),
      skill_gaps: (profile?.skill_gaps || []).slice(0, 20).map((s: unknown) => trunc(s, 100)),
      location: trunc(profile?.location, 100),
    }

    // P1.3 read switch — unified `skills` column.
    const sanitisedExperiences = (experiences || []).slice(0, 10).map((e: any) => ({
      title: trunc(e.title, 100),
      company: trunc(e.company, 100),
      responsibilities: trunc(e.responsibilities, 300),
      skills: (e.skills || []).slice(0, 30).map((s: unknown) => trunc(s, 60)),
      type: trunc(e.type, 50),
    }))

    const sanitisedProjects = (projects || []).slice(0, 10).map((p: any) => ({
      name: trunc(p.name, 100),
      description: trunc(p.description, 200),
      skills: (p.skills || []).slice(0, 10).map((s: unknown) => trunc(s, 60)),
    }))

    const sanitisedCerts = (certifications || []).slice(0, 10).map((c: any) => ({
      name: trunc(c.name, 100),
      issuer: trunc(c.issuer, 100),
    }))

    const sanitisedRoles = (careerRoles || []).slice(0, 6).map((r: any) => ({
      title: trunc(r.title, 100),
      track: trunc(r.track, 20),
      readiness_score: r.readiness_score ?? null,
      missing_skills: (r.missing_skills || []).slice(0, 10).map((s: unknown) => trunc(s, 60)),
    }))

    const sanitisedApplications = activeApplications.slice(0, 10).map((a: any) => ({
      role_title: trunc(a.role_title, 100),
      company: trunc(a.company, 100),
      status: trunc(a.status, 50),
      interview_stage: trunc(a.interview_stage, 50),
    }))

    // N-K5 fix — filter the role library + skill mapping down to ONLY the
    // user's existing career_roles. Tasks are generated for the user's
    // already-known roadmap (sanitisedRoles), not for role discovery, so the
    // LLM doesn't need the full ~170-role / ~400KB library context. The
    // pattern mirrors generate-job-suggestions's matchedRoles.slice(0, 10).
    //
    // Matching: case-insensitive title match against standardized_title or
    // alternate_titles. If filter is empty (user's roles aren't in the
    // taxonomy), fall back to empty arrays — the LLM still has the user's
    // sanitisedRoles in the user prompt with their missing_skills explicitly
    // listed, so it can generate tasks without the broader library.
    const userRoleTitles = new Set(
      (sanitisedRoles || [])
        .map((r: { title: string }) => String(r.title || '').toLowerCase().trim())
        .filter(Boolean)
    )
    const matchesUserRoles = (role: any): boolean => {
      const candidates = [role?.standardized_title, role?.title, ...(role?.alternate_titles || [])]
        .filter(Boolean)
        .map((s: string) => String(s).toLowerCase().trim())
      return candidates.some((c: string) => userRoleTitles.has(c))
    }
    const filteredRoles = ((roleLibrary as any).roles as any[]).filter(matchesUserRoles)
    const filteredRoleIds = new Set(filteredRoles.map((r: any) => r.id || r.role_id))
    const filteredMappings = ((roleSkillMapping as any).role_skill_mapping as any[])
      .filter((m: any) => filteredRoleIds.has(m.role_id))

    const today = new Date().toISOString().slice(0, 10);

    // --- Build System Prompt with Library Context ---
    const systemPrompt = `You are a Task Generation Engine for the "Get A Job" Career Operating System.

You have access to the following logic libraries. Use them as your source of truth when generating tasks — do not invent task types, categories, or priorities outside of what these libraries define.

TASK GENERATION LOGIC (use these rules to generate stage-aware, personalized tasks):
${JSON.stringify(taskGenerationLogic, null, 2)}

COURSE RECOMMENDATION LOGIC (use this when deciding whether to recommend a course or project task):
${JSON.stringify(courseRecommendationLogic, null, 2)}

JOB SEARCH STAGE LOGIC (use this to understand what stage the user is in and what tasks are most relevant):
${JSON.stringify(jobSearchStageLogic, null, 2)}

ROLE LIBRARY (filtered to the user's existing career_roles — ${filteredRoles.length} entries, scoped for relevance):
${JSON.stringify(filteredRoles, null, 2)}

ROLE-SKILL MAPPING (filtered to the same role set — ${filteredMappings.length} entries):
${JSON.stringify(filteredMappings, null, 2)}

TASK GENERATION RULES:
- Always determine the user's job_search_stage first ΓÇö it drives which tasks are most relevant
- Tasks must be real and immediately actionable ΓÇö not vague or generic
- Tasks must be personalized to this specific user's profile, gaps, and behavior
- Mix quick wins with high-impact actions ΓÇö never all easy or all hard
- Maximum 5-8 tasks total ΓÇö do not overwhelm
- If the user shows overwhelm signals (low clarity score, low activity), limit to 3 top-priority tasks
- Only recommend course tasks for structured skill gaps (technical, tools, frameworks) ΓÇö not behavioral gaps
- Always end with at least one networking or application task unless the user is in interview stage
- Use the task structure format exactly: task_title, task_description, suggested_specific_action, reason, category, priority, due_date

DUE DATE GUIDANCE (today is ${today}):
- high priority: pick a date 1-5 days from today
- medium priority: pick a date 5-14 days from today
- low priority: pick a date 14-30 days from today
- Format: ISO date string YYYY-MM-DD (e.g. "${today}")
- Do not invent past dates, do not skip the field — every task must have a due_date.

TASK CATEGORIES (use EXACTLY one of these — any other value is invalid):
- application — applying to roles, finding opportunities, interview prep (prep for an upcoming interview belongs here)
- cv — CV improvement, tailoring, LinkedIn updates, positioning and clarity work
- skill — learning a specific skill, taking a course
- project — building something to demonstrate a skill
- networking — outreach, referrals, relationship building

PRIORITY LEVELS (use EXACTLY one of these — any other value is invalid):
- high — blocking job search, time-sensitive, critical next step
- medium — important but not blocking, momentum-building
- low — skill building, strategic positioning, nice-to-have

DO NOT invent new categories or priorities. The database rejects any value outside the lists above.`

    const userPrompt = `USER PROFILE:
- Name: ${sanitisedProfile.full_name || 'Not provided'}
- Employment Status: ${sanitisedProfile.employment_status || 'Not provided'}
- Location: ${sanitisedProfile.location || 'Not provided'}
- 5-Year Goal: ${sanitisedProfile.five_year_role || 'Not provided'}
- Target Job Titles: ${JSON.stringify(sanitisedProfile.target_job_titles)}
- Skills: ${JSON.stringify(sanitisedProfile.skills)}
- Skill Gaps: ${JSON.stringify(sanitisedProfile.skill_gaps)}
- Biggest Challenge: ${sanitisedProfile.biggest_challenge || 'Not provided'}
- Role Clarity Score: ${sanitisedProfile.role_clarity_score ?? 'Not provided'} (1=no idea, 5=very clear)
- CV Tailoring Strategy: ${sanitisedProfile.cv_tailoring_strategy || 'Not provided'}
- LinkedIn Outreach Behavior: ${sanitisedProfile.linkedin_outreach_strategy || 'Not provided'}

CAREER ROLES (tiered role recommendations):
${JSON.stringify(sanitisedRoles)}

EXPERIENCES:
${JSON.stringify(sanitisedExperiences)}

PROJECTS:
${JSON.stringify(sanitisedProjects)}

CERTIFICATIONS:
${JSON.stringify(sanitisedCerts)}

JOB SEARCH ACTIVITY:
- Total Applications: ${totalApplications}
- Active Applications: ${activeApplications.length}
- Currently Interviewing: ${interviewingApplications.length}
- Late Stage (Final Round): ${lateStageApplications.length}
- Applied with No Response: ${noResponseApplications.length}
- Detected Job Search Stage: ${jobSearchStage}
- Active Applications Detail: ${JSON.stringify(sanitisedApplications)}

CONTEXT: ${safeContext || 'weekly action plan'}

TASK:
Using the task generation logic and job search stage logic from your system prompt, generate a personalized set of tasks for this user.

Steps:
1. Confirm the user's job_search_stage based on their tracker activity
2. Identify the biggest blocking factor right now
3. Identify the most urgent skill gaps relative to their Track 1 target roles
4. Generate tasks that directly address the stage + gaps + behavior
5. Assign priorities based on what is most blocking right now
6. Apply overwhelm handling if clarity score is low or activity is low

Return a JSON object:
{
  "detected_stage": "string (the job search stage you detected)",
  "tasks": [
    {
      "title": "string (short, actionable task title)",
      "description": "string (what to do ΓÇö 1-2 sentences)",
      "suggested_specific_action": "string (concrete example of how to do it)",
      "reason": "string (why this matters right now for this specific user)",
      "category": "application|cv|skill|project|networking",
      "priority": "high|medium|low",
      "role_title": "string (target role this relates to, if any ΓÇö use exact title from role library)",
      "due_date": "string (ISO date YYYY-MM-DD, required for every task)"
    }
  ]
}

Return ONLY valid JSON. Generate 5-8 tasks unless overwhelm signals are present, in which case limit to 3.`

    // 5-8 tasks with title + description + suggested_specific_action + reason
    // can run long. 2048 is usually enough but rich profiles push the boundary;
    // when it does truncate, JSON.parse silently fails and we used to return
    // 500 with no recovery path. Retry doubles the budget, fail explicitly if
    // still truncated.
    const BASE_MAX_TOKENS = 2048
    const RETRY_MAX_TOKENS = 4096

    async function callOpenAI(maxTokens: number) {
      return await openaiChatCompletionWithRetry(
        {
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.4,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        },
        openaiKey,
        {
          traceName: 'generate-tasks',
          userId: user.id,
          metadata: {
            has_context: !!context,
            max_tokens: maxTokens,
          },
        },
        { signal: AbortSignal.timeout(45000) },
      )
    }

    let openaiResponse = await callOpenAI(BASE_MAX_TOKENS)
    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text()
      // D2 — keep upstream detail server-side only (log_error RPC + console.error
      // backup); client gets generic message.
      await serviceClient.rpc('log_error', {
        p_user_id: user.id,
        p_function_name: 'generate-tasks',
        p_error_message: 'OpenAI API error',
        p_error_details: { status: openaiResponse.status, details: errText },
      })
      console.error(`[generate-tasks] OpenAI ${openaiResponse.status}: ${errText}`)
      _http = 502; _err = `openai_${openaiResponse.status}`
      m.modelUsed = MODEL
      return new Response(JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let completion = await openaiResponse.json()
    let finishReason: string | undefined = completion.choices?.[0]?.finish_reason
    let content: string = completion.choices?.[0]?.message?.content || '{"tasks":[]}'

    if (finishReason === 'length') {
      console.warn(`[generate-tasks] truncation detected at max_tokens=${BASE_MAX_TOKENS}, retrying at ${RETRY_MAX_TOKENS}`)
      openaiResponse = await callOpenAI(RETRY_MAX_TOKENS)
      if (!openaiResponse.ok) {
        const errText = await openaiResponse.text()
        console.error(`[generate-tasks] retry failed: OpenAI ${openaiResponse.status}: ${errText}`)
        _http = 502; _err = `openai_retry_${openaiResponse.status}`
        m.modelUsed = MODEL
        // Capture tokens from initial call (the only completed one).
        m.tokensIn = completion.usage?.prompt_tokens ?? null
        m.tokensOut = completion.usage?.completion_tokens ?? null
        return new Response(JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      completion = await openaiResponse.json()
      finishReason = completion.choices?.[0]?.finish_reason
      content = completion.choices?.[0]?.message?.content || '{"tasks":[]}'
      if (finishReason === 'length') {
        console.error(`[generate-tasks] still truncated at max_tokens=${RETRY_MAX_TOKENS}; profile data likely too large`)
        _http = 502; _err = 'truncated_after_retry'
        m.modelUsed = MODEL
        m.tokensIn = completion.usage?.prompt_tokens ?? null
        m.tokensOut = completion.usage?.completion_tokens ?? null
        return new Response(JSON.stringify({ error: 'AI response too long. Please try again.' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Capture LLM usage from the LAST successful call (initial OR retry).
    m.modelUsed = MODEL
    m.tokensIn = completion.usage?.prompt_tokens ?? null
    m.tokensOut = completion.usage?.completion_tokens ?? null

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(content);
    } catch (parseErr) {
      console.error(`[generate-tasks] JSON parse failed (finish_reason=${finishReason}):`, content.slice(0, 200), parseErr);
      _http = 500; _err = 'json_parse'
      return new Response(JSON.stringify({ error: 'AI returned an invalid response format. Please try again.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize priority and category to the DB's chk constraints, regardless of what the LLM returned.
    // chk_tasks_priority: low|medium|high · chk_tasks_category: application|project|networking|skill|cv
    const PRIORITY_MAP: Record<string, string> = {
      urgent_now: "high", this_week: "medium", longer_term: "low",
      high: "high", medium: "medium", low: "low",
    };
    const CATEGORY_MAP: Record<string, string> = {
      application: "application", cv: "cv", skill: "skill", project: "project", networking: "networking",
      interview_prep: "application", clarity_positioning: "cv",
    };
    if (Array.isArray(result.tasks)) {
      result.tasks = (result.tasks as any[]).map((t) => ({
        ...t,
        priority: PRIORITY_MAP[String(t?.priority)] || "medium",
        category: CATEGORY_MAP[String(t?.category)] || "application",
      }));
    }

    _ok = true; _http = 200
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    try {
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      await serviceClient.rpc('log_error', {
        p_user_id: null,
        p_function_name: 'generate-tasks',
        p_error_message: error.message,
        p_error_details: null,
      })
    } catch { /* best-effort logging */ }
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})
