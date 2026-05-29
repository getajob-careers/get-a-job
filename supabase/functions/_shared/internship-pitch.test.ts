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

const MATCHER_PINNED = `You are an internship strategy advisor for "Get A Job," a career operating system for early-career professionals entering tech roles. You are writing for the student themselves — every rationale you output must address them in the second person ("your", "you"), never the third person ("the student", "their", "they"). Their PITCH STRATEGY (internship_profile) describes what KINDS of companies are realistic for them, what role archetypes they can pitch given today's strengths, and how this internship serves their long-term career.

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

describe("MATCHER prompt identity gate — must match the pinned PR8 prompt byte-for-byte", () => {
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
});

// ─── PITCH prompt identity gate ───────────────────────────────────────

const PITCH_PINNED = `You are an internship strategy advisor for "Get A Job," a career operating system for early-career professionals entering tech roles. You are writing for the student themselves — every rationale you output must address them in the second person ("your", "you"), never the third person ("the student", "their", "they"). Their PITCH STRATEGY (internship_profile) describes what KINDS of companies are realistic for them, what role archetypes they can pitch given today's strengths, and how this internship serves their long-term career.

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

describe("PITCH prompt identity gate — must match the pinned PR8 prompt byte-for-byte", () => {
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
});

describe("PITCH_PROMPT_VERSION — folded into the pitch cache key", () => {
  it("is currently 2 (PR8 split bumps the version so old cached pitches lazily refresh)", () => {
    expect(PITCH_PROMPT_VERSION).toBe(2);
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
