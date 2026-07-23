// extraction-context.ts — reference-only grounding context for the extraction
// functions (extract-bullets today; extract-story-from-text is import-ready).
//
// WHY: the extractors only ever saw the user's pasted text + the linked entry's
// title/company. With no sense of the user's field or target role, they frame
// bullets generically. This module fetches a COMPACT profile signal (field +
// target role only) and formats it as an explicitly reference-only block.
//
// SCOPE — round-1 recalibration (2026-07-23, hub-ruled). An earlier version also
// fed the user's existing SKILL NAMES as vocabulary. The frozen eval proved that
// line was a fabrication leak: gpt-4o-mini emitted the listed profile skills
// (Python/SQL) as demonstrated skills on pastes that never mentioned them
// (docs/eval/story-extraction-baseline-findings.md). It was removed. The
// field + target-role lines leaked nothing and carried the only measured gain,
// so ONLY those remain. Reintroducing skill vocabulary belongs in skill-ID
// RESOLUTION (never in the extraction prompt) — deferred proposal #2.
//
// ANTI-FABRICATION IS NON-NEGOTIABLE. This context may ONLY shape how a bullet is
// framed toward the user's goal. It must NEVER become a source of facts,
// metrics, tools, or skills — those come from the USER TEXT alone.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface GroundingSignal {
  primaryDomain: string | null
  targetRole: string | null
}

// Pure formatter — the single source of truth for the block SHAPE. The eval
// harness (scripts/story-extraction-eval.mjs) mirrors this exact shape; keep
// them in lockstep. Returns '' when there is nothing worth grounding on, so a
// thin-profile user's prompt is byte-identical to the pre-grounding prompt.
export function formatGroundingBlock(sig: GroundingSignal): string {
  const lines: string[] = []
  if (sig.primaryDomain) lines.push(`- The user's field: ${sig.primaryDomain}`)
  if (sig.targetRole) lines.push(`- Working toward: ${sig.targetRole}`)
  if (!lines.length) return ''
  return `\n\nGROUNDING CONTEXT (reference only — frames the bullet toward the user's goal; NEVER a source of facts, metrics, tools, or skills to add. Every claim in a bullet still comes from the USER TEXT alone):
${lines.join('\n')}`
}

// Fetches the profile signal for a user. RLS-scoped through the passed client.
// Best-effort: on any error or missing profile it returns empty signal so the
// caller falls back to the ungrounded prompt (never a hard failure).
export async function fetchGroundingSignal(
  supabase: SupabaseClient,
  userId: string,
): Promise<GroundingSignal> {
  const empty: GroundingSignal = { primaryDomain: null, targetRole: null }
  try {
    const { data } = await supabase
      .from('profiles')
      .select('primary_domain, five_year_role')
      .eq('id', userId)
      .maybeSingle()
    if (!data) return empty
    return {
      primaryDomain: (data.primary_domain as string | null) || null,
      targetRole: (data.five_year_role as string | null) || null,
    }
  } catch {
    return empty
  }
}
