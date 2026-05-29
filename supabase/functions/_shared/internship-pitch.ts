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

SCORING RUBRIC — use these discrete bands, do not hedge in the middle.

match_score (0-100) — a single honest match score that absorbs BOTH axes: how well this company matches your realistic_* targets AND how much an internship here serves your long-term Track 1 path (career_compound_rationale + track_1_role_alignment). A great match is strong on BOTH; a weak match is weak on EITHER.
  85-100  Obvious match. Multiple strong matches on stage / sector / signals AND the role archetypes pitchable here close named skill_gaps_to_close and align with track_1_role_alignment. You walk in with a clear story AND it materially compounds toward Track 1.
  70-84   Real match. Strong on one axis with one or two caveats on the other — worth pitching; rationale should name the caveat (fit caveat OR career-compound caveat).
  50-69   Stretch match. Defensible but requires you to bridge a gap on either the fit axis OR the long-term axis. Rationale must name the strongest hook AND the stretch.
  0-49    Weak match. Skip unless the candidate_companies list is thin. Either a weak fit, anti-compound (pulls you sideways), or both.

RULES:
- Do not output any score in the 60-65 hedge band unless you can name the specific signal that makes it borderline. Force yourself to commit.
- pitched_role must be GROUNDED in pitch_strength_signals — your actual current strengths, not aspirations. "User research support for the CS team" not "Senior PM". Reference specific signals when possible. Keep it ≤120 characters.
- match_rationale: 1 sentence in second person naming the primary signal driving the match_score — the strongest hook OR the weakest caveat, whichever determines the band.
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

match_score (0-100) — a single honest match score that absorbs BOTH axes: how well this company matches your realistic_* targets AND how much an internship here serves your long-term Track 1 path (career_compound_rationale + track_1_role_alignment). A great match is strong on BOTH; a weak match is weak on EITHER.
  85-100  Obvious match. Multiple strong matches on stage / sector / signals AND the role archetypes pitchable here close named skill_gaps_to_close and align with track_1_role_alignment. You walk in with a clear story AND it materially compounds toward Track 1.
  70-84   Real match. Strong on one axis with one or two caveats on the other — worth pitching; rationale should name the caveat (fit caveat OR career-compound caveat).
  50-69   Stretch match. Defensible but requires you to bridge a gap on either the fit axis OR the long-term axis. Rationale must name the strongest hook AND the stretch.
  0-49    Weak match. Skip unless the candidate_companies list is thin. Either a weak fit, anti-compound (pulls you sideways), or both.

PRESET ROLE HANDLING:
- If the input contains a non-empty "preset_pitched_role" field, treat that role as fixed: echo it verbatim in pitched_role and write all your prose (pitch_rationale, skill_gaps_this_fills, who_to_contact) around THAT role. This is the matcher's pre-chosen pitch — do NOT second-guess it.
- If preset_pitched_role is absent, empty, or null, choose the role yourself per the grounding rules below.

RULES:
- Do not output any score in the 60-65 hedge band unless you can name the specific signal that makes it borderline. Force yourself to commit.
- pitched_role must be GROUNDED in pitch_strength_signals — your actual current strengths, not aspirations. "User research support for the CS team" not "Senior PM". Reference specific signals when possible.
- pitch_rationale: 1-2 sentences in second person. WHY this role at THIS company given your signals. Concrete, not generic. Write "Your VIP CS experience at Guardio positions you to…", never "the student has CS experience".
- skill_gaps_this_fills: pick 1-3 items from internship_profile.skill_gaps_to_close that this specific company + role would actually close. Empty array if none.
- match_rationale: 1 sentence in second person naming the primary signal driving the match_score — the strongest hook OR the weakest caveat, whichever determines the band.
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
export const PITCH_PROMPT_VERSION = 2;
