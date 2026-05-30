// Tests for the shared pitch module. PR8 splits the prompt into two:
//   - MATCHER_SYSTEM_PROMPT  (used by match-internship-companies)
//   - PITCH_SYSTEM_PROMPT    (used by generate-internship-pitch)
//
// Two purposes preserved from earlier PRs:
//   1. PROMPT-IDENTITY GATES — each prompt has a pinned constant. If
//      the shared prompt drifts even by whitespace, behavior shifts
//      silently in production. Lock the bytes here; any prompt edit
//      must update the corresponding pin in the same commit.
//   2. Parser robustness — both normalizers should reject bad shapes
//      (anti-fab guard) and accept good ones.

import { describe, it, expect } from "vitest";
import {
  MATCHER_SYSTEM_PROMPT,
  PITCH_SYSTEM_PROMPT,
  buildUserPrompt,
  clampScore,
  normalizeScoredMatch,
  normalizeScoredPitch,
  PITCH_PROMPT_VERSION,
} from "./internship-pitch";

// ─── MATCHER prompt identity gate ─────────────────────────────────────

const MATCHER_PINNED = `You are an internship strategy advisor for "Get A Job," a career operating system for early-career professionals entering tech roles. You are writing for the student themselves — every rationale you output must address them in the second person ("your", "you"), never the third person ("the student", "their", "they").

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

describe("MATCHER prompt identity gate — must match the pinned PR9 prompt byte-for-byte", () => {
  it("MATCHER_SYSTEM_PROMPT === pinned matcher prompt", () => {
    expect(MATCHER_SYSTEM_PROMPT).toBe(MATCHER_PINNED);
  });

  it("emits only score + match_rationale + pitched_role (no prose fields)", () => {
    // PR8 invariant: matcher must NOT ask for pitch_rationale,
    // skill_gaps_this_fills, who_to_contact — those live on the pitch
    // call. Otherwise we re-introduce the cap pressure.
    expect(MATCHER_SYSTEM_PROMPT).not.toContain("pitch_rationale");
    expect(MATCHER_SYSTEM_PROMPT).not.toContain("skill_gaps_this_fills");
    expect(MATCHER_SYSTEM_PROMPT).not.toContain("who_to_contact");
    expect(MATCHER_SYSTEM_PROMPT).toContain("pitched_role");
    expect(MATCHER_SYSTEM_PROMPT).toContain("match_score");
    expect(MATCHER_SYSTEM_PROMPT).toContain("match_rationale");
  });

  it("PR10 invariant: function-grain + consistency + no role-level fallback", () => {
    // PR10 swaps "pick the closest available bridge role" for the
    // function-grain DEFAULT-then-REFINE rule. Pitched_role is now
    // "<X> internship" anchored on the user's target, consistent
    // across companies. Demotion happens via match_score, NOT via
    // role-swap. The Manufactured-title vocabulary is forbidden.
    expect(MATCHER_SYSTEM_PROMPT).toContain("goal_aligned_targets");
    expect(MATCHER_SYSTEM_PROMPT).toContain("TARGET ANCHORING");
    expect(MATCHER_SYSTEM_PROMPT).toContain("FUNCTION");
    expect(MATCHER_SYSTEM_PROMPT).toContain("CONSISTENCY");
    expect(MATCHER_SYSTEM_PROMPT).toContain("Humanization map");
    expect(MATCHER_SYSTEM_PROMPT).toContain("internship");
    // Anti-fallback guard — the rule must explicitly forbid swapping
    // the function.
    expect(MATCHER_SYSTEM_PROMPT).toContain("Do NOT fall back to a lower-aligned function");
    // Old PR8/PR9 manufactured-title vocabulary must be gone.
    expect(MATCHER_SYSTEM_PROMPT).not.toContain("Coordinator / Analyst / Associate / Intern");
    expect(MATCHER_SYSTEM_PROMPT).not.toContain("Senior PM");
    expect(MATCHER_SYSTEM_PROMPT).not.toContain("not aspirations");
  });
});

// ─── PITCH prompt identity gate ───────────────────────────────────────

const PITCH_PINNED = `You are an internship strategy advisor for "Get A Job," a career operating system for early-career professionals entering tech roles. You are writing for the student themselves — every rationale you output must address them in the second person ("your", "you"), never the third person ("the student", "their", "they"). Their PITCH STRATEGY (internship_profile) describes what KINDS of companies are realistic for them, what role archetypes they can pitch given today's strengths, and how this internship serves their long-term career.

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
- who_to_contact: array of 1-2 role-level titles to contact at this company who could actually say YES to hosting an intern in the PITCHED FUNCTION. The contacts MUST match the function in pitched_role — NOT the student's current domain.
  - If pitched_role is in Product (e.g. "Product Operations internship", "Product Management internship"): contacts are Product leadership — "Head of Product", "VP Product", "Product Operations Lead", "Senior PM". NOT "Customer Success team lead".
  - If pitched_role is in Customer Success: contacts are CS leadership — "Head of Customer Success", "CS team lead".
  - If pitched_role is in Marketing: contacts are Marketing leadership — "Head of Marketing", "Growth lead", "Brand lead".
  - If pitched_role is in Sales: contacts are Sales leadership — "Head of Sales", "VP Sales", "Sales Manager".
  - If pitched_role is in Engineering: contacts are Engineering leadership — "Engineering Manager", "VP Engineering", "Tech Lead".
  - General rule: the contact is the function's hiring manager / department head — someone who owns the team the intern would join.
  - "Recruiter" is allowed only as a SECONDARY contact (second slot), never primary. A recruiter can route the intro but isn't who decides on an unposted intern slot.
  - NEVER invent person names. NEVER claim seniority you can't ground (don't say "VP" unless the source materials reference one).
  - 1-2 entries (prefer 1 if there's a clear function lead). Empty array only if you genuinely can't name a plausible function-anchored role.

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

describe("PITCH prompt identity gate — must match the pinned PR9 prompt byte-for-byte", () => {
  it("PITCH_SYSTEM_PROMPT === pinned pitch prompt", () => {
    expect(PITCH_SYSTEM_PROMPT).toBe(PITCH_PINNED);
  });

  it("describes the preset_pitched_role hint behavior", () => {
    expect(PITCH_SYSTEM_PROMPT).toContain("preset_pitched_role");
    expect(PITCH_SYSTEM_PROMPT).toContain("PRESET ROLE HANDLING");
  });

  it("keeps the full prose schema (pitch_rationale + skill_gaps + who_to_contact)", () => {
    expect(PITCH_SYSTEM_PROMPT).toContain("pitch_rationale");
    expect(PITCH_SYSTEM_PROMPT).toContain("skill_gaps_this_fills");
    expect(PITCH_SYSTEM_PROMPT).toContain("who_to_contact");
  });

  it("PR9 invariant: bridge framing replaces 'you have X' restatement", () => {
    expect(PITCH_SYSTEM_PROMPT).toContain("TARGET ANCHORING");
    expect(PITCH_SYSTEM_PROMPT).toContain("goal_aligned_targets");
    expect(PITCH_SYSTEM_PROMPT).toContain("BRIDGE");
    expect(PITCH_SYSTEM_PROMPT).toContain("credible angle into");
    expect(PITCH_SYSTEM_PROMPT).not.toContain("not aspirations");
  });

  it("PR10 invariant: who_to_contact anchors on the pitched function", () => {
    // PR10 fix for the Aligned-card bug — the rule must explicitly
    // forbid CS-default contacts on Product pitches and instead
    // require contacts that match the pitched function.
    expect(PITCH_SYSTEM_PROMPT).toContain("MUST match the function in pitched_role");
    expect(PITCH_SYSTEM_PROMPT).toContain("NOT the student's current domain");
    expect(PITCH_SYSTEM_PROMPT).toContain("Recruiter");
    expect(PITCH_SYSTEM_PROMPT).toContain("never primary");
  });
});

describe("PITCH_PROMPT_VERSION — folded into the pitch cache key", () => {
  it("is currently 4 (PR10 bumps for function-grain pitched_role + function-anchored who_to_contact)", () => {
    expect(PITCH_PROMPT_VERSION).toBe(4);
  });
});

// ─── User prompt builder (shared) ─────────────────────────────────────

describe("buildUserPrompt — byte-identical to inline construction", () => {
  it("uses the literal 'Score the candidate companies for this student.' opener and 'INPUT:' marker", () => {
    const out = buildUserPrompt({ foo: "bar" });
    expect(out).toBe(
      `Score the candidate companies for this student.

INPUT:
${JSON.stringify({ foo: "bar" }, null, 2)}

Return ONLY valid JSON.`,
    );
  });
});

// ─── clampScore ───────────────────────────────────────────────────────

describe("clampScore", () => {
  it("clamps below 0 and above 100", () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(150)).toBe(100);
  });
  it("rounds to 2 decimal places", () => {
    expect(clampScore(73.456)).toBe(73.46);
  });
  it("returns null for non-numbers + non-finite", () => {
    expect(clampScore("75")).toBeNull();
    expect(clampScore(NaN)).toBeNull();
    expect(clampScore(Infinity)).toBeNull();
    expect(clampScore(null)).toBeNull();
    expect(clampScore(undefined)).toBeNull();
  });
});

// ─── MATCHER normalizer ───────────────────────────────────────────────

describe("normalizeScoredMatch", () => {
  const validIds = new Set(["co-1", "co-2"]);
  const baseRaw = {
    company_id: "co-1",
    match_score: 80,
    match_rationale: "Strong cyber sector match.",
    pitched_role: "User research support for the GTM team",
  };

  it("accepts a well-formed matcher object", () => {
    const out = normalizeScoredMatch(baseRaw, validIds);
    expect(out).toMatchObject({
      company_id: "co-1",
      match_score: 80,
      pitched_role: "User research support for the GTM team",
    });
  });

  it("anti-fab guard — rejects company_id not in validIds", () => {
    expect(normalizeScoredMatch({ ...baseRaw, company_id: "co-999" }, validIds)).toBeNull();
  });

  it("rejects when match_rationale or pitched_role is empty", () => {
    expect(normalizeScoredMatch({ ...baseRaw, pitched_role: "" }, validIds)).toBeNull();
    expect(normalizeScoredMatch({ ...baseRaw, match_rationale: "  " }, validIds)).toBeNull();
  });

  it("rejects when match_score missing / non-numeric", () => {
    expect(normalizeScoredMatch({ ...baseRaw, match_score: "high" }, validIds)).toBeNull();
    expect(normalizeScoredMatch({ ...baseRaw, match_score: null }, validIds)).toBeNull();
  });

  it("ignores prose fields if the LLM accidentally emits them (defense in depth)", () => {
    const out = normalizeScoredMatch({
      ...baseRaw,
      pitch_rationale: "should not appear",
      skill_gaps_this_fills: ["should not appear"],
      who_to_contact: ["should not appear"],
    }, validIds);
    expect(out).not.toBeNull();
    expect(out).not.toHaveProperty("pitch_rationale");
    expect(out).not.toHaveProperty("skill_gaps_this_fills");
    expect(out).not.toHaveProperty("who_to_contact");
  });
});

// ─── PITCH normalizer ─────────────────────────────────────────────────

describe("normalizeScoredPitch", () => {
  const validIds = new Set(["co-1", "co-2"]);
  const baseRaw = {
    company_id: "co-1",
    match_score: 80,
    match_rationale: "Strong sector match plus closes your enterprise CS gap.",
    pitched_role: "Customer Success",
    pitch_rationale: "You have VIP CS experience at Guardio — pitch helping their CS team.",
    skill_gaps_this_fills: ["enterprise CS playbooks"],
    who_to_contact: ["CS team lead", "Recruiter"],
  };

  it("accepts a well-formed pitch object", () => {
    const out = normalizeScoredPitch(baseRaw, validIds);
    expect(out).toMatchObject({
      company_id: "co-1",
      match_score: 80,
      pitched_role: "Customer Success",
      who_to_contact: ["CS team lead", "Recruiter"],
    });
  });

  it("anti-fab guard — rejects company_id not in validIds", () => {
    expect(normalizeScoredPitch({ ...baseRaw, company_id: "co-999" }, validIds)).toBeNull();
  });

  it("rejects when any required text field is empty", () => {
    expect(normalizeScoredPitch({ ...baseRaw, pitched_role: "" }, validIds)).toBeNull();
    expect(normalizeScoredPitch({ ...baseRaw, pitch_rationale: "  " }, validIds)).toBeNull();
    expect(normalizeScoredPitch({ ...baseRaw, match_rationale: "" }, validIds)).toBeNull();
  });

  it("caps skill_gaps_this_fills at 5 entries + 100-char per item", () => {
    const long = Array.from({ length: 10 }, (_, i) => `gap ${i} ` + "x".repeat(200));
    const out = normalizeScoredPitch({ ...baseRaw, skill_gaps_this_fills: long }, validIds);
    expect(out?.skill_gaps_this_fills).toHaveLength(5);
    expect(out!.skill_gaps_this_fills[0].length).toBeLessThanOrEqual(100);
  });

  it("caps who_to_contact at 2 entries + trims + 80-char per item", () => {
    const out = normalizeScoredPitch({
      ...baseRaw,
      who_to_contact: ["one", "  two  ", "three", "x".repeat(120)],
    }, validIds);
    expect(out?.who_to_contact).toHaveLength(2);
    expect(out!.who_to_contact[0]).toBe("one");
    expect(out!.who_to_contact[1]).toBe("two");
  });

  it("defaults who_to_contact to [] when missing or non-array", () => {
    const { who_to_contact: _, ...withoutField } = baseRaw;
    void _;
    expect(normalizeScoredPitch(withoutField, validIds)?.who_to_contact).toEqual([]);
    expect(normalizeScoredPitch({ ...baseRaw, who_to_contact: null }, validIds)?.who_to_contact).toEqual([]);
    expect(normalizeScoredPitch({ ...baseRaw, who_to_contact: "HR" }, validIds)?.who_to_contact).toEqual([]);
  });

  it("drops non-string entries inside who_to_contact and skill_gaps_this_fills", () => {
    const out = normalizeScoredPitch({
      ...baseRaw,
      who_to_contact: ["CS team lead", 42, null, ""],
      skill_gaps_this_fills: ["valid", 42, null, "  "],
    }, validIds);
    expect(out?.who_to_contact).toEqual(["CS team lead"]);
    expect(out?.skill_gaps_this_fills).toEqual(["valid"]);
  });
});
