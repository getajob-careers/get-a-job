// Tests for the shared pitch module. Two purposes:
//   1. PROMPT-IDENTITY GATE — the system prompt and user-prompt builder
//      must produce strings byte-identical to the pinned version below.
//      If either drifts even by whitespace, the matcher's behavior
//      shifts silently. Lock the bytes here; require any prompt edit
//      to update the test in the same commit.
//   2. Parser robustness — normalizeScoredCompany should reject bad
//      shapes (anti-fab guard for the matcher's batched call as well
//      as the drawer's single-company call) and accept good ones.

import { describe, it, expect } from "vitest";
import {
  PITCH_SYSTEM_PROMPT_BASE,
  buildSystemPrompt,
  buildUserPrompt,
  clampScore,
  normalizeScoredCompany,
} from "./internship-pitch";

// ─── PROMPT IDENTITY GATE ─────────────────────────────────────────────
//
// PINNED_PROMPT below is a verbatim copy of the PR6 single-score rewrite.
// History: PR4 extracted the original two-score prompt; PR5 rewrote it
// in second person; PR6 collapses to a single match_score (drops
// career_compound_score, renames fit_* → match_*). If you change the
// shared prompt, you must intentionally update this constant in the
// same commit — the test failure WILL surface drift.

const PINNED_PROMPT = `You are an internship strategy advisor for "Get A Job," a career operating system for early-career professionals entering tech roles. You are writing for the student themselves — every rationale you output must address them in the second person ("your", "you"), never the third person ("the student", "their", "they"). Their PITCH STRATEGY (internship_profile) describes what KINDS of companies are realistic for them, what role archetypes they can pitch given today's strengths, and how this internship serves their long-term career.

You will score CANDIDATE COMPANIES against this strategy. Return ONE score per company and a specific pitch recommendation, written as if speaking directly to the student.

SCORING RUBRIC — use these discrete bands, do not hedge in the middle.

match_score (0-100) — a single honest match score that absorbs BOTH axes: how well this company matches your realistic_* targets AND how much an internship here serves your long-term Track 1 path (career_compound_rationale + track_1_role_alignment). A great match is strong on BOTH; a weak match is weak on EITHER.
  85-100  Obvious match. Multiple strong matches on stage / sector / signals AND the role archetypes pitchable here close named skill_gaps_to_close and align with track_1_role_alignment. You walk in with a clear story AND it materially compounds toward Track 1.
  70-84   Real match. Strong on one axis with one or two caveats on the other — worth pitching; rationale should name the caveat (fit caveat OR career-compound caveat).
  50-69   Stretch match. Defensible but requires you to bridge a gap on either the fit axis OR the long-term axis. Rationale must name the strongest hook AND the stretch.
  0-49    Weak match. Skip unless the candidate_companies list is thin. Either a weak fit, anti-compound (pulls you sideways), or both.

RULES:
- Do not output any score in the 60-65 hedge band unless you can name the specific signal that makes it borderline. Force yourself to commit.
- pitched_role must be GROUNDED in pitch_strength_signals — your actual current strengths, not aspirations. "User research support for the CS team" not "Senior PM". Reference specific signals when possible.
- pitch_rationale: 1-2 sentences in second person. WHY this role at THIS company given your signals. Concrete, not generic. Write "Your VIP CS experience at Guardio positions you to…", never "the student has CS experience".
- skill_gaps_this_fills: pick 1-3 items from internship_profile.skill_gaps_to_close that this specific company + role would actually close. Empty array if none.
- match_rationale: 1 sentence in second person naming the primary signal driving the match_score — the strongest hook OR the weakest caveat, whichever determines the band.
- Honour pitch_anti_patterns — if a company would push you into one of those patterns, that's a match caveat.

Output ONLY valid JSON in this exact shape:
{
  "scored": [
    {
      "company_id": "<uuid from input>",
      "match_score": <number 0-100>,
      "match_rationale": "<string>",
      "pitched_role": "<string>",
      "pitch_rationale": "<string>",
      "skill_gaps_this_fills": ["<string>", ...]
    },
    ...
  ]
}

One object per input company. Same order is fine but not required — we match by company_id.`;

describe("prompt identity gate — shared module must match the pinned PR6 prompt byte-for-byte", () => {
  it("PITCH_SYSTEM_PROMPT_BASE === pinned prompt", () => {
    expect(PITCH_SYSTEM_PROMPT_BASE).toBe(PINNED_PROMPT);
  });

  it("buildSystemPrompt({ includeWhoToContact: false }) === pinned prompt (unchanged path)", () => {
    expect(buildSystemPrompt({ includeWhoToContact: false })).toBe(PINNED_PROMPT);
  });

  it("buildSystemPrompt({ includeWhoToContact: true }) appends the who_to_contact extension", () => {
    const withExt = buildSystemPrompt({ includeWhoToContact: true });
    expect(withExt.startsWith(PINNED_PROMPT)).toBe(true);
    expect(withExt.length).toBeGreaterThan(PINNED_PROMPT.length);
    expect(withExt).toContain("who_to_contact");
    expect(withExt).toContain("max");
    expect(withExt).toContain("NEVER invent person names");
  });

  it("uses second-person voice (PR5) and single-score schema (PR6)", () => {
    // PR5 set second-person voice; PR6 collapsed to a single match_score.
    // Positive checks against both invariants. The byte-identity gate
    // above is the real drift catcher; this is a quick readable check.
    expect(PITCH_SYSTEM_PROMPT_BASE).toContain("second person");
    expect(PITCH_SYSTEM_PROMPT_BASE).toContain("match_score");
    expect(PITCH_SYSTEM_PROMPT_BASE).toContain("Return ONE score per company");
    expect(PITCH_SYSTEM_PROMPT_BASE).toContain("absorbs BOTH axes");
    // The old two-score keys must not appear anywhere — the JSON shape
    // and rubric switched to match_*.
    expect(PITCH_SYSTEM_PROMPT_BASE).not.toContain("fit_score");
    expect(PITCH_SYSTEM_PROMPT_BASE).not.toContain("career_compound_score");
  });
});

describe("buildUserPrompt — byte-identical to matcher's inline construction", () => {
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

// ─── parser robustness ────────────────────────────────────────────────

describe("clampScore", () => {
  it("clamps below 0 and above 100", () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(150)).toBe(100);
  });
  it("rounds to 2 decimal places (preserves matcher's existing behaviour)", () => {
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

describe("normalizeScoredCompany", () => {
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

  it("accepts a well-formed object", () => {
    const out = normalizeScoredCompany(baseRaw, validIds);
    expect(out).toMatchObject({
      company_id: "co-1",
      match_score: 80,
      pitched_role: "Customer Success",
      who_to_contact: ["CS team lead", "Recruiter"],
    });
  });

  it("anti-fab guard — rejects company_id not in validIds set", () => {
    expect(normalizeScoredCompany({ ...baseRaw, company_id: "co-999" }, validIds)).toBeNull();
  });

  it("rejects when any required text field is empty", () => {
    expect(normalizeScoredCompany({ ...baseRaw, pitched_role: "" }, validIds)).toBeNull();
    expect(normalizeScoredCompany({ ...baseRaw, pitch_rationale: "  " }, validIds)).toBeNull();
    expect(normalizeScoredCompany({ ...baseRaw, match_rationale: "" }, validIds)).toBeNull();
  });

  it("rejects when match_score is missing / non-numeric", () => {
    expect(normalizeScoredCompany({ ...baseRaw, match_score: "high" }, validIds)).toBeNull();
    expect(normalizeScoredCompany({ ...baseRaw, match_score: null }, validIds)).toBeNull();
    const { match_score: _ms, ...withoutScore } = baseRaw;
    void _ms;
    expect(normalizeScoredCompany(withoutScore, validIds)).toBeNull();
  });

  it("ignores unknown fields from old two-score callers (PR4/PR5 compat — they'd just be stripped)", () => {
    const out = normalizeScoredCompany({
      ...baseRaw,
      fit_score: 80,
      career_compound_score: 65,
      fit_rationale: "old shape",
    }, validIds);
    expect(out).not.toBeNull();
    expect(out).not.toHaveProperty("fit_score");
    expect(out).not.toHaveProperty("career_compound_score");
    expect(out).not.toHaveProperty("fit_rationale");
  });

  it("caps skill_gaps_this_fills at 5 entries + trims + 100-char per item", () => {
    const long = Array.from({ length: 10 }, (_, i) => `gap ${i} ` + "x".repeat(200));
    const out = normalizeScoredCompany({ ...baseRaw, skill_gaps_this_fills: long }, validIds);
    expect(out?.skill_gaps_this_fills).toHaveLength(5);
    expect(out!.skill_gaps_this_fills[0].length).toBeLessThanOrEqual(100);
  });

  it("caps who_to_contact at 2 entries + trims + 80-char per item", () => {
    const out = normalizeScoredCompany({
      ...baseRaw,
      who_to_contact: ["one", "  two  ", "three", "x".repeat(120)],
    }, validIds);
    expect(out?.who_to_contact).toHaveLength(2);
    expect(out!.who_to_contact[0]).toBe("one");
    expect(out!.who_to_contact[1]).toBe("two");
  });

  it("defaults who_to_contact to [] when missing or non-array (matcher's pre-PR4 path)", () => {
    const { who_to_contact: _, ...withoutField } = baseRaw;
    void _;
    expect(normalizeScoredCompany(withoutField, validIds)?.who_to_contact).toEqual([]);
    expect(normalizeScoredCompany({ ...baseRaw, who_to_contact: null }, validIds)?.who_to_contact).toEqual([]);
    expect(normalizeScoredCompany({ ...baseRaw, who_to_contact: "HR" }, validIds)?.who_to_contact).toEqual([]);
  });

  it("drops non-string entries inside who_to_contact and skill_gaps_this_fills", () => {
    const out = normalizeScoredCompany({
      ...baseRaw,
      who_to_contact: ["CS team lead", 42, null, ""],
      skill_gaps_this_fills: ["valid", 42, null, "  "],
    }, validIds);
    expect(out?.who_to_contact).toEqual(["CS team lead"]);
    expect(out?.skill_gaps_this_fills).toEqual(["valid"]);
  });
});
