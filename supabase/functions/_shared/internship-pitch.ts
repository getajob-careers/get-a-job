// Shared pitch generation — used by:
//   - match-internship-companies/index.ts  (batched top-30 LLM call)
//   - generate-internship-pitch/index.ts   (single-company drawer pitch)
//
// One source of truth for the system prompt, the per-company JSON shape
// the model is asked to return, and the defensive parser. Same pattern
// as _shared/internship-rule-score.ts — keep this file authoritative;
// touch nothing in either edge function except the import line.
//
// PR4 (drawer) extends the existing matcher schema by adding
// `who_to_contact` (max 2 role-level titles). The matcher's existing
// `normalizeScoredCompany` ignores unknown fields, so the matcher keeps
// working unchanged even though gpt-4o will now emit the new field for
// every company. The drawer surfaces it; the kanban can adopt it in
// PR5.

// ============================================================
// System prompt. PR5 rewrites this from third-person to second-person:
// rationales now address the student as "you / your" so the drawer
// reads like personal advice ("your CS experience at Guardio…") instead
// of third-person commentary ("the student has CS experience"). The
// prompt-identity gate in _shared/internship-pitch.test.ts is updated
// in the same commit — any future drift must update the test alongside.
// ============================================================

export const PITCH_SYSTEM_PROMPT_BASE = `You are an internship strategy advisor for "Get A Job," a career operating system for early-career professionals entering tech roles. You are writing for the student themselves — every rationale you output must address them in the second person ("your", "you"), never the third person ("the student", "their", "they"). Their PITCH STRATEGY (internship_profile) describes what KINDS of companies are realistic for them, what role archetypes they can pitch given today's strengths, and how this internship serves their long-term career.

You will score CANDIDATE COMPANIES against this strategy. Return TWO scores per company and a specific pitch recommendation, written as if speaking directly to the student.

SCORING RUBRIC — use these discrete bands, do not hedge in the middle.

fit_score (0-100) — how well this company matches your realistic_* targets:
  85-100  Obvious fit. Multiple strong matches on stage / sector / signals. You walk in with a clear story.
  70-84   Real fit with one or two caveats. Worth pitching; rationale should name the caveat.
  50-69   Stretch fit. Defensible but requires you to bridge a gap. Rationale must name the strongest hook.
  0-49    Weak fit. Skip unless the candidate_companies list is thin.

career_compound_score (0-100) — how much an internship at THIS specific company serves your long-term Track 1 path (career_compound_rationale + track_1_role_alignment):
  85-100  Strong compound. The role archetypes pitchable here close named skill_gaps_to_close and align with track_1_role_alignment.
  70-84   Solid compound. Closes some gaps; partial alignment.
  50-69   Weak compound. Doesn't hurt the path but doesn't accelerate it.
  0-49    Anti-compound. Pulls you sideways; rationale should name what would be lost.

RULES:
- Do not output any score in the 60-65 hedge band unless you can name the specific signal that makes it borderline. Force yourself to commit.
- A company can have fit_score 85 and career_compound_score 55 (great fit, weak long-term move) — these are independent. Score them independently.
- pitched_role must be GROUNDED in pitch_strength_signals — your actual current strengths, not aspirations. "User research support for the CS team" not "Senior PM". Reference specific signals when possible.
- pitch_rationale: 1-2 sentences in second person. WHY this role at THIS company given your signals. Concrete, not generic. Write "Your VIP CS experience at Guardio positions you to…", never "the student has CS experience".
- skill_gaps_this_fills: pick 1-3 items from internship_profile.skill_gaps_to_close that this specific company + role would actually close. Empty array if none.
- fit_rationale: 1 sentence in second person naming the primary signal driving the fit_score (the hook OR the caveat).
- Honour pitch_anti_patterns — if a company would push you into one of those patterns, that's a fit caveat or career_compound hit.

Output ONLY valid JSON in this exact shape:
{
  "scored": [
    {
      "company_id": "<uuid from input>",
      "fit_score": <number 0-100>,
      "career_compound_score": <number 0-100>,
      "fit_rationale": "<string>",
      "pitched_role": "<string>",
      "pitch_rationale": "<string>",
      "skill_gaps_this_fills": ["<string>", ...]
    },
    ...
  ]
}

One object per input company. Same order is fine but not required — we match by company_id.`;

// PR4 extension — appended only when we want who_to_contact in the
// output (drawer mode + matcher mode both opt in). The matcher's
// `normalizeScoredCompany` ignores unknown fields so this is safe to
// add everywhere; the drawer uses the new field, the kanban currently
// ignores it.
const WHO_TO_CONTACT_EXTENSION = `

ADDITIONAL FIELD (output it on every scored company):
- who_to_contact: array of 0-2 role-level titles to contact at this company. MUST be department/title names like "Customer Success team lead", "Recruiter", "HR Business Partner", "Engineering manager". NEVER invent person names. NEVER claim seniority you can't ground (don't say "VP" unless the source materials reference one). Use the most senior title that's a plausible first contact for a student — usually a hiring manager, recruiter, or team lead. Two entries is the max; one is fine; zero is fine when you genuinely can't name a plausible role.

Add who_to_contact to each object in the "scored" array.`;

export function buildSystemPrompt({ includeWhoToContact }: { includeWhoToContact: boolean }): string {
  return includeWhoToContact
    ? PITCH_SYSTEM_PROMPT_BASE + WHO_TO_CONTACT_EXTENSION
    : PITCH_SYSTEM_PROMPT_BASE;
}

export function buildUserPrompt(llmInput: unknown): string {
  return `Score the candidate companies for this student.

INPUT:
${JSON.stringify(llmInput, null, 2)}

Return ONLY valid JSON.`;
}

// ============================================================
// LLM output normalisation — BYTE-IDENTICAL to the version previously
// inlined in match-internship-companies/index.ts, plus the new
// who_to_contact field. Reject any company not in the input set
// (anti-fab guard), clamp scores into 0-100, cap string lengths,
// validate array shape.
// ============================================================

export interface ScoredPitch {
  company_id: string;
  fit_score: number;
  career_compound_score: number;
  fit_rationale: string;
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

export function normalizeScoredCompany(
  raw: unknown,
  validIds: Set<string>,
): ScoredPitch | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const company_id = typeof r.company_id === "string" ? r.company_id : null;
  if (!company_id || !validIds.has(company_id)) return null;

  const fit_score = clampScore(r.fit_score);
  const career_compound_score = clampScore(r.career_compound_score);
  if (fit_score === null || career_compound_score === null) return null;

  const fit_rationale = typeof r.fit_rationale === "string"
    ? r.fit_rationale.trim().slice(0, 500) : "";
  const pitched_role = typeof r.pitched_role === "string"
    ? r.pitched_role.trim().slice(0, 200) : "";
  const pitch_rationale = typeof r.pitch_rationale === "string"
    ? r.pitch_rationale.trim().slice(0, 600) : "";

  if (!fit_rationale || !pitched_role || !pitch_rationale) return null;

  const skill_gaps_this_fills = Array.isArray(r.skill_gaps_this_fills)
    ? r.skill_gaps_this_fills
        .filter((g: unknown) => typeof g === "string" && g.trim().length > 0)
        .map((g: unknown) => (g as string).trim().slice(0, 100))
        .slice(0, 5)
    : [];

  // PR4 addition: who_to_contact, 0-2 role-level titles. Matches
  // skill_gaps_this_fills behavior: defensive parse, drop garbage,
  // string-cap.
  const who_to_contact = Array.isArray(r.who_to_contact)
    ? r.who_to_contact
        .filter((t: unknown) => typeof t === "string" && t.trim().length > 0)
        .map((t: unknown) => (t as string).trim().slice(0, 80))
        .slice(0, 2)
    : [];

  return {
    company_id,
    fit_score,
    career_compound_score,
    fit_rationale,
    pitched_role,
    pitch_rationale,
    skill_gaps_this_fills,
    who_to_contact,
  };
}
