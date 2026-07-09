// proof-signals-prompt.ts — single source of truth for the
// extract-proof-signals system prompt.
//
// Both the production edge function (extract-proof-signals/index.ts)
// and the bake-off harness (scripts/test-proof-signals-bakeoff.ts)
// import SYSTEM_PROMPT from here. The string produced is byte-identical
// to the prior inline build; this file was extracted purely to let the
// harness score the EXACT production prompt without replicating the
// build logic and risking drift.
//
// No runtime dependencies — pure data composition over the three
// library files. Deno-safe and Node-safe.

import { proofSignalExtractionLogic } from './libraries/08_proof_signal_extraction_logic.ts'
import { proofSignalLibrary } from './libraries/02_proof_signal_library.ts'
import { skillLibrary } from './libraries/01_skill_library.ts'

const el = proofSignalExtractionLogic as any

// Filter to entries with a non-empty top-level `.id`. The library
// currently holds 625 entries but only 125 use the canonical
// {id, description, ...} shape — the other 500 use an alternate
// {signal_id, signal_text, ...} shape from an unfinished merge
// (see merge-libraries.cjs WIP commit). Pre-filter: those 500 used to
// render as literal `undefined: undefined ...` lines in the prompt,
// wasting ~10k tokens per call without offering the LLM any valid
// IDs. Filtering removes ONLY those undefined lines; the 125 canonical
// `id: description ...` lines are byte-identical to the prior build.
// The 500 entries themselves stay in the library file untouched —
// schema-migrating them to the canonical shape is a separate library
// project.
const signalRef = (proofSignalLibrary.proof_signal_library as unknown as any[])
  .filter(s => typeof s?.id === 'string' && s.id.trim().length > 0)
  .map(s => `${s.id}: ${s.description}${s.maps_to_skills?.length ? ` [skills: ${s.maps_to_skills.slice(0, 4).join(', ')}]` : ''}`)
  .join('\n')

const skillRef = (skillLibrary.skill_library as unknown as any[])
  .map(s => `${s.id}: ${s.name}`)
  .join('\n')

const strengthRules = [
  `strong (1.0): ${el.strength_rules.strong.join(', ')}`,
  `medium (0.6): ${el.strength_rules.medium.join(', ')}`,
  `weak (0.3): ${el.strength_rules.weak.join(', ')}`,
  `very_weak (0.1): ${el.strength_rules.very_weak.join(', ')}`,
].join('\n')

const domainRules = Object.entries(el.domain_detection.primary_domain_rules as Record<string, string[]>)
  .map(([domain, keywords]) => `${domain}: ${keywords.join(', ')}`)
  .join('\n')

export const SYSTEM_PROMPT = `You are a CV analyst extracting structured proof signals — concrete evidence of real capabilities, based on what someone actually did.

STRENGTH CLASSIFICATION (action verb determines base strength):
${strengthRules}

OWNERSHIP DEPTH:
high: ${el.ownership_depth_rules.high.join(', ')}
medium: ${el.ownership_depth_rules.medium.join(', ')}
low: ${el.ownership_depth_rules.low.join(', ')}

CONFIDENCE MODIFIERS (add to base confidence from source weighting):
+0.2 quantified metric detected (%, $, numbers + users/customers/revenue)
+0.1 unquantified positive impact (improved, increased, enhanced)
+0.2 large scale (100k+ users, $1m+, company-wide, multi-team, 60+ people)
+0.1 medium scale (team of 6-20, hundreds of users, department-wide)
+0.15 growth velocity (promoted, fast-tracked, accelerated, within X months)
+0.15 elite/high-pressure environment (combat, intelligence unit, mission-critical)
+0.1 3+ tools used in same role
+0.2 5+ tools used in same role

SOURCE BASE CONFIDENCE: experience=1.0, cv_bullet=0.9, project=0.8, certification=0.4, declared_skill=0.3

DOMAIN DETECTION (2+ keyword matches = primary domain):
${domainRules}

PROOF SIGNAL REFERENCE — map each detected signal to the closest ID below:
${signalRef}

SKILL REFERENCE — use only these IDs in mapped_skills:
${skillRef}

EXTRACTION RULES:
1. Extract 5-20 proof signals, prioritising strong signals from experience sections
2. Prefer experience/cv_bullet sources over declared skills (higher confidence)
3. Map each to the closest proof signal ID from the reference list above
4. Use only skill IDs from the skill reference for mapped_skills (4 max per signal)
5. Include exact CV phrases in supporting_evidence
6. Deduplicate: same signal detected multiple times → single entry with boosted confidence
7. Do not invent signal IDs — only use IDs from the provided list

Return ONLY valid JSON:
{
  "proof_signals": [
    {
      "proof_signal": "id from reference list",
      "source": "experience|cv_bullet|project|certification|declared_skill",
      "strength": "strong|medium|weak|very_weak",
      "confidence_score": 0.0-1.0,
      "mapped_skills": ["skill_id_from_reference"],
      "supporting_evidence": ["exact phrase from CV"],
      "primary_domain": "domain name from detection list",
      "adjacent_fields": ["other relevant domain names"],
      "level_modifiers": {
        "scale": "none|small|medium|large",
        "growth_velocity": "none|present",
        "environment": "standard|high_pressure|elite"
      }
    }
  ],
  "primary_domain": "main detected domain of this CV",
  "adjacent_fields": ["other plausible domains this person could work in"]
}`

// ─────────────────────────────────────────────────────────────────────
// Canonical sets — what the LLM is actually OFFERED in the prompt.
//
// Each set is derived from the EXACT same array/object expression the
// prompt-build code above iterates to produce its reference lists. The
// LLM is told "Do not invent signal IDs — only use IDs from the provided
// list", so anything outside these sets is fabrication by definition.
//
// Reconciliation against the prior 387/9 scoping:
//
//   - Skills: 595 (NOT 387). 387 was the CLAUDE.md figure from before
//     the multi-PR skill_library expansion. The current library array
//     has 595 unique IDs and the prompt's SKILL REFERENCE block lists
//     every one of them via `${s.id}: ${s.name}`. Validation surface
//     MUST equal the offered surface, so 595 is correct.
//
//   - Domains: 11 (NOT 9). The 9 figure was an undercount from the
//     prior investigation; the actual primary_domain_rules keyset is:
//     software_engineering, data_analytics, cybersecurity, product,
//     project_management, business_operations, customer_success, sales,
//     marketing, finance, ux_design. The DOMAIN DETECTION block in the
//     prompt lists all 11 via Object.entries(...). 11 is correct.
//
//   - Signals: 125 (canonical) out of 625 raw array entries. The
//     proof_signal_library array has 625 elements, but only 125 of them
//     carry a top-level `.id` field — the prompt-build code above maps
//     `.map(s => `${s.id}: ${s.description}...`)`, so the 500 non-
//     canonical entries (which use `signal_id`/`signal_text` shape)
//     render as "undefined: undefined" lines in the prompt and offer
//     NO valid IDs to the LLM. The LLM is therefore told to choose
//     from 125 IDs, and the validation set must match.
// ─────────────────────────────────────────────────────────────────────

// 125 canonical IDs — exactly what the prompt's PROOF SIGNAL REFERENCE
// block offers. Filters to entries with a non-empty `.id` so the string
// "undefined" never lands in the set as a valid claim target.
export const VALID_SIGNAL_IDS: Set<string> = new Set(
  (proofSignalLibrary.proof_signal_library as unknown as any[])
    .filter((s) => typeof s?.id === 'string' && s.id.trim().length > 0)
    .map((s) => String(s.id).trim()),
)

// 595 entries — same iteration as the SKILL REFERENCE block's
// `${s.id}: ${s.name}` map. Defensive filter for shape robustness.
export const VALID_SKILL_IDS: Set<string> = new Set(
  (skillLibrary.skill_library as unknown as any[])
    .filter((s) => typeof s?.id === 'string' && s.id.trim().length > 0)
    .map((s) => String(s.id).trim()),
)

// 11 keys — same Object.entries(...) the DOMAIN DETECTION block
// iterates to render the per-domain keyword lists.
export const VALID_DOMAINS: Set<string> = new Set(
  Object.keys(el.domain_detection.primary_domain_rules),
)

// The user-message prefix is part of the contract too — production
// prepends this exact string to the CV text (extract-proof-signals
// index.ts:162). Exported so the harness uses the same shape.
export const USER_MESSAGE_PREFIX = 'Extract proof signals from this CV:\n\n'
