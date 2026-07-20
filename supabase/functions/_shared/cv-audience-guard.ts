// cv-audience-guard.ts — deterministic guard against a fabrication class the
// number/proper-noun anti-fab gate can't see: AUDIENCE/MARKET-CLASS claims about
// the USER's own history (B2B, B2C, enterprise, SMB, mid-market...). The JD
// commonly names an audience model ("B2B SaaS accounts"); the About Me authoring
// weaves that vocabulary and can attach it to the user's experience even when
// their source never says it (observed: a B2C/Guardio background rendered as
// "managing high-value B2B accounts"). B2B/B2C are neither numbers nor proper
// nouns, so the existing gate misses them.
//
// This strips any audience-class term from the target text that does NOT appear
// in the user's source data (so a genuinely-B2B background keeps "B2B"). Applied
// to the About Me on BOTH the single-call and fan-out paths; the same helper
// backs an eval probe so the class is caught mechanically.

// Audience/market MODEL terms only — the clear "who did you sell/serve" class.
// Industry verticals (fintech, cybersecurity) are deliberately NOT included:
// they're often legitimately sourced (Guardio IS cybersecurity) and need a
// different, source-matched treatment.
const AUDIENCE_TERMS = [
  'b2b2c', 'b2b', 'b2c', 'd2c',
  'enterprise', 'smb', 'mid-market', 'midmarket',
  'small business', 'smbs',
]

// Word-boundary matcher per term (case-insensitive). Hyphen/plural handled per entry.
function termRegex(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'gi')
}

export interface AudienceGuardResult {
  text: string
  stripped: string[] // distinct terms removed (lowercased)
}

// Strip audience-class terms absent from the source. sourceHaystackLower must be
// the user's own data (experiences/responsibilities/bullets/skills/profile),
// lowercased. Returns the cleaned text + which terms were stripped (for the
// response diagnostic + eval).
export function stripUnsourcedAudienceTerms(
  text: string | null | undefined,
  sourceHaystackLower: string,
): AudienceGuardResult {
  if (!text) return { text: text ?? '', stripped: [] }
  let out = String(text)
  const stripped = new Set<string>()
  for (const term of AUDIENCE_TERMS) {
    if (sourceHaystackLower.includes(term)) continue // sourced → legitimate, keep
    if (termRegex(term).test(out)) {
      stripped.add(term)
      // Remove the term; then tidy the seams it leaves. Handles "high-value B2B
      // accounts" → "high-value accounts" and "in a B2B SaaS environment" →
      // "in a SaaS environment" without leaving double spaces or " ," artifacts.
      out = out.replace(termRegex(term), '')
    }
  }
  if (stripped.size) {
    out = out
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.;:])/g, '$1')
      .replace(/\(\s*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  return { text: out, stripped: [...stripped] }
}

// Eval/probe helper: list audience-class terms present in text but absent from
// source (i.e. the fabrication this guard prevents). Empty = clean.
export function unsourcedAudienceTerms(text: string | null | undefined, sourceHaystackLower: string): string[] {
  if (!text) return []
  const t = String(text)
  return AUDIENCE_TERMS.filter(term => !sourceHaystackLower.includes(term) && termRegex(term).test(t))
}
