import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { roleLibrary } from '../_shared/libraries/00_role_library.ts'

// Deterministic role-skills lookup. Used by ChatInterface's
// handleApplyRoadmapChanges as the first fallback when the AI agent
// suggests adding a role to the user's career roadmap. Returns
// matched_skills (subset of the user's profile.skills) and
// missing_skills (in human-readable form) so the row inserted into
// career_roles is fully populated and Home renders the skills card
// correctly.
//
// If the role isn't in the library, returns { found: false } and the
// caller falls back to AI-proposed skills (validated against
// profile.skills) or, ultimately, an empty-arrays insert with a soft
// "Refresh Analysis" notification.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Normalise to alphanumeric-lowercase for comparison. Handles the
// snake_case ↔ Title Case mismatch between role_library
// required_skills (snake_case ids) and profile.skills (free text the
// user typed). "Customer Communication" and "customer_communication"
// both normalise to "customercommunication".
function compareKey(s: string): string {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function snakeToTitle(s: string): string {
  return String(s || '').split('_')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Track suggestion based on readiness:
//   ≥ 0.6 → track_1 (Your Move — the user is essentially qualified)
//   0.3-0.6 → track_2 (Plan B — close, needs upskilling)
//   < 0.3  → track_3 (Work Toward — long-term goal)
function suggestTier(readiness: number): string {
  if (readiness >= 0.6) return 'track_1'
  if (readiness >= 0.3) return 'track_2'
  return 'track_3'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const m = startMetric('lookup-role-skills')
  let _ok = false
  let _http = 500
  let _err: string | null = null

  try {
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

    const body = await req.json()
    const roleTitle = String(body?.role_title || '').trim()
    if (!roleTitle) {
      _http = 400; _err = 'missing_input'
      return new Response(JSON.stringify({ error: 'role_title required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch user's profile.skills (the only profile field we need).
    const { data: profiles } = await supabase
      .from('profiles')
      .select('skills')
      .eq('id', user.id)
    const userSkills: string[] = (profiles?.[0]?.skills || []).map((s: unknown) => String(s))

    // Search role_library for case-insensitive match on
    // standardized_title or alternate_titles.
    const titleKey = compareKey(roleTitle)
    const roles = (roleLibrary as any).roles || []
    const match = roles.find((r: any) => {
      const candidates = [r.standardized_title, ...(r.alternate_titles || [])]
        .filter(Boolean)
        .map((s: string) => compareKey(s))
      return candidates.includes(titleKey)
    })

    if (!match) {
      _ok = true; _http = 200
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build a key→original map of the user's skills so matched_skills
    // returns the user's original casing (matches what they see
    // elsewhere in the app).
    const userSkillByKey = new Map<string, string>()
    for (const s of userSkills) {
      userSkillByKey.set(compareKey(s), s)
    }

    const required: string[] = match.required_skills || []
    const matched: string[] = []
    const missing: string[] = []
    for (const reqSkill of required) {
      const key = compareKey(reqSkill)
      if (userSkillByKey.has(key)) {
        matched.push(userSkillByKey.get(key)!)
      } else {
        missing.push(snakeToTitle(reqSkill))
      }
    }

    const readiness = required.length > 0 ? matched.length / required.length : 0

    _ok = true; _http = 200
    return new Response(JSON.stringify({
      found: true,
      role_id: match.id,
      matched_skills: matched,
      missing_skills: missing,
      readiness_score: readiness,
      suggested_tier: suggestTier(readiness),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('[lookup-role-skills] error:', error?.message || error)
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})
