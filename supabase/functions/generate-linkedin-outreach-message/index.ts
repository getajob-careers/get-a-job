import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletion } from '../_shared/openai-chat.ts'
import { OUTREACH_VOICE_RULES } from '../_shared/voice-rules.ts'
import { FRAMEWORK_BY_GOAL } from '../_shared/outreach-frameworks/frameworks.ts'

// generate-linkedin-outreach-message — Phase 4 PR B of the LinkedIn
// command center. The Outreach Conversation Coach.
//
// Multi-turn DM coach across 8 outreach goals (recruiter, hiring manager,
// alumni, informational interview, thank-you, reconnect-dormant,
// referral, recommendation). The AI reads the goal + thread state on
// each call and decides whether to coach a warm-up message or make the
// ask, per the goal's framework.
//
// Two modes:
//   1. New conversation — caller provides goal + target_person. We
//      INSERT a row into linkedin_outreach_conversations and return the
//      first AI suggestion (turn_type='opener').
//   2. Continuing conversation — caller provides conversation_id +
//      optionally new_them_reply (recipient sent something) or
//      mark_as_sent (user accepted prior suggestion + edited it). We
//      UPDATE the message_thread, then ask the LLM for the next turn.
//
// Anti-fabrication: messages reference user's real profile/experiences.
// Statements ABOUT the recipient must come from target_person.mutual_context
// or be safely-generic. The framework's warm_up_advice field is the
// load-bearing coaching signal — when the user pushes for an ask
// prematurely (e.g. asking for a referral with a dormant relationship),
// the AI explicitly coaches "send the warm-up turn first."

import type {
  OutreachGoal,
  TargetPerson,
  ThreadMessage,
  OutreachSuggestion,
  OutreachResponse,
} from '../_shared/outreach-frameworks/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const MODEL = 'gpt-4o'
// 60/hour matches comments + posts. Outreach is lower-frequency than
// comments but multi-turn; 60 covers an active session.
const RATE_LIMIT_CALLS = 60
const RATE_LIMIT_WINDOW = 3600

// Runtime allowlist for body.goal. Must stay in sync with the
// OutreachGoal union in _shared/outreach-frameworks/types.ts AND the
// CHECK constraint on linkedin_outreach_conversations.goal — TypeScript
// type-checks the union but the runtime validation is THIS literal
// array. Adding a goal touches three places: union, CHECK constraint,
// and this list.
const VALID_GOALS: ReadonlyArray<OutreachGoal> = [
  'message_recruiter',
  'message_hiring_manager',
  'message_alumni',
  'request_informational_interview',
  'thank_you_follow_up',
  'reconnect_dormant',
  'ask_for_referral',
  'ask_for_recommendation',
  'propose_internship',
]

const MAX_NAME = 200
const MAX_ROLE = 200
const MAX_COMPANY = 200
const MAX_RELATIONSHIP = 400
const MAX_MUTUAL = 600
const MAX_REPLY = 4000
const MAX_SENT = 4000
// Cap thread serialization. ~40 messages × ~200 chars/msg = 8K — well
// within budget for gpt-4o with the rest of the prompt.
const MAX_THREAD_LEN = 40

const SYSTEM_PROMPT = `You are an Outreach Conversation Coach for the "Get A Job" Career Operating System. Your job is to coach a user through a multi-turn LinkedIn DM exchange with a target recipient. You read: (1) the user's outreach goal, (2) the target person's profile + relationship to the user, (3) the conversation thread so far. Then you produce ONE suggested next message + coaching context.

THREE HARD RULES — these override every other instruction below. Violating any of these makes the suggestion unusable:

HARD RULE 1 — NEVER use ANY of these phrases or variants in any sentence position:
- "I hope this finds you well"
- "I hope you're doing well"
- "Hope you're well"
- "Trust this finds you well"
- "How have you been?"
- "Hope all is good"
These are template signals. They burn the recipient's trust before the message even starts.

HARD RULE 2 — NEVER fabricate what you discussed at past meetings or events.
If target_person.mutual_context says "met once at X meetup," you may write "We met briefly at the X meetup" — but you may NOT write:
- "I remember our chat about [made-up topic]"
- "I recall you shared some great insights about [made-up topic]"
- "I remember we discussed [made-up topic]"
- "Your point about [made-up thing] stuck with me"
The recipient remembers what they actually said. Inventing topics is detected immediately and burns trust permanently. If you don't know what was discussed, write nothing about the content of past conversations — only the fact of the meeting.

HARD RULE 3 — NEVER fabricate what you took from a shared course, event, or program.
If user data says "took the same Customer Discovery course," you may write "we both took Prof Lee's Customer Discovery course" — you may NOT write:
- "I remember [Professor]'s lecture on [made-up topic]"
- "The framework we used in [course] for [made-up exercise]"
Reference only the fact of the shared experience. Specifics that weren't in the input are off-limits.



YOUR JUDGMENT — the load-bearing decision on every turn:
On EACH turn, you decide whether the user is ready to make their goal's ask, OR whether they need to warm up first. For multi-step goals (ask_for_referral with a dormant relationship, request_informational_interview, reconnect_dormant), pushing the ask too early kills the conversation. The framework for the user's chosen goal tells you when ask-now-vs-warm-up-first applies — follow it strictly.

ABSOLUTE FABRICATION RULES:
1. Numbers, projects, employers, schools, tools you reference about THE USER must come from the user's source data — profile, experiences, Story Bank. Never invent.
2. Statements about the RECIPIENT must come from what the user provided in target_person.mutual_context, OR be safely-generic phrasings ("I see you're at [Company]", "your role at [Company]"). Do NOT fabricate that the user attended the recipient's talk, met them at an event, or knows specifics that weren't provided.
3. If the user has nothing genuine to say to this recipient given their profile + the goal, return a turn that says so honestly rather than generating fake relevance.

OUTPUT — return EXACTLY this JSON shape:
{
  "suggested_text": "string — the message text the user should send (after possibly editing). Length depends on turn_type — see framework for the goal.",
  "turn_type": "opener | follow_up_after_silence | next_response | connection_request_note",
  "angle": "string — 1 short line describing the angle (e.g. 'warm opener referencing the shared alumni connection', 'soft follow-up after 5 days of silence')",
  "warm_up_advice": "string — when the user is pushing for an ask their thread state isn't ready for, explain why + what to send first. Empty string when no warm-up advice is needed (most turns).",
  "conversation_state": "cold_open | warming_up | rapport_built | making_the_ask | awaiting_reply | goal_complete",
  "warnings": ["array of string — caveats the user should consider (e.g. timing tip, length warning, OTW reminder). Often empty."]
}

Return ONLY valid JSON.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const m = startMetric('generate-linkedin-outreach-message')
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
      p_function_name: 'generate-linkedin-outreach-message',
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

    const conversation_id: string | undefined = typeof body.conversation_id === 'string' && body.conversation_id.trim()
      ? body.conversation_id.trim() : undefined
    const requested_goal: OutreachGoal | undefined = typeof body.goal === 'string' && VALID_GOALS.includes(body.goal as OutreachGoal)
      ? body.goal as OutreachGoal : undefined
    const requested_target = sanitizeTargetPerson(body.target_person)
    const new_them_reply: string | undefined = typeof body.new_them_reply === 'string'
      ? body.new_them_reply.slice(0, MAX_REPLY) : undefined
    const mark_as_sent: string | undefined = typeof body.mark_as_sent === 'string' && body.mark_as_sent.trim()
      ? body.mark_as_sent.slice(0, MAX_SENT) : undefined
    if (new_them_reply !== undefined && mark_as_sent !== undefined) {
      _http = 400; _err = 'bad_input'
      return new Response(JSON.stringify({ error: 'Provide either new_them_reply or mark_as_sent, not both.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Resolve conversation: load existing OR create new.
    let convoRow: any
    if (conversation_id) {
      const { data: existing, error: loadErr } = await supabase
        .from('linkedin_outreach_conversations')
        .select('*')
        .eq('id', conversation_id)
        .eq('user_id', user.id)
        .single()
      if (loadErr || !existing) {
        _http = 404; _err = 'no_convo'
        return new Response(JSON.stringify({ error: 'Conversation not found.' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      convoRow = existing
    } else {
      // New conversation — require goal + target.
      if (!requested_goal) {
        _http = 400; _err = 'bad_input'
        return new Response(JSON.stringify({ error: 'goal required for new conversations.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (!requested_target || !requested_target.name) {
        _http = 400; _err = 'bad_input'
        return new Response(JSON.stringify({ error: 'target_person.name required for new conversations.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: created, error: insertErr } = await supabase
        .from('linkedin_outreach_conversations')
        .insert({
          user_id: user.id,
          goal: requested_goal,
          target_person: requested_target,
          message_thread: [],
          status: 'active',
        })
        .select()
        .single()
      if (insertErr || !created) {
        console.error('[generate-linkedin-outreach-message] insert failed:', insertErr)
        _http = 500; _err = 'insert_failed'
        return new Response(JSON.stringify({ error: 'Failed to create conversation.' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      convoRow = created
    }

    // Goal/target mid-thread editing per design 1A. Apply if the request
    // provided different values than what's stored.
    let activeGoal: OutreachGoal = convoRow.goal
    let activeTarget: TargetPerson = convoRow.target_person
    let needsUpdate = false
    if (requested_goal && requested_goal !== convoRow.goal) {
      activeGoal = requested_goal
      needsUpdate = true
    }
    if (requested_target && JSON.stringify(requested_target) !== JSON.stringify(convoRow.target_person)) {
      activeTarget = requested_target
      needsUpdate = true
    }

    // Append new_them_reply or mark_as_sent to the thread.
    const thread: ThreadMessage[] = Array.isArray(convoRow.message_thread)
      ? convoRow.message_thread.slice(0, MAX_THREAD_LEN)
      : []
    if (mark_as_sent !== undefined) {
      thread.push({ role: 'user', text: mark_as_sent.trim(), ts: new Date().toISOString() })
      needsUpdate = true
    }
    if (new_them_reply !== undefined) {
      // Empty string IS valid — signals silence/no-reply, triggers
      // follow-up coaching per decision 2A. We store an empty-text
      // message so the LLM sees the thread state correctly.
      thread.push({ role: 'them', text: new_them_reply.trim(), ts: new Date().toISOString() })
      needsUpdate = true
    }

    if (needsUpdate) {
      const { error: updateErr } = await supabase
        .from('linkedin_outreach_conversations')
        .update({
          goal: activeGoal,
          target_person: activeTarget,
          message_thread: thread,
        })
        .eq('id', convoRow.id)
        .eq('user_id', user.id)
      if (updateErr) {
        console.error('[generate-linkedin-outreach-message] update failed:', updateErr)
        _http = 500; _err = 'update_failed'
        return new Response(JSON.stringify({ error: 'Failed to update conversation.' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Fetch user data for grounding (same shape as generate-linkedin-comment).
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
      // PR13: gate for the propose_internship framework's program-
      // ENROLLMENT credibility lever. true when the user picked either
      // "Yes" option in onboarding's StepInternship (faculty_assigned
      // OR self_sourced — both mean "enrolled in my school's
      // internship program"; null means "No, not enrolled"). The
      // framework asserts ENROLLMENT only ("part of my university's
      // internship program") with SAME wording regardless of sub-type
      // — placement varies by sub-type and would over-claim for
      // self-sourcing students. sub-type is a data dimension for
      // analysis, not a behavior switch.
      in_practicum: !!profile.practicum_path,
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

    const framework = FRAMEWORK_BY_GOAL[activeGoal]
    const systemPrompt = SYSTEM_PROMPT + '\n\n' + OUTREACH_VOICE_RULES + '\n\n' + framework

    const threadForPrompt = thread.map((msg, i) => ({
      turn: i + 1,
      role: msg.role,
      text: msg.text,
    }))

    // Compute hints for the LLM about what kind of turn this is.
    const lastEntry = thread[thread.length - 1]
    const turnHint = thread.length === 0
      ? 'OPENER — generate the first message of the conversation.'
      : (new_them_reply !== undefined && new_them_reply.trim() === '')
        ? 'FOLLOW_UP_AFTER_SILENCE — the user marked the recipient as silent (no reply yet). Coach a soft follow-up that does NOT pile on. Acknowledge silence honestly without being passive-aggressive.'
        : lastEntry?.role === 'them'
          ? 'NEXT_RESPONSE — the recipient just replied. Read their reply carefully and coach a response that advances the goal.'
          : 'NEXT_TURN — the user wants the next AI suggestion. Read the thread state carefully and decide what to coach next.'

    const userPrompt = `OUTREACH GOAL: ${activeGoal}

TARGET PERSON:
${JSON.stringify(activeTarget, null, 2)}

CONVERSATION THREAD (so far):
${threadForPrompt.length === 0 ? '(empty — no messages sent yet)' : JSON.stringify(threadForPrompt, null, 2)}

USER DATA (the SENDER's profile, experiences, Story Bank — use these to ground the message in real specifics):
${JSON.stringify(userData, null, 2)}

TURN HINT: ${turnHint}

Now produce the next AI-coached suggestion as JSON per the output spec. Apply the goal-specific framework above + OUTREACH_VOICE_RULES strictly. If the user is pushing for the goal's ask in a turn that's premature given thread state, set warm_up_advice with explicit coaching for the warm-up turn instead.`

    const openaiResponse = await openaiChatCompletion(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      },
      openaiKey,
      {
        traceName: 'generate-linkedin-outreach-message',
        userId: user.id,
        // The conversation row id groups multi-turn outreach into one
        // Langfuse session — every turn of the same DM thread appears
        // together in the UI.
        sessionId: `outreach-${convoRow.id}`,
        metadata: {
          goal: activeGoal,
          thread_turn: thread.length,
        },
      },
      { signal: AbortSignal.timeout(60000) },
    )

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text()
      console.error(`[generate-linkedin-outreach-message] OpenAI ${openaiResponse.status}: ${errText.slice(0, 300)}`)
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
      console.error('[generate-linkedin-outreach-message] JSON parse failed:', content.slice(0, 200), parseErr)
      _http = 502; _err = 'json_parse'
      return new Response(JSON.stringify({ error: 'AI returned malformed response. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const suggestion = sanitizeSuggestion(rawParsed)
    if (!suggestion.suggested_text) {
      _http = 502; _err = 'empty_suggestion'
      return new Response(JSON.stringify({ error: 'AI returned an empty suggestion. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result: OutreachResponse = {
      conversation_id: convoRow.id,
      suggestion,
      message_thread: thread,
      goal: activeGoal,
      target_person: activeTarget,
      status: convoRow.status,
    }

    _ok = true; _http = 200
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('[generate-linkedin-outreach-message] unhandled:', error?.message || error)
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})

function sanitizeTargetPerson(raw: unknown): TargetPerson | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>
  const name = typeof t.name === 'string' ? t.name.trim().slice(0, MAX_NAME) : ''
  if (!name) return null
  const out: TargetPerson = { name }
  if (typeof t.role === 'string' && t.role.trim()) out.role = t.role.trim().slice(0, MAX_ROLE)
  if (typeof t.company === 'string' && t.company.trim()) out.company = t.company.trim().slice(0, MAX_COMPANY)
  if (typeof t.relationship === 'string' && t.relationship.trim()) out.relationship = t.relationship.trim().slice(0, MAX_RELATIONSHIP)
  if (typeof t.mutual_context === 'string' && t.mutual_context.trim()) out.mutual_context = t.mutual_context.trim().slice(0, MAX_MUTUAL)
  return out
}

function sanitizeSuggestion(raw: unknown): OutreachSuggestion {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const validTurnTypes = ['opener', 'follow_up_after_silence', 'next_response', 'connection_request_note']
  const validStates = ['cold_open', 'warming_up', 'rapport_built', 'making_the_ask', 'awaiting_reply', 'goal_complete']
  const turn_type = typeof r.turn_type === 'string' && validTurnTypes.includes(r.turn_type)
    ? r.turn_type as OutreachSuggestion['turn_type']
    : 'next_response'
  const conversation_state = typeof r.conversation_state === 'string' && validStates.includes(r.conversation_state)
    ? r.conversation_state as OutreachSuggestion['conversation_state']
    : 'warming_up'
  const warningsRaw = Array.isArray(r.warnings) ? r.warnings : []
  const warnings = warningsRaw
    .filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
    .map((w) => w.trim().slice(0, 300))

  const suggested_text = typeof r.suggested_text === 'string' ? r.suggested_text.trim().slice(0, 4000) : ''

  // Programmatic anti-pattern detection. The LLM does not reliably
  // follow rules against high-frequency training-data phrases ("I hope
  // you're doing well") even with hard-rule injection. Catch them in
  // post and surface a warning chip — the message is editable so the
  // user sees the warning, edits the line, sends.
  const lower = suggested_text.toLowerCase()
  const antiPatterns: { match: string; warn: string }[] = [
    { match: 'i hope this finds you well', warn: '"I hope this finds you well" is template phrasing — consider replacing with something specific.' },
    { match: 'i hope this email finds you well', warn: '"I hope this email finds you well" is template phrasing — consider replacing.' },
    { match: 'i hope this message finds you well', warn: '"I hope this message finds you well" is template phrasing — consider replacing.' },
    { match: "i hope you're doing well", warn: `"I hope you're doing well" is template phrasing — consider replacing with a specific reason for reaching out.` },
    { match: "i hope you're well", warn: `"I hope you're well" is template phrasing — consider replacing.` },
    { match: 'hope you are doing well', warn: '"Hope you are doing well" is template phrasing — consider replacing.' },
    { match: 'hope you are well', warn: '"Hope you are well" is template phrasing — consider replacing.' },
    { match: 'trust this finds you well', warn: '"Trust this finds you well" is template phrasing — consider replacing.' },
    { match: 'pick your brain', warn: '"Pick your brain" is overused outreach phrasing — consider naming a specific question instead.' },
    { match: 'i came across your profile', warn: '"I came across your profile" is template phrasing — consider opening with the specific reason instead.' },
  ]
  const programmaticWarnings: string[] = []
  for (const { match, warn } of antiPatterns) {
    if (lower.includes(match) && !programmaticWarnings.includes(warn)) {
      programmaticWarnings.push(warn)
    }
  }

  return {
    suggested_text,
    turn_type,
    angle: typeof r.angle === 'string' ? r.angle.trim().slice(0, 200) : '',
    warm_up_advice: typeof r.warm_up_advice === 'string' ? r.warm_up_advice.trim().slice(0, 800) : '',
    conversation_state,
    warnings: [...warnings, ...programmaticWarnings].slice(0, 8),
    generated_at: new Date().toISOString(),
  }
}
