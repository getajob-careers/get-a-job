// fanout-cv.ts — SPIKE (flag-gated, opt-in). Decomposes the single ~31s Pass-2
// authoring call into parallel per-section calls, assembled server-side, to test
// the fan-out latency thesis (~10-11s predicted; see
// docs/research/cv-pass2-fanout-proposal.md) WITHOUT changing the default path.
//
// Output contract: produces the SAME shape the single Pass-2 call produces —
// each experience bucket as [{index, bullets}], plus summary + skills — so the
// EXISTING reconcile (fillFromSource) / guards / anti-fab / PDF downstream runs
// unchanged. fit_analysis is computed deterministically (skill overlap) to keep
// it off the LLM critical path.
//
// Quality parity (NOT a trim): each per-role call preserves the role's source
// bullets/facts verbatim (rule 35), just authored in isolation. The only
// cross-CV coupling — the must_include_phrase distribution — is dissolved by
// pre-assigning phrases across the parallel calls (assignPhrases).

import type { TraceContext } from './openai-chat.ts'

// A transport fn with the openai/openrouter WithRetry signature. The caller
// passes whichever the request's cv_model selected, so fan-out inherits the
// exact same transport + retry as the single-call path.
export type ChatTransport = (
  payload: Record<string, unknown>,
  key: string,
  traceCtx: TraceContext,
  options: { signal?: AbortSignal },
) => Promise<Response>

export interface FanoutRole {
  index: number
  bucket: 'professional' | 'military' | 'volunteering' | 'leadership'
  title: string
  company: string
  dates?: string
  responsibilities?: string
  bullets?: string[]
  skills?: string[]
}

export interface FanoutInputs {
  roles: FanoutRole[]
  aboutContext: string   // slim profile summary + role titles for About Me
  skillsContext: string  // profile skills + JD skills for the Skills call
  jdKeywordBlock: string // must_include_phrases / action_verbs / domain_terms, compact
  mustIncludePhrases: string[]
  targetRole: string
  voiceRules: string     // shared CV_VOICE_RULES (identical across calls → tone parity)
  transport: ChatTransport
  key: string
  model: string
  baseTrace: Omit<TraceContext, 'traceName'>
  // deterministic fit inputs
  profileSkills: string[]
  jdSkills: string[]
  // Test-only fault injection (debug). Any role whose `${bucket}:${index}` is
  // listed skips its LLM call and goes straight to the source-bullets-verbatim
  // fallback — used to prove the never-drop fallback fires (fellBack=true).
  failRoles?: string[]
  // Progress hook: called once as each authoring sub-call (role / about / skills)
  // completes, so the caller can advance a {done,total,stage} progress row.
  onSubcallDone?: () => void
}

export interface FanoutResult {
  cvData: Record<string, any>
  timing: { label: string; ms: number }[]
  subcalls: { label: string; ok: boolean; fellBack: boolean; ms: number; ti: number; to: number }[]
  coverage: { phrases: number; covered_exact_substring: number; note: string }
  tokensIn: number
  tokensOut: number
}

const BUCKET_KEY: Record<string, string> = {
  professional: 'professional_experiences',
  military: 'military_experiences',
  volunteering: 'volunteering_experiences',
  leadership: 'leadership_experiences',
}

// Round-robin distribute the JD's must-include phrases across the parallel slots
// (each role + About Me + Skills), so the 6-across-CV target is met by
// construction instead of a global self-count the parallel calls can't run.
export function assignPhrases(phrases: string[], slotKeys: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const k of slotKeys) out[k] = []
  phrases.forEach((p, i) => { out[slotKeys[i % slotKeys.length]].push(p) })
  return out
}

function jsonFrom(text: string): any {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  return JSON.parse(cleaned)
}

// One per-role authoring call. Retries once on failure; on final failure returns
// the role's SOURCE bullets verbatim (never-drop fallback) with fellBack=true.
async function authorRole(
  role: FanoutRole,
  assigned: string[],
  inp: FanoutInputs,
  signal: AbortSignal,
): Promise<{ index: number; bullets: string[]; ok: boolean; fellBack: boolean; ms: number; ti: number; to: number }> {
  const t0 = Date.now()
  const sourceBullets = (role.bullets && role.bullets.length
    ? role.bullets
    : String(role.responsibilities || '').split(/\n|(?<=[.;])\s+/).map(s => s.trim()).filter(Boolean))
  // Test fault injection: force this role to fail → exercise the never-drop fallback.
  if (inp.failRoles?.includes(`${role.bucket}:${role.index}`)) {
    return { index: role.index, bullets: sourceBullets, ok: false, fellBack: true, ms: Date.now() - t0, ti: 0, to: 0 }
  }
  const system = `You rewrite the source responsibilities of ONE role into tightened ATS resume bullets for the target role "${inp.targetRole}".
RULES:
- Preserve EVERY source responsibility as a bullet — do not drop content, do not merge two into one. Same count in, same count out.
- 14-22 words per bullet. Lead with the achievement/action; a tool is never the subject.
- Preserve EVERY number, percentage, currency, duration, team size, tool name, and company/product name from the source VERBATIM. Never invent a metric.
- Weave in these JD phrases ONLY where they describe work the user actually did: ${assigned.join('; ') || '(none)'}.
- No em dash (U+2014). No filler ("results-driven", "passionate", "team player").
${inp.voiceRules}
Return JSON ONLY: {"bullets": string[]}.`
  const user = `TARGET ROLE: ${inp.targetRole}
JD SIGNAL: ${inp.jdKeywordBlock}
SOURCE ROLE: ${role.title}${role.company ? ' at ' + role.company : ''}${role.dates ? ' (' + role.dates + ')' : ''}
SOURCE RESPONSIBILITIES (author one bullet each, preserving facts):
${sourceBullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}`

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await inp.transport(
        { model: inp.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 1200 },
        inp.key,
        { ...inp.baseTrace, traceName: `generate-tailored-cv:fanout-role-${role.bucket}-${role.index}` },
        { signal },
      )
      if (!res.ok) continue
      const data = await res.json()
      const parsed = jsonFrom(data.choices?.[0]?.message?.content || '')
      const bullets = Array.isArray(parsed.bullets) ? parsed.bullets.map((b: any) => String(b)).filter(Boolean) : []
      if (bullets.length) return { index: role.index, bullets, ok: true, fellBack: false, ms: Date.now() - t0, ti: data.usage?.prompt_tokens ?? 0, to: data.usage?.completion_tokens ?? 0 }
    } catch (_) { /* retry */ }
  }
  // never-drop fallback: source bullets verbatim (no LLM tokens spent)
  return { index: role.index, bullets: sourceBullets, ok: false, fellBack: true, ms: Date.now() - t0, ti: 0, to: 0 }
}

async function authorAboutMe(assigned: string[], inp: FanoutInputs, signal: AbortSignal): Promise<{ summary: string; ok: boolean; ms: number; ti: number; to: number }> {
  const t0 = Date.now()
  const system = `Write a factual 3-4 sentence About Me for a resume targeting "${inp.targetRole}". Subject is always the USER (their experience/skills), never the target company. Use JD vocabulary where it genuinely applies. AUDIENCE/MARKET CLASS: a market-model term (B2B, B2C, enterprise, SMB, mid-market) or industry describes the TARGET ROLE — NEVER assert it of the USER's own history (no "B2B experience", "enterprise accounts") unless that exact term is in their source. Weave in: ${assigned.join('; ') || '(none)'}. No pronouns, no em dash, no filler.
${inp.voiceRules}
Return JSON ONLY: {"summary": string}.`
  try {
    const res = await inp.transport(
      { model: inp.model, messages: [{ role: 'system', content: system }, { role: 'user', content: `${inp.aboutContext}\nJD SIGNAL: ${inp.jdKeywordBlock}` }], response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 500 },
      inp.key, { ...inp.baseTrace, traceName: 'generate-tailored-cv:fanout-about' }, { signal },
    )
    if (res.ok) { const d = await res.json(); const p = jsonFrom(d.choices?.[0]?.message?.content || ''); if (p.summary) return { summary: String(p.summary), ok: true, ms: Date.now() - t0, ti: d.usage?.prompt_tokens ?? 0, to: d.usage?.completion_tokens ?? 0 } }
  } catch (_) { /* fall through */ }
  return { summary: '', ok: false, ms: Date.now() - t0, ti: 0, to: 0 }
}

async function authorSkills(assigned: string[], inp: FanoutInputs, signal: AbortSignal): Promise<{ skills: any; ok: boolean; ms: number; ti: number; to: number }> {
  const t0 = Date.now()
  const system = `Select and order resume skills for the target role "${inp.targetRole}". Prefer skills the user has that match the JD; do NOT invent skills the user lacks. Include: ${assigned.join('; ') || '(none)'} only if the user genuinely has them. Return JSON ONLY: {"skills": {"domain": string[], "tools": string[], "technical": string[]}}.`
  try {
    const res = await inp.transport(
      { model: inp.model, messages: [{ role: 'system', content: system }, { role: 'user', content: `${inp.skillsContext}\nJD SIGNAL: ${inp.jdKeywordBlock}` }], response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 600 },
      inp.key, { ...inp.baseTrace, traceName: 'generate-tailored-cv:fanout-skills' }, { signal },
    )
    if (res.ok) { const d = await res.json(); const p = jsonFrom(d.choices?.[0]?.message?.content || ''); if (p.skills) return { skills: p.skills, ok: true, ms: Date.now() - t0, ti: d.usage?.prompt_tokens ?? 0, to: d.usage?.completion_tokens ?? 0 } }
  } catch (_) { /* fall through */ }
  return { skills: null, ok: false, ms: Date.now() - t0, ti: 0, to: 0 }
}

// Deterministic fit — skill overlap %, band per the same 75/50/25 rubric the
// single-call path recomputes server-side anyway. Keeps fit off the LLM path.
function computeFit(profileSkills: string[], jdSkills: string[]): any {
  const prof = new Set(profileSkills.map(s => s.toLowerCase().trim()).filter(Boolean))
  const jd = jdSkills.map(s => s.toLowerCase().trim()).filter(Boolean)
  const matched = jd.filter(s => prof.has(s)).length
  const pct = jd.length ? Math.round((matched / jd.length) * 100) : 0
  const alignment = pct >= 75 ? 'Strong' : pct >= 50 ? 'Moderate' : pct >= 25 ? 'Weak' : 'Not a match'
  return { skill_match_percentage: pct, alignment }
}

export async function runFanout(inp: FanoutInputs, signal: AbortSignal): Promise<FanoutResult> {
  const t0 = Date.now()
  const timing: { label: string; ms: number }[] = []
  const mark = (l: string) => timing.push({ label: l, ms: Date.now() - t0 })

  const slotKeys = [
    ...inp.roles.map(r => `role:${r.bucket}:${r.index}`),
    'about', 'skills',
  ]
  const assigned = assignPhrases(inp.mustIncludePhrases, slotKeys)
  mark('assigned')

  const tick = <T,>(p: Promise<T>): Promise<T> => p.finally(() => inp.onSubcallDone?.())
  const roleP = inp.roles.map(r => tick(authorRole(r, assigned[`role:${r.bucket}:${r.index}`] || [], inp, signal)))
  const aboutP = tick(authorAboutMe(assigned['about'] || [], inp, signal))
  const skillsP = tick(authorSkills(assigned['skills'] || [], inp, signal))

  const [roleResults, about, skills] = await Promise.all([Promise.all(roleP), aboutP, skillsP])
  mark('authored')

  // assemble into the {index, bullets} bucket shape the reconcile step expects
  const cvData: Record<string, any> = {
    professional_experiences: [], military_experiences: [],
    volunteering_experiences: [], leadership_experiences: [],
  }
  // Assemble by POSITION, not by index: roleResults is 1:1 with inp.roles
  // (Promise.all preserves order), and `index` is per-BUCKET (every bucket
  // starts at 0), so a find(x => x.index === r.index) collides across buckets —
  // that bug gave every bucket's index-0 role the professional[0] bullets.
  inp.roles.forEach((r, i) => {
    const out = roleResults[i]
    cvData[BUCKET_KEY[r.bucket]].push({ index: r.index, bullets: out?.bullets || (r.bullets || []) })
  })
  cvData.summary = about.summary
  if (skills.skills) cvData.skills = skills.skills
  cvData.fit_analysis = computeFit(inp.profileSkills, inp.jdSkills)
  mark('assembled')

  // Coverage MEASUREMENT only (observability). The earlier re-author-About-Me
  // retry was removed after the eval proved it counterproductive: rendered
  // exact-substring coverage of the internal must-include phrases is inherently
  // low (the model weaves VARIANTS — "retention" for "renewals" — that exact
  // match misses), so `covered < target` fired on every run (+~4s each, p50
  // 12s→16s) AND re-authoring About Me wholesale could DROP a phrase already
  // present (a run went 3→2). The diagnosis stands: fan-out's rendered coverage
  // is already >= the single call (no gap to close). This count is retained for
  // the eval, explicitly labeled: exact-substring, UNDERCOUNTS variants.
  const renderedText = [
    cvData.summary || '',
    JSON.stringify(cvData.skills || {}),
    Object.keys(BUCKET_KEY).map(b => (cvData[BUCKET_KEY[b]] || []).flatMap((e: any) => e.bullets || []).join(' ')).join(' '),
  ].join(' ').toLowerCase()
  const phrases = inp.mustIncludePhrases
  const covered = phrases.filter(p => renderedText.includes(String(p).toLowerCase())).length
  const coverage = { phrases: phrases.length, covered_exact_substring: covered, note: 'rendered exact-substring; undercounts variants' }

  const subcalls = [
    ...inp.roles.map((r, i) => ({ label: `role-${r.bucket}-${r.index}`, ok: roleResults[i]?.ok ?? false, fellBack: roleResults[i]?.fellBack ?? true, ms: roleResults[i]?.ms ?? 0, ti: roleResults[i]?.ti ?? 0, to: roleResults[i]?.to ?? 0 })),
    { label: 'about', ok: about.ok, fellBack: !about.ok, ms: about.ms, ti: about.ti, to: about.to },
    { label: 'skills', ok: skills.ok, fellBack: !skills.ok, ms: skills.ms, ti: skills.ti, to: skills.to },
  ]
  const tokensIn = subcalls.reduce((a, s) => a + (s.ti || 0), 0)
  const tokensOut = subcalls.reduce((a, s) => a + (s.to || 0), 0)
  return { cvData, timing, subcalls, coverage, tokensIn, tokensOut }
}
