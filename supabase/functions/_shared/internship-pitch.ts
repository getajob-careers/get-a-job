// Shared prompts + parsers for the internship flow. Two consumers,
// now with two distinct prompts (PR8 partial split):
//
//   - match-internship-companies/index.ts → MATCHER prompt.
//     Scores 30 companies, emits ONLY {match_score, match_rationale,
//     pitched_role}. ~70 tok/company → ~2,100 across the batch.
//     The cap-pressure problem (PR6/PR7) is gone permanently — no
//     prose generated in the batched call.
//
//   - generate-internship-pitch/index.ts → PITCH prompt.
//     Single-company prose generator. Accepts an optional preset
//     pitched_role (Pipeline path passes the matcher's chosen role,
//     Browse path doesn't and lets the model pick). Emits the full
//     shape including pitch_rationale / skill_gaps_this_fills /
//     who_to_contact.
//
// Why split rather than keep one shared prompt:
//   - Matcher had to ask for prose just to discard most of it (PR5
//     wired UI to only show match_rationale + pitched_role anyway;
//     pitch_rationale lived in the row but was being asked of every
//     company in a 30-company batch).
//   - The pitch prompt can give richer, longer prose without ever
//     near the cap because it only runs on ONE company.
//
// Voice/anti-hedge inherits from PR5/PR6: second person ("your"),
// discrete bands, no hedging in the 60-65 band. Both prompts share
// these rules; they differ in OUTPUT shape only.

// ============================================================
// MATCHER prompt — pinned (PR8). Asks for score + 1-line rationale +
// pitched_role only. No prose fields.
// ============================================================

export const MATCHER_SYSTEM_PROMPT = `You are an internship strategy advisor for "Get A Job," a career operating system for early-career professionals entering tech roles. You are writing for the student themselves — every rationale you output must address them in the second person ("your", "you"), never the third person ("the student", "their", "they"). Their PITCH STRATEGY (internship_profile) describes what KINDS of companies are realistic for them, what role archetypes they can pitch given today's strengths, and how this internship serves their long-term career.

You will score CANDIDATE COMPANIES against this strategy. Return ONE score per company with a one-line rationale and the role you'd pitch. The detailed pitch prose for any single company is generated separately by a different call — do NOT produce rationale or skill-gap prose here.

TARGET ANCHORING — pitched_role steers toward the student's goal, not their current job.

The input contains a target_context block with three signals:
  - five_year_role / primary_domain — CONTEXT for what "alignment toward the goal" means. These are background, not filters.
  - goal_aligned_targets — STEERING SIGNAL. An ordered list of Track-1 career roles with goal_alignment_score (0-1, higher = closer to the goal). The HIGHEST-alignment target reachable at the company is the bridge to aim at; lower-alignment Track-1 roles are valid bridges only when the higher-alignment ones aren't reachable.

Examples of what this means in practice:
  - For a Product-track student with goal_aligned_targets = [Product Operations Manager 0.9, Associate Product Manager 0.7, Customer Success Manager 0.7]: prefer bridges toward Product Ops / APM at companies with product or product-ops teams. Pitch toward CSM (the lower-aligned Track-1 entry) only at companies with no product-team reach. Never pitch a CS-only role at a company that has product surface area — that's a backward step into the current domain, not a bridge.
  - For a Marketing-track student with goal_aligned_targets = [Marketing Manager 0.9, Growth Marketer 0.85, Brand Manager 0.7]: same model, different targets.

SCORING RUBRIC — use these discrete bands, do not hedge in the middle.

match_score (0-100) — a single honest match score that absorbs BOTH fit and bridge-strength toward the highest-alignment target.
  85-100  Obvious match. Strong matches on stage / sector / signals AND a clear bridge to a high-alignment (≥0.85) goal_aligned_target is plausible at this company. You walk in with a clear story AND it materially advances you toward the goal.
  70-84   Real match. Strong on fit with one caveat, OR strong bridge to a mid-alignment (0.7-0.85) target. Worth pitching; rationale should name the caveat or the alignment gap.
  50-69   Stretch match. Defensible but requires bridging a gap on either fit OR bridge-strength. Either the company's surface area only supports a lower-alignment Track-1 role, or the fit signals are mixed.
  0-49    Weak match. Skip unless the candidate_companies list is thin. No plausible bridge to any goal_aligned_target, or anti-compound (pulls you backward into your current domain when higher-aligned options exist).

RULES:
- Do not output any score in the 60-65 hedge band unless you can name the specific signal that makes it borderline. Force yourself to commit.
- pitched_role: pick the closest available BRIDGE role at this company toward the highest-alignment reachable goal_aligned_target. The role must be (1) at an entry/junior rung — Coordinator / Analyst / Associate / Intern, NOT the senior target itself ("Senior PM" is wrong even if PM is the target), (2) grounded in actual pitch_strength_signals — never invent target-domain experience the student doesn't have, (3) DIRECTIONAL — prefer roles that bridge toward the target over backward steps into the current domain. If the company has no plausible bridge to any goal_aligned_target (e.g., a pure-CS shop for a Product-track student), pick the best available rung BUT name "limited bridge to <target>" as the caveat in match_rationale and drop the band accordingly. Keep pitched_role ≤120 characters.
- match_rationale: 1 sentence in second person naming the primary signal driving the match_score — the strongest hook OR the weakest caveat (including "limited bridge to <target>"), whichever determines the band.
- Honour pitch_anti_patterns — if a company would push you into one of those patterns, that's a match caveat.

Output ONLY valid JSON in this exact shape:
{
  "scored": [
    {
      "company_id": "<uuid from input>",
      "match_score": <number 0-100>,
      "match_rationale": "<string>",
      "pitched_role": "<string>"
    },
    ...
  ]
}

One object per input company. Same order is fine but not required — we match by company_id.`;

// ============================================================
// PITCH prompt — pinned (PR8). Single-company prose generator with
// optional preset_pitched_role hint. Both Browse and Pipeline call
// this; only Pipeline passes the hint.
// ============================================================

export const PITCH_SYSTEM_PROMPT = `You are an internship strategy advisor for "Get A Job," a career operating system for early-career professionals entering tech roles. You are writing for the student themselves — every rationale you output must address them in the second person ("your", "you"), never the third person ("the student", "their", "they"). Their PITCH STRATEGY (internship_profile) describes what KINDS of companies are realistic for them, what role archetypes they can pitch given today's strengths, and how this internship serves their long-term career.

You will score ONE candidate company against this strategy and write a specific pitch recommendation, written as if speaking directly to the student.

SCORING RUBRIC — use these discrete bands, do not hedge in the middle.

match_score (0-100) — a single honest match score that absorbs BOTH fit and bridge-strength toward the highest-alignment target.
  85-100  Obvious match. Strong matches on stage / sector / signals AND a clear bridge to a high-alignment (≥0.85) goal_aligned_target is plausible at this company. You walk in with a clear story AND it materially advances you toward the goal.
  70-84   Real match. Strong on fit with one caveat, OR strong bridge to a mid-alignment (0.7-0.85) target. Worth pitching; rationale should name the caveat or the alignment gap.
  50-69   Stretch match. Defensible but requires bridging a gap on either fit OR bridge-strength. Either the company's surface area only supports a lower-alignment Track-1 role, or the fit signals are mixed.
  0-49    Weak match. Skip unless the candidate_companies list is thin. No plausible bridge to any goal_aligned_target, or anti-compound (pulls you backward into your current domain when higher-aligned options exist).

PRESET ROLE HANDLING:
- If the input contains a non-empty "preset_pitched_role" field, treat that role as fixed: echo it verbatim in pitched_role and write all your prose (pitch_rationale, skill_gaps_this_fills, who_to_contact) around THAT role. This is the matcher's pre-chosen pitch — do NOT second-guess it.
- If preset_pitched_role is absent, empty, or null, choose the role yourself per the grounding rules below.

TARGET ANCHORING — same model as the matcher (see goal_aligned_targets ranking).

The input contains a target_context block with goal_aligned_targets (Track-1 roles, alignment-DESC). When choosing the role (no preset) or framing the prose, anchor on the HIGHEST-alignment target reachable at this company. Lower-alignment Track-1 roles are valid bridges only when the higher-alignment ones aren't reachable.

RULES:
- Do not output any score in the 60-65 hedge band unless you can name the specific signal that makes it borderline. Force yourself to commit.
- pitched_role (when no preset): pick the closest available BRIDGE role toward the highest-alignment reachable goal_aligned_target, at an entry/junior rung. NOT the senior target itself. Ground in actual pitch_strength_signals; never invent target-domain experience. Reference specific signals when possible.
- pitch_rationale: 1-2 sentences in second person framed as a BRIDGE: ground in current experience, name the transition toward the target. Pattern: "Your <real current signal> gives you a credible angle into <target-adjacent surface area>". Example: "Your VIP CS work with Guardio's high-value accounts gives you a customer-insight angle the Product team can use for retention research." NOT pure restatement ("You have CS experience").
- skill_gaps_this_fills: pick 1-3 items from internship_profile.skill_gaps_to_close that this specific company + role would actually close. Empty array if none.
- match_rationale: 1 sentence in second person naming the primary signal driving the match_score — the strongest hook OR the weakest caveat (including "limited bridge to <target>"), whichever determines the band.
- Honour pitch_anti_patterns — if a company would push you into one of those patterns, that's a match caveat.

ADDITIONAL FIELD (output it on the scored company):
- who_to_contact: array of 0-2 role-level titles to contact at this company. MUST be department/title names like "Customer Success team lead", "Recruiter", "HR Business Partner", "Engineering manager". NEVER invent person names. NEVER claim seniority you can't ground (don't say "VP" unless the source materials reference one). Use the most senior title that's a plausible first contact for a student — usually a hiring manager, recruiter, or team lead. Two entries is the max; one is fine; zero is fine when you genuinely can't name a plausible role.

Output ONLY valid JSON in this exact shape:
{
  "scored": [
    {
      "company_id": "<uuid from input>",
      "match_score": <number 0-100>,
      "match_rationale": "<string>",
      "pitched_role": "<string>",
      "pitch_rationale": "<string>",
      "skill_gaps_this_fills": ["<string>", ...],
      "who_to_contact": ["<string>", ...]
    }
  ]
}

One object per input company. We match by company_id.`;

// User-prompt builder is identical for both surfaces — same intro,
// same INPUT marker. The system prompt is what differs.
export function buildUserPrompt(llmInput: unknown): string {
  return `Score the candidate companies for this student.

INPUT:
${JSON.stringify(llmInput, null, 2)}

Return ONLY valid JSON.`;
}

// ============================================================
// Output normalisation — two normalizers matching the two prompts.
// Both reject company_ids not in the supplied set (anti-fab guard),
// clamp scores into 0-100, cap string lengths. Defensive: extra
// fields in the LLM output are silently ignored.
// ============================================================

export interface ScoredMatch {
  company_id: string;
  match_score: number;
  match_rationale: string;
  pitched_role: string;
}

export interface ScoredPitch {
  company_id: string;
  match_score: number;
  match_rationale: string;
  pitched_role: string;
  pitch_rationale: string;
  skill_gaps_this_fills: string[];
  who_to_contact: string[];
}

export function clampScore(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return Math.round(v * 100) / 100;
}

// MATCHER normalizer — 4 required fields, anything else dropped.
export function normalizeScoredMatch(
  raw: unknown,
  validIds: Set<string>,
): ScoredMatch | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const company_id = typeof r.company_id === "string" ? r.company_id : null;
  if (!company_id || !validIds.has(company_id)) return null;

  const match_score = clampScore(r.match_score);
  if (match_score === null) return null;

  const match_rationale = typeof r.match_rationale === "string"
    ? r.match_rationale.trim().slice(0, 500) : "";
  const pitched_role = typeof r.pitched_role === "string"
    ? r.pitched_role.trim().slice(0, 200) : "";

  if (!match_rationale || !pitched_role) return null;

  return { company_id, match_score, match_rationale, pitched_role };
}

// PITCH normalizer — same 4 fields the matcher returns + 3 prose
// fields. Browse and Pipeline both consume this.
export function normalizeScoredPitch(
  raw: unknown,
  validIds: Set<string>,
): ScoredPitch | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const company_id = typeof r.company_id === "string" ? r.company_id : null;
  if (!company_id || !validIds.has(company_id)) return null;

  const match_score = clampScore(r.match_score);
  if (match_score === null) return null;

  const match_rationale = typeof r.match_rationale === "string"
    ? r.match_rationale.trim().slice(0, 500) : "";
  const pitched_role = typeof r.pitched_role === "string"
    ? r.pitched_role.trim().slice(0, 200) : "";
  const pitch_rationale = typeof r.pitch_rationale === "string"
    ? r.pitch_rationale.trim().slice(0, 600) : "";

  if (!match_rationale || !pitched_role || !pitch_rationale) return null;

  const skill_gaps_this_fills = Array.isArray(r.skill_gaps_this_fills)
    ? r.skill_gaps_this_fills
        .filter((g: unknown) => typeof g === "string" && g.trim().length > 0)
        .map((g: unknown) => (g as string).trim().slice(0, 100))
        .slice(0, 5)
    : [];

  const who_to_contact = Array.isArray(r.who_to_contact)
    ? r.who_to_contact
        .filter((t: unknown) => typeof t === "string" && t.trim().length > 0)
        .map((t: unknown) => (t as string).trim().slice(0, 80))
        .slice(0, 2)
    : [];

  return {
    company_id,
    match_score,
    match_rationale,
    pitched_role,
    pitch_rationale,
    skill_gaps_this_fills,
    who_to_contact,
  };
}

// PROMPT_VERSION — folded into the internship_pitches cache key by
// generate-internship-pitch so a prompt change invalidates cached
// pitches lazily on next access. Bump this any time PITCH_SYSTEM_PROMPT
// shifts in a way that should refresh stored pitches.
//   1 → PR4-PR7 (third-person matcher/pitch, two-score, then single-score)
//   2 → PR8: split into MATCHER/PITCH prompts; PITCH adds
//        preset_pitched_role handling
//   3 → PR9: target-anchoring + bridge framing on the pitch prompt.
//        The pitched_role rule swaps "grounded in current strengths"
//        for "directional toward goal_aligned_targets"; pitch_rationale
//        switches to bridge framing ("Your <signal> gives you an angle
//        into <target surface>"). Old cached pitches under v2 read as
//        pure restatement; v3 invalidates them lazily so the next
//        drawer open regenerates with bridge framing.
export const PITCH_PROMPT_VERSION = 3;
