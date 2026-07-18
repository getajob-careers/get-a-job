import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletion } from '../_shared/openai-chat.ts'
import { COMMENT_VOICE_RULES } from '../_shared/voice-rules.ts'

// generate-linkedin-comment — Phase 4 PR A of the LinkedIn command center.
//
// Highest-leverage AI tool in the Networking tab per the research doc:
// substantive 15+-word comments on others' posts reportedly drive ~55%
// lift in profile views for sub-1K-follower accounts (every pilot user).
//
// Inputs: the post the user wants to comment on (text + author + author's
// headline) — option C from PR #34 architecture call. Author info lets
// the LLM reference "as Maya pointed out..." rather than generic framing.
//
// Output: 3 comment options (option A from PR #34 architecture). User
// picks one + edits inline. Total token cost ~3x a single comment but
// comments are short (~50-150 words each); marginal cost is small for
// big UX win.
//
// State: ephemeral (option A from PR #34). No persistence — generate,
// copy, send. Pilot data may show users want a history; v2 if so.
//
// Anti-fabrication: comments grounded in user's real profile/experiences.
// If the user has nothing relevant to add, the LLM is told to flag that
// rather than fabricate relevance.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const MODEL = 'gpt-4o'
// 60/hour. Comments are higher-frequency than posts (research suggests
// 5-10/day per user); 60/hour is comfortable headroom.
const RATE_LIMIT_CALLS = 60
const RATE_LIMIT_WINDOW = 3600

// Bounds on free-text inputs so a malicious or runaway client can't
// blow prompt budget. Real LinkedIn posts cap at 3000 chars per the
// research doc; we accept up to 4000 to absorb pasted formatting.
const MAX_POST_TEXT = 4000
const MAX_AUTHOR_NAME = 200
const MAX_AUTHOR_HEADLINE = 400

interface CommentOption {
  text: string
  // Brief 1-line note on what angle the comment takes — helps the user
  // pick when scanning 3 options ("references your Guardio renewal
  // experience", "asks a tightening question").
  angle: string
}

interface GeneratedComments {
  options: CommentOption[]
  // When user has nothing meaningfully relevant to add, AI flags it
  // rather than fabricating. Empty options + non-empty no_fit_reason
  // signals "skip this post — nothing genuine to contribute."
  no_fit_reason?: string
  generated_at: string
}

const SYSTEM_PROMPT = `You are a LinkedIn Comment Coach for the "Get A Job" Career Operating System. You read a LinkedIn post written by someone else, the user's profile + experiences, and produce 3 comment OPTIONS the user can pick from. Each option must be substantive (15+ words), specific to THIS post, and grounded in the user's REAL experience.

ABSOLUTE FABRICATION RULES:
1. Numbers, projects, tools, companies you reference in the comment must come from the user's source data — Story Bank metrics, profile experiences. Never invent.
2. If the user has nothing genuinely relevant to add to this specific post, return options as an empty array and set no_fit_reason to a 1-sentence honest explanation (e.g. "User's experience is in customer success at a B2B startup; this post is about consumer marketing trends — nothing genuine to contribute."). Don't fabricate fake relevance.

OUTPUT — return EXACTLY this JSON shape:
{
  "options": [
    {
      "text": "string — the comment, 50-150 words, ready to paste",
      "angle": "string — 1 short line describing what angle this comment takes (helps user pick)"
    }
  ],
  "no_fit_reason": "string OR omit — only set when options is empty"
}

Return ONLY valid JSON. options should have exactly 3 entries when there's genuine relevance; empty array when there isn't.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const m = startMetric('generate-linkedin-comment')
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
      p_function_name: 'generate-linkedin-comment',
      p_max_calls: RATE_LIMIT_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW,
    })
    if (allowed === false) {
      _http = 429; _err = 'rate_limit'
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in an hour.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let body: any
    try {
      const raw = await req.text()
      body = raw ? JSON.parse(raw) : {}
    } catch {
      _http = 400; _err = 'bad_json'
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const post_text = String(body.post_text || '').trim().slice(0, MAX_POST_TEXT)
    if (!post_text || post_text.length < 30) {
      _http = 400; _err = 'bad_input'
      return new Response(JSON.stringify({ error: 'post_text required (≥30 chars; paste the LinkedIn post you want to comment on)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const author_name = String(body.author_name || '').trim().slice(0, MAX_AUTHOR_NAME)
    if (!author_name) {
      _http = 400; _err = 'bad_input'
      return new Response(JSON.stringify({ error: 'author_name required (the post author\'s name)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const author_headline = String(body.author_headline || '').trim().slice(0, MAX_AUTHOR_HEADLINE)
    // headline is optional — many pasted posts won't include it. Empty
    // string passes through and the LLM proceeds without that context.

    // Fetch user's profile + recent experiences. Stories optional but
    // useful — let the model pick a relevant one if applicable.
    const [profileRes, experiencesRes, storiesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('experiences').select('*').eq('user_id', user.id).order('start_date', { ascending: false }).limit(5),
      supabase.from('stories').select('id, title, action, result, metrics, skills_demonstrated, tools_used').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
    ])
    const profile = profileRes.data
    if (!profile) {
      _http = 404; _err = 'no_profile'
      return new Response(JSON.stringify({ error: 'No profile found. Complete onboarding first.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const trunc = (s: unknown, n: number) => String(s ?? '').slice(0, n)
    const safeArr = (v: unknown): any[] => Array.isArray(v) ? v : []

    const userData = {
      full_name: trunc(profile.full_name, 100),
      summary: trunc(profile.summary, 800),
      primary_domain: trunc(profile.primary_domain, 100),
      target_job_titles: safeArr(profile.target_job_titles).slice(0, 10).map((t) => trunc(t, 100)),
      qualification_level: trunc(profile.qualification_level, 50),
      recent_experiences: (experiencesRes.data || []).slice(0, 5).map((e: any) => ({
        title: trunc(e.title, 200),
        company: trunc(e.company, 200),
        is_current: !!e.is_current,
        responsibilities: trunc(e.responsibilities, 600),
      })),
      stories: (storiesRes.data || []).map((s: any) => ({
        title: trunc(s.title, 200),
        action: s.action ? trunc(s.action, 400) : null,
        result: s.result ? trunc(s.result, 400) : null,
        metrics: safeArr(s.metrics).slice(0, 8),
        skills: safeArr(s.skills_demonstrated).slice(0, 8),
        tools: safeArr(s.tools_used).slice(0, 8),
      })),
    }

    const systemPrompt = SYSTEM_PROMPT + '\n\n' + COMMENT_VOICE_RULES
    const userPrompt = `THE LINKEDIN POST YOU'RE COMMENTING ON:
Author: ${author_name}${author_headline ? ` (${author_headline})` : ''}

Post text:
"""
${post_text}
"""

USER DATA (your profile, experiences, and Story Bank — use these to ground your comment options):
${JSON.stringify(userData, null, 2)}

Generate 3 comment options the user could leave on this post. Each comment:
- 50-150 words
- References something specific the post said
- Grounded in the user's real experience (named companies, specific outcomes from stories, real tools)
- Each option takes a different angle (different aspect of the post to engage with, different example from the user's background)

If the user has nothing genuinely relevant to add, return options: [] and set no_fit_reason. Don't fabricate relevance.

Return ONLY valid JSON.`

    const openaiResponse = await openaiChatCompletion(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      },
      openaiKey,
      {
        traceName: 'generate-linkedin-comment',
        userId: user.id,
        metadata: {
          post_text_length: post_text.length,
          has_author_headline: !!author_headline,
        },
      },
      { signal: AbortSignal.timeout(60000) },
    )

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text()
      console.error(`[generate-linkedin-comment] OpenAI ${openaiResponse.status}: ${errText.slice(0, 300)}`)
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

    const content: string = completion.choices?.[0]?.message?.content || '{}'
    let rawParsed: unknown
    try {
      rawParsed = JSON.parse(content)
    } catch (parseErr) {
      console.error('[generate-linkedin-comment] JSON parse failed:', content.slice(0, 200), parseErr)
      _http = 502; _err = 'json_parse'
      return new Response(JSON.stringify({ error: 'AI returned malformed response. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Sanitize. Trust but verify — defensive empties + caps.
    const r = rawParsed as Record<string, unknown>
    const optionsRaw = Array.isArray(r.options) ? r.options : []
    const options: CommentOption[] = optionsRaw
      .filter((o): o is Record<string, unknown> => !!o && typeof o === 'object')
      .map((o) => ({
        text: typeof o.text === 'string' ? o.text.trim().slice(0, 1500) : '',
        angle: typeof o.angle === 'string' ? o.angle.trim().slice(0, 200) : '',
      }))
      .filter((o) => o.text.length >= 30)
      .slice(0, 3)
    const no_fit_reason = typeof r.no_fit_reason === 'string' && r.no_fit_reason.trim()
      ? r.no_fit_reason.trim().slice(0, 400) : undefined

    const result: GeneratedComments = {
      options,
      ...(no_fit_reason && options.length === 0 ? { no_fit_reason } : {}),
      generated_at: new Date().toISOString(),
    }

    _ok = true; _http = 200
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('[generate-linkedin-comment] unhandled:', error?.message || error)
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})
