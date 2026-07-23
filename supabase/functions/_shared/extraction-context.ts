// extraction-context.ts — reference-only grounding context for the extraction
// functions (extract-bullets today; extract-story-from-text is import-ready).
//
// WHY: the extractors only ever saw the user's pasted text + the linked entry's
// title/company. With no sense of the user's field, target role, or existing
// skill vocabulary, they emit inconsistent skill labels and mis-framed bullets.
// This module fetches a COMPACT profile signal and formats it as an explicitly
// reference-only block.
//
// ANTI-FABRICATION IS NON-NEGOTIABLE. This context may ONLY shape (a) which
// skill NAMES the model uses (consistency/casing) and (b) how it frames a bullet
// toward the user's goal. It must NEVER become a source of facts, metrics,
// tools, or skills added to a bullet — those come from the USER TEXT alone. The
// block wording says so, the callers keep the anti-fab rules ahead of it, and
// the eval's anti-fab gate (docs/eval/story-extraction-rubric.md) is what
// verifies no regression before this ships.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface GroundingSignal {
  primaryDomain: string | null
  targetRole: string | null
  entrySkills: string[]
}

// Pure formatter — the single source of truth for the block SHAPE. The eval
// harness (scripts/story-extraction-eval.mjs) mirrors this exact shape; keep
// them in lockstep. Returns '' when there is nothing worth grounding on, so a
// thin-profile user's prompt is byte-identical to the pre-grounding prompt.
export function formatGroundingBlock(sig: GroundingSignal): string {
  const lines: string[] = []
  if (sig.primaryDomain) lines.push(`- The user's field: ${sig.primaryDomain}`)
  if (sig.targetRole) lines.push(`- Working toward: ${sig.targetRole}`)
  const skills = (sig.entrySkills || []).filter(Boolean).slice(0, 12)
  if (skills.length) {
    lines.push(
      `- Skill names the user already uses (match this wording/casing when a bullet demonstrates one — do NOT add a skill that isn't in the USER TEXT): ${skills.join(', ')}`,
    )
  }
  if (!lines.length) return ''
  return `\n\nGROUNDING CONTEXT (reference only — shapes skill NAMES and framing toward the goal; NEVER a source of facts, metrics, tools, or skills to add. Every claim in a bullet still comes from the USER TEXT alone):
${lines.join('\n')}`
}

// Fetches the profile signal for a user. RLS-scoped through the passed client.
// Best-effort: on any error or missing profile it returns empty signal so the
// caller falls back to the ungrounded prompt (never a hard failure).
export async function fetchGroundingSignal(
  supabase: SupabaseClient,
  userId: string,
  entrySkills: string[],
): Promise<GroundingSignal> {
  const empty: GroundingSignal = { primaryDomain: null, targetRole: null, entrySkills: entrySkills || [] }
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
      entrySkills: entrySkills || [],
    }
  } catch {
    return empty
  }
}
