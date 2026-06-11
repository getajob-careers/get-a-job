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
