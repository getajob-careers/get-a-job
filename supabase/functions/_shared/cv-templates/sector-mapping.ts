// sector-mapping.ts — three-layer sector resolution.
//
// Layer 1 (SECTOR_THEMES): role_family → font theme. Hardcoded mapping
// — 21 role_family values from 00_role_library.ts grouped into 3 themes
// (TECH_BUSINESS, FINANCE_LAW, ENGINEERING). Conservative palette per the
// visual-design research; 62% of recruiters say overdesign hurts
// perception (Resume Genius 2025-2026), so tones are intentionally muted.
//
// Layer 2 (matchRoleToLibrary): upgraded role-title matcher. The legacy
// inline matcher in generate-tailored-cv hit 17% on real application
// titles (n=12 real apps tested 2026-05-05). Failure modes: parenthetical
// suffixes "(IL)", seniority prefixes "Junior/Senior", slash-separated
// alternates, alternate_titles array sitting unused. This matcher fixes
// each. Lifting library_match rate has knock-on benefits beyond font
// selection — the LIBRARY_CONTEXT block in the LLM prompt only fires on
// match, so more matches → better-tailored CVs across the board.
//
// Layer 3 (resolveSectorTheme): fallback chain when no library match.
// 1. profile.target_industries[0] keyword scan → theme
// 2. profile.primary_domain keyword scan → theme
// 3. default TECH_BUSINESS (Calibri/blue) — pilot audience is Israeli
//    business students entering tech.

import type { SectorTheme } from './types.ts'

// ---------- Layer 1: themes ----------

export const TECH_BUSINESS: SectorTheme = {
  key: 'tech_business',
  font: 'Calibri',
  accentHex: '2D5BA8', // muted blue — Design Shack "classic blue"
  label: 'Tech / Business',
}

export const FINANCE_LAW: SectorTheme = {
  key: 'finance_law',
  font: 'Garamond',
  accentHex: '3F2E1E', // deep brown — Design Shack conservative palette
  label: 'Finance / Law',
}

export const ENGINEERING: SectorTheme = {
  key: 'engineering',
  font: 'Arial',
  accentHex: '1E5631', // forest green — Design Shack engineering palette
  label: 'Engineering',
}

// role_family → theme. The 21 family values come from
// 00_role_library.ts; if the library adds new families, this map will
// emit a TypeScript error since the values are union-checked at the
// call site (the family string is whatever the library has). Defensive
// fallback in resolveSectorTheme handles unknown families.
const FAMILY_TO_THEME: Record<string, SectorTheme> = {
  // Tech / business cluster — most pilot users land here
  Marketing: TECH_BUSINESS,
  Sales: TECH_BUSINESS,
  Product: TECH_BUSINESS,
  BD_Partnerships: TECH_BUSINESS,
  RevOps_BizOps: TECH_BUSINESS,
  Operations: TECH_BUSINESS,
  Customer_Experience: TECH_BUSINESS,
  Onboarding_Implementation: TECH_BUSINESS,
  Relationship_Growth: TECH_BUSINESS,
  Support: TECH_BUSINESS,
  HR_People: TECH_BUSINESS,
  Admin_GA: TECH_BUSINESS,
  Leadership: TECH_BUSINESS,
  Consulting: TECH_BUSINESS,
  // Finance cluster
  Finance: FINANCE_LAW,
  // Engineering / technical cluster
  Engineering: ENGINEERING,
  AI_ML: ENGINEERING,
  Data: ENGINEERING,
  IT_Security: ENGINEERING,
  Solutions_Engineering: ENGINEERING,
  Design_UX: ENGINEERING, // design treated as engineering-adjacent for font (Arial)
}

// ---------- Layer 2: upgraded matcher ----------

interface LibraryRole {
  id?: string
  role_id?: string
  title?: string
  standardized_title?: string
  alternate_titles?: string[]
  role_family?: string
}

// Whitespace + dash + underscore normalization. Same shape as the legacy
// matcher; we keep it identical so existing matches don't shift.
const normalize = (s: string) => s.toLowerCase().replace(/[\s_\-]+/g, ' ').trim()

// Strip parenthetical suffixes — "(IL)", "(Remote)", "(Contract to Hire)".
// Multiple parens stripped greedily.
const stripParens = (s: string) => s.replace(/\s*\([^)]*\)\s*/g, ' ').trim()

// Seniority prefixes that don't change the underlying role family. We
// strip them when they precede the title and try matching the bare
// title. We do NOT strip them when they appear in the library entry
// itself (e.g. an alternate_title that legitimately contains "Senior")
// — those match via direct comparison.
const SENIORITY_PREFIXES = [
  'junior', 'jr', 'jr.',
  'senior', 'sr', 'sr.',
  'lead', 'staff', 'principal',
  'associate', 'entry-level', 'entry level',
  'mid-level', 'mid level',
  'intern',
]
const stripSeniority = (s: string) => {
  let out = s
  for (const prefix of SENIORITY_PREFIXES) {
    const re = new RegExp(`^${prefix}\\s+`, 'i')
    out = out.replace(re, '')
  }
  return out.trim()
}

// AI / engineering keyword fallback — when the title clearly signals
// engineering even though it doesn't match a library entry. Used by
// resolveSectorTheme as a Layer-2-internal escape hatch BEFORE falling
// to Layer 3. Keeps us from defaulting "AI Automation Developer" to
// TECH_BUSINESS just because the library doesn't have it yet.
const ENGINEERING_KEYWORDS = [
  'engineer', 'developer', 'devops', 'ml engineer', 'machine learning',
  'data scientist', 'data engineer', 'ai automation', 'ai/automation',
  'ai engineer', 'ai developer', 'llm', 'sre', 'platform engineer',
  'infrastructure',
]
const FINANCE_KEYWORDS = [
  'investment banking', 'investment banker', 'investment associate',
  'private equity', 'venture capital', 'hedge fund', 'asset management',
  'equity research', 'corporate finance', 'financial analyst',
  'financial advisor', 'portfolio manager', 'compliance officer',
  'wealth management', 'risk analyst', 'quant',
]

// Try to find a library role for the input title. Returns the matched
// role + the matching strategy used (for diagnostics) or null.
//
// Strategy order — first hit wins:
//   1. Exact id / role_id match (legacy behavior, preserved)
//   2. Normalized exact match against title / standardized_title
//      (legacy behavior, preserved)
//   3. Normalized exact match against alternate_titles[] (NEW)
//   4. Strip parens, retry strategies 2-3 (NEW)
//   5. Strip seniority prefix, retry strategies 2-3 (NEW)
//   6. Slash-split + retry strategies 2-3 on each side (NEW)
//
// We do NOT do substring matching ("manager" matching "Engineering
// Manager"). The legacy matcher avoided substring for a reason — it
// produces wrong results on short generic words. Same discipline here.
export function matchRoleToLibrary(
  rawTitle: string,
  roleLibrary: { roles: LibraryRole[] },
): { role: LibraryRole; via: string } | null {
  const t = String(rawTitle || '').trim()
  if (!t) return null

  const roles = roleLibrary.roles
  const tn = normalize(t)

  // Strategy 1 — exact id
  const byId = roles.find(r => r.role_id === t || r.id === t)
  if (byId) return { role: byId, via: 'id' }

  // Strategy 2 — normalized title / standardized_title
  const matchTitle = (norm: string) => roles.find(r =>
    (r.title && normalize(r.title) === norm) ||
    (r.standardized_title && normalize(r.standardized_title) === norm)
  )
  const m2 = matchTitle(tn)
  if (m2) return { role: m2, via: 'title' }

  // Strategy 3 — alternate_titles
  const matchAlternate = (norm: string) => roles.find(r =>
    Array.isArray(r.alternate_titles) &&
    r.alternate_titles.some((alt: string) => normalize(alt) === norm)
  )
  const m3 = matchAlternate(tn)
  if (m3) return { role: m3, via: 'alternate_title' }

  // Strategy 4 — strip parens, retry 2-3
  const noParens = normalize(stripParens(t))
  if (noParens && noParens !== tn) {
    const m4t = matchTitle(noParens)
    if (m4t) return { role: m4t, via: 'title_stripped_parens' }
    const m4a = matchAlternate(noParens)
    if (m4a) return { role: m4a, via: 'alternate_stripped_parens' }
  }

  // Strategy 5 — strip seniority, retry 2-3
  const noSeniority = normalize(stripSeniority(stripParens(t)))
  if (noSeniority && noSeniority !== noParens) {
    const m5t = matchTitle(noSeniority)
    if (m5t) return { role: m5t, via: 'title_stripped_seniority' }
    const m5a = matchAlternate(noSeniority)
    if (m5a) return { role: m5a, via: 'alternate_stripped_seniority' }
  }

  // Strategy 6 — slash-split, retry 2-3 on each side
  if (noSeniority.includes('/')) {
    for (const side of noSeniority.split('/').map(s => s.trim()).filter(Boolean)) {
      const m6t = matchTitle(side)
      if (m6t) return { role: m6t, via: 'title_slash_split' }
      const m6a = matchAlternate(side)
      if (m6a) return { role: m6a, via: 'alternate_slash_split' }
    }
  }

  // Strategy 7 — prefix match. Handles titles with team/scope/qualifier
  // suffixes that don't match the canonical exactly:
  //   "Customer Success Specialist – VIP Team" → "Customer Success Specialist"
  //   "Marketing Coordinator – Growth Team"   → "Marketing Coordinator"
  // Walks longest-first so the most specific role wins. Gated by ≥2
  // tokens after seniority+paren stripping to prevent "PM" → matching
  // any role starting with "PM". Mirrors the client-side helper at
  // src/lib/roleSkillsLookup.js — keep the two in sync.
  const tokens = noSeniority.split(/\s+/).filter(Boolean)
  if (tokens.length >= 2) {
    for (let len = tokens.length - 1; len >= 2; len--) {
      const prefix = tokens.slice(0, len).join(' ')
      const m7t = matchTitle(prefix)
      if (m7t) return { role: m7t, via: 'title_prefix' }
      const m7a = matchAlternate(prefix)
      if (m7a) return { role: m7a, via: 'alternate_prefix' }
    }
  }

  return null
}

// ---------- Layer 3: fallback chain ----------

interface ProfileShape {
  target_industries?: unknown
  primary_domain?: unknown
}

// Try to extract a sector theme from profile signals when the role
// library didn't match. Returns null if nothing matches; the caller
// then falls to default TECH_BUSINESS.
function themeFromProfile(profile: ProfileShape | null | undefined): SectorTheme | null {
  if (!profile) return null

  const industries = Array.isArray(profile.target_industries)
    ? profile.target_industries.map(s => String(s).toLowerCase())
    : []
  const domain = String(profile.primary_domain || '').toLowerCase()

  const haystack = [...industries, domain].join(' ')
  if (!haystack.trim()) return null

  // Engineering signals (most specific first)
  if (/\b(engineering|software|hardware|robotics|cyber|infrastructure|platform engineering)\b/.test(haystack)) {
    return ENGINEERING
  }
  // Finance signals
  if (/\b(finance|banking|investment|capital markets|asset management|trading|insurance)\b/.test(haystack)) {
    return FINANCE_LAW
  }
  // AI/data — engineering bucket per the font theme grouping
  if (/\b(ai|artificial intelligence|machine learning|data science)\b/.test(haystack)) {
    return ENGINEERING
  }
  // Tech / business — broadest catch
  if (/\b(technology|tech|software as a service|saas|product|marketing|sales|operations|consulting)\b/.test(haystack)) {
    return TECH_BUSINESS
  }
  return null
}

// Resolve sector theme from all available signals. Order:
//   1. role_library match → role_family → theme (most specific)
//   2. role title keyword match (engineering / finance keywords)
//   3. profile.target_industries / primary_domain keyword scan
//   4. default TECH_BUSINESS
//
// Returns the theme + a diagnostic source string for logging.
export function resolveSectorTheme(
  rawTitle: string,
  roleLibrary: { roles: LibraryRole[] },
  profile: ProfileShape | null | undefined,
): { theme: SectorTheme; source: string } {
  // 1. Library match
  const match = matchRoleToLibrary(rawTitle, roleLibrary)
  if (match?.role.role_family) {
    const theme = FAMILY_TO_THEME[match.role.role_family]
    if (theme) return { theme, source: `role_family:${match.role.role_family} (via ${match.via})` }
  }

  // 2. Role-title keyword fallback
  const tn = normalize(stripParens(String(rawTitle || '')))
  if (ENGINEERING_KEYWORDS.some(kw => tn.includes(kw))) {
    return { theme: ENGINEERING, source: 'title_keyword:engineering' }
  }
  if (FINANCE_KEYWORDS.some(kw => tn.includes(kw))) {
    return { theme: FINANCE_LAW, source: 'title_keyword:finance' }
  }

  // 3. Profile fallback
  const fromProfile = themeFromProfile(profile)
  if (fromProfile) {
    return { theme: fromProfile, source: 'profile_fallback' }
  }

  // 4. Default — pilot audience is Israeli business students entering tech
  return { theme: TECH_BUSINESS, source: 'default' }
}
