import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletion } from '../_shared/openai-chat.ts'

// extract-story-from-text — Wk 2 Day 2 of the June 15 launch sprint.
//
// Reads free-form user text describing a work experience, project, or moment,
// and returns a STAR-structured story candidate that the frontend renders in
// an editable confirmation card. The frontend (NOT this function) inserts
// into the stories table after the user accepts/edits — that's the design's
// safety mechanism: every fabrication mistake is caught before storage.
//
// Anti-fabrication contract is enforced in three layers:
//   1. Prompt rules (mirrors generate-tailored-cv's gold-standard wording)
//   2. Required extraction_notes field forcing the LLM to reason about its
//      own omissions
//   3. Server-side post-validation (empty-string→null, array caps, type coerce)
//
// Skills vocabulary: free-form display strings ("Stakeholder Management"),
// matching the existing storage convention across profiles.skills /
// career_roles.matched_skills / etc. Library-ID matching happens at query
// time via the same normalise-then-match bridge other code already uses
// (see generate-career-analysis line 776-780, applyHandlerValidation.js
// skillKey()). Investigated and decided in conversation prior to this commit.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const MODEL = 'gpt-4o-mini'
// 60/hour. Story capture is per-user-action so the natural cap is typing
// speed; this protects against runaway loops or abuse during pilot without
// constraining real users (worst case ~10/min is well above any human pace).
const RATE_LIMIT_CALLS = 60
const RATE_LIMIT_WINDOW = 3600

// Locks the source vocabulary at the function boundary so a bad client can't
// reach the DB CHECK constraint and produce a confusing 5xx. Same shape as
// the stories.source CHECK in 20260504_stories_schema.sql.
const VALID_SOURCES = new Set(['conversation', 'manual_form', 'manual_quick_add', 'imported_from_resume'])

// Cheap UUID format check. Doesn't need to be exhaustive — the FK lookup
// against experiences / conversations is the real gate; this just rejects
// obviously-malformed input early so the LLM call never happens for it.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Output array caps. Defensive — the prompt asks for these limits but a
// rogue model output shouldn't make it to the response.
const CAP_METRICS = 10
const CAP_SKILLS = 10
const CAP_TOOLS = 15
const CAP_TAGS = 6
const CAP_TITLE = 200
const CAP_TEXT_INPUT = 5000

const SYSTEM_PROMPT = `You are a Story Extractor for the "Get A Job" Career Operating System. You read free-form user text describing a work experience, project, achievement, or moment, and parse it into STAR-structured story records that downstream career features (CV generation, LinkedIn optimization, interview coaching) use as grounded evidence.

ABSOLUTE FABRICATION RULES — these override every other consideration:

1. NEVER invent metrics, numbers, percentages, durations, team sizes, dollar amounts, dates, company names, or product names that aren't EXPLICITLY in the user's text. If the user wrote "I led a project to improve onboarding" you may NOT extract result: "improved by 30%" or task: "for a 12-person team" — those numbers do not exist in the source.

2. STAR fields (situation, task, action, result) MUST be NULL when the user's text doesn't directly support them. A 1-sentence story about an action alone is fine — leave situation/task/result NULL. Do not pad with plausible-sounding context.

3. metrics[] only includes EXACT figures the user wrote. "shipped 2 weeks early" → metrics: ["shipped 2 weeks early"]. "shipped fast" → metrics: []. Do not estimate, do not round, do not extrapolate.

4. tools_used[] only includes platforms / tools the user named explicitly. "I used Notion and Linear" → ["Notion", "Linear"]. "we used some tools" → []. Inferring tools from job role ("they were a designer so they probably used Figma") is forbidden.

5. skills_demonstrated[] may include skills strongly implied by the action verb. "I led a 6-person team" → ["Team Leadership"] is acceptable. But be conservative — if you wouldn't bet money the user has the skill based on their text, leave it out. Default to fewer, more confident skills over many speculative ones. Always use full skill names, never abbreviations — "Stakeholder Management" not "Stakeholder Mgmt", "Project Management" not "PM". Label drift across stories degrades downstream matching.

6. relevance_tags[] should be loose topical tags inferred from what the story is about (e.g. "migration", "customer_research", "fundraising"). Limit to 6 tags maximum — over-tagging dilutes downstream search.

EXTRACTION_NOTES — required field. In 1–2 sentences, name which STAR fields you left NULL and why. Example: "Left situation and task NULL because the user's text described the action and result but not the prompting context." This is shown to the user so they understand the discipline; it also forces you to consciously check your work.

STAR DEFINITIONS:
- situation: the context or backdrop (what was happening, what problem existed)
- task: what the user was responsible for or asked to do
- action: what the user actually did (verbs — what they built, led, fixed, decided)
- result: the outcome (what changed, was shipped, was achieved)

VOCABULARY: skills and tools use display-friendly format ("Stakeholder Management", "Customer Research"), NOT snake_case. Title-case for skills_demonstrated and tools_used. relevance_tags may use lowercase-with-underscores ("cross_functional", "product_launch") since they're loose topical tags, not canonical skill names.

OUTPUT — return EXACTLY this JSON shape:
{
  "story": {
    "title": "string (required, ≤200 chars — short headline summarising the story; you write this)",
    "situation": "string | null",
    "task": "string | null",
    "action": "string | null",
    "result": "string | null",
    "metrics": ["string", ...],
    "skills_demonstrated": ["string", ...],
    "tools_used": ["string", ...],
    "relevance_tags": ["string", ...]
  },
  "extraction_notes": "string (1–2 sentences explaining what was left blank and why)"
}

Return ONLY valid JSON.`

// Server-side post-validation. The structured-output JSON mode is reliable
// but not perfect — empty strings sneak in instead of nulls, arrays exceed
// caps, non-string entries appear, etc. This pass coerces to the contract.
function sanitiseStory(raw: unknown): { story: Record<string, unknown>; extraction_notes: string } | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const rawStory = r.story
  if (!rawStory || typeof rawStory !== 'object') return null
  const s = rawStory as Record<string, unknown>

  const title = typeof s.title === 'string' ? s.title.trim().slice(0, CAP_TITLE) : ''
  if (!title) return null

  // Strip empty strings → null on STAR fields. Model occasionally emits ""
  // when "null" was intended; normalise so downstream consumers can use a
  // simple `if (situation)` check without worrying about the falsy edge case.
  const starField = (v: unknown): string | null => {
    if (typeof v !== 'string') return null
    const trimmed = v.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  const stringArray = (v: unknown, cap: number): string[] => {
    if (!Array.isArray(v)) return []
    const out: string[] = []
    const seen = new Set<string>()
    for (const item of v) {
      if (typeof item !== 'string') continue
      const trimmed = item.trim()
      if (!trimmed) continue
      const key = trimmed.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(trimmed)
      if (out.length >= cap) break
    }
    return out
  }

  const extraction_notes = typeof r.extraction_notes === 'string'
    ? r.extraction_notes.trim().slice(0, 500)
    : ''

  return {
    story: {
      title,
      situation: starField(s.situation),
      task: starField(s.task),
      action: starField(s.action),
      result: starField(s.result),
      metrics: stringArray(s.metrics, CAP_METRICS),
      skills_demonstrated: stringArray(s.skills_demonstrated, CAP_SKILLS),
      tools_used: stringArray(s.tools_used, CAP_TOOLS),
      relevance_tags: stringArray(s.relevance_tags, CAP_TAGS),
    },
    extraction_notes,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const m = startMetric('extract-story-from-text')
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
      p_function_name: 'extract-story-from-text',
      p_max_calls: RATE_LIMIT_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW,
    })
    if (allowed === false) {
      _http = 429; _err = 'rate_limit'
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in an hour.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rawBody = await req.text()
    if (rawBody.length > 10_000) {
      _http = 413; _err = 'payload_too_large'
      return new Response(JSON.stringify({ error: 'Request payload too large.' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    let parsed: { text?: unknown; experience_id?: unknown; conversation_id?: unknown; source?: unknown }
    try {
      parsed = JSON.parse(rawBody)
    } catch {
      _http = 400; _err = 'bad_json'
      return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const text = typeof parsed.text === 'string' ? parsed.text.trim().slice(0, CAP_TEXT_INPUT) : ''
    if (!text) {
      _http = 400; _err = 'missing_input'
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const source = typeof parsed.source === 'string' ? parsed.source : ''
    if (!VALID_SOURCES.has(source)) {
      _http = 400; _err = 'bad_input'
      return new Response(JSON.stringify({
        error: `source must be one of: ${[...VALID_SOURCES].join(', ')}`,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Optional FKs — validate format up-front, then verify ownership via the
    // user-scoped supabase client (RLS gates the SELECT, so a query for an
    // experience the user doesn't own returns no rows naturally).
    const experience_id = typeof parsed.experience_id === 'string' ? parsed.experience_id : null
    if (experience_id && !UUID_RE.test(experience_id)) {
      _http = 400; _err = 'bad_input'
      return new Response(JSON.stringify({ error: 'experience_id must be a valid UUID' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const conversation_id = typeof parsed.conversation_id === 'string' ? parsed.conversation_id : null
    if (conversation_id && !UUID_RE.test(conversation_id)) {
      _http = 400; _err = 'bad_input'
      return new Response(JSON.stringify({ error: 'conversation_id must be a valid UUID' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch experience context for the LLM if linked. Title + company give
    // the model grounding so it can echo the company name in fields without
    // having to infer it from the user's text. RLS gates ownership.
    let experienceContext = ''
    if (experience_id) {
      const { data: exp } = await supabase
        .from('experiences')
        .select('title, company')
        .eq('id', experience_id)
        .maybeSingle()
      if (!exp) {
        _http = 404; _err = 'bad_ownership'
        return new Response(JSON.stringify({ error: 'experience_id not found or not owned by user' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      experienceContext = `\n\nEXPERIENCE CONTEXT (the user has linked this story to an existing experience entry):
- Role: ${String(exp.title || '').slice(0, 200)}
- Company: ${String(exp.company || '').slice(0, 200)}

Use this context to ground the story (you may reference the role or company in any field including the title, since they are confirmed). Do not invent additional details about this role beyond what the user wrote.`
    }
    if (conversation_id) {
      // Existence check only — conversations don't carry narrative context
      // beyond what's already in the user's text.
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversation_id)
        .maybeSingle()
      if (!conv) {
        _http = 404; _err = 'bad_ownership'
        return new Response(JSON.stringify({ error: 'conversation_id not found or not owned by user' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const userPrompt = `USER TEXT:
${text}${experienceContext}

Extract a story from the user text above.`

    const openaiResponse = await openaiChatCompletion(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        // Low temperature: this is a parsing task, not creative. Below 0.3
        // matches the discipline of analyze-job-match (0.3) and is tighter
        // than the agent chat models (0.4) which need some style variability.
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      },
      openaiKey,
      {
        traceName: 'extract-story-from-text',
        userId: user.id,
        metadata: {
          source,
          has_experience_link: !!experience_id,
          has_conversation_link: !!conversation_id,
        },
      },
      { signal: AbortSignal.timeout(20000) },
    )

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text()
      console.error(`[extract-story-from-text] OpenAI ${openaiResponse.status}: ${errText}`)
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
      console.error(`[extract-story-from-text] JSON parse failed:`, content.slice(0, 200), parseErr)
      _http = 502; _err = 'json_parse'
      return new Response(JSON.stringify({ error: 'AI returned malformed response. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const sanitised = sanitiseStory(rawParsed)
    if (!sanitised) {
      console.error(`[extract-story-from-text] bad shape from LLM:`, JSON.stringify(rawParsed).slice(0, 300))
      _http = 502; _err = 'bad_shape'
      return new Response(JSON.stringify({ error: 'AI returned an unexpected structure. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    _ok = true; _http = 200
    return new Response(JSON.stringify(sanitised), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('[extract-story-from-text] unhandled:', error?.message || error)
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})
