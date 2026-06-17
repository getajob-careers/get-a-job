// Unit tests for prompt-lib.ts (eli/chat-model-sonnet). Focus on the two
// behaviors this PR introduced:
//   1. extractJsonBlock is FENCE-TOLERANT — it parses an action block whether
//      or not claude-sonnet-4.6 wrapped it in a ```json markdown fence, and
//      strips a trailing fence-close from the user-visible reply.
//   2. assembleSystemPrompt wires CONTEXT_HONESTY_RULES into every conversational
//      agent and gives career_agent CV_GENERATION_RULES (capability routing).
//
// Runs under Vitest (npm test), same as page-context.test.ts.

import { describe, it, expect } from "vitest";
import {
  extractJsonBlock,
  parseSuggestions,
  assembleSystemPrompt,
  CONTEXT_HONESTY_RULES,
  BULLET_CAPTURE_RULES,
} from "./prompt-lib.ts";

const MARKER = "SUGGESTED_TASKS_JSON:";

describe("extractJsonBlock — fence tolerance", () => {
  it("parses an unfenced block (legacy gpt-4o-mini shape)", () => {
    const text = `Here's your plan.\n\n${MARKER}[{"title":"Apply to Workiz"}]`;
    const r = extractJsonBlock(text, MARKER);
    expect(r).not.toBeNull();
    expect(r!.parsed).toEqual([{ title: "Apply to Workiz" }]);
    expect(r!.cleaned).toBe("Here's your plan.");
  });

  it("parses a ```json fenced block (Sonnet shape) — the regression this PR fixes", () => {
    const text = `Here's your plan.\n\n${MARKER}\n\`\`\`json\n[{"title":"Apply to Workiz"}]\n\`\`\``;
    const r = extractJsonBlock(text, MARKER);
    expect(r).not.toBeNull();
    expect(r!.parsed).toEqual([{ title: "Apply to Workiz" }]);
    // trailing fence-close must NOT leak into the user-visible reply
    expect(r!.cleaned).toBe("Here's your plan.");
    expect(r!.cleaned).not.toContain("`");
  });

  it("parses a bare ``` fence (no language tag)", () => {
    const text = `Plan:\n\n${MARKER} \`\`\`\n{"changes":[]}\n\`\`\``;
    const r = extractJsonBlock(text, "SUGGESTED_ROADMAP_CHANGES_JSON:");
    // marker mismatch → null (sanity); now test the right marker
    expect(r).toBeNull();
    const r2 = extractJsonBlock(text, MARKER);
    expect(r2).not.toBeNull();
    expect(r2!.parsed).toEqual({ changes: [] });
  });

  it("returns null when the marker is absent", () => {
    expect(extractJsonBlock("no markers here", MARKER)).toBeNull();
  });

  it("returns null on malformed JSON (no silent repair — parity with production)", () => {
    const text = `${MARKER}[{"title": ]`;
    expect(extractJsonBlock(text, MARKER)).toBeNull();
  });
});

describe("parseSuggestions — fenced action block end-to-end", () => {
  it("extracts a fenced SUGGESTED_TASKS_JSON and strips it from reply", () => {
    const reply = `Focus on these.\n\n${MARKER}\n\`\`\`json\n[{"title":"Tailor CV","category":"cv","priority":"high"}]\n\`\`\``;
    const parsed = parseSuggestions(reply, "what should I do?", []);
    expect(parsed.suggested_tasks).toHaveLength(1);
    expect(parsed.suggested_tasks[0].category).toBe("cv");
    expect(parsed.reply).toBe("Focus on these.");
    expect(parsed.reply).not.toContain("SUGGESTED_TASKS_JSON");
    expect(parsed.reply).not.toContain("`");
  });
});

describe("parseSuggestions — add-skill (profile-write capability v1)", () => {
  const UUID = "11111111-2222-3333-4444-555555555555";

  it("extracts a valid skill+experience pair and strips the block from reply", () => {
    const reply = `I'd add Python to your Atera role — confirm below.\n\nSUGGESTED_ADD_SKILL_JSON:{"skill":"Python","experience_id":"${UUID}"}`;
    const parsed = parseSuggestions(reply, "I used python at atera", []);
    expect(parsed.suggested_add_skill).toEqual({
      skill: "Python",
      experience_id: UUID,
    });
    expect(parsed.reply).toBe("I'd add Python to your Atera role — confirm below.");
    expect(parsed.reply).not.toContain("SUGGESTED_ADD_SKILL_JSON");
  });

  it("drops the block when experience_id is missing/invalid (v1 requires the pair)", () => {
    const reply = `Sure.\n\nSUGGESTED_ADD_SKILL_JSON:{"skill":"SQL","experience_id":"not-a-uuid"}`;
    const parsed = parseSuggestions(reply, "add sql", []);
    expect(parsed.suggested_add_skill).toBeNull();
    expect(parsed.reply).not.toContain("SUGGESTED_ADD_SKILL_JSON");
  });

  it("drops the block when skill is empty", () => {
    const reply = `SUGGESTED_ADD_SKILL_JSON:{"skill":"  ","experience_id":"${UUID}"}`;
    const parsed = parseSuggestions(reply, "x", []);
    expect(parsed.suggested_add_skill).toBeNull();
  });
});

describe("assembleSystemPrompt — profile-write capabilities on every agent", () => {
  const AGENTS = [
    "career_agent",
    "interview_coach",
    "skill_development_agent",
    "cv-helper",
    "application_cv_success_agent",
    "career-coach",
  ];

  for (const agent of AGENTS) {
    it(`gives ${agent} both SUGGESTED_BULLET_CAPTURE_JSON and SUGGESTED_ADD_SKILL_JSON`, () => {
      const sys = assembleSystemPrompt(agent, "", null);
      expect(sys).toContain("SUGGESTED_BULLET_CAPTURE_JSON");
      expect(sys).toContain("SUGGESTED_ADD_SKILL_JSON");
    });
  }

  it("does NOT give resume-extractor the profile-write blocks", () => {
    const sys = assembleSystemPrompt("resume-extractor", "", null);
    expect(sys).not.toContain("SUGGESTED_ADD_SKILL_JSON");
    expect(sys).not.toContain("SUGGESTED_BULLET_CAPTURE_JSON");
  });
});

describe("assembleSystemPrompt — honesty rules + capability routing", () => {
  it("appends CONTEXT_HONESTY_RULES to career_agent", () => {
    const sys = assembleSystemPrompt("career_agent", "", null);
    expect(sys).toContain(CONTEXT_HONESTY_RULES.trim().slice(0, 40));
    expect(sys).toContain("CAPABILITY ROUTING");
  });

  it("gives career_agent CV_GENERATION_RULES so it routes CV requests", () => {
    const sys = assembleSystemPrompt("career_agent", "", null);
    expect(sys).toContain("SUGGESTED_CV_GENERATION_JSON");
  });

  it("appends CONTEXT_HONESTY_RULES to interview_coach and skill_development_agent", () => {
    expect(assembleSystemPrompt("interview_coach", "", null)).toContain(
      "DEIXIS HONESTY",
    );
    expect(assembleSystemPrompt("skill_development_agent", "", null)).toContain(
      "DEIXIS HONESTY",
    );
  });

  it("does NOT append honesty rules to resume-extractor (structured-extract path)", () => {
    const sys = assembleSystemPrompt("resume-extractor", "", null);
    expect(sys).not.toContain("CONTEXT & HONESTY RULES");
  });
});

describe("assembleSystemPrompt — capability boundary (no fake writes)", () => {
  // Regression coverage for the 2026-06-14 bug where the agent told the
  // user "I'll save this to your Story Bank" / "I'll include this in your
  // CV" without emitting any SUGGESTED_*_JSON block — i.e. claimed writes
  // it had no path to perform. Item 5 of CONTEXT_HONESTY_RULES forbids
  // any phrasing that implies a completed write before user confirmation,
  // and forbids claiming the CV "includes" content not in authoritative
  // rows. Wired into every conversational agent + the cv-helper's
  // cv_generation follow-up path (which previously skipped CONTEXT_HONESTY_RULES
  // entirely and was therefore the most likely place the false-write
  // phrasing leaked through).
  const sentinel = "CAPABILITY BOUNDARY";

  it("wires CAPABILITY BOUNDARY into career_agent", () => {
    expect(assembleSystemPrompt("career_agent", "", null)).toContain(sentinel);
  });

  it("wires CAPABILITY BOUNDARY into interview_coach", () => {
    expect(assembleSystemPrompt("interview_coach", "", null)).toContain(sentinel);
  });

  it("wires CAPABILITY BOUNDARY into skill_development_agent", () => {
    expect(assembleSystemPrompt("skill_development_agent", "", null)).toContain(sentinel);
  });

  it("wires CAPABILITY BOUNDARY into cv-helper (general path)", () => {
    expect(assembleSystemPrompt("cv-helper", "", null)).toContain(sentinel);
  });

  it("wires CAPABILITY BOUNDARY into cv-helper's cv_generation follow-up path (regression)", () => {
    // Pre-fix this branch built a prompt with BULLET_CAPTURE_RULES +
    // the dropped FOLLOWUP rule + guards only — no CONTEXT_HONESTY_RULES,
    // so the false-write phrasing was unconstrained. The fix appends
    // CONTEXT_HONESTY_RULES here too.
    expect(assembleSystemPrompt("cv-helper", "", "cv_generation")).toContain(sentinel);
  });

  it("wires CAPABILITY BOUNDARY into application_cv_success_agent (CV agent on tracker)", () => {
    expect(assembleSystemPrompt("application_cv_success_agent", "", null)).toContain(sentinel);
  });

  it("CAPABILITY BOUNDARY forbids the specific false-write phrasings the bug surfaced", () => {
    // The rule body must contain the named anti-claim phrasings so any
    // future prompt edit that softens the rule loudly fails this test.
    expect(CONTEXT_HONESTY_RULES).toContain('"I\'ll add that to your CV"');
    expect(CONTEXT_HONESTY_RULES).toContain('"saved"');
    expect(CONTEXT_HONESTY_RULES).toContain('"capturing this now"');
    expect(CONTEXT_HONESTY_RULES).toContain('"updating your profile"');
    expect(CONTEXT_HONESTY_RULES).toContain('"noted in your skills"');
    // And the affirmative routing-to-Profile guidance for skill / summary
    // edits where there is no propose block:
    expect(CONTEXT_HONESTY_RULES).toContain("open Profile and add it there");
  });

  it("CAPABILITY BOUNDARY explicitly enumerates the no-write tables (cannot drift silently)", () => {
    expect(CONTEXT_HONESTY_RULES).toContain("experiences");
    expect(CONTEXT_HONESTY_RULES).toContain("skills_canonical");
    expect(CONTEXT_HONESTY_RULES).toContain("profile.summary");
  });
});

describe("BULLET_CAPTURE_RULES — add-X-to-CV intent + bullet contract (Phase 1b)", () => {
  // The agent must now emit SUGGESTED_BULLET_CAPTURE_JSON on "add X to my
  // CV / put Y on my resume / include Z on my profile" intent (the
  // persist-intent pattern) AND continue to NOT emit on a bare "generate
  // a CV" regenerate request. These tests pin the rule body's emit/
  // exclude language so future edits can't silently undo the loop-closer.

  it("affirms 'add X to my CV' as an EMIT trigger", () => {
    expect(BULLET_CAPTURE_RULES).toContain("add my Guardio AI-bot QA work to my CV");
    expect(BULLET_CAPTURE_RULES).toContain("intent to PERSIST");
  });

  it("still excludes bare 'generate a fresh CV' from emit (the regenerate intent stays separate)", () => {
    expect(BULLET_CAPTURE_RULES).toContain("generate a fresh CV");
    expect(BULLET_CAPTURE_RULES).toContain("SUGGESTED_CV_GENERATION_JSON");
  });

  it("requires the thin-narrative ask-first anti-fab gate (never invent details)", () => {
    expect(BULLET_CAPTURE_RULES).toContain("THIN-NARRATIVE");
    expect(BULLET_CAPTURE_RULES).toContain("NEVER invent details");
    expect(BULLET_CAPTURE_RULES).toContain("ONE concrete clarifying question");
  });

  it("requires PROPOSAL framing pre-confirm (regression: #319 honesty must hold)", () => {
    // The CAPABILITY BOUNDARY rule from #319 forbade phrases that imply a
    // completed write before the user taps the confirm card. BULLET_CAPTURE
    // must echo that — when the agent emits the proposal block, the
    // in-conversation acknowledgement must be future-tense / conditional,
    // never past-tense "saved".
    expect(BULLET_CAPTURE_RULES).toContain("PROPOSAL FRAMING");
    expect(BULLET_CAPTURE_RULES).toContain('"saved"');
    expect(BULLET_CAPTURE_RULES).toContain("confirm in the card below");
    expect(BULLET_CAPTURE_RULES).toContain("Future-tense or conditional only");
  });

  it("text field rule still demands user-verbatim (anti-fab on save payload)", () => {
    expect(BULLET_CAPTURE_RULES).toContain("VERBATIM");
    // For add-X-to-CV intent, text is the user's description of X — not
    // the literal "add X to my CV" phrasing — pulled from this turn or
    // recent turns.
    expect(BULLET_CAPTURE_RULES).toContain('not the phrase "add X to my CV" itself');
  });
});

describe("BULLET_CAPTURE_RULES — experiences + education target + no downstream promise (Part B)", () => {
  it("requires an experience OR education target and refuses to invent one (zero-targets gate)", () => {
    expect(BULLET_CAPTURE_RULES).toContain("ZERO TARGETS");
    expect(BULLET_CAPTURE_RULES).toContain("Never invent an experience");
  });

  it("emits a best-guess {type,id} target from real UUIDs, null when unsure (picker resolves)", () => {
    expect(BULLET_CAPTURE_RULES).toContain("EXACT UUID from the matching EXPERIENCES or EDUCATION context");
    expect(BULLET_CAPTURE_RULES).toContain("NEVER invent a UUID");
    expect(BULLET_CAPTURE_RULES).toContain('"target":null');
  });

  it("forbids promising the bullet flows into CV / LinkedIn / internship / daily-action output", () => {
    // Phase 1b: nothing reads experiences.bullets for output yet, so the
    // agent must NOT promise downstream effects (reinstated in Phase 4 when
    // the CV authors from bullets).
    expect(BULLET_CAPTURE_RULES).toContain("DO NOT PROMISE DOWNSTREAM OUTPUT");
    expect(BULLET_CAPTURE_RULES).toContain("do not read bullets yet");
    expect(BULLET_CAPTURE_RULES).toContain("I'll regenerate your CV with it");
  });

  it("routes through the new bullet marker + edge function", () => {
    expect(BULLET_CAPTURE_RULES).toContain("SUGGESTED_BULLET_CAPTURE_JSON");
    expect(BULLET_CAPTURE_RULES).toContain("extract-bullets");
    // generalized target contract: experiences AND education
    expect(BULLET_CAPTURE_RULES).toContain('"target"');
    expect(BULLET_CAPTURE_RULES).toContain("education");
  });
});

describe("post-save CV-regen follow-up is DROPPED in Phase 1b", () => {
  // The "STORY JUST SAVED, OFFER CV REGEN" follow-up promised an output the
  // CV doesn't produce yet (bullets aren't read until Phase 4), so it is
  // removed entirely. A bullet_capture / story_capture follow-up value must
  // NOT resurrect a regen offer — it falls through to the normal agent prompt.
  for (const fu of ["story_capture", "bullet_capture"]) {
    it(`follow_up_after="${fu}" produces no CV-regen offer`, () => {
      const sys = assembleSystemPrompt("career_agent", "", fu);
      expect(sys).not.toContain("OFFER CV REGEN");
      expect(sys).not.toContain("STORY JUST SAVED");
    });
  }
});
