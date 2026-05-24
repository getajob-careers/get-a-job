import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletion } from '../_shared/openai-chat.ts'

// Source-controlled in commit fixing H1-H4. The deployed function previously
// existed only in the dashboard — this file imports it back into the repo
// alongside two behavioural fixes:
//
// 1. (H2) prompt now requests matched_requirements/missing_requirements as
//    arrays of {requirement, reason} / {requirement, gap} objects so the
//    JobMatchChecker.jsx renderer (which dereferences .requirement and
//    .reason / .gap on each item) actually displays content instead of
//    blanks with literal " — " separators.
//
// 2. (H3) URL-only mode (no pasted job_description) now returns an explicit
//    400 instead of letting the LLM hallucinate a fake job posting. Edge
//    runtimes can't fetch most job-board pages (auth walls, JS rendering,
//    bot protection) and the previous "inform the user you need text" prompt
//    instruction was unreliable — gpt-4o-mini frequently fabricated rather
//    than refused.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODEL = 'gpt-4o-mini'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    // CORS preflight is overhead; skip metric instrumentation
    return new Response('ok', { headers: corsHeaders })
  }

  // Per-call metric. Mutated as the handler progresses (userId, modelUsed,
  // tokens) and finalised in the finally block. Fire-and-forget — observability
  // never blocks the user response.
  const m = startMetric('analyze-job-match')
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

    const authHeader = req.headers.get('Authorization')!
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

    const { job_description, job_url, mode } = await req.json()

    if (!job_description && !job_url) {
      _http = 400; _err = 'missing_input'
      return new Response(JSON.stringify({ error: 'job_description or job_url is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // H3: refuse URL-only requests rather than fabricating analysis.
    if (mode === 'url' && !job_description) {
      _http = 400; _err = 'url_only_mode'
      return new Response(JSON.stringify({
        error: "Can't fetch job posting URLs (most boards require login). Please paste the job description text instead.",
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profiles } = await supabase.from('profiles').select('*').eq('id', user.id)
    const { data: experiences } = await supabase.from('experiences').select('*').eq('user_id', user.id)
    const profile = profiles?.[0]

    const userSkills = (profile?.skills || []).join(', ')
    const expSummary = (experiences || []).map((e: any) => `${e.title} at ${e.company}`).join(', ')
    const fiveYearRole = profile?.five_year_role || ''
    const primaryDomain = profile?.primary_domain || ''
    const qualLevel = profile?.qualification_level || ''
    const hasGoal = !!fiveYearRole.trim()

    // Stage maps a profile's qualification_level + employment_status to the
    // three career stages used by trackFromScores' seniority ceiling. Mirrors
    // inferExperienceLevel in generate-career-analysis (any explicit "student"
    // status forces early_career) but keys on qualification_level when no
    // experiences are passed (the LLM-based scoring path doesn't load them).
    function deriveUserStage(p: any): "early" | "mid" | "senior" {
      const employment = Array.isArray(p?.employment_status) ? p.employment_status : []
      if (employment.includes("student")) return "early"
      const lvl = String(p?.qualification_level || "").toLowerCase()
      if (/senior|lead|director|principal|head|staff/.test(lvl)) return "senior"
      if (/junior|entry|graduate|associate/.test(lvl)) return "early"
      if (/mid/.test(lvl)) return "mid"
      return "early"  // default: be conservative — don't false-promote unknown profiles to track_1
    }
    const userStage = deriveUserStage(profile)
    const yearsExp = (experiences || []).length  // proxy used in the LLM context line

    // When the user has a 5-year goal, ask the LLM for a goal_alignment_score
    // alongside match_score so the tracker can derive tier from BOTH signals
    // (mirrors assignTrackWithGoal in generate-career-analysis). Without this,
    // a high-fit-but-off-path role like an SDR scored 0.75 for a Product
    // Manager target and was wrongly assigned track_1.
    const goalBlock = hasGoal
      ? `\nUSER CAREER TARGET:
- 5-year goal: ${fiveYearRole}
- Current domain: ${primaryDomain || 'unspecified'}
- Current level: ${qualLevel || 'unspecified'} (career stage: ${userStage}, ~${yearsExp} role(s) of experience on profile)\n`
      : `\nUSER CAREER STAGE: ${userStage} (level: ${qualLevel || 'unspecified'}, ~${yearsExp} role(s) on profile)\n`

    const goalSchemaLine = hasGoal
      ? `\n  "goal_alignment_score": number (0-100, how well pursuing this role progresses the user toward their 5-year goal — see rubric below),`
      : ''

    const seniorityRubric = `\n\nREQUIRED SENIORITY RUBRIC: Read the JD for explicit experience requirements ("X+ years"), seniority words in the title, scope of responsibility. Pick ONE bucket — if unclear, pick the LOWER one (we'd rather miss a stretch role than miscall a Senior role as Mid).
- "Entry": 0-1 years, "new grad", "Associate", entry-level, internship-to-FT.
- "Entry_Mid": 1-3 years, "Junior X", "X I", typical second job.
- "Mid": 3-5 years, "X II", "Mid-level", explicit "3+ years" or "4+ years".
- "Senior": 5-8 years, "Senior X", "Sr. X", explicit "5+ years" or "6+ years".
- "Lead": 8+ years, "Lead X", "Principal", "Staff", "Manager", "Head of".

A JD that says "4+ years" → Mid. "5+ years" → Senior. "Senior Product Analyst" → Senior even if no years mentioned.`

    const goalRubric = hasGoal
      ? `\n\nGOAL ALIGNMENT RUBRIC (0-100): Score how much pursuing this role would advance the user toward their 5-year goal of "${fiveYearRole}".

CRITICAL: pick the lowest band that fits. Do NOT default to 60 as a "safe middle." The rubric is asymmetric on purpose — most roles a user could be hired for are NOT on the path to their stated 5-year goal, and scoring them in the 60-79 band misleads the user into pursuing dead-end work.

- 80-100: Direct stepping stone. Same role family as the target, OR a well-documented transfer path (e.g. APM → PM, Analyst → PM, Engineer → PM). The role exists primarily on the same career ladder as the goal.
- 60-79: Genuinely adjacent — a different role family, but one that hiring managers for the goal role explicitly value as preparation (e.g. UX Researcher → PM, Solutions Engineer → PM). Use this band ONLY when there's a real, common path, not just "transferable soft skills."
- 40-59: Tangentially useful. Some skills carry over but the role is on a different ladder; pivoting later would require restarting at entry-level.
- 20-39: Unrelated. Pursuing it pulls the user sideways and the experience does not signal goal-relevant capability to recruiters in the goal field.
- 0-19: Actively contradicts the trajectory. The role is on a competing/orthogonal career ladder. Examples for a Product Manager target: SDR/AE/sales roles, recruiting, customer support, accounting — these are NOT PM stepping stones, and a year spent in them is a year not spent building PM signal.

Common mistakes to AVOID:
- Rating any customer-facing role 60+ for a PM target just because "PMs talk to customers." Customer empathy is universal; that's not what makes a role PM-adjacent.
- Rating any sales role 40+ for a PM target just because "you learn the product." SDRs/AEs do not become PMs; the ladder is structurally different.
- Rating the SAME alignment as match_score. Match score and goal alignment are independent signals — a user can be a 90% fit for a job that's a 10% goal alignment.`
      : ''

    const prompt = `You are a Job Match Analyzer for the "Get A Job" Career Operating System.

JOB DESCRIPTION:
${job_description}

USER PROFILE:
- Skills: ${userSkills || 'Not provided'}
- Experience: ${expSummary || 'Not provided'}
- Education: ${profile?.degree || ''} in ${profile?.field_of_study || ''}
- Summary: ${profile?.summary || 'Not provided'}${goalBlock}
ANALYZE the job posting against the user's profile and return a JSON object with EXACTLY this schema:
{
  "job_title": "string (extracted from posting)",
  "company": "string (extracted from posting)",
  "job_description": "string (brief summary of the role)",
  "match_score": number (0-100, how well the user matches THIS JOB's requirements — pure fit, ignore career trajectory),
  "required_seniority": "Entry" | "Entry_Mid" | "Mid" | "Senior" | "Lead" (the JD's experience level — see rubric below),${goalSchemaLine}
  "verdict": "string (1-2 sentence overall assessment)",
  "matched_requirements": [
    { "requirement": "the requirement from the JD", "reason": "specific evidence from the user's profile that they meet it (cite their skill, experience, or education)" }
  ],
  "missing_requirements": [
    { "requirement": "the requirement from the JD", "gap": "what's missing and how big the gap is (e.g. needs 1 specific course, needs 2 years more experience)" }
  ],
  "recommendation": "string (actionable advice for improving their candidacy)",
  "source_url": "${job_url || ''}"
}

Each item in matched_requirements MUST be an object with both "requirement" and "reason" keys.
Each item in missing_requirements MUST be an object with both "requirement" and "gap" keys.
Do NOT return arrays of plain strings.

Do not invent specific statistics, study citations, or company-specific interview practices. Cite only the user's stated profile data and the job description text.${seniorityRubric}${goalRubric}

Return ONLY valid JSON.`

    // BASE_MAX_TOKENS bumped from 1024 → 2048 because the JSON schema grew
    // (goal_alignment_score + required_seniority + matched/missing_requirements
    // arrays). Long-form JDs at the old 1024 cap silently truncated mid-JSON,
    // tripping JSON.parse and returning 500 with no diagnostic for the user.
    // The retry path catches the cases where 2048 still isn't enough.
    const BASE_MAX_TOKENS = 2048
    const RETRY_MAX_TOKENS = 4096

    async function callOpenAI(maxTokens: number) {
      return await openaiChatCompletion(
        {
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        },
        openaiKey,
        {
          traceName: 'analyze-job-match',
          userId: user.id,
          metadata: {
            mode: mode || 'paste',
            has_url: !!job_url,
            max_tokens: maxTokens,
          },
        },
        { signal: AbortSignal.timeout(45000) },
      )
    }

    let openaiResponse = await callOpenAI(BASE_MAX_TOKENS)
    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text()
      // D2 — keep upstream detail server-side only; client gets generic message.
      // Raw OpenAI error bodies can include API key fragments, internal paths,
      // schema info, or rate limit metadata that shouldn't reach the browser.
      console.error(`[analyze-job-match] OpenAI ${openaiResponse.status}: ${errText}`)
      _http = 502; _err = `openai_${openaiResponse.status}`
      m.modelUsed = MODEL
      return new Response(JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let completion = await openaiResponse.json()
    let finishReason: string | undefined = completion.choices?.[0]?.finish_reason
    let content: string = completion.choices?.[0]?.message?.content || '{}'

    // Truncation retry. response_format: json_object guarantees the output
    // STARTS as JSON but doesn't guarantee it COMPLETES. finish_reason ===
    // 'length' means the model hit max_tokens mid-emit; the partial content
    // is invalid JSON and JSON.parse will throw.
    if (finishReason === 'length') {
      console.warn(`[analyze-job-match] truncation detected at max_tokens=${BASE_MAX_TOKENS}, retrying at ${RETRY_MAX_TOKENS}`)
      openaiResponse = await callOpenAI(RETRY_MAX_TOKENS)
      if (!openaiResponse.ok) {
        const errText = await openaiResponse.text()
        console.error(`[analyze-job-match] retry failed: OpenAI ${openaiResponse.status}: ${errText}`)
        _http = 502; _err = `openai_retry_${openaiResponse.status}`
        m.modelUsed = MODEL
        return new Response(JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      completion = await openaiResponse.json()
      finishReason = completion.choices?.[0]?.finish_reason
      content = completion.choices?.[0]?.message?.content || '{}'
      if (finishReason === 'length') {
        console.error(`[analyze-job-match] still truncated at max_tokens=${RETRY_MAX_TOKENS}; JD likely needs trimming`)
        _http = 502; _err = 'truncated_after_retry'
        m.modelUsed = MODEL
        m.tokensIn = completion.usage?.prompt_tokens ?? null
        m.tokensOut = completion.usage?.completion_tokens ?? null
        return new Response(JSON.stringify({ error: 'AI response too long for this job description. Try pasting a shorter version.' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Capture LLM usage for metrics. completion.usage reflects the LAST
    // OpenAI call (initial OR retry, whichever produced the result we used).
    m.modelUsed = MODEL
    m.tokensIn = completion.usage?.prompt_tokens ?? null
    m.tokensOut = completion.usage?.completion_tokens ?? null

    let result: Record<string, unknown>
    try {
      result = JSON.parse(content)
    } catch (parseErr) {
      console.error(`[analyze-job-match] JSON parse failed (finish_reason=${finishReason}):`, content.slice(0, 200), parseErr)
      _http = 502; _err = 'json_parse'
      return new Response(JSON.stringify({ error: 'AI returned malformed response. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Echo user_stage so the client tier helper can apply the same seniority
    // ceiling that generate-career-analysis applies (T1_SENIORITY_CEILING).
    // Without this, an early-career student saw Mid-level roles in track_1
    // because the LLM's match_score gave them full credit on skill overlap
    // while ignoring the 4+ years experience gap.
    result.user_stage = userStage

    // Diagnostic — captures all four signals that trackFromScores uses, so
    // tier mis-assignments can be attributed to specific cause:
    //   has_goal:false/null → goal alignment ignored (fit-only fallback)
    //   match_score wrong   → LLM scored topical fit incorrectly
    //   alignment wrong     → LLM ignored goal rubric
    //   seniority wrong     → LLM misread experience requirements
    console.log(JSON.stringify({
      tag: '[analyze-job-match] result',
      user_id: user.id,
      has_goal: hasGoal,
      five_year_role: fiveYearRole || null,
      user_stage: userStage,
      job_title: result.job_title || null,
      match_score: result.match_score ?? null,
      goal_alignment_score: result.goal_alignment_score ?? null,
      required_seniority: result.required_seniority ?? null,
    }))

    _ok = true; _http = 200
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})
