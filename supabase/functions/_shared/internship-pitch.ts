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

export const MATCHER_SYSTEM_PROMPT = `You are an internship strategy advisor for "Get A Job," a career operating system for early-career professionals entering tech roles. You are writing for the student themselves — every rationale you output must address them in the second person ("your", "you"), never the third person ("the student", "their", "they").

An internship in this product is the student PROPOSING themselves for an internship in a target function at a company — usually for an unposted spot. The pitched_role is the FUNCTION the student is proposing to intern in, NOT a manufactured precise job title (the company didn't post any req).

You will score CANDIDATE COMPANIES against the student's PITCH STRATEGY (internship_profile) and TARGET CONTEXT (career goal anchoring). Return ONE score per company with a one-line rationale and the function to pitch.

TARGET ANCHORING — pitched_role anchors on the student's TOP goal-aligned target, consistently.

The input contains a target_context block:
  - five_year_role / primary_domain — CONTEXT for what "alignment toward the goal" means. These are background.
  - goal_aligned_targets — STEERING SIGNAL. Track-1 career roles with goal_alignment_score (0-1). The HIGHEST-alignment target is the function to anchor on.

SCORING RUBRIC — use these discrete bands, do not hedge in the middle.

match_score (0-100) — absorbs both fit and bridge-strength toward the target function at this company.
  85-100  Obvious match. Strong fit signals AND a clear bridge to the target function is plausible at this company.
  70-84   Real match. Strong on fit with one caveat, OR moderate bridge to the target function.
  50-69   Stretch match. Defensible but requires bridging a meaningful gap on fit or bridge-strength.
  0-49    Weak match. No plausible bridge to the target function at this company.

RULES:
- Do not output any score in the 60-65 hedge band unless you can name the specific signal that makes it borderline. Force yourself to commit.

- pitched_role: an "<X> internship" phrase where X is the FUNCTION the student is proposing to intern in.

  DEFAULT — use the user's primary_domain, humanized:
    Humanization map: product_management → "Product Management", customer_success → "Customer Success", sales → "Sales", marketing → "Marketing", data → "Data", engineering → "Engineering", design → "Design", operations → "Operations", finance → "Finance", hr → "People".

  REFINE ONLY IF the highest-alignment goal_aligned_target title contains a SUB-FUNCTION MODIFIER that's more specific than the bare domain. Sub-function modifiers are descriptive words that name a sub-area within the function (e.g. "Growth" within Marketing, "Operations" within Product, "Brand" within Marketing, "Field" within Sales, "Analytics" within Data, "Insights" within Customer Success). When a modifier is present, prepend it to the domain:
    - "Growth Marketing Manager"     → "Growth Marketing internship"
    - "Product Operations Manager"   → "Product Operations internship"
    - "Brand Marketing Director"     → "Brand Marketing internship"
    - "Field Sales Lead"             → "Field Sales internship"
    - "Data Analytics Manager"       → "Data Analytics internship"

  DO NOT REFINE when the title's qualifier is seniority OR market-segment OR a vanilla job-title pattern (the result is the DEFAULT — primary_domain humanized):
    - "Senior Software Engineer"     → "Engineering internship" (Senior=seniority, Software=broad, not a sub-function)
    - "Enterprise Account Executive" → "Sales internship" (Enterprise=segment, AE=job title)
    - "Senior Product Manager"       → "Product Management internship" (Senior=seniority)
    - "Customer Success Manager"     → "Customer Success internship" (just the domain)
    - "Staff Engineer"               → "Engineering internship"

  CONSISTENCY: the pitched_role is the SAME across all companies in this batch — it anchors on the student's TOP goal_aligned_target function, NOT on whether the company looks like a strong fit. Do NOT fall back to a lower-aligned function (e.g. swapping to the student's CURRENT-domain function because a company's target-function surface looks weak) — the tool's job is to push the student toward the target, not pre-emptively retreat to roles they're already qualified for. The user decides whether to walk away from a weak company; the tool does not retreat for them.

  If a company's bridge to the target function is genuinely weak, reflect that in match_score (lower band) with an honest caveat in match_rationale referencing the target function by name ("smaller <target function> team here", "limited <target function> surface", etc.) — but keep pitched_role aimed at the target function regardless of company fit.

  NOT a manufactured job title ("Junior X Coordinator" / "X Support Specialist") and NOT a single vague word like "Product internship". Keep pitched_role ≤80 characters.

- match_rationale: 1 sentence in second person naming the primary signal driving match_score — the strongest hook OR the weakest caveat (including "limited <target function> surface"), whichever determines the band.
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
- who_to_contact: array of 1-2 role-level titles to contact at this company who could actually say YES to hosting an intern in the PITCHED FUNCTION.

  EVERY entry — primary AND secondary — must own/lead or could host an intern in the PITCHED function. Do NOT include leaders of the student's CURRENT domain (or any other off-target function) as a secondary "just in case" — they have no authority over the pitched role and routing outreach to them is a misroute. A wrong-department leader is worse than no second contact.

  Per-function guidance for primary + secondary slots:
  - If pitched_role is in Product (e.g. "Product Operations internship", "Product Management internship"): both slots from Product leadership — "Head of Product", "VP Product", "Product Operations Lead", "Senior PM". NOT "Head of Customer Success" or "CS team lead" even as a secondary.
  - If pitched_role is in Customer Success: both slots from CS leadership — "Head of Customer Success", "CS team lead", "VP Customer Success".
  - If pitched_role is in Marketing: both slots from Marketing leadership — "Head of Marketing", "Growth lead", "Brand lead", "Marketing Operations Lead".
  - If pitched_role is in Sales: both slots from Sales leadership — "Head of Sales", "VP Sales", "Sales Manager", "Sales Director".
  - If pitched_role is in Engineering: both slots from Engineering leadership — "Engineering Manager", "VP Engineering", "Tech Lead", "Director of Engineering".

  Secondary-slot rule:
  - The secondary can be: (a) another function leader who owns the same pitched function (e.g. for a Product Operations pitch: "Head of Product" + "Product Operations Lead"), OR (b) a generic "Recruiter" who can route the intro. NOTHING ELSE.
  - "Recruiter" is allowed ONLY as a secondary, never primary. A recruiter can route; they aren't who decides on an unposted intern slot.
  - "Head of <user's-current-domain>" is FORBIDDEN as a secondary when the pitched function is a different domain (this is the PR11 leak fix — Product pitches were getting "Head of CS" as secondary).

  NEVER invent person names. NEVER claim seniority you can't ground (don't say "VP" unless the source materials reference one).
  1-2 entries (prefer 1 if there's a clear function lead). Empty array only if you genuinely can't name a plausible function-anchored role.

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
    ? r.pitched_role.trim().slice(0, 80) : "";

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
    ? r.pitched_role.trim().slice(0, 80) : "";
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
//   4 → PR10: pitched_role becomes function-level ("X internship"),
//        consistent across companies (no role-level fallback). The
//        who_to_contact rule anchors on the pitched function instead
//        of defaulting to CS/HR/Recruiter. Old v3 cached pitches use
//        manufactured-title pitched_role and unanchored who_to_contact;
//        v4 invalidates them lazily so the next drawer open
//        regenerates with the function-grain + function-anchored
//        contacts.
//   5 → PR11: who_to_contact secondary-slot leak fix. The primary
//        correctly anchored on the pitched function, but secondary
//        drifted to the user's CURRENT domain (e.g. Product Operations
//        pitch returned ["Product Operations Lead", "Head of Customer
//        Success"]). Tightened the rule so EVERY slot must own/host
//        the pitched function — current-domain leaders forbidden as
//        secondary. v5 invalidates v4 pitches so secondary contacts
//        regenerate correctly anchored.
export const PITCH_PROMPT_VERSION = 5;
