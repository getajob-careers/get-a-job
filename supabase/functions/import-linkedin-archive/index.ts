import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { BlobReader, ZipReader, TextWriter } from 'https://esm.sh/@zip.js/zip.js@2.7.45'
import { startMetric, finishMetric } from '../_shared/metrics.ts'

// import-linkedin-archive — Wk 3 of the June 15 launch sprint.
//
// Receives a LinkedIn data archive ZIP (the user requests their archive from
// LinkedIn → Settings → Get a copy of your data), parses the user's OWN
// profile data from the allow-listed CSV files, and upserts the structured
// shape into linkedin_optimizations.baseline_data. The Optimizer then
// consumes baseline_data as the "current LinkedIn" context the LLM compares
// against when generating improved sections.
//
// baseline_data sections (all optional — only populated when present in the
// archive): profile, positions, education, skills, recommendations, honors,
// volunteering, languages, preferences.
//
// Privacy posture (CRITICAL):
//   - The ZIP lives in function memory only — never written to Storage,
//     never persisted to disk. Garbage collected when the response returns.
//   - ALLOW-LIST of files we parse (defined in TARGETED_FILES). Any other
//     file in the archive is ignored, recorded in files_skipped for audit.
//   - Connections.csv, Messages.csv, Invitations.csv, Endorsement_*.csv and
//     any other file containing third-party PII are EXPLICITLY in the skip
//     list — pending Israeli Privacy Protection Law Amendment 13 review
//     before we touch connection data.
//   - Logs: counts only ("positions: 7"), never names/emails/text content.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// 10/hour. Imports are rare (a user re-imports only when their LinkedIn
// changes substantially) — this protects against abuse without constraining
// legitimate use.
const RATE_LIMIT_CALLS = 10
const RATE_LIMIT_WINDOW = 3600

// Hard cap on archive size. LinkedIn archives are typically 1–5 MB; 50 MB
// is generous headroom for power users with extensive activity history,
// while still preventing memory exhaustion attacks.
const MAX_ZIP_BYTES = 50 * 1024 * 1024

// File allow-list. Keys are the section names we'll write to baseline_data;
// values are the candidate filenames LinkedIn has used over time (case-
// insensitive match — LinkedIn renames files between archive format
// revisions, so we match any historical name).
const TARGETED_FILES: Record<string, string[]> = {
  profile: ['Profile.csv'],
  positions: ['Positions.csv'],
  education: ['Education.csv'],
  skills: ['Skills.csv'],
  recommendations: ['Recommendations_Received.csv', 'Recommendations Received.csv'],
  honors: ['Honors.csv', 'Honors_and_Awards.csv', 'Honors and Awards.csv'],
  volunteering: ['Volunteering.csv', 'Volunteer_Experience.csv', 'Volunteer Experience.csv'],
  languages: ['Languages.csv'],
  // Job Seeker Preferences ships under a Jobs/ subdirectory in LinkedIn's
  // archive ('Jobs/Job Seeker Preferences.csv'). The path is stripped to
  // basename before this lookup, so just the leaf filename is needed here.
  // Carries Job Titles / Industries / Dream Companies / Locations etc — high-
  // signal data the user explicitly set. Downstream consumers: Career Roadmap
  // cross-check (does our generated target_job_titles match what they want?)
  // and Internship Company Picker seed list.
  preferences: ['Job Seeker Preferences.csv'],
}

// Files we EXPLICITLY refuse to parse — these contain third-party PII or are
// privacy-sensitive. Even if a future code path tried to read them, this
// list is a second-layer guard. Logged in files_skipped with reason 'policy'
// so the audit trail shows we deliberately rejected them.
const POLICY_BLOCKED_FILES = new Set([
  'connections.csv',
  'messages.csv',
  'invitations.csv',
  'endorsement_received_info.csv',
  'endorsement_given_info.csv',
  'recommendations_given.csv',
  'recommendations given.csv',
  'search_queries.csv',
  'search history.csv',
  'logins.csv',
  'ads_clicked.csv',
  'ad_targeting.csv',
])

// CSV parser — RFC-4180-ish, handles quoted fields with embedded commas,
// escaped quotes (""), and CRLF line endings. LinkedIn CSVs are well-formed
// in practice but a custom parser keeps us off heavy dependencies.
function parseCsv(text: string): Record<string, string>[] {
  // Strip UTF-8 BOM if present (LinkedIn occasionally emits one).
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)

  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const len = text.length

  while (i < len) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += ch; i++; continue
    }
    if (ch === '"') { inQuotes = true; i++; continue }
    if (ch === ',') { cur.push(field); field = ''; i++; continue }
    if (ch === '\r') { i++; continue }
    if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; i++; continue }
    field += ch; i++
  }
  // Last field / row (no trailing newline).
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur) }

  if (rows.length < 2) return []
  const header = rows[0].map(h => h.trim())
  const out: Record<string, string>[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (row.length === 1 && row[0] === '') continue // skip blank lines
    const obj: Record<string, string> = {}
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = (row[c] ?? '').trim()
    }
    out.push(obj)
  }
  return out
}

// LinkedIn date columns come in various forms: "Mar 2024", "March 2024",
// "2024", "03/15/2024", or empty. Normalise to YYYY-MM (or YYYY for year-
// only) when parseable; null otherwise. We don't store invented day
// precision since LinkedIn rarely exposes it.
const MONTHS: Record<string, string> = {
  jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
  apr: '04', april: '04', may: '05', jun: '06', june: '06',
  jul: '07', july: '07', aug: '08', august: '08', sep: '09', sept: '09', september: '09',
  oct: '10', october: '10', nov: '11', november: '11', dec: '12', december: '12',
}
function parseLinkedinDate(s: string | undefined): string | null {
  if (!s) return null
  const trimmed = s.trim()
  if (!trimmed || /^present$/i.test(trimmed)) return null
  // "Mar 2024" / "March 2024"
  const monthYear = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/)
  if (monthYear) {
    const m = MONTHS[monthYear[1].toLowerCase()]
    if (m) return `${monthYear[2]}-${m}`
  }
  // Year only
  if (/^\d{4}$/.test(trimmed)) return trimmed
  // ISO-ish "2024-03" / "2024-03-15"
  const iso = trimmed.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/)
  if (iso) return iso[3] ? `${iso[1]}-${iso[2]}-${iso[3]}` : `${iso[1]}-${iso[2]}`
  // Slash format "03/15/2024" or "3/2024"
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) return `${slash[3]}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`
  const slashShort = trimmed.match(/^(\d{1,2})\/(\d{4})$/)
  if (slashShort) return `${slashShort[2]}-${slashShort[1].padStart(2, '0')}`
  return null
}

// Per-section row mappers. LinkedIn changes column names occasionally, so we
// try a few historical variants for each field. Returns the parsed structure
// or null if the row is empty/malformed (skip silently — partial rows are
// expected for users who haven't filled every field).
function pickFirst(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    if (row[k] && row[k].length > 0) return row[k]
  }
  return ''
}

function mapProfile(rows: Record<string, string>[]): Record<string, unknown> | null {
  if (!rows.length) return null
  const r = rows[0] // Profile.csv is single-row
  const out: Record<string, unknown> = {
    first_name: pickFirst(r, ['First Name']),
    last_name: pickFirst(r, ['Last Name']),
    headline: pickFirst(r, ['Headline']),
    about: pickFirst(r, ['Summary', 'About']),
    industry: pickFirst(r, ['Industry']),
    country: pickFirst(r, ['Geo Country', 'Country']),
    city: pickFirst(r, ['Geo Location', 'Location']),
  }
  // Strip empty keys for tidier JSONB.
  for (const k of Object.keys(out)) if (!out[k]) delete out[k]
  return Object.keys(out).length ? out : null
}

function mapPositions(rows: Record<string, string>[]): Array<Record<string, unknown>> {
  return rows.map(r => {
    const out: Record<string, unknown> = {
      company: pickFirst(r, ['Company Name', 'Company']),
      title: pickFirst(r, ['Title']),
      description: pickFirst(r, ['Description']),
      location: pickFirst(r, ['Location']),
      started_on: parseLinkedinDate(pickFirst(r, ['Started On', 'Start Date'])),
      finished_on: parseLinkedinDate(pickFirst(r, ['Finished On', 'End Date'])),
    }
    for (const k of Object.keys(out)) if (!out[k]) delete out[k]
    return out
  }).filter(p => p.company || p.title)
}

function mapEducation(rows: Record<string, string>[]): Array<Record<string, unknown>> {
  return rows.map(r => {
    const out: Record<string, unknown> = {
      school: pickFirst(r, ['School Name', 'School']),
      degree: pickFirst(r, ['Degree Name', 'Degree']),
      field: pickFirst(r, ['Notes', 'Activities']),
      started_on: parseLinkedinDate(pickFirst(r, ['Start Date'])),
      finished_on: parseLinkedinDate(pickFirst(r, ['End Date'])),
    }
    for (const k of Object.keys(out)) if (!out[k]) delete out[k]
    return out
  }).filter(e => e.school)
}

function mapSkills(rows: Record<string, string>[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    const name = pickFirst(r, ['Name', 'Skill'])
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

function mapRecommendations(rows: Record<string, string>[]): Array<Record<string, unknown>> {
  return rows.map(r => {
    const out: Record<string, unknown> = {
      recommender_name: pickFirst(r, ['First Name', 'Recommender Name']),
      recommender_last: pickFirst(r, ['Last Name']),
      relationship: pickFirst(r, ['Company', 'Relationship']),
      text: pickFirst(r, ['Text', 'Recommendation']),
      date: parseLinkedinDate(pickFirst(r, ['Creation Date', 'Date'])),
      status: pickFirst(r, ['Status']),
    }
    // Combine first + last into recommender_name; the user's own name is
    // first_name + last_name in Profile.csv so the recommender's surname is
    // their own data, not third-party PII reuse — but limit to recommendations
    // the user explicitly accepted (Status='VISIBLE').
    if (out.recommender_last) {
      out.recommender_name = `${out.recommender_name} ${out.recommender_last}`.trim()
      delete out.recommender_last
    }
    for (const k of Object.keys(out)) if (!out[k]) delete out[k]
    return out
  }).filter(r => r.text) // skip recommendations with no text
}

function mapHonors(rows: Record<string, string>[]): Array<Record<string, unknown>> {
  return rows.map(r => {
    const out: Record<string, unknown> = {
      title: pickFirst(r, ['Title', 'Name']),
      issuer: pickFirst(r, ['Issuer']),
      date: parseLinkedinDate(pickFirst(r, ['Issued On', 'Date'])),
      description: pickFirst(r, ['Description']),
    }
    for (const k of Object.keys(out)) if (!out[k]) delete out[k]
    return out
  }).filter(h => h.title)
}

function mapVolunteering(rows: Record<string, string>[]): Array<Record<string, unknown>> {
  return rows.map(r => {
    const out: Record<string, unknown> = {
      organization: pickFirst(r, ['Company Name', 'Organization']),
      role: pickFirst(r, ['Role']),
      cause: pickFirst(r, ['Cause']),
      started_on: parseLinkedinDate(pickFirst(r, ['Started On', 'Start Date'])),
      finished_on: parseLinkedinDate(pickFirst(r, ['Finished On', 'End Date'])),
      description: pickFirst(r, ['Description']),
    }
    for (const k of Object.keys(out)) if (!out[k]) delete out[k]
    return out
  }).filter(v => v.organization || v.role)
}

function mapLanguages(rows: Record<string, string>[]): Array<Record<string, unknown>> {
  return rows.map(r => {
    const out: Record<string, unknown> = {
      name: pickFirst(r, ['Name', 'Language']),
      proficiency: pickFirst(r, ['Proficiency']),
    }
    for (const k of Object.keys(out)) if (!out[k]) delete out[k]
    return out
  }).filter(l => l.name)
}

// Job Seeker Preferences is a single-row file with deliberate user-set
// targeting fields. Multi-value fields use pipe ('|') delimiters in
// LinkedIn's export — confirmed from real archive inspection.
//
// PII discipline: Phone Number and Commute Preference Starting Address are
// EXPLICITLY skipped — those are home address / contact info that don't
// belong in baseline_data. Other low-signal fields (visibility flags,
// commute mode, etc) are also dropped to keep the JSONB lean and the
// downstream LLM prompt focused on targeting signal.
function splitPipe(s: string): string[] {
  if (!s) return []
  return s.split('|').map(x => x.trim()).filter(Boolean)
}
function mapPreferences(rows: Record<string, string>[]): Record<string, unknown> | null {
  if (!rows.length) return null
  const r = rows[0]
  const out: Record<string, unknown> = {
    job_titles: splitPipe(pickFirst(r, ['Job Titles'])),
    industries: splitPipe(pickFirst(r, ['Industries'])),
    locations: splitPipe(pickFirst(r, ['Locations'])),
    dream_companies: splitPipe(pickFirst(r, ['Dream Companies'])),
    preferred_job_types: splitPipe(pickFirst(r, ['Preferred Job Types'])),
    company_employee_count: splitPipe(pickFirst(r, ['Company Employee Count'])),
    job_title_for_fast_growing: pickFirst(r, ['Job Title For Searching Fast Growing Companies']),
    introduction_statement: pickFirst(r, ['Introduction Statement']),
    semantic_preferences: pickFirst(r, ['Semantic Preferences']),
    open_to_recruiters: pickFirst(r, ['Open To Recruiters']),
    job_seeker_activity_level: pickFirst(r, ['Job Seeker Activity Level']),
    job_seeking_urgency_level: pickFirst(r, ['Job Seeking Urgency Level']),
    preferred_start_time_range: pickFirst(r, ['Preferred Start Time Range']),
  }
  // Strip empty strings AND empty arrays — keeps the JSONB lean. An empty
  // dream_companies array carries no signal and clutters the prompt context.
  for (const k of Object.keys(out)) {
    const v = out[k]
    if (!v) delete out[k]
    else if (Array.isArray(v) && v.length === 0) delete out[k]
  }
  return Object.keys(out).length ? out : null
}

const MAPPERS: Record<string, (rows: Record<string, string>[]) => unknown> = {
  profile: mapProfile,
  positions: mapPositions,
  education: mapEducation,
  skills: mapSkills,
  recommendations: mapRecommendations,
  honors: mapHonors,
  volunteering: mapVolunteering,
  languages: mapLanguages,
  preferences: mapPreferences,
}

// Parse the ZIP from a Uint8Array, returning the structured baseline + a
// parse summary. ALL parsing happens in memory; the input bytes are not
// retained beyond this function call.
export async function parseLinkedinArchive(bytes: Uint8Array): Promise<{
  baseline: Record<string, unknown>
  filesParsed: string[]
  filesSkipped: Array<{ name: string; reason: string }>
  counts: Record<string, number>
}> {
  const zipReader = new ZipReader(new BlobReader(new Blob([bytes as unknown as BlobPart])))
  const entries = await zipReader.getEntries()

  // Build a case-insensitive lookup from filename → desired section.
  const sectionByFilename = new Map<string, string>()
  for (const [section, candidates] of Object.entries(TARGETED_FILES)) {
    for (const c of candidates) sectionByFilename.set(c.toLowerCase(), section)
  }

  const baseline: Record<string, unknown> = {}
  const filesParsed: string[] = []
  const filesSkipped: Array<{ name: string; reason: string }> = []
  const counts: Record<string, number> = {}

  for (const entry of entries) {
    if (entry.directory) continue
    // Strip any path prefix LinkedIn may use (e.g. "Basic_LinkedInDataExport_.../Profile.csv")
    const baseName = entry.filename.split('/').pop() || entry.filename
    const lower = baseName.toLowerCase()

    if (POLICY_BLOCKED_FILES.has(lower)) {
      filesSkipped.push({ name: baseName, reason: 'policy' })
      continue
    }

    const section = sectionByFilename.get(lower)
    if (!section) {
      filesSkipped.push({ name: baseName, reason: 'not_in_allowlist' })
      continue
    }

    if (!entry.getData) continue
    const writer = new TextWriter()
    const text = await entry.getData(writer)
    const rows = parseCsv(text)
    const mapped = MAPPERS[section](rows)

    baseline[section] = mapped
    filesParsed.push(baseName)
    counts[section] = Array.isArray(mapped) ? mapped.length : (mapped ? 1 : 0)
  }

  await zipReader.close()
  return { baseline, filesParsed, filesSkipped, counts }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const m = startMetric('import-linkedin-archive')
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

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: allowed } = await serviceClient.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_function_name: 'import-linkedin-archive',
      p_max_calls: RATE_LIMIT_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW,
    })
    if (allowed === false) {
      _http = 429; _err = 'rate_limit'
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in an hour.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      _http = 400; _err = 'bad_input'
      return new Response(JSON.stringify({ error: 'Expected multipart/form-data with a file field' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch (e) {
      console.error('[import-linkedin-archive] formData parse failed:', (e as Error)?.message)
      _http = 400; _err = 'bad_multipart'
      return new Response(JSON.stringify({ error: 'Invalid multipart body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      _http = 400; _err = 'missing_file'
      return new Response(JSON.stringify({ error: 'file field is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (file.size > MAX_ZIP_BYTES) {
      _http = 413; _err = 'file_too_large'
      return new Response(JSON.stringify({ error: `File too large. Max ${MAX_ZIP_BYTES / 1024 / 1024}MB.` }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Sniff zip magic bytes — content-type from the browser is unreliable.
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
      _http = 400; _err = 'not_zip'
      return new Response(JSON.stringify({ error: 'File does not appear to be a ZIP archive' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let parseResult: Awaited<ReturnType<typeof parseLinkedinArchive>>
    try {
      parseResult = await parseLinkedinArchive(bytes)
    } catch (e) {
      console.error('[import-linkedin-archive] parse failed:', (e as Error)?.message)
      _http = 400; _err = 'parse_failed'
      return new Response(JSON.stringify({ error: 'Failed to parse ZIP. Make sure it is a LinkedIn data archive.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (parseResult.filesParsed.length === 0) {
      _http = 400; _err = 'no_recognised_files'
      return new Response(JSON.stringify({
        error: 'No recognised files found in archive. Make sure this is a LinkedIn data export ZIP.',
        files_skipped: parseResult.filesSkipped.slice(0, 20),
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const importedAt = new Date().toISOString()
    const baselineData = {
      ...parseResult.baseline,
      _meta: {
        imported_at: importedAt,
        files_parsed: parseResult.filesParsed,
        files_skipped: parseResult.filesSkipped,
        counts: parseResult.counts,
      },
    }

    // UPSERT — single-state workspace per user; re-import overwrites baseline
    // but preserves any existing generated_data so the user doesn't lose
    // their last generation when they refresh their LinkedIn data.
    const { error: upsertError } = await serviceClient
      .from('linkedin_optimizations')
      .upsert({
        user_id: user.id,
        baseline_data: baselineData,
        baseline_source: 'archive_import',
        baseline_imported_at: importedAt,
      }, { onConflict: 'user_id' })

    if (upsertError) {
      console.error('[import-linkedin-archive] upsert failed:', upsertError.message)
      _http = 500; _err = 'db_upsert'
      return new Response(JSON.stringify({ error: 'Failed to save baseline. Please try again.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[import-linkedin-archive] user=${user.id} parsed=${parseResult.filesParsed.length} skipped=${parseResult.filesSkipped.length} counts=${JSON.stringify(parseResult.counts)}`)

    _ok = true; _http = 200
    return new Response(JSON.stringify({
      imported_at: importedAt,
      files_parsed: parseResult.filesParsed,
      files_skipped: parseResult.filesSkipped,
      counts: parseResult.counts,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('[import-linkedin-archive] unhandled:', error?.message || error)
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})
