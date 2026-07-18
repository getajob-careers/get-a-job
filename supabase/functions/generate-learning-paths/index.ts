import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletion } from '../_shared/openai-chat.ts'
import { pickPrimaryEducation, formatEducationLine } from '../_shared/education-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const MODEL = 'gpt-4o-mini'
const RATE_LIMIT_CALLS = 10
const RATE_LIMIT_WINDOW = 3600

// HEAD-validate URLs the LLM emits in learning paths. The LLM regularly
// hallucinates plausible-looking URLs that 404; LearningPaths.jsx already
// has a "Search Google for this course" fallback when r.url is null, so
// we null out anything that fails validation and let the frontend
// degrade gracefully.
async function validateUrl(url: string): Promise<boolean> {
  if (!url || typeof url !== 'string') return false
  if (!/^https?:\/\//i.test(url)) return false
  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; GetAJobBot/1.0)' }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    let r = await fetch(url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow', headers })
    clearTimeout(timer)
    if (r.ok) return true
    // Some sites (CDNs, certain hosting platforms) return 405 for HEAD —
    // retry with a Range GET that fetches one byte.
    if (r.status === 405) {
      const ctrl2 = new AbortController()
      const timer2 = setTimeout(() => ctrl2.abort(), 5000)
      r = await fetch(url, {
        method: 'GET',
        signal: ctrl2.signal,
        redirect: 'follow',
        headers: { ...headers, Range: 'bytes=0-0' },
      })
      clearTimeout(timer2)
      return r.ok || r.status === 206
    }
    return false
  } catch {
    return false
  }
}

// Bounded-concurrency map. Keeps total HEAD-check time bounded
// (worst case ceil(N/limit) × timeout) when validating a batch of URLs.
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx])
    }
  })
  await Promise.all(workers)
  return results
}

// Per-platform validators. Bot-detected sites (Coursera, Udemy, etc.)
// reject HEAD/GET probes from edge runtimes regardless of User-Agent
// because they fingerprint TLS, not just headers. Instead we use the
// platforms' own purpose-built endpoints where available.
//
// Coursera exposes a public catalog API at api.coursera.org; YouTube
// has the public oembed endpoint. Confirmed via curl smoke test:
//   - Coursera /learn/<good-slug> → API 200; /learn/<bad-slug> → API 404
//   - YouTube oembed for real video → 200; for fake id → 400

async function validateCourseraUrl(url: string): Promise<boolean> {
  try {
    const u = new URL(url)
    // Only the /learn/<slug> pattern routes through the courses.v1 API.
    // Specializations and professional-certificates use different APIs
    // we don't probe — trust them rather than rejecting valid URLs.
    const match = u.pathname.match(/^\/learn\/([^\/]+)/)
    if (!match) return true
    const slug = match[1]
    const ctrl = new AbortController()
    setTimeout(() => ctrl.abort(), 5000)
    const r = await fetch(
      `https://api.coursera.org/api/courses.v1?q=slug&slug=${encodeURIComponent(slug)}`,
      { signal: ctrl.signal },
    )
    return r.ok
  } catch {
    return true  // API failure → trust, don't penalise the user
  }
}

async function validateYouTubeUrl(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    setTimeout(() => ctrl.abort(), 5000)
    const r = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}`,
      { signal: ctrl.signal },
    )
    return r.ok
  } catch {
    return true
  }
}

// Domains we trust without per-platform validation. These are major
// learning platforms whose URLs the LLM gets right ~95% of the time
// but which all reject HEAD probes. Better to ship a real link with
// a small chance of 404 than to null every link and force users into
// a Google search for the same course.
const TRUSTED_DOMAINS = new Set([
  'freecodecamp.org', 'edx.org', 'khanacademy.org',
  'pluralsight.com', 'linkedin.com', 'codecademy.com', 'datacamp.com',
])

// Domains we know reject all probes AND have no public validator AND
// are hallucination-prone enough that a 404 risk isn't acceptable for
// a demo. URLs here always get nulled; frontend shows the "Search
// Google for this course" fallback. Deterministic — never relies on
// the HEAD probe happening to succeed or fail.
const UNTRUSTED_DOMAINS = new Set(['udemy.com'])

async function validateOrTrust(url: string): Promise<boolean> {
  if (!url || !/^https?:\/\//i.test(url)) return false
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return false
  }
  if (UNTRUSTED_DOMAINS.has(host)) return false
  if (host === 'coursera.org' || host.endsWith('.coursera.org')) return await validateCourseraUrl(url)
  if (host === 'youtube.com' || host === 'youtu.be') return await validateYouTubeUrl(url)
  if (TRUSTED_DOMAINS.has(host)) return true
  // Unknown host — fall through to the generic HEAD probe.
  return await validateUrl(url)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const m = startMetric('generate-learning-paths')
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
      p_function_name: 'generate-learning-paths',
      p_max_calls: RATE_LIMIT_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW,
    })
    if (allowed === false) {
      _http = 429; _err = 'rate_limit'
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in an hour.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body defensively
    const rawBody = await req.text()
    if (rawBody.length > 50_000) {
      _http = 413; _err = 'payload_too_large'
      return new Response(JSON.stringify({ error: 'Request payload too large.' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    let body: Record<string, unknown> = {}
    if (rawBody.trim().length > 0) {
      try { body = JSON.parse(rawBody) } catch {
        _http = 400; _err = 'bad_json'
        return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }
    const skill_gaps = Array.isArray(body.skill_gaps) ? body.skill_gaps : undefined
    const target_roles = Array.isArray(body.target_roles) ? body.target_roles : undefined

    // Fetch user data for context. Phase B: education lives on its own table,
    // pulled via PostgREST nested embed and reduced to a single primary row
    // for prompt context.
    const [{ data: profiles }, { data: careerRoles }] = await Promise.all([
      supabase.from('profiles').select('*, education(*)').eq('id', user.id),
      supabase.from('career_roles').select('*').eq('user_id', user.id),
    ])

    const profile = profiles?.[0]
    const roles: string[] = (target_roles && target_roles.length ? target_roles : (careerRoles || []).map((r: any) => r.title))
      .filter((x: any) => typeof x === 'string')
    const gaps: string[] = (skill_gaps && skill_gaps.length ? skill_gaps : (careerRoles || []).flatMap((r: any) => r.skills_gap || []))
      .filter((x: any) => typeof x === 'string')

    // Guardrail: if there are no gaps at all, return an empty set — don't bother the LLM.
    if (gaps.length === 0) {
      _ok = true; _http = 200
      return new Response(JSON.stringify({ learning_paths: [], courses: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const trunc = (s: unknown, max: number) => String(s ?? '').slice(0, max)
    const profileSkills = (profile?.skills || []).slice(0, 50).map((s: unknown) => trunc(s, 60))
    const safeGaps = gaps.slice(0, 8).map(s => trunc(s, 80))
    const safeRoles = roles.slice(0, 10).map(s => trunc(s, 100))

    const prompt = `You are a Learning Path Generator for the "Get A Job" Career Operating System.

USER CONTEXT:
- Current Skills: ${JSON.stringify(profileSkills)}
- Skill Gaps: ${JSON.stringify(safeGaps)}
- Target Roles: ${safeRoles.join(', ') || 'General career development'}
- Education: ${formatEducationLine(pickPrimaryEducation((profile as any)?.education))}

TASK: Generate learning paths to help close the user's skill gaps and prepare for their target roles.

For each skill gap, recommend:
- Specific free or affordable courses. PREFER these platforms in this order: Coursera, freeCodeCamp, YouTube, edX, Khan Academy. AVOID Udemy unless the user explicitly asks for it — Udemy URLs are less reliable in our system.
- A capstone project idea that proves the skill
- Estimated time commitment

KEEP RESPONSES COMPACT so the JSON fits. Return EXACTLY 1 resource per skill — not 2, not more. Keep ALL strings under 100 characters each.

Return a JSON object with this exact shape:
{
  "learning_paths": [
    {
      "skill": "string (the skill gap)",
      "why_important": "string (1 sentence)",
      "resources": [
        {
          "title": "string",
          "platform": "string",
          "url": "string (actual course URL if known, or search URL)",
          "type": "course|tutorial|book|project",
          "time_commitment": "string (e.g. '4 hours', '2 weeks')"
        }
      ],
      "capstone_project": {
        "title": "string",
        "description": "string (1–2 sentences)",
        "why_it_proves": "string (1 sentence)"
      }
    }
  ]
}

Return ONLY valid JSON.`

    const openaiResponse = await openaiChatCompletion(
      {
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      },
      openaiKey,
      {
        traceName: 'generate-learning-paths',
        userId: user.id,
        metadata: { role_count: roles.length, gap_count: gaps.length },
      },
      { signal: AbortSignal.timeout(55000) },
    )

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text()
      // D2 — keep upstream detail server-side only; client gets generic message.
      console.error(`[generate-learning-paths] OpenAI ${openaiResponse.status}: ${errText}`)
      _http = 502; _err = `openai_${openaiResponse.status}`
      m.modelUsed = MODEL
      return new Response(JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const completion = await openaiResponse.json()
    m.modelUsed = MODEL
    m.tokensIn = completion.usage?.prompt_tokens ?? null
    m.tokensOut = completion.usage?.completion_tokens ?? null
    const rawContent = completion.choices?.[0]?.message?.content ?? ''
    const finishReason = completion.choices?.[0]?.finish_reason ?? 'unknown'

    // If the model got truncated by max_tokens, JSON.parse will fail. Surface a clear error.
    if (finishReason === 'length') {
      _http = 500; _err = 'truncated'
      return new Response(JSON.stringify({
        error: 'Your learning plan was too long to generate in one pass. Reduce the number of skill gaps and try again.',
      }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let result: { learning_paths?: unknown } = { learning_paths: [] }
    try {
      result = JSON.parse(rawContent || '{"learning_paths":[]}')
    } catch (parseErr) {
      console.error('[learning-paths] JSON.parse failed:', (parseErr as Error).message)
      _http = 500; _err = 'json_parse'
      return new Response(JSON.stringify({ error: 'AI returned an invalid response format. Please try again.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!Array.isArray(result.learning_paths)) result.learning_paths = []

    // URL validation — strip URLs that 404 / time out. LearningPaths.jsx
    // shows "Search Google for this course" when r.url is null, so failed
    // validation downgrades to a usable fallback rather than a dead link.
    const allResources: any[] = []
    for (const lp of (result.learning_paths as any[])) {
      for (const r of (lp?.resources || [])) {
        if (r && typeof r === 'object') allResources.push(r)
      }
    }
    if (allResources.length > 0) {
      const validations = await mapWithConcurrency(allResources, 5, (r) => validateOrTrust(r?.url || ''))
      allResources.forEach((r, i) => { if (!validations[i]) r.url = null })
    }

    // Synthesize the flat `courses` array from learning_paths so existing
    // consumers (e.g. SkillGapCourses.jsx) keep working without asking the
    // LLM to emit the duplicate structure.
    const flatCourses: any[] = [];
    for (const lp of (result.learning_paths as any[])) {
      for (const r of (lp?.resources || [])) {
        flatCourses.push({
          skill_gap: lp?.skill || '',
          course_title: r?.title || '',
          platform: r?.platform || '',
          description: r?.type ? `${r.type}: ${r?.title || ''}` : (r?.title || ''),
          time_commitment: r?.time_commitment || '',
          relevance: lp?.why_important || '',
        });
      }
    }
    const responseBody = { learning_paths: result.learning_paths, courses: flatCourses };

    _ok = true; _http = 200
    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = (error as Error)?.message || String(error)
    console.error('generate-learning-paths error:', message, (error as Error)?.stack)
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: message || 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})
